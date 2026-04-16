# Anthropic

Examples of communicating with the Anthropic Claude API.

## Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) package manager
- Anthropic API key from https://console.anthropic.com/

## Setup

Copy `.env.example` to `.env` in the subfolder you want to run and fill in your API key:

```bash
cp .env.example <subfolder>/.env
```

## Examples

| Folder | Description |
|--------|-------------|
| `1_basics` | Messages API, HTTP calls |
| `2_multimodal` | Image analysis with Claude |
| `3_chat_history` | Conversation history management |
| `4_tools` | Tool use / function calling |
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
