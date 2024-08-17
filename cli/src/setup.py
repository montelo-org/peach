import os
from typing import Tuple
import requests

from pyaudio import PyAudio, Stream, paInt16
from halo import Halo
from custom_logger import logger
from constants import CORRECT_FRAME_LENGTH, SAMPLE_RATE
import constants


def _list_audio_devices(p: PyAudio):
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
def _get_stream() -> Tuple[Stream, PyAudio]:
    input_device_index = int(os.getenv("SOUND_INPUT_DEVICE"))

    # this is a stream that we only use for setup
    # another stream is created in worker_core that is used for recording
    p = PyAudio()
    _list_audio_devices(p)
    stream = p.open(
        format=paInt16,
        channels=constants.CORRECT_NUM_CHANNELS,
        rate=constants.MIC_SAMPLE_RATE,
        input=True,
        frames_per_buffer=constants.CORRECT_FRAME_LENGTH,
        input_device_index=input_device_index,
    )
    return stream, p


# logs all recording devices
def _log_devices(p: PyAudio) -> None:
    for i in range(p.get_device_count()):
        dev = p.get_device_info_by_index(i)
        logger.info(f"Device {i}: {dev['name']}, Channels: {dev['maxInputChannels']}")


# checks if the api is healthy
# which also spins up the container on modal (it's serverless)
def check_api_health() -> None:
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


# checks sample rate, frame length
def check_recording_params() -> Tuple[Stream, PyAudio]:
    p = None
    stream = None

    try:
        stream, p = _get_stream()

        _log_devices(p)

        frame_length = stream._frames_per_buffer
        sample_rate = stream._rate
        correct_sample_rate = constants.SAMPLE_RATE

        if frame_length != CORRECT_FRAME_LENGTH:
            logger.error(
                f"Frame length is {frame_length}, but should be {CORRECT_FRAME_LENGTH}"
            )
            exit(1)
        else:
            logger.info(f"Correct frame length {frame_length}")

        if SAMPLE_RATE != correct_sample_rate:
            logger.error(
                f"Sample rate is {sample_rate}, but should be {correct_sample_rate}"
            )
            exit(1)
        else:
            logger.info(f"Correct sample rate {sample_rate}")

        logger.info("✅ Setup complete\n")

        return stream, p
    except Exception as e:
        logger.error(f"Error during setup: {e}")
        if p and stream:
            p.close(stream)
            p.terminate()
        exit(1)
