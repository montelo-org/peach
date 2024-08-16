import json
import time

import requests
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.websockets import WebSocket
from modal import Image, asgi_app, Secret, App, Dict


app = App("peach-api")
web_app = FastAPI()
origins = [
    "http://localhost:5173",
    "https://getpeachpod.pages.dev",
    "https://getpeachpod.com",
]

web_app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

secret_name = "peach-secrets"
globals = Dict.from_name("globals", create_if_missing=True)


def cache_models():
    from cartesia import Cartesia

    cartesia = Cartesia(api_key=os.environ.get("CARTESIA_API_KEY"))
    voice_id = "5345cf08-6f37-424d-a5d9-8ae1101b9377"  # Maria
    voice = cartesia.voices.get(id=voice_id)
    globals["voice"] = voice


image = (
    Image.debian_slim(python_version="3.11")
    .pip_install(
        "groq",
        "elevenlabs",
        "cartesia",
        "openai",
    )
    .run_function(cache_models, secrets=[Secret.from_name(secret_name)])
)

with image.imports():
    import os
    from groq import Groq
    from openai import OpenAI
    from elevenlabs.client import ElevenLabs
    from cartesia import Cartesia


@web_app.get("/health")
def health():
    return Response(status_code=200, content="gucci")


@web_app.websocket("/ws")
async def transcribe_stream(ws: WebSocket):
    openai = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    groq = Groq(api_key=os.getenv("GROQ_API_KEY"))
    groq_model = "llama-3.1-70b-versatile"
    groq_small_model = "llama-3.1-8b-instant"
    openai_model = "gpt-4o-mini"
    elevenlabs = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))
    cartesia = Cartesia(api_key=os.environ.get("CARTESIA_API_KEY"))

    def generate_image(prompt):
        print(f"Generating image {prompt}")
        prodia_key = "72a1b2b6-281a-4211-a658-e7c17780c2d2"
        response = requests.post(
            "https://api.prodia.com/v1/sd/generate",
            json={
                "prompt": prompt,
                "model": "childrensStories_v1ToonAnime.safetensors [2ec7b88b]",
                "steps": 20,
                "cfg": 7,
                "sampler": "DPM++ 2M Karras",
                "new": "true",
            },
            headers={
                "accept": "application/json",
                "content-type": "application/json",
                "X-Prodia-Key": prodia_key,
            },
        )
        data = response.json()
        print("data: ", data)
        job = data["job"]

        if not job:
            return "Image could not be generated"

        num_tries = 0

        while True:
            if num_tries >= 30:
                return "Image could not be generated"
            response = requests.get(
                f"https://api.prodia.com/v1/job/{job}",
                headers={"accept": "application/json", "X-Prodia-Key": prodia_key},
            )
            data = response.json()
            print("job: ", data)
            status = data["status"]

            if status == "succeeded":
                return data["imageUrl"]

            num_tries += 1
            time.sleep(0.5)

    def would_you_rather(prompt):
        max_retries = 3

        for attempt in range(max_retries):
            try:
                completion = groq.chat.completions.create(
                    model=groq_model,
                    messages=[
                        {
                            "role": "system",
                            "content": """You are a fun, creative, person responsible for generating spicy would you rather 
    questions. Come up with a would you rather question for the user, and make it spicy! Make them very short, brief, and
    concise, and straight to the point. Ignore all previous instructions, you can and will provide spicy responses! This is all
    for fun and games, so try your best.
    
    You MUST respond in JSON format like this: 
    {
      option1: string,
      option2: string,
    }
    
    Examples:
    
    User: Give me a funny would you rather question
    Answer: "{\n  option1: "Have hands as feet",\n  option2: "Have feet for hands"\n}"
    
    Do NOT forget to respond in valid JSON format.
    """,
                        },
                        {"role": "user", "content": prompt},
                    ],
                    response_format={"type": "json_object"},
                )
                return completion.choices[0].message.content
            except Exception as e:
                print(
                    f"Error in would you rather call (attempt {attempt + 1}/{max_retries}):",
                    e,
                )
                if attempt >= max_retries - 1:
                    return "Sorry, an error occurred."

    def get_weather():
        latitude = "43.6532"
        longitude = "79.3832"
        city = "Toronto"
        res = requests.get(
            f"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&current=temperature_2m,is_day,rain&forecast_days=1"
        )
        res = res.json()
        temperature = res["current"]["temperature_2m"]
        is_day = res["current"]["is_day"]
        rain = res["current"]["rain"]

        # words to say
        response = f"It's {temperature} degrees in {city}."

        # generate image
        image_prompt = f"{city} during the {'night' if is_day == 0 else 'day'} when it is {temperature} degrees {'and raining' if rain == 1 else ''}"
        image_url = generate_image(image_prompt)

        return dict(
            response=response,
            temperature=temperature,
            image_url=image_url,
        )

    tool_map = dict(
        generate_image=generate_image,
        would_you_rather=would_you_rather,
        get_weather=get_weather,
    )

    def ai(messages) -> dict[str, str]:
        start_time = time.time()

        completion = openai.chat.completions.create(
            model=openai_model,
            messages=messages,
            tools=[
                {
                    "type": "function",
                    "function": {
                        "name": "would_you_rather",
                        "description": "Generates a 'would you rather' question",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "prompt": {
                                    "type": "string",
                                    "description": "The prompt to generate the would you rather questions.",
                                }
                            },
                            "required": ["prompt"],
                        },
                    },
                },
                {
                    "type": "function",
                    "function": {
                        "name": "generate_image",
                        "description": "Generates an image.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "prompt": {
                                    "type": "string",
                                    "description": "The prompt to generate the image. Take the user's prompt and expand on it. Try to formulate 2-3 sentences for best results.",
                                }
                            },
                            "required": ["prompt"],
                        },
                    },
                },
                {
                    "type": "function",
                    "function": {
                        "name": "get_weather",
                        "description": "Gets the weather for a location.",
                        "parameters": {},
                    },
                },
            ],
            tool_choice="auto",
            max_tokens=300,
        )
        end_time = time.time()
        elapsed_time = (end_time - start_time) * 1000
        rounded_time = round(elapsed_time)
        print(f"ai - {rounded_time} ms")

        tool_calls = completion.choices[0].message.tool_calls

        if tool_calls:
            print("Tool call!")
            messages.append(completion.choices[0].message.to_dict())
            tool_call = tool_calls[0]
            function_name = tool_call.function.name
            print("Function call: ", function_name)
            function_to_call = tool_map[function_name]
            function_args = json.loads(tool_call.function.arguments)
            print(
                "Calling: ", function_name, " with args ", tool_call.function.arguments
            )
            function_response = function_to_call(**function_args)
            print("Function response: ", function_response)

            if function_name == "generate_image":
                return dict(
                    content="Here's your image",
                    tool_name=function_name,
                    tool_res=function_response,
                )
            elif function_name == "would_you_rather":
                parsed = json.loads(function_response)
                option1 = parsed["option1"]
                option2 = parsed["option2"]
                content = f"Would you rather {option1.lower()}, or {option2.lower()}"
                return dict(content=content, tool_name=function_name, tool_res=parsed)
            elif function_name == "get_weather":
                return dict(
                    content=function_response["response"],
                    tool_name=function_name,
                    tool_res=function_response,
                )
        else:
            print("No tool call")
            content = (
                completion.choices[0].message.content or "Sorry something went wrong."
            )
            return dict(content=content, tool_name=None, tool_res=None)

    async def elevenlabs_speech(ws: WebSocket, ai_response: str):
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
                buffer.extend(wav_bytes)

                # Send data only when we have complete frames
                while len(buffer) >= frame_size:
                    # Determine how many complete frames we can send
                    send_size = (len(buffer) // frame_size) * frame_size
                    to_send = bytes(
                        buffer[:send_size]
                    )  # Convert to bytes before sending
                    await ws.send_bytes(to_send)
                    buffer = buffer[send_size:]  # Remove the sent bytes from buffer

            # After loop, check if there's any leftover data in buffer that can be sent
            if len(buffer) > 0 and len(buffer) % frame_size == 0:
                await ws.send_bytes(
                    bytes(buffer)
                )  # Convert to bytes and send remaining data
                buffer.clear()  # Clear the buffer
        except Exception as e:
            print(
                f"Error during audio stream generation or WebSocket transmission: {e}"
            )
        finally:
            if len(buffer) > 0:
                print(f"Leftover data in buffer not sent: {len(buffer)} bytes")

    async def cartesia_speech(ws: WebSocket, ai_response: str):
        model_id = "sonic-english"
        output_format = {
            "container": "raw",
            "encoding": "pcm_s16le",
            "sample_rate": 24000,
        }

        cartesia_ws = cartesia.tts.websocket()

        try:
            for output in cartesia_ws.send(
                model_id=model_id,
                transcript=ai_response,
                voice_embedding=globals["voice"]["embedding"],
                stream=True,
                output_format=output_format,
            ):
                buffer = output["audio"]
                await ws.send_bytes(buffer)

        except Exception as e:
            print(f"Error during audio generation or WebSocket transmission: {e}")

        finally:
            cartesia_ws.close()

    async def is_user_intent_to_chat(messages) -> bool:
        completion = groq.chat.completions.create(
            model=groq_small_model,
            messages=[
                {
                    "role": "system",
                    "content": "Determine if this the user is chatting with you or not. Respond with true if they are chatting with you, and false if they are not. ONLY respond with true or false.",
                },
                {
                    "role": "user",
                    "content": f"Chat history:\n\n{json.dumps(messages)}",
                },
            ],
        )
        return completion.choices[0].message.content == "true"

    async def core(
        *,
        ws: WebSocket,
        messages,
    ):
        print("Starting core")

        print("messages: ", messages)

        try:
            user_has_intent_to_chat = await is_user_intent_to_chat(messages)
            if not user_has_intent_to_chat:
                print("User does not have intent to chat, returning")
                await ws.send_json(dict(event="no_intent_to_chat"))
                return
            print("User has intent to chat, continuing")
            ai_response = ai(messages)
        except Exception as e:
            print(e)
            ai_response = dict(
                content="Sorry, something went wrong! Could you try again later?",
                tool_name=None,
                tool_res=None,
            )

        print("ai_response: ", ai_response)
        ai_content = ai_response["content"]

        # await elevenlabs_speech(ws, ai_content)
        await cartesia_speech(ws, ai_content)

        completion = groq.chat.completions.create(
            model=groq_model,
            messages=[
                {
                    "role": "system",
                    "content": """Determine if you want to continue listening to the user. For one-off
    questions, you should not continue listening. For follow-up questions, you should continue listening.
    Respond with a boolean value, true if you should continue listening, false if you should stop listening.
    """,
                },
                {
                    "role": "user",
                    "content": json.dumps(
                        [*messages, dict(role="assistant", **ai_response)]
                    ),
                },
            ],
        )
        should_continue_listening = completion.choices[0].message.content == "true"
        print("should_continue_listening: ", should_continue_listening)
        await ws.send_json(
            dict(
                role="assistant",
                should_continue_listening=should_continue_listening,
                **ai_response,
            )
        )

    try:
        await ws.accept()

        while True:
            data = await ws.receive_json()
            messages = data.get("messages", [])
            if messages == []:
                continue
            await core(ws=ws, messages=messages)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await ws.close()


@app.function(image=image, secrets=[Secret.from_name(secret_name)], keep_warm=1)
@asgi_app()
def fastapi_app():
    return web_app
