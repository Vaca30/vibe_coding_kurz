# OpenAI

Examples of communicating with the OpenAI API.

## Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) package manager
- OpenAI API key from https://platform.openai.com/api-keys

## Setup

Copy `.env.example` to `.env` in the subfolder you want to run and fill in your API key:

```bash
cp .env.example <subfolder>/.env
```

## Examples

| Folder | Description |
|--------|-------------|
| `1_basics` | Chat Completion API, Responses API, HTTP calls |
| `1_basics_azure` | Azure OpenAI integration |
| `2_multimodal` | Image analysis with GPT-4o |
| `3_chat_history` | Conversation history management |
| `4_tools` | Function calling / tool use |
| `5_generate_image` | DALL-E image generation |
| `10_react_agent` | ReAct agent with multiple tools |

## Run

In each subfolder:

```bash
uv run main.py
```

Or manually:

```bash
uv venv
source .venv/bin/activate
uv sync
python main.py
```
