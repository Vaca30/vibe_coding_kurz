import json
import os
from openai import OpenAI
from dotenv import load_dotenv


MODEL = "gpt-4o-mini"


def calculate(operation: str, a: float, b: float) -> dict:
    operations = {
        "add": lambda x, y: x + y,
        "subtract": lambda x, y: x - y,
        "multiply": lambda x, y: x * y,
        "divide": lambda x, y: x / y,
    }

    if operation not in operations:
        return {
            "error": "Nepodporovaná operace.",
            "operation": operation,
            "a": a,
            "b": b,
        }

    if operation == "divide" and b == 0:
        return {
            "error": "Dělení nulou není povoleno.",
            "operation": operation,
            "a": a,
            "b": b,
        }

    result = operations[operation](a, b)
    return {"operation": operation, "a": a, "b": b, "result": result}


def main() -> None:
    load_dotenv()
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "Chybí OPENAI_API_KEY. Zkopírujte .env.example na .env a doplňte klíč."
        )

    client = OpenAI(api_key=api_key)

    tools = [
        {
            "type": "function",
            "function": {
                "name": "calculate",
                "description": "Provede základní matematickou operaci.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "operation": {
                            "type": "string",
                            "enum": ["add", "subtract", "multiply", "divide"],
                            "description": "Požadovaná matematická operace.",
                        },
                        "a": {
                            "type": "number",
                            "description": "První číslo.",
                        },
                        "b": {
                            "type": "number",
                            "description": "Druhé číslo.",
                        },
                    },
                    "required": ["operation", "a", "b"],
                },
            },
        }
    ]

    messages = [
        {
            "role": "developer",
            "content": (
                "Jsi asistent. Když potřebuješ matematický výpočet, "
                "zavolej nástroj calculate."
            ),
        },
        {
            "role": "user",
            "content": "Kolik je 23 * 7? Výpočet udělej pomocí nástroje calculate.",
        },
    ]

    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        tools=tools,
        tool_choice="auto",
    )

    response_message = response.choices[0].message
    print("--- První odpověď modelu ---")
    print(response_message)

    if not response_message.tool_calls:
        print("Model nespustil žádný nástroj.")
        print(response_message.content)
        return

    tool_call = response_message.tool_calls[0]
    function_args = json.loads(tool_call.function.arguments or "{}")
    tool_result = calculate(**function_args)

    messages.append(
        {
            "role": "assistant",
            "tool_calls": [
                {
                    "id": tool_call.id,
                    "type": "function",
                    "function": {
                        "name": tool_call.function.name,
                        "arguments": json.dumps(function_args),
                    },
                }
            ],
        }
    )
    messages.append(
        {
            "role": "tool",
            "tool_call_id": tool_call.id,
            "name": tool_call.function.name,
            "content": json.dumps(tool_result),
        }
    )

    final_response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
    )

    final_message = final_response.choices[0].message
    print("\n=== Finální odpověď ===")
    print(final_message.content)


if __name__ == "__main__":
    main()