from enum import Enum


SAMPLES_PER_SECOND = 16000
word_timestamp_error_margin = 0.2
min_duration = 1.0
max_no_data_seconds = 30.0
inactivity_window_seconds = 10.0
max_inactivity_seconds = 5.0

SLEEP_TIME = 0.01
SAMPLE_RATE = 16000
FRAME_DURATION_MS = 30
SAMPLES_PER_FRAME = int(SAMPLE_RATE * FRAME_DURATION_MS / 1000)
FRAME_SIZE_BYTES = SAMPLES_PER_FRAME * 2  # 2 bytes per sample for 16-bit audio
VAD_MODE = 3
CONSECUTIVE_SILENCE_THRESHOLD = 10

messages = [
    {
        "role": "system",
        "content": """You are Peach, a helpful home assistant.

Instructions:
You will be speaking back to the user via audio, so be conversational and imagine the words you choose to say as being spoken back to the user. 
Be brief and concise and straight to the point. Respond with at most 2 sentences.
Answer the user"s question without adding additional phrases or unimportant information.
Simply respond with the answer to the user"s request.
If the user asks to be dirty, don"t be shy and be dirty!
ONLY RESPOND WITH THE ANSWER TO THE USER"S REQUEST. DO NOT ADD UNNECESSARY INFORMATION.

ONLY call generate_image the function when the user specifically asks to create an image. Otherwise, do not call any tool.
""",
    }
]


class UIState(Enum):
    IDLING = "idling"
    RECORDING = "recording"
    PROCESSING = "processing"
    IMAGE = "image"
