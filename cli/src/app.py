###########################################################################
# imports
###########################################################################
import asyncio
import ctypes
from io import BytesIO
import json
import multiprocessing
import os
import re
import time
from typing import List

import numpy as np
import requests
import sounddevice as sd
import websockets
from dotenv import load_dotenv
from halo import Halo
import pyaudio
from supabase import create_client, Client
import webrtcvad

from asr import FasterWhisperASR
from transcriber import LocalAgreement, needs_audio_after, prompt
from audio import Audio, AudioStream, audio_samples_from_file
from core import Transcription
from config import (
    SLEEP_TIME,
    SAMPLE_RATE,
    SAMPLES_PER_FRAME,
    FRAME_SIZE_BYTES,
    VAD_MODE,
    CONSECUTIVE_SILENCE_THRESHOLD,
    messages,
    UIState,
)
from custom_logger import logger


###########################################################################
# load env vars
###########################################################################
load_dotenv()


###########################################################################
# libs
###########################################################################
def find_supported_sample_rate(p, device_index) -> List[int]:
    info = p.get_device_info_by_index(device_index)
    rates = [8000, 16000, 32000, 44100, 48000]  # Common sample rates
    supported_rates = []
    for rate in rates:
        try:
            p.is_format_supported(
                rate,
                input_device=device_index,
                input_channels=info["maxInputChannels"],
                input_format=pyaudio.paInt16,
            )
            supported_rates.append(rate)
        except ValueError:
            continue
    return supported_rates


p = pyaudio.PyAudio()

for i in range(p.get_device_count()):
    dev = p.get_device_info_by_index(i)
    logger.debug(f"Device {i}: {dev['name']}, Channels: {dev['maxInputChannels']}")

input_device_index = int(os.getenv("SOUND_INPUT_DEVICE"))
sample_rate = find_supported_sample_rate(p, input_device_index)
logger.debug(f"Supported sample rates: {sample_rate}")

stream = p.open(
    format=pyaudio.paInt16,
    channels=1,
    rate=16000,
    input=True,
    frames_per_buffer=512,
    input_device_index=input_device_index,
)

supabase: Client = create_client(
    os.environ.get("SUPABASE_URL"),
    os.environ.get("SUPABASE_KEY"),
)


###########################################################################
# locks
###########################################################################
RECORDER_LOCK = asyncio.Lock()  # this lock determines when we need to record/not record
HEY_PEACH_DETECTED_LOCK = (
    asyncio.Lock()
)  # this lock determines when the user says "hey peach"
USER_ENDED_SPEAKING_EVENT = (
    asyncio.Event()
)  # this lock determines when the user is done speaking
LAST_AUDIO_PROCESSED_EVENT = asyncio.Event()


###########################################################################
# cli
###########################################################################


# this will update the record in the db, which then updates the frontend
def db_update_state(new_state: str) -> None:
    user_id = os.getenv("SUPABASE_ID")
    supabase.table("events").update({"state": new_state}).eq("id", user_id).execute()


