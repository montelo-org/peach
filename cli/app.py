import json
import os
import queue
import time

import numpy as np
import pvporcupine
import pyaudio
import sounddevice as sd
import soundfile as sf
from dotenv import load_dotenv
from groq import Groq
from openai import OpenAI
from pvrecorder import PvRecorder
from serpapi import GoogleSearch
from whisper_cpp_python import Whisper

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
whisper = Whisper(model_path="../../whisper.cpp/models/ggml-tiny.en.bin")

# constants
model = "llama3-70b-8192"
messages = [
    {
        "role": "system",
        "content": """You are Peach, a helpful home assistant. 

Instructions:
You will be speaking back to the user via audio, so be conversational and imagine the words you choose to say as being spoken back to the user. 
Be brief and concise and straight to the point. 
Answer the user's question without adding additional phrases or unimportant information.
Simply respond with the answer to the user's request.

Important: DO NOT ADD UNNECCESSARY PHRASES, like "Here are some..."
"""
    }
]


# tools
def web_search(*, query, index):
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


tool_map = dict(
    web_search=web_search
)


def process_and_transcribe():
    """ Process, transcribe, and convert text to speech for audio data directly from the queue. """
    global messages
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
        print("Response: ", ai_response)
        convert_text_to_speech(ai_response)
    else:
        print("No recording data to save.")


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
    output = whisper.transcribe(open(file_path, mode="rb"))
    print(output)
    return output["text"]
    # with open(file_path, "rb") as audio_file:
    #     transcription = openai.audio.transcriptions.create(
    #         model="whisper-1",
    #         file=audio_file,
    #         response_format="text"
    #     )
    #     return transcription


def play_audio(file_path):
    """ Play the audio file using sounddevice. """
    data, file_samplerate = sf.read(file_path)
    print(f"File Samplerate: {file_samplerate}, Expected Samplerate: {samplerate}")
    sd.play(data, file_samplerate)
    sd.wait()  # Wait until file is done playing
    print("Playback finished.")


def convert_text_to_speech(text):
    """ Convert the transcribed text to speech and stream it directly. """
    # Setup audio stream with pyaudio
    p = pyaudio.PyAudio()
    stream = p.open(format=pyaudio.paInt16,  # This format should match the PCM 16-bit format
                    channels=1,
                    rate=24000,  # Sample rate specified for the model
                    output=True)

    # Create and handle streaming response
    with openai.audio.speech.with_streaming_response.create(
            model="tts-1",
            voice="alloy",
            input=text,
            response_format="pcm"
    ) as response:
        for chunk in response.iter_bytes(1024):  # Stream audio in chunks
            stream.write(chunk)

    # Clean up
    stream.stop_stream()
    stream.close()
    p.terminate()
    print("Streaming complete.")


def listen_and_record(recorder, duration=20):
    print("Start speaking...")
    start_time = time.time()
    recorded_data = []

    silence_threshold = 800  # Adjust threshold to a realistic level for int16 data
    silence_duration = 1
    last_sound_time = time.time()

    while True:
        frames = recorder.read()
        if not frames:
            continue

        pcm_array = np.array(frames, dtype=np.int16)
        volume = np.sqrt(np.mean(np.square(pcm_array.astype(np.float32))))
        print(f"Volume: {volume:.2f}")

        if volume > silence_threshold:
            last_sound_time = time.time()
            recorded_data.append(pcm_array)

        current_time = time.time()
        if (current_time - last_sound_time >= silence_duration) or (current_time - start_time > duration):
            break

    return np.concatenate(recorded_data, axis=0)


def main():
    print("[main] Starting...")

    recorder.start()
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
