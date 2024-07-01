import asyncio
import base64
import time
from enum import Enum
from io import BytesIO

from fastapi import FastAPI, Response
from modal import Image, asgi_app, Secret, gpu
from starlette.websockets import WebSocket, WebSocketDisconnect

from src.common import app

web_app = FastAPI()
whisper_model = "tiny.en"


def download_models():
    from faster_whisper import WhisperModel

    WhisperModel(whisper_model, device="cuda")


image = (
    Image
    .from_registry(
        "nvidia/cuda:12.1.1-cudnn8-devel-ubuntu22.04", add_python="3.11", setup_dockerfile_commands=[
            "RUN apt update",
            "RUN DEBIAN_FRONTEND=noninteractive DEBCONF_NONINTERACTIVE_SEEN=true apt install software-properties-common -y",
            "RUN add-apt-repository ppa:deadsnakes/ppa",
            "RUN apt install python3.11 python3-pip -y",
            "RUN apt install python-is-python3 -y",
        ],
    )
    .apt_install("ffmpeg")
    .pip_install("faster-whisper", "pydub", "groq", "elevenlabs", "soundfile")
    .run_function(download_models, gpu=gpu.A10G())
)

with image.imports():
    import os
    from groq import Groq
    from elevenlabs.client import ElevenLabs
    from faster_whisper import WhisperModel
    from faster_whisper.vad import VadOptions, get_speech_timestamps
    from src.asr import FasterWhisperASR
    from src.audio import AudioStream, audio_samples_from_file
    from src.transcriber import audio_transcriber
    from src.config import max_no_data_seconds, inactivity_window_seconds, SAMPLES_PER_SECOND, max_inactivity_seconds


@web_app.get("/health")
def health():
    return Response(status_code=200, content="gucci")


@web_app.websocket("/ws")
async def transcribe_stream(ws: WebSocket):
    class WsEvent(Enum):
        AUDIO_UPDATE = "AUDIO_UPDATE"
        AUDIO_END = "AUDIO_END"
        SEND_MESSAGES = "SEND_MESSAGES"

    groq = Groq(api_key=os.getenv("GROQ_API_KEY"))
    ai_model = "llama3-70b-8192"
    elevenlabs = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

    async def audio_receiver(ws: WebSocket, audio_stream: AudioStream) -> None:
        try:
            while True:
                data = await asyncio.wait_for(ws.receive_json(), timeout=max_no_data_seconds)
                event = data["event"]

                if event == WsEvent.AUDIO_END.value:
                    break

                audio_base64 = data["audio"]

                bytes_ = base64.b64decode(audio_base64)
                audio_samples = audio_samples_from_file(BytesIO(bytes_))
                audio_stream.extend(audio_samples)
                if audio_stream.duration - inactivity_window_seconds >= 0:
                    audio = audio_stream.after(
                        audio_stream.duration - inactivity_window_seconds
                    )
                    vad_opts = VadOptions(min_silence_duration_ms=500, speech_pad_ms=0)
                    # NOTE: This is a synchronous operation that runs every time new data is received.
                    # This shouldn"t be an issue unless data is being received in tiny chunks or the user"s machine is a potato.
                    timestamps = get_speech_timestamps(audio.data, vad_opts)
                    if len(timestamps) == 0:
                        print(f"No speech detected in the last {inactivity_window_seconds} seconds.")
                        break
                    elif (
                            # last speech end time
                            inactivity_window_seconds
                            - timestamps[-1]["end"] / SAMPLES_PER_SECOND
                            >= max_inactivity_seconds
                    ):
                        print(
                            f"Not enough speech in the last {inactivity_window_seconds} seconds."
                        )
                        break
        except asyncio.TimeoutError:
            print(
                f"No data received in {max_no_data_seconds} seconds. Closing the connection."
            )
        except WebSocketDisconnect as e:
            print(f"Client disconnected: {e}")
        except Exception as e:
            print("Error in audio_receiver: ", e)
        audio_stream.close()

    def ai(transcription: str, messages):
        start_time = time.time()

        combined_messages = messages + [dict(role="user", content=transcription)]
        completion = groq.chat.completions.create(
            model=ai_model,
            messages=combined_messages,
        )
        content = completion.choices[0].message.content

        end_time = time.time()
        elapsed_time = (end_time - start_time) * 1000
        rounded_time = round(elapsed_time)
        print(f"ai - {rounded_time} ms")

        return content

    async def speech(ws: WebSocket, ai_response: str):
        generator = elevenlabs.generate(
            text=ai_response,
            voice="Matilda",
            model="eleven_turbo_v2",
            output_format="pcm_24000",
            optimize_streaming_latency=3,
            stream=True,
        )

        buffer = bytearray()
        frame_size = 2  # Since using int16, each frame should be 2 bytes

        try:
            for wav_bytes in generator:
                print(f"Received audio data chunk of size {len(wav_bytes)} bytes")
                buffer.extend(wav_bytes)

                # Send data only when we have complete frames
                while len(buffer) >= frame_size:
                    # Determine how many complete frames we can send
                    send_size = (len(buffer) // frame_size) * frame_size
                    to_send = bytes(buffer[:send_size])  # Convert to bytes before sending
                    await ws.send_bytes(to_send)
                    buffer = buffer[send_size:]  # Remove the sent bytes from buffer

            # After loop, check if there's any leftover data in buffer that can be sent
            if len(buffer) > 0 and len(buffer) % frame_size == 0:
                await ws.send_bytes(bytes(buffer))  # Convert to bytes and send remaining data
                buffer.clear()  # Clear the buffer
        except Exception as e:
            print(f"Error during audio stream generation or WebSocket transmission: {e}")
        finally:
            if len(buffer) > 0:
                print(f"Leftover data in buffer not sent: {len(buffer)} bytes")

    try:
        await ws.accept()

        whisper = WhisperModel(whisper_model, device="cuda")
        transcribe_opts = {
            "vad_filter": True,
            "condition_on_previous_text": False,
        }
        asr = FasterWhisperASR(whisper, **transcribe_opts)

        audio_stream = AudioStream()
        full_transcription = ""

        async with asyncio.TaskGroup() as tg:
            tg.create_task(audio_receiver(ws, audio_stream))
            async for transcription in audio_transcriber(asr, audio_stream):
                print(f"Transcription: {transcription.text}")
                full_transcription = transcription.text

        print("Final transcription: ", full_transcription)
        messages = None

        while True:
            message = await asyncio.wait_for(ws.receive_json(), timeout=3)
            if message["event"] != WsEvent.SEND_MESSAGES.value:
                continue

            messages = message["messages"]
            break

        ai_response = ai(full_transcription, messages)
        print("ai_response: ", ai_response)

        await speech(ws, ai_response)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await ws.close()


@app.function(image=image, secrets=[Secret.from_name("peach-secrets")], gpu=gpu.A10G())
@asgi_app()
def fastapi_app():
    return web_app