# this task will record audio and put it in a queue to be shared between tasks
async def task_record(
    *,
    audio_queue: multiprocessing.Queue,
    stream: pyaudio.Stream,
    last_audio_timestamp: multiprocessing.Value,
) -> None:
    logger.info("Recording started, start speaking!")
    logger.info("after stream start")

    vad = webrtcvad.Vad(VAD_MODE)
    consecutive_silence_frames = 0
    audio_stream = AudioStream(audio_queue)

    chunk_buffer = np.array([], dtype=np.float32)

    while True:
        await asyncio.sleep(SLEEP_TIME)  # Small sleep to prevent busy-waiting

        if RECORDER_LOCK.locked():
            continue

        pcm = stream.read(SAMPLES_PER_FRAME, exception_on_overflow=False)
        if not pcm:
            continue

        pcm_array = np.frombuffer(pcm, dtype=np.int16)
        audio_samples = audio_samples_from_file(BytesIO(pcm_array.tobytes()))

        # Add samples to the chunk buffer
        chunk_buffer = np.append(chunk_buffer, audio_samples)

        # Check if we have collected 1 second of audio
        if len(chunk_buffer) >= SAMPLE_RATE:
            current_time = int(time.time())
            # Send the 1-second chunk to the audio queue
            audio_stream.extend(chunk_buffer[:SAMPLE_RATE], current_time)
            # Keep any remaining samples for the next chunk
            chunk_buffer = chunk_buffer[SAMPLE_RATE:]

        if HEY_PEACH_DETECTED_LOCK.locked() and not USER_ENDED_SPEAKING_EVENT.is_set():
            try:
                # Ensure we have exactly the right number of bytes
                if len(pcm) != FRAME_SIZE_BYTES:
                    logger.warning(
                        f"Unexpected frame size: {len(pcm)} bytes, expected {FRAME_SIZE_BYTES}"
                    )
                    continue

                is_speech = vad.is_speech(pcm, SAMPLE_RATE)

                if is_speech:
                    consecutive_silence_frames = 0
                else:
                    consecutive_silence_frames += 1

                if consecutive_silence_frames >= CONSECUTIVE_SILENCE_THRESHOLD:
                    logger.info(
                        f"🔇 User ended speaking, locking, last timestamp is {current_time}"
                    )
                    await RECORDER_LOCK.acquire()
                    USER_ENDED_SPEAKING_EVENT.set()
                    last_audio_timestamp.value = current_time

                    # Send any remaining audio in the buffer
                    if len(chunk_buffer) > 0:
                        audio_stream.extend(chunk_buffer, current_time)

            except Exception as e:
                logger.error(f"Error in VAD processing: {e}")
                logger.error(f"Frame size: {len(pcm)} bytes")
                logger.error(f"Frame content (first 10 bytes): {pcm[:10]}")
                continue  # Skip this frame and continue with the next one


def check_peach(transcription: str) -> bool:
    N = 100
    # Get the last N characters of the transcription
    last_N_chars = transcription[-N:].lower()

    # Define the regular expression pattern
    pattern = r"\bpeach[.!]?\b"

    # Check if the pattern is in the last N characters
    return bool(re.search(pattern, last_N_chars))


# this task is responsible for reading from the recorder queue and sending the data to the api
async def task_ws_sender(
    *,
    shared_transcription: multiprocessing.Value,
    ws: websockets.WebSocketClientProtocol,
    last_audio_timestamp: multiprocessing.Value,
):
    processed_transcription = ""

    try:
        while True:
            # Pause briefly to avoid blocking the event loop
            await asyncio.sleep(SLEEP_TIME)

            if ws.closed:
                logger.info("WebSocket is closed, stopping sender.")
                break

            if shared_transcription.value == "":
                continue

            diff_transcription = shared_transcription.value[
                len(processed_transcription) :
            ].strip()

            if check_peach(diff_transcription):
                logger.info("🍑 Hey Peach detected, locking...")
                await HEY_PEACH_DETECTED_LOCK.acquire()
                logger.info("Waiting for user to finish speaking...")

                await USER_ENDED_SPEAKING_EVENT.wait()
                logger.info(
                    "User finished speaking, waiting for latest transcription..."
                )

                # wait for the last audio processed event
                # this is a hack to wait for the transcription to finish
                # should make this event driven but i tried and failed big F
                await asyncio.sleep(0.8)

                logger.info(f"Latest transcription: {shared_transcription.value}")

                diff_transcription = shared_transcription.value[
                    len(processed_transcription) :
                ].strip()
                processed_transcription = shared_transcription.value

                logger.info(f"Diff transcription: {diff_transcription}")

                logger.info("Handling locks...")
                USER_ENDED_SPEAKING_EVENT.clear()
                HEY_PEACH_DETECTED_LOCK.release()
                LAST_AUDIO_PROCESSED_EVENT.clear()
                last_audio_timestamp.value = 0

                messages.append(
                    dict(
                        role="user",
                        content=diff_transcription,
                    )
                )

                await ws.send(json.dumps({"messages": messages}))
                db_update_state(UIState.PROCESSING.value)
    except websockets.exceptions.ConnectionClosed as e:
        logger.error(f"WebSocket connection closed unexpectedly: {e}")
    except Exception as e:
        logger.error(f"An unexpected error occurred: {e}")
    finally:
        logger.info("Closed websocket sender")


