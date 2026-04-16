# 3_rag

This lesson implements a minimal Retrieval-Augmented Generation flow over a small local text corpus.

The example:

- reads a local text file
- splits it into simple chunks
- embeds the chunks with `OpenAIEmbeddings`
- stores them in `InMemoryVectorStore`
- retrieves relevant chunks for a question
- answers with the retrieved context

No external vector database setup is required.

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

- the retrieved local chunks
- the final answer grounded in that local context
