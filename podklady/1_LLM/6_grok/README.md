# Grok (X.AI)

Examples of communicating with the Grok API via OpenAI-compatible interface.

## Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) package manager
- Grok API key from https://console.x.ai/

## Setup

Copy `.env.example` to `.env` in the subfolder you want to run and fill in your API key:

```bash
cp .env.example <subfolder>/.env
```

## Examples

| Folder | Description |
|--------|-------------|
| `1_basics` | Chat completions, HTTP calls |
| `2_multimodal` | Image analysis |
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
