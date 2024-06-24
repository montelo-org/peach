import json
import logging
import os
import queue
import random
import time
from threading import Thread

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
from openai import OpenAI
from pvrecorder import PvRecorder
from serpapi import GoogleSearch
from tavily import TavilyClient

load_dotenv()

# Audio recording settings
samplerate = 16000  # Sample rate in Hz
channels = 1  # Mono recording

# Global variables
audio_queue = queue.Queue()  # Queue to hold audio data
ws_clients = set()

# libs
porcupine = pvporcupine.create(
    access_key=os.getenv("PORCUPINE_API_KEY"),
    keyword_paths=[os.getenv("KEYWORD_PATH")],
)
recorder = PvRecorder(
    frame_length=porcupine.frame_length,
    device_index=int(os.getenv("SOUND_INPUT_DEVICE"))
)
openai = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)
groq = Groq(
    api_key=os.getenv("GROQ_API_KEY"),
)
elevenlabs = ElevenLabs(
    api_key=os.getenv("ELEVENLABS_API_KEY")
)
tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

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
"""
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
CORS(app, resources={r"/*": {"origins": "*"}}, methods=['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'], allow_headers=[
    "Content-Type", "Authorization", "X-Requested-With", "Access-Control-Allow-Credentials",
    "Access-Control-Allow-Origin"])
app.logger.setLevel(logging.WARNING)
logging.getLogger('werkzeug').setLevel(logging.WARNING)


@app.route("/")
@cross_origin(origin='*')
def get_state():
    return ui_state


# tools
def web_search_serp(*, query, index):
    search = GoogleSearch({
        "q": query,
        "location": "toronto, ontario, canada",
        "api_key": os.getenv("SERP_API_KEY")
    })
    results = search.get_dict()
    result = results.get(index, None)

    if result is None:
        return results

    if index == "sports_results":
        return json.dumps(result)

    # organic
    return "\n\n".join([r["snippet"] for r in result])


def web_search_tavily(*, query):
    return tavily.qna_search(query=query)


def generate_image(prompt):
    prodia_key = "72a1b2b6-281a-4211-a658-e7c17780c2d2"
    response = requests.post("https://api.prodia.com/v1/sdxl/generate", json={"prompt": prompt}, headers={
        "accept": "application/json",
        "content-type": "application/json",
        "X-Prodia-Key": prodia_key,
    })
    data = response.json()
    print("data: ", data)
    job = data["job"]

    if not job:
        return "Image could not be generated"

    num_tries = 0

    while True:
        if num_tries >= 30:
            return "Image could not be generated"
        response = requests.get(f"https://api.prodia.com/v1/job/{job}", headers={
            "accept": "application/json",
            "X-Prodia-Key": prodia_key
        })
        data = response.json()
        print("job: ", data)
        status = data["status"]

        if status == "succeeded":
            return data["imageUrl"]

        num_tries += 1
        time.sleep(1)


def get_best_university():
    return "https://www.shorttermprograms.com/images/cache/600_by_314/uploads/institution-logos/mcgill-university.png"


tool_map = dict(
    web_search=web_search_tavily,
    generate_image=generate_image,
    get_best_university=get_best_university,
)


def process_and_transcribe():
    """ Process, transcribe, and convert text to speech for audio data directly from the queue. """
    global ui_state
    global messages

    ui_state = UIStates.PROCESSING
    all_data = []
    while not audio_queue.empty():
        all_data.append(audio_queue.get())
    if all_data:
        audio_array = np.concatenate(all_data, axis=0)
        file_path = "data/temp_audio.wav"
        sf.write(file_path, audio_array, samplerate, format='wav')
        print("Audio file saved. Transcribing now...")
        transcription = transcribe_audio(file_path)
        print("Transcription: ", transcription)
        ai_response = get_ai_response(transcription)

        if messages[-2].get("name", None) == "generate_image":
            image_url = messages[-2]["content"]
            print("image url: ", image_url)
            if image_url.startswith("http"):
                print("setting ui state to image")
                convert_text_to_speech("Here's your image!")
                ui_state = f"{UIStates.IMAGE} {image_url}"
                time.sleep(1)
                ui_state = UIStates.IDLING
            else:
                print("setting state back to idling")
                convert_text_to_speech("Sorry, I couldn't generate an image for you.")
                ui_state = UIStates.IDLING
        elif messages[-2].get("name", None) == "get_best_university":
            image_url = messages[-2]["content"]
            convert_text_to_speech("Hell yeah I can")
            ui_state = f"{UIStates.IMAGE} {image_url}"
            time.sleep(1)
            ui_state = UIStates.IDLING
        else:
            print("Response: ", ai_response)
            convert_text_to_speech(ai_response)
            ui_state = UIStates.IDLING
    else:
        print("No recording data to save.")


def get_ai_response(transcription):
    global messages
    messages.append({"role": "user", "content": transcription})
    completion = openai.chat.completions.create(
        model=model,
        messages=messages,
        tools=[
            {
                "type": "function",
                "function": {
                    "name": "get_best_university",
                    "description": "Gets the best university in the world.",
                    "parameters": {
                        "type": "object",
                        "properties": {},
                    },
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "web_search",
                    "description": "Only use this for questions where you need to query the web to get an answer. Do NOT use this unless absolutely needed. If you can answer the question without using this, then do not use this.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "The query to make on the web. Be clear and verbose in what you want to search for. The more details, the more accurate the response.",
                            }
                        },
                        "required": ["query"],
                    },
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "generate_image",
                    "description": "Use this function to generate an image if the user requests to create an image.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "prompt": {
                                "type": "string",
                                "description": "The prompt to generate the image. Take the user's prompt and expand on it. Try to formulate 2-3 sentences for best results. Don't say 'generate an image...', just describe the image you'd like to generate. you can be detailed! ",
                            }
                        },
                        "required": ["prompt"],
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
            model="llama3-70b-8192",
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
    sd.wait()
    print("Playback finished.")


def convert_text_to_speech(text):
    """Convert text to speech and stream it directly using the new library."""

    if text is None or text == "":
        return

    global ui_state
    ui_state = UIStates.PLAYBACK
    # Generate audio stream from the client
    audio_stream = elevenlabs.generate(
        text=text,
        voice="Matilda",
        model="eleven_multilingual_v2",
        stream=True  # Enable streaming
    )

    stream(audio_stream)


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
            silence_threshold = 1.5 * np.median(volumes)  # Update threshold after initial recording
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
    main_thread = Thread(target=main)
    main_thread.start()
    app.run(use_reloader=False)
