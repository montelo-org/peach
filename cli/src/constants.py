from enum import Enum

CORRECT_NUM_CHANNELS = 1
CORRECT_FRAME_LENGTH = 512
SLEEP_TIME = 0.01
SAMPLE_RATE = 16000
FRAME_DURATION_MS = 30
SAMPLES_PER_FRAME = int(SAMPLE_RATE * FRAME_DURATION_MS / 1000)
FRAME_SIZE_BYTES = SAMPLES_PER_FRAME * 2  # 2 bytes per sample for 16-bit audio
VAD_MODE = 1
CONSECUTIVE_SILENCE_THRESHOLD = 20

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
