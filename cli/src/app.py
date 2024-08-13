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
vad = webrtcvad.Vad(0)  # Create VAD with aggressiveness level 0


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
VAD_WINDOW_SIZE = 50  # Number of frames to consider
SILENCE_RATIO_THRESHOLD = 0.7  # 70% of frames in window must be silent

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
    processed_transcription: str = ""
    full_transcription: str = ""
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
    logging.info("Recording started, start speaking!")
    recorder.start()

    silence_window = []
    silence_threshold = None
    total_samples = 0
    SILENCE_CALIBRATION_TIME = 0.5  # Time in seconds to calibrate silence
    silence_calibration_samples = int(SILENCE_CALIBRATION_TIME * FRAME_RATE)
    SILENCE_WINDOW_SIZE = int(FRAME_RATE * SILENCE_CALIBRATION_TIME)

    while True:
        await asyncio.sleep(SLEEP_TIME)

        if RECORDER_LOCK.locked():
            continue

        pcm = recorder.read()
        if not pcm:
            continue

        pcm_array = np.array(pcm, dtype=np.int16)
        audio_samples = audio_samples_from_file(BytesIO(pcm_array.tobytes()))
        audio_stream.extend(audio_samples)

        if HEY_PEACH_DETECTED_LOCK.locked() and not USER_ENDED_SPEAKING_EVENT.is_set():
            volume = np.sqrt(np.mean(np.square(pcm_array.astype(np.float32))))
            logging.info(f"Volume: {volume:.2f}")

            if silence_threshold is None:
                # Calibration phase
                total_samples += len(pcm_array)
                silence_window.extend(pcm_array)

                if total_samples >= silence_calibration_samples:
                    silence_threshold = (
                        np.sqrt(
                            np.mean(
                                np.square(
                                    np.array(
                                        silence_window[:silence_calibration_samples]
                                    ).astype(np.float32)
                                )
                            )
                        )
                        * 1.1
                    )
                    logging.info(f"Silence threshold calibrated: {silence_threshold}")
                    silence_window = silence_window[
                        -SILENCE_WINDOW_SIZE:
                    ]  # Keep only the last SILENCE_WINDOW_SIZE samples
            else:
                # Post-calibration phase
                silence_window.extend(pcm_array)
                if len(silence_window) > SILENCE_WINDOW_SIZE:
                    silence_window = silence_window[-SILENCE_WINDOW_SIZE:]

                window_volume = np.sqrt(
                    np.mean(np.square(np.array(silence_window).astype(np.float32)))
                )
                is_silent = window_volume < silence_threshold

                silence_ratio = 1.0 if is_silent else 0.0
                logging.info(f"Silence ratio: {silence_ratio:.2f}")

                if silence_ratio >= SILENCE_RATIO_THRESHOLD:
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
            transcription_state.update_event.clear()

            diff_transcription = transcription_state.full_transcription[
                len(transcription_state.processed_transcription) :
            ].strip()

            logging.info(f"Diff transcription: {diff_transcription}")

            if ws.closed:
                logging.info("WebSocket is closed, stopping sender.")
                break

            if not HEY_PEACH_DETECTED_LOCK.locked() and check_hey_peach(
                diff_transcription
            ):
                logging.info("🍑 Hey Peach detected, locking...")
                await HEY_PEACH_DETECTED_LOCK.acquire()
                logging.info("Waiting for user to finish speaking...")

                await USER_ENDED_SPEAKING_EVENT.wait()
                logging.info("User finished speaking, getting latest transcription...")

                await transcription_state.update_event.wait()
                diff_transcription = transcription_state.full_transcription[
                    len(transcription_state.processed_transcription) :
                ].strip()
                transcription_state.update_event.clear()
                logging.info(f"Got transcription: {diff_transcription}")
                transcription_state.processed_transcription = (
                    transcription_state.full_transcription
                )

                logging.info("Handling locks...")
                await RECORDER_LOCK.acquire()
                USER_ENDED_SPEAKING_EVENT.clear()
                HEY_PEACH_DETECTED_LOCK.release()

                messages.append(
                    dict(
                        role="user",
                        content=diff_transcription,
                    )
                )

                await ws.send(json.dumps({"messages": messages}))
                db_update_state(UIState.PROCESSING.value)
    except websockets.exceptions.ConnectionClosed as e:
        logging.error(f"WebSocket connection closed unexpectedly: {e}")
    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}")
    finally:
        logging.info("Closed websocket sender")


async def task_ws_receiver(*, ws: websockets.WebSocketClientProtocol):
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

                    # we sleep here to give the audio enough time to finish
                    # obv a hack but it works
                    await asyncio.sleep(1)

                    # release the recorder lock
                    if RECORDER_LOCK.locked():
                        RECORDER_LOCK.release()

                    if isinstance(parsed_data, dict):
                        tool_name = parsed_data.get("tool_name")
                        logging.info(f"Tool name: {tool_name}")
                        if tool_name == "generate_image":
                            logging.info(
                                f"Generating image: {parsed_data.get('tool_res')}"
                            )
                            db_update_state(
                                f"{UIState.IMAGE} {parsed_data.get('tool_res')}"
                            )
                        elif tool_name == "get_weather":
                            logging.info(
                                f"Getting weather: {json.dumps(parsed_data.get('tool_res'))}"
                            )
                            db_update_state(
                                f"get_weather {json.dumps(parsed_data.get('tool_res'))}"
                            )
                        elif tool_name == "would_you_rather":
                            logging.info(
                                f"Would you rather: {json.dumps(parsed_data.get('tool_res'))}"
                            )
                            db_update_state(
                                f"would_you_rather {json.dumps(parsed_data.get('tool_res'))}"
                            )
                        else:
                            db_update_state(UIState.IDLING.value)
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
            tg.create_task(task_ws_receiver(ws=ws))
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
        logging.info(f"Just transcribed: {transcription.text}")
        transcription_state.full_transcription = transcription.text
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
        asr = FasterWhisperASR(
            WHISPER_MODEL,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500),
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
