from __future__ import annotations

import multiprocessing
from typing import BinaryIO

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
        self.data = np.append(self.data, data)


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
        self.data_queue.put(None)
