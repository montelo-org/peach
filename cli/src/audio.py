from __future__ import annotations

import asyncio
import multiprocessing
from typing import AsyncGenerator, BinaryIO, Tuple

import numpy as np
import soundfile as sf
from numpy.typing import NDArray

from config import SAMPLES_PER_SECOND


def audio_samples_from_file(file: BinaryIO) -> NDArray[np.float32]:
    audio_and_sample_rate = sf.read(
        file,
        format="RAW",
        channels=1,
        samplerate=SAMPLES_PER_SECOND,
        subtype="PCM_16",
        dtype="float32",
        endian="LITTLE",
    )
    audio = audio_and_sample_rate[0]
    return audio  # type: ignore


class Audio:
    def __init__(
        self,
        data: NDArray[np.float32] = np.array([], dtype=np.float32),
        start: float = 0.0,
    ) -> None:
        self.data = data
        self.start = start

    def __repr__(self) -> str:
        return f"Audio(start={self.start:.2f}, end={self.end:.2f})"

    @property
    def end(self) -> float:
        return self.start + self.duration

    @property
    def duration(self) -> float:
        return len(self.data) / SAMPLES_PER_SECOND

    def after(self, ts: float) -> Audio:
        assert ts <= self.duration
        return Audio(self.data[int(ts * SAMPLES_PER_SECOND) :], start=ts)

    def extend(self, data: NDArray[np.float32]) -> None:
        # logger.debug(f"Extending audio by {len(data) / SAMPLES_PER_SECOND:.2f}s")
        self.data = np.append(self.data, data)
        # logger.debug(f"Audio duration: {self.duration:.2f}s")


class AudioStream:
    def __init__(self, data_queue: multiprocessing.Queue):
        self.data_queue = data_queue
        self.closed = False

    def extend(self, data: NDArray[np.float32], timestamp: float) -> None:
        assert not self.closed
        self.data_queue.put((timestamp, data))

    def close(self) -> None:
        assert not self.closed
        self.closed = True
        self.data_queue.put(None)  # Sentinel value to signal end of stream

    async def chunks(
        self, min_duration: float
    ) -> AsyncGenerator[Tuple[float, NDArray[np.float32]], None]:
        buffer = np.array([], dtype=np.float32)
        last_timestamp = None
        while True:
            try:
                while not self.data_queue.empty():
                    timestamp, chunk = (
                        self.data_queue.get_nowait()
                    )  # Unpack timestamp and data
                    if chunk is None:  # Check for sentinel value
                        self.closed = True
                        break
                    last_timestamp = timestamp
                    buffer = np.append(buffer, chunk)
            except Exception:
                pass

            if len(buffer) / SAMPLES_PER_SECOND >= min_duration or self.closed:
                yield (last_timestamp, buffer)  # Yield both timestamp and buffer
                buffer = np.array([], dtype=np.float32)

            if self.closed and len(buffer) == 0:
                return

            if not self.closed:
                await asyncio.sleep(0.1)
