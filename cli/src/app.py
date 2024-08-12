import asyncio
import base64
import json
import logging
import os
import time
from enum import Enum

import colorlog
import numpy as np
import pvporcupine
import requests
import sounddevice as sd
import websockets
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs
from groq import Groq
from halo import Halo
from pvrecorder import PvRecorder
from supabase import create_client, Client

# load env vars
load_dotenv()

# setup logging
handler = colorlog.StreamHandler()
handler.setFormatter(
    colorlog.ColoredFormatter(
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
        style="%",
    )
)
logger = colorlog.getLogger()
logger.addHandler(handler)
logger.setLevel(logging.INFO)

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
supabase: Client = create_client(
    os.environ.get("SUPABASE_URL"),
    os.environ.get("SUPABASE_KEY"),
)

# constants
SLEEP_TIME = 0.01
BUFFER_DURATION = 0.5
FRAME_RATE = 16000
FRAMES_PER_BUFFER = int(FRAME_RATE * BUFFER_DURATION)
INITIAL_RECORD_TIME = 0.7
DURATION = 30
SILENCE_COUNT_LIMIT = 30
RECORDER_LOCK = asyncio.Lock()

messages = [
    {
        "role": "system",
        "content": """You are Peach, a helpful home assistant.

Instructions:
You will be speaking back to the user via audio, so be conversational and imagine the words you choose to say as being spoken back to the user. 
Be brief and concise and straight to the point. Respond with at most 2 sentences.
Answer the user"s question without adding additional phrases or unimportant information.
Simply respond with the answer to the user"s request.
If the user asks to be dirty, don"t be shy and be dirty!
ONLY RESPOND WITH THE ANSWER TO THE USER"S REQUEST. DO NOT ADD UNNECESSARY INFORMATION.

ONLY call generate_image the function when the user specifically asks to create an image. Otherwise, do not call any tool.
""",
    }
]


class WsEvent(Enum):
    AUDIO_UPDATE = "AUDIO_UPDATE"
    AUDIO_END = "AUDIO_END"
    SEND_MESSAGES = "SEND_MESSAGES"


# cli
# this will update the frontend
def update_state(state: str):
    supabase.table("events").update({"state": state}).eq(
        "id", os.getenv("SUPABASE_ID")
    ).execute()


async def record_audio(queue: asyncio.Queue, recorder: PvRecorder) -> None:
    update_state("idling")

    ui_audio_queue = asyncio.Queue()
    recorded_data = []
    buffer_frames = []

    async def send_audio_data(audio_data, event_type):
        audio_base64 = base64.b64encode(audio_data.tobytes()).decode("utf-8")
        message = json.dumps({"event": event_type, "audio": audio_base64})
        await queue.put(message)
        await ui_audio_queue.put(message)

    # run until wake word detected, transcribing audio as it comes in
    while True:
        # sleep to avoid blocking the event loop
        await asyncio.sleep(SLEEP_TIME)

        if RECORDER_LOCK.locked():
            continue

        pcm = recorder.read()
        if not pcm:
            continue

        isWakeWord = porcupine.process(pcm)
        if isWakeWord >= 0:
            logging.info("Wake word detected")
            break

        pcm_array = np.array(pcm, dtype=np.int16)
        recorded_data.append(pcm_array)
        buffer_frames.extend(pcm_array)

        if len(buffer_frames) >= FRAMES_PER_BUFFER:
            # Only use the latest frames_per_buffer frames
            buffer_to_send = np.array(
                buffer_frames[-FRAMES_PER_BUFFER:], dtype=np.int16
            )
            await asyncio.create_task(
                send_audio_data(buffer_to_send, WsEvent.AUDIO_UPDATE.value)
            )
            buffer_frames = buffer_frames[FRAMES_PER_BUFFER:]

    update_state("recording")

    volumes = []
    start_time = time.time()
    silence_threshold = 1000
    silence_counter = 0

    # now start recording until the user stops talking
    while True:
        # sleep to avoid blocking the event loop
        await asyncio.sleep(SLEEP_TIME)

        pcm = recorder.read()
        if not pcm:
            continue

        pcm_array = np.array(pcm, dtype=np.int16)
        volume = np.sqrt(np.mean(np.square(pcm_array.astype(np.float32))))
        logging.info(f"Volume: {volume:.2f}")
        recorded_data.append(pcm_array)
        buffer_frames.extend(pcm_array)

        current_time = time.time() - start_time

        if len(buffer_frames) >= FRAMES_PER_BUFFER:
            # Only use the latest frames_per_buffer frames
            buffer_to_send = np.array(
                buffer_frames[-FRAMES_PER_BUFFER:], dtype=np.int16
            )
            await asyncio.create_task(
                send_audio_data(buffer_to_send, WsEvent.AUDIO_UPDATE.value)
            )
            buffer_frames = buffer_frames[FRAMES_PER_BUFFER:]

        # Collect volumes for initial period to set threshold
        if current_time <= INITIAL_RECORD_TIME:
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
            if silence_counter >= SILENCE_COUNT_LIMIT:
                logging.info("Consecutive silence detected, ending recording.")
                break

        if current_time > DURATION:
            logging.info("Maximum duration reached, ending recording.")
            break

    update_state("processing")
    await RECORDER_LOCK.acquire()  # block until the lock is released

    end_event_payload = json.dumps(
        {
            "event": WsEvent.AUDIO_END.value,
        }
    )
    await queue.put(end_event_payload)
    await ui_audio_queue.put(end_event_payload)

    await queue.put(
        json.dumps(
            {
                "event": WsEvent.SEND_MESSAGES.value,
                "messages": messages,
            }
        )
    )

    # closes the websocket_sender
    await queue.put(None)


