import asyncio
import base64
import json
import time
from io import BytesIO
from typing import List

from fastapi import FastAPI, UploadFile, Form, Response
from fastapi.responses import JSONResponse
from modal import App, Image, asgi_app, Secret, gpu
from starlette.websockets import WebSocket, WebSocketState, WebSocketDisconnect

web_app = FastAPI()
app = App("peach-api")
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
    from pydub import AudioSegment
    import numpy as np
    from groq import Groq
    import os
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
    async def audio_receiver(ws: WebSocket, audio_stream: AudioStream) -> None:
        try:
            print("Inside audio_receiver")
            while True:
                message = await asyncio.wait_for(ws.receive(), timeout=max_no_data_seconds)
                if message is None or message.get('type') != 'websocket.receive':
                    print("Connection closed, no message received, or incorrect message type.")
                    return

                message_text = message.get('text')
                if not message_text:
                    print("No text in the message.")
                    continue

                # Parse the JSON text
                data = json.loads(message_text)
                audio_base64 = data['audio']
                bytes_ = base64.b64decode(audio_base64)
                print(f"Received {len(bytes_)} bytes of audio data")
                audio_samples = audio_samples_from_file(BytesIO(bytes_))
                audio_stream.extend(audio_samples)
                if audio_stream.duration - inactivity_window_seconds >= 0:
                    audio = audio_stream.after(
                        audio_stream.duration - inactivity_window_seconds
                    )
                    vad_opts = VadOptions(min_silence_duration_ms=500, speech_pad_ms=0)
                    # NOTE: This is a synchronous operation that runs every time new data is received.
                    # This shouldn't be an issue unless data is being received in tiny chunks or the user's machine is a potato.
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

    try:
        await ws.accept()
        transcribe_opts = {
            "vad_filter": True,
            "condition_on_previous_text": False,
        }
        whisper = WhisperModel(whisper_model, device="cuda")
        print("Loaded whisper model")
        asr = FasterWhisperASR(whisper, **transcribe_opts)
        print("Loaded asr model")
        audio_stream = AudioStream()
        print("Opened audio stream")
        async with asyncio.TaskGroup() as tg:
            print("Inside task group")
            tg.create_task(audio_receiver(ws, audio_stream))
            print("Created audio_receiver task")
            async for transcription in audio_transcriber(asr, audio_stream):
                print(f"Sending transcription: {transcription.text}")
                if ws.client_state == WebSocketState.DISCONNECTED:
                    break

                await ws.send_text(transcription.text)

    except Exception as e:
        print(f"Error: {e}")
    finally:
        await ws.close()


@web_app.post("/upload")
async def upload_audio(file: UploadFile, messages: List[str] = Form(...)):
    if not file.filename.endswith(".wav"):
        return JSONResponse(status_code=400, content={"message": "Invalid file format. Please upload a WAV file."})

    groq = Groq(api_key=os.getenv("GROQ_API_KEY"))
    ai_model = "llama3-70b-8192"
    elevenlabs = ElevenLabs(
        api_key=os.getenv("ELEVENLABS_API_KEY")
    )

    async def transcribe(file: UploadFile) -> str:
        start_time = time.time()

        audio_bytes = await file.read()
        audio = AudioSegment.from_file(BytesIO(audio_bytes))
        audio = audio.set_channels(1).set_frame_rate(16000)
        raw_data = audio.raw_data
        audio_np = np.frombuffer(raw_data, dtype=np.int16).astype(np.float32)
        audio_np /= np.iinfo(np.int16).max

        model = WhisperModel(whisper_model, device="cuda")
        segments, info = model.transcribe(audio_np, beam_size=5)
        transcription = ""
        for segment in segments:
            transcription += segment.text

        end_time = time.time()
        elapsed_time = (end_time - start_time) * 1000
        rounded_time = round(elapsed_time)
        print(f"transcribe - {rounded_time} ms")

        return transcription

    def ai(transcription: str):
        start_time = time.time()

        json_messages = json.loads(messages[0])
        combined_messages = json_messages + [dict(role="user", content=transcription)]
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

    def speech(ai_response):
        # url = "https://api.deepgram.com/v1/speak?model=aura-asteria-en"
        # deepgram_api_key = os.getenv("DEEPGRAM_API_KEY")
        # headers = {
        #     "Authorization": f"Token {deepgram_api_key}",
        #     "Content-Type": "application/json"
        # }
        # payload = {
        #     "text": ai_response
        # }
        # response = requests.post(url, headers=headers, json=payload)
        # res = response.content

        generator = elevenlabs.generate(
            text=ai_response,
            voice="Matilda",
            model="eleven_turbo_v2",
            stream=True,
        )

        return generator

    async def run():
        transcription = await transcribe(file)
        ai_response = ai(transcription)
        return ai_response

    try:
        return await run()
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": f"{str(e)}"})


@app.function(image=image, secrets=[Secret.from_name("peach-secrets")], gpu=gpu.A10G())
@asgi_app()
def fastapi_app():
    return web_app
