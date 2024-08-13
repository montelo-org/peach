###########################################################################
# imports
###########################################################################
import asyncio
from dataclasses import dataclass, field
from io import BytesIO
import json
import logging
import os
from enum import Enum
import re
import time

from faster_whisper import WhisperModel
import colorlog
import numpy as np
import requests
import sounddevice as sd
import websockets
from dotenv import load_dotenv
from halo import Halo
from pvrecorder import PvRecorder
from supabase import create_client, Client
import webrtcvad
from asr import FasterWhisperASR
from transcriber import audio_transcriber
from audio import AudioStream, audio_samples_from_file


###########################################################################
# load env vars
###########################################################################
load_dotenv()


###########################################################################
# logging
###########################################################################
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


###########################################################################
# libs
###########################################################################
recorder = PvRecorder(
    frame_length=512,
    device_index=int(os.getenv("SOUND_INPUT_DEVICE")),
)
supabase: Client = create_client(
    os.environ.get("SUPABASE_URL"),
    os.environ.get("SUPABASE_KEY"),
)
vad = webrtcvad.Vad(2)  # Create VAD with aggressiveness level 2


###########################################################################
# constants
###########################################################################
WHISPER_MODEL = "base.en"
SLEEP_TIME = 0.01
BUFFER_DURATION = 0.5
FRAME_RATE = 16000
VAD_FRAME_SIZE = 480  # Assuming 30ms frames at 16kHz
BUFFER_DURATION_MS = 500  # 500ms buffer
VAD_BUFFER_SIZE = BUFFER_DURATION_MS * 16  # 500ms buffer at 16kHz
COUNT_SILENCE_THRESHOLD = 15

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


###########################################################################
# locks & shared states
###########################################################################
RECORDER_LOCK = asyncio.Lock()  # this lock determines when we need to record/not record
USER_ENDED_SPEAKING_EVENT = (
    asyncio.Event()
)  # this lock determines when the user is done speaking
HEY_PEACH_DETECTED_LOCK = (
    asyncio.Lock()
)  # this lock determines when the user says "hey peach"


@dataclass
class TranscriptionState:
    transcription: str = ""
    update_event: asyncio.Event = field(default_factory=asyncio.Event)


###########################################################################
# enums
###########################################################################
class WsEvent(Enum):
    AUDIO_UPDATE = "AUDIO_UPDATE"
    AUDIO_END = "AUDIO_END"
    SEND_MESSAGES = "SEND_MESSAGES"


class UIState(Enum):
    IDLING = "idling"
    RECORDING = "recording"
    PROCESSING = "processing"
    IMAGE = "image"


###########################################################################
# cli
###########################################################################


# this will update the record in the db, which then updates the frontend
def db_update_state(new_state: str) -> None:
    user_id = os.getenv("SUPABASE_ID")
    supabase.table("events").update({"state": new_state}).eq("id", user_id).execute()


# this task will record audio and put it in a queue to be shared between tasks
async def task_record(*, recorder: PvRecorder, audio_stream: AudioStream) -> None:
    # start the recorder
    logging.info("Recording started, start speaking!")
    recorder.start()

    vad_buffer = np.zeros(VAD_BUFFER_SIZE, dtype=np.int16)
    count_silence = 0

    while True:
        # Pause briefly to avoid blocking the event loop
        await asyncio.sleep(SLEEP_TIME)

        # Skip recording if the recorder is locked (processing or playback)
        if RECORDER_LOCK.locked():
            logging.info("Recorder locked, skipping")
            continue

        # Read PCM data from the recorder
        pcm = recorder.read()
        if not pcm:
            continue

        # Convert PCM data to numpy array and append to audio stream
        pcm_array = np.array(pcm, dtype=np.int16)
        audio_samples = audio_samples_from_file(BytesIO(pcm_array.tobytes()))
        audio_stream.extend(audio_samples)

        if HEY_PEACH_DETECTED_LOCK.locked():
            logging.info("Checking for speech...")
            # Update VAD buffer
            vad_buffer = np.roll(vad_buffer, -len(pcm_array))
            vad_buffer[-len(pcm_array) :] = pcm_array

            # Check for speech in the VAD buffer
            is_speech = any(
                vad.is_speech(vad_buffer[i : i + VAD_FRAME_SIZE].tobytes(), FRAME_RATE)
                for i in range(0, len(vad_buffer), VAD_FRAME_SIZE)
            )

            logging.info(f"Speech detected: {is_speech}")

            if is_speech:
                count_silence = 0
            else:
                count_silence += 1

            logging.info(f"Count silence: {count_silence}")

            if count_silence > COUNT_SILENCE_THRESHOLD:
                logging.info("🔇 User ended speaking, locking...")
                USER_ENDED_SPEAKING_EVENT.set()


def check_hey_peach(transcription: str) -> bool:
    N = 50
    # Get the last N characters of the transcription
    last_N_chars = transcription[-N:].lower()

    # Define the regular expression pattern
    pattern = r"\bhey\s*,?\s*peach[.!]?\b"

    # Check if the pattern is in the last N characters
    return bool(re.search(pattern, last_N_chars))


