import asyncio
import time
from typing import Iterable

from faster_whisper import transcribe, WhisperModel

from realtime_whisper.audio import Audio
from realtime_whisper.core import Transcription, Word
from custom_logger import logger


class FasterWhisperASR:
    def __init__(
        self,
        whisper_model: str,
        **kwargs,
    ) -> None:
        self.whisper = WhisperModel(whisper_model, device="cpu", compute_type="int8")
        self.transcribe_opts = kwargs

    def _transcribe(
        self,
        audio: Audio,
        prompt: str | None = None,
    ) -> tuple[Transcription, transcribe.TranscriptionInfo]:
        start = time.perf_counter()
        segments, transcription_info = self.whisper.transcribe(
            audio.data,
            initial_prompt=prompt,
            word_timestamps=True,
            **self.transcribe_opts,
        )
        words = words_from_whisper_segments(segments)
        for word in words:
            word.offset(audio.start)
        transcription = Transcription(words)
        end = time.perf_counter()
        logger.info(
            f"Transcribed {audio} in {end - start:.2f} seconds.\nTranscription: {transcription.text}"
        )
        return (transcription, transcription_info)

    async def transcribe(
        self,
        audio: Audio,
        prompt: str | None = None,
    ) -> tuple[Transcription, transcribe.TranscriptionInfo]:
        """Wrapper around _transcribe so it can be used in async context"""
        # is this the optimal way to execute a blocking call in an async context?
        # TODO: verify performance when running inference on a CPU
        return await asyncio.get_running_loop().run_in_executor(
            None,
            self._transcribe,
            audio,
            prompt,
        )


def words_from_whisper_segments(segments: Iterable[transcribe.Segment]) -> list[Word]:
    words: list[Word] = []
    for segment in segments:
        assert segment.words is not None
        words.extend(
            Word(
                start=word.start,
                end=word.end,
                text=word.word,
                probability=word.probability,
            )
            for word in segment.words
        )
    return words
