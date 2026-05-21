# Ollama

Examples of communicating with locally running Ollama models.

## Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) package manager
- [Ollama](https://ollama.com/) installed and running locally

## Setup

No API key needed. Pull the required models before running:

```bash
ollama pull mistral
ollama pull llama3.2-vision   # for multimodal examples
```

## Examples

| Folder | Description |
|--------|-------------|
| `0_embedding` | Embedding models |
| `1_basics` | Basic chat completions |
| `2_multimodal` | Vision models (llama3.2-vision) |
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
