# 2_tools_agents

This lesson shows how LangChain standardizes model, tool, and agent wiring.

You define regular Python tools, pass them into `create_agent`, and invoke the agent through a consistent message-based interface.

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

- tool messages generated during the agent run
- the final answer produced by the agent
