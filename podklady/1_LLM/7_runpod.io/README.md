# RunPod.io

Examples of communicating with LLM models deployed on RunPod serverless GPU.

## Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) package manager
- A running RunPod endpoint (update the URL in `main.py`)

## Setup

No API key file needed. Update the RunPod proxy URL directly in the Python files to match your endpoint.

## Examples

| Folder | Description |
|--------|-------------|
| `1_basics` | Basic HTTP chat completions |
| `4_tools` | Function calling / tool use |

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
