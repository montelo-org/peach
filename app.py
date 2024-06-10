import json
import os
import queue
import threading
import time
from pathlib import Path

import numpy as np
import pvporcupine
import sounddevice as sd
import soundfile as sf
from dotenv import load_dotenv
from groq import Groq
from openai import OpenAI
from serpapi import GoogleSearch

load_dotenv()

# Audio recording settings
samplerate = 24000  # Sample rate in Hz
channels = 1  # Mono recording

# Global variables
audio_queue = queue.Queue()  # Queue to hold audio data

# libs
porcupine = pvporcupine.create(
    access_key=os.getenv("PORCUPINE_API_KEY"),
    keyword_paths=['Hey-peach_en_mac_v3_0_0.ppn']
)
openai = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)
groq = Groq(
    api_key=os.getenv("GROQ_API_KEY"),
)
model = "llama3-70b-8192"


def recording_thread():
    """ Continuously record audio while 'recording' is True. """
    global audio_queue
    recording = False
    try:
        while True:
            if recording:
                with sd.InputStream(samplerate=samplerate, channels=channels, dtype='float32', device=1) as stream:
                    print(f"Actual Sample Rate: {stream.samplerate}")
                    while recording:
                        data, overflowed = stream.read(1024)
                        audio_queue.put(data)
            else:
                threading.Event().wait(0.1)
    except Exception as e:
        print("Recording thread error:", e)


def process_and_transcribe():
    """ Process, transcribe, and convert text to speech for audio data directly from the queue. """
    global messages
    all_data = []
    while not audio_queue.empty():
        all_data.append(audio_queue.get())
    if all_data:
        audio_array = np.concatenate(all_data, axis=0)
        sf.write("data/temp_audio.wav", audio_array, samplerate)
        print("Audio file saved. Transcribing now...")
        transcription = transcribe_audio("data/temp_audio.wav")
        print("Transcription: ", transcription)
        ai_response = get_ai_response(transcription)
        print("Response: ", ai_response)
        convert_text_to_speech(ai_response)
    else:
        print("No recording data to save.")


messages = [
    {
        "role": "system",
        "content": "You are a helpful assistant. You will be speaking back to the user via audio, so be fun and conversational. However be brief and concise and straight to the point. Answer the user's question with no extra information. User's location: Toronto, Canada. Do not ramble, just answer the user's question."
    }
]


def web_search(*, query, index):
    search = GoogleSearch({
        "q": query,
        "location": "toronto, ontario, canada",
        "api_key": os.getenv("SERP_API_KEY")
    })
    results = search.get_dict()
    result = results[index]
    print("web search res: ", result)
    if index == "sports_results":
        return json.dumps(result)

    # organic
    return "\n\n".join([r["snippet"] for r in result])


tool_map = dict(
    web_search=web_search
)


def get_ai_response(transcription):
    global messages
    messages.append({"role": "user", "content": transcription})
    completion = groq.chat.completions.create(
        model=model,
        messages=messages,
        tools=[
            {
                "type": "function",
                "function": {
                    "name": "web_search",
                    "description": "Searches the web and returns a list of results for the search.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "The query to make on the web. Be clear and verbose in the query!",
                            },
                            "index": {
                                "type": "string",
                                "enum": ["sports_results", "organic_results"],
                                "description": "Which index to filter the search by."
                            },
                        },
                        "required": ["query", "index"],
                    },
                }
            }
        ]
    )
    tool_calls = completion.choices[0].message.tool_calls

    if tool_calls:
        print("Tool call!")
        messages.append(completion.choices[0].message.to_dict())
        for tool_call in tool_calls:
            function_name = tool_call.function.name
            function_to_call = tool_map[function_name]
            function_args = json.loads(tool_call.function.arguments)
            print("Calling: ", function_name, " with args ", tool_call.function.arguments)
            function_response = function_to_call(**function_args)
            print("Function response: ", function_response)
            messages.append(
                {
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": function_name,
                    "content": function_response,
                }
            )
        second_response = groq.chat.completions.create(
            model=model,
            messages=messages,
        )
        second_response_content = second_response.choices[0].message.content
        messages.append({"role": "assistant", "content": second_response_content})
        return second_response_content
    else:
        response = completion.choices[0].message.content
        messages.append({"role": "assistant", "content": response})
        return response


def transcribe_audio(file_path):
    """ Transcribe the given audio file using OpenAI's Whisper model. """
    with open(file_path, "rb") as audio_file:
        transcription = openai.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="text"
        )
        return transcription


def play_audio(file_path):
    """ Play the audio file using sounddevice. """
    data, file_samplerate = sf.read(file_path)
    print(f"File Samplerate: {file_samplerate}, Expected Samplerate: {samplerate}")
    sd.play(data, file_samplerate)
    sd.wait()  # Wait until file is done playing
    print("Playback finished.")


def convert_text_to_speech(text):
    """ Convert the transcribed text to speech and save as an audio file. """
    speech_file_path = Path("data", "output_speech.mp3")
    with openai.audio.speech.with_streaming_response.create(
            model="tts-1",
            voice="alloy",
            input=text
    ) as response:
        response.stream_to_file(speech_file_path)
    print(f"Text-to-speech audio saved to {speech_file_path}")
    play_audio(speech_file_path)


def listen_and_record(stream, duration=20):
    """ Record from the stream until silence is detected or the duration is exceeded. """
    print("Start speaking...")
    start_time = time.time()  # Use time module to track the start time
    recorded_data = []
    last_sound_time = time.time()  # Initialize last sound time

    # Silence settings
    silence_threshold = 2.5  # Adjust this based on your mic sensitivity or environment
    silence_duration = 1  # Amount of continuous silence time in seconds required to stop recording

    while True:
        data, overflow = stream.read(1024)
        volume = np.linalg.norm(data) * 10
        recorded_data.append(data)
        print("volume: ", volume)

        if volume > silence_threshold:
            last_sound_time = time.time()  # Update the last time sound was detected

        current_time = time.time()
        if current_time - last_sound_time >= silence_duration:
            print("Silence detected, stopping recording.")
            break  # Stop recording after silence

        if current_time - start_time > duration:
            print("Maximum duration reached, stopping recording.")
            break  # Safety break to avoid too long recording

    return np.concatenate(recorded_data, axis=0)


def main():
    print("Listening for keywords...")
    rec_thread = threading.Thread(target=recording_thread, daemon=True)
    rec_thread.start()

    try:
        with sd.InputStream(samplerate=porcupine.sample_rate, channels=1, dtype='float32', device=1) as stream:
            while True:
                data, overflow = stream.read(porcupine.frame_length)
                # Ensure data is clipped and scaled correctly, then convert to int16
                data_int16 = (np.clip(data, -1, 1) * 32767).astype(np.int16).flatten()  # Ensure it is flattened
                keyword_index = porcupine.process(data_int16)
                if keyword_index >= 0:
                    print("Keyword detected")
                    audio_data = listen_and_record(stream)
                    audio_queue.put(audio_data)
                    print("Processing speech...")
                    process_and_transcribe()
    except KeyboardInterrupt:
        print("Exiting...")
    finally:
        print("Shutting down audio processing...")


if __name__ == "__main__":
    main()
