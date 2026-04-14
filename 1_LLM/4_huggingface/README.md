# Hugging Face

Examples of communicating with the Hugging Face Inference API.

## Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) package manager
- Hugging Face token from https://huggingface.co/settings/tokens

## Setup

Copy `.env.example` to `.env` in the subfolder you want to run and fill in your token:

```bash
cp .env.example <subfolder>/.env
```

## Examples

| Folder | Description |
|--------|-------------|
| `1_basics` | HF Hub client, OpenAI-compatible API, HTTP calls |
| `2_multimodal` | Vision models |
| `3_chat_history` | Conversation history management |
| `4_tools` | Function calling / tool use |
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