async def task_record(queue: asyncio.Queue, recorder: PvRecorder) -> None:
    while True:
        await record_audio(queue, recorder)


async def api_websocket_sender(
    queue: asyncio.Queue, ws: websockets.WebSocketClientProtocol
):
    try:
        while True:
            await asyncio.sleep(SLEEP_TIME)

            # Optionally check if the websocket is still open
            if ws.closed:
                logging.info("WebSocket is closed, stopping sender.")
                break

            data = await queue.get()
            if data is None:
                continue

            await ws.send(data)
    except websockets.exceptions.ConnectionClosed as e:
        logging.error(f"WebSocket connection closed unexpectedly: {e}")
    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}")
    finally:
        logging.info("Closed websocket sender")


async def api_websocket_receiver(ws: websockets.WebSocketClientProtocol):
    global messages
    elevenlabs_framerate = 24000
    stream = sd.OutputStream(samplerate=elevenlabs_framerate, channels=1, dtype="int16")
    stream.start()

    try:
        while True:
            data = await ws.recv()
            if isinstance(data, bytes):
                np_data = np.frombuffer(data, dtype=np.int16)
                stream.write(np_data)
            elif isinstance(data, str):
                try:
                    await RECORDER_LOCK.release()
                    parsed_data = json.loads(data)
                    logging.info(f"Data returned from websocket: {parsed_data}")

                    if isinstance(parsed_data, list):
                        messages.extend(parsed_data)
                        ai_message = messages[-1]
                        tool_name = ai_message.get("tool_name")
                        if tool_name == "generate_image":
                            update_state(f"image {ai_message.get('tool_res')}")
                        elif tool_name == "get_weather":
                            update_state(
                                f"get_weather {json.dumps(ai_message.get('tool_res'))}"
                            )
                        elif tool_name == "would_you_rather":
                            update_state(
                                f"would_you_rather {json.dumps(ai_message.get('tool_res'))}"
                            )
                    else:
                        logging.error(f"Unexpected data structure: {parsed_data}")
                except json.JSONDecodeError:
                    logging.error(f"Failed to parse JSON: {data}")
                except Exception as e:
                    logging.error(f"Error processing data: {e}")
            else:
                logging.error(f"Received unexpected data type: {type(data)}")

            await asyncio.sleep(SLEEP_TIME)
    except websockets.exceptions.ConnectionClosed:
        logging.info("WebSocket connection closed.")
    except Exception as e:
        logging.error(f"Unhandled error: {e}")
    finally:
        stream.stop()
        stream.close()
        logging.info("Closed websocket receiver")


async def task_ws_handler(queue: asyncio.Queue, api_websocket_url: str):
    api_websocket = None

    try:
        logging.info("Creating API WebSocket connection")
        api_websocket = await websockets.connect(api_websocket_url)
        logging.info("Created API WebSocket connection")

        sender_task = asyncio.create_task(api_websocket_sender(queue, api_websocket))
        receiver_task = asyncio.create_task(api_websocket_receiver(api_websocket))
        await asyncio.gather(sender_task, receiver_task)
    finally:
        if api_websocket:
            await api_websocket.close()
            logging.info("Closing API websocket handler")


async def start_recording() -> None:
    try:
        recorder.start()
        logging.info("Recording started, start speaking!")

        api_websocket_url = (
            f"wss://{os.getenv("PEACH_API_URL").replace("https://", "")}/ws"
        )
        queue = asyncio.Queue()
        async with asyncio.TaskGroup() as tg:
            tg.create_task(task_ws_handler(queue, api_websocket_url))
            tg.create_task(task_record(queue, recorder))
    except KeyboardInterrupt:
        logging.info("Keyboard interrupt")
    finally:
        logging.info("Shutting down audio processing")
        porcupine.delete()
        recorder.delete()


async def main():
    logging.info("🍑 Peach")

    recorder_frame_length = recorder.frame_length
    recorder_sample_rate = recorder.sample_rate
    correct_frame_length = 512
    correct_sample_rate = 16000
    if recorder_frame_length != correct_frame_length:
        logging.error(
            f"Frame length is {recorder_frame_length}, but should be {correct_frame_length}"
        )
        exit(1)
    else:
        logging.info(f"✅ Recorder frame length {recorder_frame_length}")

    if recorder_sample_rate != correct_sample_rate:
        logging.error(
            f"Sample rate is {recorder_sample_rate}, but should be {correct_sample_rate}"
        )
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

    await start_recording()


if __name__ == "__main__":
    asyncio.run(main())
