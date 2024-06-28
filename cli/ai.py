import json
import os
import sys

from dotenv import load_dotenv
from groq import Groq
from openai import OpenAI
from tavily import TavilyClient

from constants.model_config import MODEL, SYSTEM_MESSAGE, TOOL_MAP
from constants.tools_json import TOOLS_JSON
from utils import log_function_time

load_dotenv()

openai = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
groq = Groq(
    api_key=os.getenv("GROQ_API_KEY"),
)
tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

messages = [SYSTEM_MESSAGE]


def get_user_category(messages):
    completion = openai.chat.completions.create(
        model="gpt-4o",
        messages=messages,
    )
    return completion.choices[0].message.content


@log_function_time
def get_ai_response(transcription):
    global messages
    messages.append({"role": "user", "content": transcription})

    # category = get_user_category(messages)
    # print("category: ", category)

    try:
        # Initial completion
        completion = openai.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=TOOLS_JSON,
        )
        tool_calls = completion.choices[0].message.tool_calls

        if tool_calls:
            print("Tool call detected!")
            messages.append(completion.choices[0].message.to_dict())

            for tool_call in tool_calls:
                try:
                    function_name = tool_call.function.name
                    function_to_call = TOOL_MAP.get(function_name)

                    if not function_to_call:
                        raise ValueError(f"Unknown function: {function_name}")

                    function_args = json.loads(tool_call.function.arguments)
                    print(
                        f"Calling: {function_name} with args {tool_call.function.arguments}"
                    )

                    function_response = function_to_call(**function_args)
                    print(f"Function response: {function_response}")

                    messages.append(
                        {
                            "tool_call_id": tool_call.id,
                            "role": "tool",
                            "name": function_name,
                            "content": function_response,
                        }
                    )
                except json.JSONDecodeError:
                    print(
                        f"Error parsing function arguments: {tool_call.function.arguments}"
                    )
                except Exception as e:
                    print(f"Error calling function {function_name}: {str(e)}")

            # Second completion after tool calls
            try:
                second_response = groq.chat.completions.create(
                    model=MODEL,
                    messages=messages,
                )
                second_response_content = second_response.choices[0].message.content
                messages.append(
                    {"role": "assistant", "content": second_response_content}
                )
                return second_response_content
            except Exception as e:
                print(f"Error in second completion: {str(e)}")
                return "I apologize, but I encountered an error while processing your request."

        else:
            response = completion.choices[0].message.content
            messages.append({"role": "assistant", "content": response})
            return response

    except Exception as e:
        print(f"Error in get_ai_response: {str(e)}")
        return "I'm sorry, but an error occurred while processing your request."


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Please provide your input as a command line argument.")
        sys.exit(1)

    userInput = sys.argv[1]

    while True:
        response = get_ai_response(userInput)
        print(response)
        userInput = input("\nEnter your input: ")
