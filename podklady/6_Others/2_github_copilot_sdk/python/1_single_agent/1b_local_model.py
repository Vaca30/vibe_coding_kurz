"""
1b — BYOK: point Copilot at a local model.

Concept
-------
Copilot SDK supports Bring-Your-Own-Key (BYOK) via a `provider` config on the
session. You give it a base URL + API key, and the SDK talks directly to that
provider instead of routing through Copilot's hosted endpoints.

This example points at a local Ollama server with its OpenAI-compatible API
(default port 11434). Start Ollama first:

    ollama serve
    ollama pull qwen3-coder

Run:
    python 1_single_agent/1b_local_model.py
"""

import asyncio

from copilot import CopilotClient
from copilot.session import PermissionHandler


async def main() -> None:
    client = CopilotClient()
    await client.start()

    session = await client.create_session(
        on_permission_request=PermissionHandler.approve_all,
        # Tell the session to talk to a local OpenAI-compatible server.
        provider={
            "type": "openai",
            "base_url": "http://localhost:11434/v1",
            "api_key": "ollama",  # any non-empty string works for local Ollama
        },
        # When using a custom provider you must specify the model explicitly,
        # because the CLI can't list models for you.
        model="qwen3-coder",
    )

    reply = await session.send_and_wait(
        "Tell me about Python in two sentences.",
        timeout=300.0,  # local models are slower than hosted ones
    )
    if reply is not None:
        print(reply.data.content)

    await session.disconnect()
    await client.stop()


if __name__ == "__main__":
    asyncio.run(main())
