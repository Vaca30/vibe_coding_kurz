"""
Ollama Demo — basic chat, streaming, and tool calls with qwen3.5:9b
"""

import json
import ollama

MODEL = "qwen3.5:9b"


# ── 1. Basic chat ────────────────────────────────────────────────────────────

def basic_chat():
    print("=" * 60)
    print("1) BASIC CHAT")
    print("=" * 60)

    response = ollama.chat(
        model=MODEL,
        messages=[{"role": "user", "content": "What is the capital of France? Answer in one sentence."}],
    )
    print(response.message.content)
    print()


# ── 2. Streaming chat ───────────────────────────────────────────────────────

def streaming_chat():
    print("=" * 60)
    print("2) STREAMING CHAT")
    print("=" * 60)

    stream = ollama.chat(
        model=MODEL,
        messages=[{"role": "user", "content": "Explain what a neural network is in 3 sentences."}],
        stream=True,
    )
    for chunk in stream:
        print(chunk.message.content, end="", flush=True)
    print("\n")


# ── 3. Tool calls ───────────────────────────────────────────────────────────

# Define the tools the model can call
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get the current weather for a given city",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "The city name, e.g. 'Prague'",
                    },
                    "unit": {
                        "type": "string",
                        "enum": ["celsius", "fahrenheit"],
                        "description": "Temperature unit",
                    },
                },
                "required": ["city"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate",
            "description": "Evaluate a mathematical expression",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "Math expression to evaluate, e.g. '2 + 2 * 3'",
                    },
                },
                "required": ["expression"],
            },
        },
    },
]


# Simulated tool implementations
def get_weather(city: str, unit: str = "celsius") -> dict:
    """Fake weather lookup."""
    fake_data = {
        "prague": {"temp": 18, "condition": "partly cloudy"},
        "new york": {"temp": 24, "condition": "sunny"},
        "tokyo": {"temp": 28, "condition": "humid"},
    }
    data = fake_data.get(city.lower(), {"temp": 20, "condition": "unknown"})
    if unit == "fahrenheit":
        data["temp"] = round(data["temp"] * 9 / 5 + 32)
    return {"city": city, "unit": unit, **data}


def calculate(expression: str) -> dict:
    """Safely evaluate a math expression."""
    try:
        result = eval(expression, {"__builtins__": {}})
        return {"expression": expression, "result": result}
    except Exception as e:
        return {"expression": expression, "error": str(e)}


TOOL_DISPATCH = {
    "get_weather": get_weather,
    "calculate": calculate,
}


def tool_calls_demo():
    print("=" * 60)
    print("3) TOOL CALLS")
    print("=" * 60)

    messages = [
        {
            "role": "user",
            "content": "What is the weather in Prague and what is 42 * 17?",
        }
    ]

    print(f"User: {messages[0]['content']}")
    print()

    # Step 1 — let the model decide which tools to call
    response = ollama.chat(model=MODEL, messages=messages, tools=TOOLS)

    # If the model made tool calls, execute them
    if response.message.tool_calls:
        # Add assistant message with tool calls to history
        messages.append(response.message)

        for tool_call in response.message.tool_calls:
            fn_name = tool_call.function.name
            fn_args = tool_call.function.arguments

            print(f"  -> Tool call: {fn_name}({json.dumps(fn_args)})")

            # Execute the tool
            fn = TOOL_DISPATCH.get(fn_name)
            if fn:
                result = fn(**fn_args)
            else:
                result = {"error": f"Unknown tool: {fn_name}"}

            print(f"  <- Result:    {json.dumps(result)}")

            # Feed the tool result back to the model
            messages.append({"role": "tool", "content": json.dumps(result)})

        print()

        # Step 2 — let the model produce a final answer using the tool results
        final_response = ollama.chat(model=MODEL, messages=messages, tools=TOOLS)
        print(f"Assistant: {final_response.message.content}")
    else:
        # No tool calls — model answered directly
        print(f"Assistant: {response.message.content}")

    print()


# ── Run all demos ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    basic_chat()
    streaming_chat()
    tool_calls_demo()
