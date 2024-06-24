TOOLS_JSON = [
    {
        "type": "function",
        "function": {
            "name": "get_best_university",
            "description": "Gets the best university in the world.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Searches the web for an answer. Only use this for questions where you need to query the web to get an answer.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The query to make on the web. Be clear and verbose in what you want to search for. The more details, the more accurate the response.",
                    }
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_image",
            "description": "Use this function to generate an image if the user requests to create an image.",
            "parameters": {
                "type": "object",
                "properties": {
                    "prompt": {
                        "type": "string",
                        "description": "The prompt to generate the image. Take the user's prompt and expand on it. Try to formulate 2-3 sentences for best results. Don't say 'generate an image...', just describe the image you'd like to generate. you can be detailed! ",
                    }
                },
                "required": ["prompt"],
            },
        },
    },
]
