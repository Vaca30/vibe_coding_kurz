# 6_langchain

One compact hour for LangChain v1 in Python.

LangChain is useful when you want a higher-level layer on top of raw model calls. It gives you standard interfaces for prompts, chat models, tools, retrieval, and agents, so you can wire LLM applications together with less glue code.

Use raw SDK calls when you only need a few direct requests and want minimal abstraction. Use LangChain when you want reusable prompt pipelines, consistent tool wiring, or a lightweight RAG and agent setup without building every integration detail yourself.

## Prerequisites

- Python 3.12 or newer
- `uv`
- `OPENAI_API_KEY`

## Quick Run

From a lesson folder:

```bash
uv sync
uv run main.py
```

Optional local virtual environment flow:

```bash
uv venv
.venv\Scripts\activate
uv sync
python main.py
```

## Lessons

- [1_basics](./1_basics/README.md): minimal chat model call and prompt-template-based invocation
- [2_tools_agents](./2_tools_agents/README.md): two local tools and one `create_agent` example
- [3_rag](./3_rag/README.md): lightweight local-text RAG with `OpenAIEmbeddings` and `InMemoryVectorStore`

## Note On LangGraph

For this first practical hour, LangChain is the higher-level starting point. LangGraph is the lower-level orchestration layer for more advanced agent workflows, and it is intentionally out of scope here.
