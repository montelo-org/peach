import logging
import os
import queue
import random
import time

import numpy as np
import pvporcupine
import requests
import sounddevice as sd
import soundfile as sf
from dotenv import load_dotenv
from elevenlabs import stream
from elevenlabs.client import ElevenLabs
from flask import Flask
from flask_cors import CORS, cross_origin
from groq import Groq
from pvrecorder import PvRecorder

load_dotenv()

# Audio recording settings
samplerate = 16000  # Sample rate in Hz
channels = 1  # Mono recording

# Global variables
audio_queue = queue.Queue()  # Queue to hold audio data

# libs
porcupine = pvporcupine.create(
    access_key=os.getenv("PORCUPINE_API_KEY"),
    keyword_paths=[os.getenv("KEYWORD_PATH")],
)
recorder = PvRecorder(
    frame_length=porcupine.frame_length,
    device_index=int(os.getenv("SOUND_INPUT_DEVICE")),
)
elevenlabs = ElevenLabs(
    api_key=os.getenv("ELEVENLABS_API_KEY")
)
groq = Groq(api_key=os.getenv("GROQ_API_KEY"))

# constants
model = "gpt-4o"
messages = [
    {
        "role": "system",
        "content": """You are Peach, a helpful home assistant.

Instructions:
You will be speaking back to the user via audio, so be conversational and imagine the words you choose to say as being spoken back to the user. 
Be brief and concise and straight to the point. 
Answer the user's question without adding additional phrases or unimportant information.
Simply respond with the answer to the user's request.
If the user asks to be dirty, don't be shy and be dirty!
ONLY RESPOND WITH THE ANSWER TO THE USER'S REQUEST. DO NOT ADD UNNECCESSARY INFORMATION.

If user asks any of the following questions, then respond with the answer below it:

Question: Is anyone from season 2 of Love Is Blind still together?
Answer: As of the latest updates, both couples from "Love Is Blind" season 2 who got married—Jarette and Iyanna, and Nick and Danielle—have since divorced.

Question: What did Huberman say about the importance of morning sunlight?
Answer: Huberman emphasized the importance of morning sunlight in regulating mood, alertness, and sleep quality by setting the body's circadian rhythm, increasing morning cortisol levels, and suppressing melatonin production.

Question: What was Michael Jackson's first album with Quincy Jones?
Answer: Michael Jackson's "Off The Wall" was the first album with Quincy Jones.

Question: How old was Michael when he released that album?
Answer: Michael Jackson was 21 years old when he released Off The Wall.

Question: What about Thriller?
Answer: Michael Jackson's "Thriller" was released in 1982 so he was 24 years old at the time.

Question: If we travel at the speed of light in a car, would bluetooth still work?
Answer: If both the Bluetooth transmitter and receiver are moving at the speed of light, the signal, which also travels at the speed of light, wouldn't be able to catch up from the transmitter to the receiver, effectively making communication impossible.
""",
    }
]


# ui
class UIStates:
    IDLING = "idling"
    RECORDING = "recording"
    PROCESSING = "processing"
    PLAYBACK = "playback"
    IMAGE = "image"


ui_state = UIStates.IDLING

app = Flask(__name__)
CORS(
    app,
    resources={r"/*": {"origins": "*"}},
    methods=["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Access-Control-Allow-Credentials",
        "Access-Control-Allow-Origin",
    ],
)
app.logger.setLevel(logging.WARNING)
logging.getLogger("werkzeug").setLevel(logging.WARNING)


@app.route("/")
@cross_origin(origin="*")
def get_state():
    return ui_state


def speech(ai_response):
    audio_stream = elevenlabs.generate(
        text=ai_response,
        voice="Matilda",
        model="eleven_turbo_v2",
        stream=True,
    )
    stream(audio_stream)


def process_and_transcribe():
    """Process, transcribe, and convert text to speech for audio data directly from the queue."""
    global ui_state
    global messages

    ui_state = UIStates.PROCESSING
    all_data = []
    while not audio_queue.empty():
        all_data.append(audio_queue.get())
    if all_data:
        audio_array = np.concatenate(all_data, axis=0)
        file_path = "data/temp_audio.wav"
        sf.write(file_path, audio_array, samplerate, format="wav")
        print("Audio file saved. Transcribing now...")

        url = "https://montelo-org--peach-api-fastapi-app-dev.modal.run/upload"
        with open(file_path, 'rb') as file:
            files = {"file": file}
            response = requests.post(url, files=files)
            ai_response = response.json()
            speech(ai_response)

        ui_state = UIStates.IDLING
    else:
        print("No recording data to save.")


def play_audio(file_path):
    """Play the audio file using sounddevice."""
    data, file_samplerate = sf.read(file_path)
    print(f"File Samplerate: {file_samplerate}, Expected Samplerate: {samplerate}")
    sd.play(data, file_samplerate)
    sd.wait()
    print("Playback finished.")


def listen_and_record(recorder, duration=30, silence_count_limit=40):
    audios = ["data/s1.mp3", "data/s2.mp3", "data/s3.mp3", "data/s4.mp3"]
    play_audio(random.choice(audios))

    print("Start speaking...")
    global ui_state
    ui_state = UIStates.RECORDING
    start_time = time.time()
    recorded_data = []
    initial_record_time = 1  # Time to record initially to determine threshold
    volumes = []
    silence_threshold = 300  # Default threshold which might be updated
    silence_counter = 0  # Tracks consecutive volumes below the threshold

    while True:
        frames = recorder.read()
        if not frames:
            continue

        pcm_array = np.array(frames, dtype=np.int16)
        volume = np.sqrt(np.mean(np.square(pcm_array.astype(np.float32))))
        print(f"Volume: {volume:.2f}")
        recorded_data.append(pcm_array)

        current_time = time.time() - start_time

        # Collect volumes for initial period to set threshold
        if current_time <= initial_record_time:
            volumes.append(volume)
        elif len(volumes) > 0:
            silence_threshold = 1.5 * np.median(
                volumes
            )  # Update threshold after initial recording
            volumes = []  # Clear volumes list to prevent recalculating threshold
            print(f"Silence threshold set at: {silence_threshold:.2f}")

        # Track silence and record data
        if volume > silence_threshold:
            silence_counter = 0  # Reset counter on loud volume
        else:
            silence_counter += 1  # Increment silence counter when below threshold
            if silence_counter >= silence_count_limit:
                print("Consecutive silence detected, ending recording.")
                break  # Break the loop if silence is detected for enough consecutive samples

        if current_time > duration:
            print("Maximum duration reached, ending recording.")
            break

    return np.concatenate(recorded_data, axis=0) if recorded_data else np.array([])


def main():
    print("[main] Starting...")

    recorder.start()
    global ui_state
    ui_state = UIStates.IDLING
    try:
        while True:
            pcm = recorder.read()
            result = porcupine.process(pcm)

            if result >= 0:
                print("Keyword detected")
                audio_data = listen_and_record(recorder)
                audio_queue.put(audio_data)
                print("Processing speech...")
                process_and_transcribe()
    except KeyboardInterrupt:
        print("Exiting...")
    finally:
        print("Shutting down audio processing...")
        porcupine.delete()
        recorder.delete()


if __name__ == "__main__":
    main()
