# Providers (Self-Hosted)

Examples of running LLM models locally or on GPU cloud providers.

## Providers

| Folder | Description | Setup |
|--------|-------------|-------|
| `1_ollama` | Ollama local inference | Install Ollama, pull models |
| `2_lmstudio` | LM Studio local inference | Install LM Studio |
| `3_lama-server` | Llama.cpp server via Docker | `docker compose up` |
| `4_vllm` | vLLM GPU inference via Docker | `docker compose up` (requires GPU) |
| `5_sglang` | SGLang inference | See README in folder |
| `6_runpod-io` | RunPod.io serverless GPU | Deploy on RunPod |
| `7_vast-ai` | Vast.ai GPU rental | Deploy on Vast.ai |

## Run

Each subfolder has its own setup. See the README.md in each folder for details.

For Python examples:

```bash
uv run main.py
```

For Docker-based providers:

```bash
docker compose up
```
