# 1_basics

Minimal LangChain v1 usage in Python:

- direct `ChatOpenAI` invocation
- prompt-template-based invocation with `ChatPromptTemplate`

## Prerequisites

- Python 3.12 or newer
- `uv`
- `OPENAI_API_KEY`

## Setup

```bash
uv sync
```

## Run

```bash
uv run main.py
```

Optional local virtual environment flow:

```bash
uv venv
.venv\Scripts\activate
uv sync
python main.py
```

## What To Look For

The script prints:

- one direct model response
- one response produced through a prompt template pipeline
