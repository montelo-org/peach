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


# function to run a worker in an asyncio loop
def run_async_worker(worker_func, *args):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(worker_func(*args))
    loop.close()
