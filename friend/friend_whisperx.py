import modal


model_size = "tiny.en"
whisper_args = dict(
    device="cuda",
    compute_type="int8",
    download_root="/root",
)
audio_file_name = "audio_15s.mp3"


def cache_model():
    import whisperx

    whisperx.load_model(model_size, **whisper_args)


image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.1.1-cudnn8-devel-ubuntu22.04",
        add_python="3.10",
        setup_dockerfile_commands=[
            "RUN apt update",
            "RUN DEBIAN_FRONTEND=noninteractive DEBCONF_NONINTERACTIVE_SEEN=true apt install software-properties-common -y",
            "RUN add-apt-repository ppa:deadsnakes/ppa",
        ],
    )
    .run_commands(
        [
            "apt install git -y",
            "apt install ffmpeg -y",
            "pip install git+https://github.com/m-bain/whisperx.git",
        ]
    )
    .copy_local_file("./audio.mp3", "/root/audio.mp3")
    .copy_local_file("./audio_half.mp3", "/root/audio_half.mp3")
    .copy_local_file("./audio_30s.mp3", "/root/audio_30s.mp3")
    .copy_local_file("./audio_15s.mp3", "/root/audio_15s.mp3")
    .run_function(
        cache_model, gpu=modal.gpu.A100(count=1, size="40GB"), force_build=True
    )
)
app = modal.App("friend", image=image)


@app.function(gpu=modal.gpu.A100(count=1, size="40GB"))
async def friend():
    import subprocess
    import whisperx
    import time
    import asyncio
    import threading

    def log_nvidia_smi():
        while True:
            output = subprocess.check_output(["nvidia-smi"], text=True)
            print("nvidia-smi output:")
            print(output)
            print("\n")
            time.sleep(0.5)

    # Start the nvidia-smi logging thread
    nvidia_thread = threading.Thread(target=log_nvidia_smi, daemon=True)
    nvidia_thread.start()

    model_load_start = time.time()
    model = whisperx.load_model(model_size, **whisper_args)
    model_load_end = time.time()
    model_load_time = round(model_load_end - model_load_start, 2)
    print(f"Model loading completed in {model_load_time} seconds.")

    audio_load_start = time.time()
    # Load only the half audio file
    audio = whisperx.load_audio(audio_file_name)
    audio_load_end = time.time()
    audio_load_time = round(audio_load_end - audio_load_start, 2)
    print(f"Audio loading completed in {audio_load_time} seconds.")

    transcription_start = time.time()
    result = await asyncio.to_thread(model.transcribe, audio, batch_size=16)

    print(result["segments"])
    transcription_end = time.time()
    transcription_time = round(transcription_end - transcription_start, 2)
    print(
        f"Transcription of {audio_file_name} completed in {transcription_time} seconds."
    )

    # Allow some time for the last nvidia-smi log to be printed
    await asyncio.sleep(1)


@app.local_entrypoint()
def main():
    friend.remote()