async def task_ws_receiver(*, ws: websockets.WebSocketClientProtocol):
    logger.info("Inside task ws receiver")
    global messages
    stream = sd.OutputStream(samplerate=24000, channels=1, dtype="int16")
    stream.start()

    try:
        while True:
            await asyncio.sleep(SLEEP_TIME)

            if ws.closed:
                logger.info("WebSocket is closed, stopping receiver.")
                break

            data = await ws.recv()
            if isinstance(data, bytes):
                np_data = np.frombuffer(data, dtype=np.int16)
                stream.write(np_data)
            elif isinstance(data, str):
                try:
                    parsed_data = json.loads(data)
                    logger.info(
                        f"Data returned from websocket: {parsed_data}, type: {type(parsed_data)}"
                    )

                    if parsed_data.get("event") == "no_intent_to_chat":
                        logger.info("User does not have intent to chat")
                        if RECORDER_LOCK.locked():
                            RECORDER_LOCK.release()
                        return

                    messages.append(
                        dict(
                            role="assistant",
                            content=parsed_data.get("content"),
                        )
                    )

                    # we sleep here to give the audio enough time to finish
                    # obv a hack but it works
                    await asyncio.sleep(0.8)

                    # release the recorder lock
                    if RECORDER_LOCK.locked():
                        RECORDER_LOCK.release()

                    if isinstance(parsed_data, dict):
                        tool_name = parsed_data.get("tool_name")
                        logger.info(f"Tool name: {tool_name}")
                        if tool_name == "generate_image":
                            logger.info(
                                f"Generating image: {parsed_data.get('tool_res')}"
                            )
                            db_update_state(
                                f"{UIState.IMAGE} {parsed_data.get('tool_res')}"
                            )
                        elif tool_name == "get_weather":
                            logger.info(
                                f"Getting weather: {json.dumps(parsed_data.get('tool_res'))}"
                            )
                            db_update_state(
                                f"get_weather {json.dumps(parsed_data.get('tool_res'))}"
                            )
                        elif tool_name == "would_you_rather":
                            logger.info(
                                f"Would you rather: {json.dumps(parsed_data.get('tool_res'))}"
                            )
                            db_update_state(
                                f"would_you_rather {json.dumps(parsed_data.get('tool_res'))}"
                            )
                        else:
                            db_update_state(UIState.IDLING.value)

                        should_continue_listening = parsed_data.get(
                            "should_continue_listening"
                        )
                        # if should_continue_listening:
                        #     await ws.send_json(dict(role="user", content=diff_transcription))
                    else:
                        logger.error(f"Unexpected data structure: {parsed_data}")
                except json.JSONDecodeError:
                    logger.error(f"Failed to parse JSON: {data}")
                except Exception as e:
                    logger.error(f"Error processing data: {e}")
            else:
                logger.error(f"Received unexpected data type: {type(data)}")
    except websockets.exceptions.ConnectionClosed:
        logger.info("WebSocket connection closed.")
    except Exception as e:
        logger.error(f"Unhandled error: {e}")
    finally:
        stream.stop()
        stream.close()
        logger.info("Closed websocket receiver")


async def task_ws_handler(
    *,
    shared_transcription: multiprocessing.Value,
    last_audio_timestamp: multiprocessing.Value,
) -> None:
    ws = None

    try:
        logger.info("Creating API WebSocket connection...")
        ws_url = f"wss://{os.getenv('PEACH_API_URL').replace('https://', '')}/ws"
        ws = await websockets.connect(ws_url)
        logger.info("Created API WebSocket connection!")

        async with asyncio.TaskGroup() as tg:
            tg.create_task(
                task_ws_sender(
                    ws=ws,
                    shared_transcription=shared_transcription,
                    last_audio_timestamp=last_audio_timestamp,
                )
            )
            tg.create_task(task_ws_receiver(ws=ws))
    except* Exception as exc:
        logger.error(f"An error occurred in the WebSocket handler: {exc}")
    finally:
        if ws:
            await ws.close()
            logger.info("Closing API websocket handler")


