import asyncio
import base64
import json
import logging
import os
import random
import time
from enum import Enum

import colorlog
import numpy as np
import pvporcupine
import requests
import sounddevice as sd
import soundfile as sf
import webrtcvad
import websockets
from dotenv import load_dotenv
from elevenlabs import stream
from elevenlabs.client import ElevenLabs
from flask import Flask
from flask_cors import CORS, cross_origin
from groq import Groq
from halo import Halo
from pvrecorder import PvRecorder

handler = colorlog.StreamHandler()
handler.setFormatter(colorlog.ColoredFormatter(
    "%(log_color)s%(asctime)s - %(funcName)s - %(message)s",
    datefmt="%H:%M:%S",
    log_colors={
        "DEBUG": "cyan",
        "INFO": "green",
        "WARNING": "yellow",
        "ERROR": "red",
        "CRITICAL": "bold_red,bg_white",
    },
    secondary_log_colors={},
    style="%"
))

logger = colorlog.getLogger()
logger.addHandler(handler)
logger.setLevel(logging.INFO)

load_dotenv()

# libs
porcupine = pvporcupine.create(
    access_key=os.getenv("PORCUPINE_API_KEY"),
    keyword_paths=[os.getenv("KEYWORD_PATH")],
)
recorder = PvRecorder(
    frame_length=porcupine.frame_length,
    device_index=int(os.getenv("SOUND_INPUT_DEVICE")),
)
elevenlabs = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))
groq = Groq(api_key=os.getenv("GROQ_API_KEY"))
vad = webrtcvad.Vad()
vad.set_mode(3)

# constants
messages = [
    {
        "role": "system",
        "content": """You are Peach, a helpful home assistant.

Instructions:
You will be speaking back to the user via audio, so be conversational and imagine the words you choose to say as being spoken back to the user. 
Be brief and concise and straight to the point. 
Answer the user"s question without adding additional phrases or unimportant information.
Simply respond with the answer to the user"s request.
If the user asks to be dirty, don"t be shy and be dirty!
ONLY RESPOND WITH THE ANSWER TO THE USER"S REQUEST. DO NOT ADD UNNECCESSARY INFORMATION.
""",
    }
]


class WsEvent(Enum):
    AUDIO_UPDATE = "AUDIO_UPDATE"
    AUDIO_END = "AUDIO_END"
    SEND_MESSAGES = "SEND_MESSAGES"


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


# cli
def speech(text: str) -> None:
    audio_stream = elevenlabs.generate(
        text=text,
        voice="Matilda",
        model="eleven_turbo_v2",
        stream=True,
    )
    stream(audio_stream)


def play_audio(file_path: str) -> None:
    logging.info("Audio playing")
    data, file_samplerate = sf.read(file_path)
    sd.play(data, file_samplerate)
    sd.wait()
    logging.info("Audio finished")


async def listen_and_record(queue: asyncio.Queue, recorder: PvRecorder) -> None:
    play_audio(random.choice(["data/s1.mp3", "data/s2.mp3", "data/s3.mp3", "data/s4.mp3"]))

    logging.info("Start speaking")

    global ui_state
    ui_state = UIStates.RECORDING

    duration = 30
    silence_count_limit = 30

    start_time = time.time()
    recorded_data = []
    initial_record_time = 0.5
    volumes = []
    silence_threshold = 300
    silence_counter = 0
    buffer_duration = 0.5
    buffer_frames = []
    frame_rate = 16000
    frames_per_buffer = int(frame_rate * buffer_duration)

    async def send_audio_data(audio_data, event_type):
        audio_base64 = base64.b64encode(audio_data.tobytes()).decode("utf-8")
        message = json.dumps({
            "event": event_type,
            "audio": audio_base64
        })
        await queue.put(message)

    while True:
        pcm = recorder.read()

        if not pcm:
            continue

        pcm_array = np.array(pcm, dtype=np.int16)
        volume = np.sqrt(np.mean(np.square(pcm_array.astype(np.float32))))
        logging.info(f"Volume: {volume:.2f}")
        recorded_data.append(pcm_array)
        buffer_frames.extend(pcm_array)

        current_time = time.time() - start_time

        if len(buffer_frames) >= frames_per_buffer:
            # Only use the latest frames_per_buffer frames
            buffer_to_send = np.array(buffer_frames[-frames_per_buffer:], dtype=np.int16)
            await asyncio.create_task(send_audio_data(buffer_to_send, WsEvent.AUDIO_UPDATE.value))
            buffer_frames = buffer_frames[frames_per_buffer:]

        # Collect volumes for initial period to set threshold
        if current_time <= initial_record_time:
            volumes.append(volume)
        elif len(volumes) > 0:
            silence_threshold = 1.3 * np.median(volumes)
            volumes = []
            logging.info(f"Silence threshold set at: {silence_threshold:.2f}")

        # Track silence and record data
        if volume > silence_threshold:
            silence_counter = 0
        else:
            silence_counter += 1
            if silence_counter >= silence_count_limit:
                logging.info("Consecutive silence detected, ending recording.")
                break

        if current_time > duration:
            logging.info("Maximum duration reached, ending recording.")
            break

        await asyncio.sleep(0.02)

    await queue.put(json.dumps({
        "event": WsEvent.AUDIO_END.value,
    }))

    await queue.put(json.dumps({
        "event": WsEvent.SEND_MESSAGES.value,
        "messages": messages,
    }))

    # closes the websocket_sender
    await queue.put(None)


