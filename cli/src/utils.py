import asyncio
import os
import re
from typing import Tuple
from pyaudio import PyAudio, paInt16, Stream
import constants
from custom_logger import logger


# this function checks if the last N characters of the transcription contain the word "peach"
# used to detect when the user says "peach" to lock the conversation
def check_peach(transcription: str) -> bool:
    N = 100
    # Get the last N characters of the transcription
    last_N_chars = transcription[-N:].lower()

    # Define the regular expression pattern
    pattern = r"\bpeach[.!]?\b"

    # Check if the pattern is in the last N characters
    return bool(re.search(pattern, last_N_chars))


def list_audio_devices(p: PyAudio):
    info = p.get_host_api_info_by_index(0)
    num_devices = info.get("deviceCount")

    # List all audio devices
    for i in range(0, num_devices):
        device_info = p.get_device_info_by_index(i)
        if (
            device_info.get("maxInputChannels") > 0
        ):  # Check if the device is an input device
            logger.info(
                f"Device {i}: {device_info.get('name')}, Channels: {device_info.get('maxInputChannels')},   Default Sample Rate: {device_info.get('defaultSampleRate')} Hz"
            )


# function to get a stream and pyaudio instance
def get_stream() -> Tuple[Stream, PyAudio]:
    input_device_index = int(os.getenv("SOUND_INPUT_DEVICE"))

    # this is a stream that we only use for setup
    # another stream is created in worker_core that is used for recording
    p = PyAudio()
    list_audio_devices(p)
    stream = p.open(
        format=paInt16,
        channels=constants.CORRECT_NUM_CHANNELS,
        rate=constants.MIC_SAMPLE_RATE,
        input=True,
        frames_per_buffer=constants.CORRECT_FRAME_LENGTH,
        input_device_index=input_device_index,
    )
    return stream, p


# function to run a worker in an asyncio loop
def run_async_worker(worker_func, *args):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(worker_func(*args))
    loop.close()