async def worker_transcription(
    audio_queue: multiprocessing.Queue,
    shared_transcription: multiprocessing.Value,
    last_audio_timestamp: multiprocessing.Value,
) -> None:
    logger.info("Inside worker transcription")
    asr = FasterWhisperASR(
        "tiny.en",
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500),
    )
    local_agreement = LocalAgreement()
    full_audio = Audio()
    confirmed = Transcription()

    while True:
        await asyncio.sleep(SLEEP_TIME)

        item = audio_queue.get()
        if item is None:
            continue

        timestamp, chunk = item

        full_audio.extend(chunk)
        audio = full_audio.after(needs_audio_after(confirmed))
        print(
            f"[worker_transcription] Transcribing audio: {audio.duration} seconds at {timestamp}"
        )

        transcription, _ = await asr.transcribe(audio, prompt(confirmed))
        print(
            f"[worker_transcription] Transcription: {transcription.text} at {timestamp}"
        )

        new_words = local_agreement.merge(confirmed, transcription)
        if len(new_words) > 0:
            confirmed.extend(new_words)
            shared_transcription.value = confirmed.text
            logger.info(
                f"Transcription: {confirmed.text} at {timestamp}, last audio timestamp: {last_audio_timestamp.value}"
            )
            last_audio_timestamp.value = int(timestamp)
            if timestamp >= last_audio_timestamp.value:
                logger.info(
                    "New transcription is newer than last audio timestamp, setting event"
                )
                LAST_AUDIO_PROCESSED_EVENT.set()


async def worker_core(
    audio_queue: multiprocessing.Queue,
    shared_transcription: multiprocessing.Value,
    last_audio_timestamp: multiprocessing.Value,
) -> None:
    logger.info("Inside worker core")
    async with asyncio.TaskGroup() as tg:
        tg.create_task(
            task_ws_handler(
                shared_transcription=shared_transcription,
                last_audio_timestamp=last_audio_timestamp,
            )
        )
        tg.create_task(
            task_record(
                audio_queue=audio_queue,
                stream=stream,
                last_audio_timestamp=last_audio_timestamp,
            )
        )


def run_async_worker(worker_func, *args):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(worker_func(*args))
    loop.close()


def setup() -> None:
    frame_length = stream._frames_per_buffer
    sample_rate = stream._rate
    correct_frame_length = 512
    correct_sample_rate = 16000

    if frame_length != correct_frame_length:
        logger.error(
            f"Frame length is {frame_length}, but should be {correct_frame_length}"
        )
        exit(1)
    else:
        logger.info(f"Correct frame length {frame_length}")

    if sample_rate != correct_sample_rate:
        logger.error(
            f"Sample rate is {sample_rate}, but should be {correct_sample_rate}"
        )
        exit(1)
    else:
        logger.info(f"Correct sample rate {sample_rate}")

    url = os.getenv("PEACH_API_URL")
    logger.info(f"Checking API at {url}")
    spinner = Halo(text="Loading", spinner="dots")
    spinner.start()
    res = requests.get(f"{url}/health")
    if res.status_code != 200:
        spinner.fail("API down, aborting")
        exit(1)
    spinner.succeed("API ok, starting main")
    spinner.stop()

    logger.info("✅ Setup complete\n\n")


def main() -> None:
    logger.info("🍑 Peach\n\n")

    # basic recording/api checks
    setup()

    # create shared variables among processes
    manager = multiprocessing.Manager()
    audio_queue = manager.Queue()
    shared_transcription = manager.Value(ctypes.c_wchar_p, "")
    last_audio_timestamp = manager.Value(ctypes.c_int, 0)

    # define the processes
    p_core = multiprocessing.Process(
        target=run_async_worker,
        args=(worker_core, audio_queue, shared_transcription, last_audio_timestamp),
    )
    p_transcription = multiprocessing.Process(
        target=run_async_worker,
        args=(
            worker_transcription,
            audio_queue,
            shared_transcription,
            last_audio_timestamp,
        ),
    )

    try:
        logger.info("🚀 Starting processes")
        p_core.start()
        p_transcription.start()

        # wait for the processes to finish
        p_core.join()
        p_transcription.join()
    except KeyboardInterrupt:
        logger.info("KeyboardInterrupt received, shutting down...")
        # Gracefully stop the stream
        stream.stop_stream()
        stream.close()
        # Terminate processes
        p_core.terminate()
        p_transcription.terminate()
        p_core.join()
        p_transcription.join()
        logger.info("Resources have been cleanly shutdown.")
    except Exception as e:
        logger.error(f"An unexpected error occurred: {e}")
    finally:
        logger.info("🏁 Done")


if __name__ == "__main__":
    main()
