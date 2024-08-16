import os
import requests

from pyaudio import PyAudio
from halo import Halo
from custom_logger import logger
from constants import CORRECT_FRAME_LENGTH, SAMPLE_RATE
from utils import get_stream


# logs all recording devices
def _log_devices(p: PyAudio) -> None:
    for i in range(p.get_device_count()):
        dev = p.get_device_info_by_index(i)
        logger.info(f"Device {i}: {dev['name']}, Channels: {dev['maxInputChannels']}")


# peforms basic recording/api checks
# checks sample rate, frame length, api health, etc.
def setup() -> None:
    p = None
    stream = None
    
    try:
        stream, p = get_stream()

        _log_devices(p)

        frame_length = stream._frames_per_buffer
        sample_rate = stream._rate
        correct_sample_rate = int(os.getenv("SAMPLE_RATE"))

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

        logger.info("✅ Setup complete\n")
    except Exception as e:
        logger.error(f"Error during setup: {e}")
        exit(1)
    finally:
        if p and stream:
            p.close(stream)
            p.terminate()
