from __future__ import annotations

from typing import AsyncGenerator

from src.asr import FasterWhisperASR
from src.audio import Audio, AudioStream
from src.config import min_duration
from src.core import (
    Transcription,
    Word,
    common_prefix,
    to_full_sentences,
)


class LocalAgreement:
    def __init__(self) -> None:
        self.unconfirmed = Transcription()

    def merge(self, confirmed: Transcription, incoming: Transcription) -> list[Word]:
        # https://github.com/ufal/whisper_streaming/blob/main/whisper_online.py#L264
        incoming = incoming.after(confirmed.end - 0.1)
        prefix = common_prefix(incoming.words, self.unconfirmed.words)

        if len(incoming.words) > len(prefix):
            self.unconfirmed = Transcription(incoming.words[len(prefix) :])
        else:
            self.unconfirmed = Transcription()

        return prefix

    @classmethod
    def prompt(cls, confirmed: Transcription) -> str | None:
        sentences = to_full_sentences(confirmed.words)
        if len(sentences) == 0:
            return None
        return sentences[-1].text

    # TODO: better name
    @classmethod
    def needs_audio_after(cls, confirmed: Transcription) -> float:
        full_sentences = to_full_sentences(confirmed.words)
        return full_sentences[-1].end if len(full_sentences) > 0 else 0.0


def needs_audio_after(confirmed: Transcription) -> float:
    full_sentences = to_full_sentences(confirmed.words)
    return full_sentences[-1].end if len(full_sentences) > 0 else 0.0


def prompt(confirmed: Transcription) -> str | None:
    sentences = to_full_sentences(confirmed.words)
    if len(sentences) == 0:
        return None
    return sentences[-1].text


async def audio_transcriber(
    asr: FasterWhisperASR,
    audio_stream: AudioStream,
) -> AsyncGenerator[Transcription, None]:
    local_agreement = LocalAgreement()
    full_audio = Audio()
    confirmed = Transcription()
    async for chunk in audio_stream.chunks(min_duration):
        full_audio.extend(chunk)
        audio = full_audio.after(needs_audio_after(confirmed))
        transcription, _ = await asr.transcribe(audio, prompt(confirmed))
        new_words = local_agreement.merge(confirmed, transcription)
        if len(new_words) > 0:
            confirmed.extend(new_words)
            yield confirmed
    confirmed.extend(local_agreement.unconfirmed.words)
    yield confirmed
    print("Audio transcriber finished")