# this task is responsible for reading from the recorder queue and sending the data to the api
async def task_ws_sender(
    *,
    transcription_state: TranscriptionState,
    ws: websockets.WebSocketClientProtocol,
):
    try:
        while True:
            # Pause briefly to avoid blocking the event loop
            await asyncio.sleep(SLEEP_TIME)

            await transcription_state.update_event.wait()
            transcription = transcription_state.transcription
            transcription_state.update_event.clear()

            logging.info(f"New transcription: {transcription}")

            if ws.closed:
                logging.info("WebSocket is closed, stopping sender.")
                break

            if not HEY_PEACH_DETECTED_LOCK.locked() and check_hey_peach(transcription):
                logging.info("🍑 Hey Peach detected, locking...")
                await HEY_PEACH_DETECTED_LOCK.acquire()
                logging.info("Waiting for user to finish speaking...")

                await USER_ENDED_SPEAKING_EVENT.wait()
                logging.info("User finished speaking, getting latest transcription...")

                await transcription_state.update_event.wait()
                transcription = transcription_state.transcription
                transcription_state.update_event.clear()
                logging.info(f"Got transcription: {transcription}")

                logging.info("Handling locks...")
                await RECORDER_LOCK.acquire()
                USER_ENDED_SPEAKING_EVENT.clear()
                HEY_PEACH_DETECTED_LOCK.release()

                messages.append(
                    dict(
                        role="user",
                        content=transcription,
                    )
                )

                await ws.send(json.dumps({"messages": messages}))
    except websockets.exceptions.ConnectionClosed as e:
        logging.error(f"WebSocket connection closed unexpectedly: {e}")
    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}")
    finally:
        logging.info("Closed websocket sender")


async def task_ws_receiver(
    *, ws: websockets.WebSocketClientProtocol, transcription_state: TranscriptionState
):
    global messages
    stream = sd.OutputStream(samplerate=24000, channels=1, dtype="int16")
    stream.start()

    try:
        while True:
            await asyncio.sleep(SLEEP_TIME)

            if ws.closed:
                logging.info("WebSocket is closed, stopping receiver.")
                break

            data = await ws.recv()
            if isinstance(data, bytes):
                np_data = np.frombuffer(data, dtype=np.int16)
                stream.write(np_data)
            elif isinstance(data, str):
                try:
                    parsed_data = json.loads(data)
                    logging.info(
                        f"Data returned from websocket: {parsed_data}, type: {type(parsed_data)}"
                    )
                    messages.append(
                        dict(
                            role="assistant",
                            content=parsed_data.get("content"),
                        )
                    )
                    transcription_state.transcription = ""

                    if RECORDER_LOCK.locked():
                        RECORDER_LOCK.release()

                    if isinstance(parsed_data, dict):
                        tool_name = parsed_data.get("tool_name")
                        if tool_name == "generate_image":
                            db_update_state(
                                f"{UIState.IMAGE} {parsed_data.get('tool_res')}"
                            )
                        elif tool_name == "get_weather":
                            db_update_state(
                                f"get_weather {json.dumps(parsed_data.get('tool_res'))}"
                            )
                        elif tool_name == "would_you_rather":
                            db_update_state(
                                f"would_you_rather {json.dumps(parsed_data.get('tool_res'))}"
                            )
                    else:
                        logging.error(f"Unexpected data structure: {parsed_data}")
                except json.JSONDecodeError:
                    logging.error(f"Failed to parse JSON: {data}")
                except Exception as e:
                    logging.error(f"Error processing data: {e}")
            else:
                logging.error(f"Received unexpected data type: {type(data)}")
    except websockets.exceptions.ConnectionClosed:
        logging.info("WebSocket connection closed.")
    except Exception as e:
        logging.error(f"Unhandled error: {e}")
    finally:
        stream.stop()
        stream.close()
        logging.info("Closed websocket receiver")


async def task_ws_handler(*, transcription_state: TranscriptionState) -> None:
    ws = None

    try:
        logging.info("Creating API WebSocket connection...")
        ws_url = f"wss://{os.getenv('PEACH_API_URL').replace('https://', '')}/ws"
        ws = await websockets.connect(ws_url)
        logging.info("Created API WebSocket connection!")

        async with asyncio.TaskGroup() as tg:
            tg.create_task(
                task_ws_sender(ws=ws, transcription_state=transcription_state)
            )
            tg.create_task(
                task_ws_receiver(ws=ws, transcription_state=transcription_state)
            )
    except* Exception as exc:
        logging.error(f"An error occurred in the WebSocket handler: {exc}")
    finally:
        if ws:
            await ws.close()
            logging.info("Closing API websocket handler")


async def task_transcriber(
    *,
    audio_stream: AudioStream,
    transcription_state: TranscriptionState,
    asr: FasterWhisperASR,
):
    async for transcription in audio_transcriber(asr, audio_stream):
        transcription_state.transcription = transcription.text
        transcription_state.update_event.set()


async def start_recording() -> None:
    try:
        # set the initial state
        logging.info("Setting initial state")
        db_update_state(UIState.IDLING.value)
        logging.info("Initial state set")

        # created a shared state for the transcription
        transcription_state = TranscriptionState()

        # setup asr
        logging.info(f"Loading whisper model {WHISPER_MODEL}...")
        whisper = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
        logging.info("Loaded whisper model!")
        asr = FasterWhisperASR(
            whisper, vad_filter=True, vad_parameters=dict(min_silence_duration_ms=500)
        )
        # this stream holds the audio data to be transcribed
        audio_stream = AudioStream()

        logging.info("Starting tasks")

        # start the tasks
        async with asyncio.TaskGroup() as tg:
            tg.create_task(task_ws_handler(transcription_state=transcription_state))
            tg.create_task(task_record(recorder=recorder, audio_stream=audio_stream))
            tg.create_task(
                task_transcriber(
                    audio_stream=audio_stream,
                    transcription_state=transcription_state,
                    asr=asr,
                )
            )
    finally:
        logging.info("Shutting down audio processing")
        recorder.delete()


async def main() -> None:
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
