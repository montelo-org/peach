import json
import time
from io import BytesIO
from typing import List

from fastapi import FastAPI, UploadFile, Form
from fastapi.responses import JSONResponse
from modal import App, Image, asgi_app, Secret, gpu

web_app = FastAPI()
app = App("peach-api")
whisper_model = "tiny.en"
whisper_compute_type = "int8_float16"


def download_models():
    from faster_whisper import WhisperModel

    WhisperModel(whisper_model, device="cuda", compute_type=whisper_compute_type)


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
    .pip_install("faster-whisper", "pydub", "groq", "elevenlabs")
    .run_function(download_models, gpu=gpu.A10G())
)

with image.imports():
    from pydub import AudioSegment
    import numpy as np
    from faster_whisper import WhisperModel
    from groq import Groq
    import os
    from elevenlabs.client import ElevenLabs


@web_app.get("/")
def health():
    return "gucci"


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

        model = WhisperModel(whisper_model, device="cuda", compute_type=whisper_compute_type)
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