async def websocket_sender(queue: asyncio.Queue, ws: websockets.WebSocketClientProtocol):
    try:
        while True:
            # Optionally check if the websocket is still open
            if ws.closed:
                logging.info("WebSocket is closed, stopping sender.")
                break

            data = await queue.get()
            if data is None:  # Use a sentinel value to indicate the sender should stop.
                break

            logging.info("[socket send]")
            await ws.send(data)  # This can throw an exception if the websocket is closed.
    except websockets.exceptions.ConnectionClosed as e:
        logging.error(f"WebSocket connection closed unexpectedly: {e}")
    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}")
    finally:
        logging.info("Closed websocket sender")


async def websocket_receiver(ws: websockets.WebSocketClientProtocol):
    elevenlabs_framerate = 24000
    stream = sd.OutputStream(samplerate=elevenlabs_framerate, channels=1, dtype='int16')
    stream.start()

    try:
        while True:
            data = await ws.recv()
            if isinstance(data, bytes):
                np_data = np.frombuffer(data, dtype=np.int16)
                stream.write(np_data)
            else:
                logging.error("Received non-byte data")
    except websockets.exceptions.ConnectionClosed:
        logging.info("WebSocket connection closed.")
    except Exception as e:
        logging.error(f"Unhandled error: {e}")
    finally:
        stream.stop()
        stream.close()
        logging.info("Closed websocket receiver")


async def websocket_handler(queue: asyncio.Queue, websocket_url: str):
    logging.info("Creating WebSocket connection")
    async with websockets.connect(websocket_url) as websocket:
        logging.info("WebSocket connected")
        sender_task = asyncio.create_task(websocket_sender(queue, websocket))
        receiver_task = asyncio.create_task(websocket_receiver(websocket))
        await asyncio.gather(sender_task, receiver_task)
    logging.info("Closing websocker handler")


async def main() -> None:
    try:
        recorder.start()
        logging.info("Recording started, start speaking!")

        global ui_state
        ui_state = UIStates.IDLING

        websocket_url = f"wss://{os.getenv("PEACH_API_URL").replace("https://", "")}/ws"

        while True:
            pcm = recorder.read()
            result = porcupine.process(pcm)

            if result >= 0:
                logging.info("Wake word detected")
                queue = asyncio.Queue()
                async with asyncio.TaskGroup() as tg:
                    tg.create_task(websocket_handler(queue, websocket_url))
                    tg.create_task(listen_and_record(queue, recorder))
                logging.info("Done processing, restarting wake word detection")

    except KeyboardInterrupt:
        logging.info("Keyboard interrupt")
    finally:
        logging.info("Shutting down audio processing")
        porcupine.delete()
        recorder.delete()


if __name__ == "__main__":
    logging.info("🍑 Peach")

    recorder_frame_length = recorder.frame_length
    recorder_sample_rate = recorder.sample_rate
    correct_frame_length = 512
    correct_sample_rate = 16000
    if recorder_frame_length != correct_frame_length:
        logging.error(f"Frame length is {recorder_frame_length}, but should be {correct_frame_length}")
        exit(1)
    else:
        logging.info(f"✅ Recorder frame length {recorder_frame_length}")

    if recorder_sample_rate != correct_sample_rate:
        logging.error(f"Sample rate is {recorder_sample_rate}, but should be {correct_sample_rate}")
        exit(1)
    else:
        logging.info(f"✅ Sample rate {recorder_sample_rate}")

    url = os.getenv("PEACH_API_URL")
    logging.info(f"Checking API at {url}")
    spinner = Halo(text="Loading", spinner="dots")
    spinner.start()
    res = requests.get(f"{url}/health")
    if res.status_code != 200:
        spinner.fail("API down, aborting")
        exit(1)
    spinner.succeed("API ok, starting main")
    spinner.stop()

    asyncio.run(main())
