# Qwen3-Coder-Next on RunPod.io

## Model Overview

| Property | Value |
|----------|-------|
| **Model** | [Qwen/Qwen3-Coder-Next](https://huggingface.co/Qwen/Qwen3-Coder-Next) |
| **Architecture** | `qwen3_next` — hybrid attention + Mixture-of-Experts (MoE) |
| **Total params** | ~80B |
| **Active params** | ~3B (MoE — only a fraction of experts active per token) |
| **Context length** | 256K tokens |
| **License** | Apache 2.0 |
| **Use case** | AI coding agent (Claude Code custom model) |

---

## Quantization Options

| Variant | VRAM needed | HuggingFace repo | Notes |
|---------|-------------|-------------------|-------|
| **FP16 (full)** | ~160 GB | `Qwen/Qwen3-Coder-Next` | Multi-GPU only |
| **FP8** | ~80-85 GB | `Qwen/Qwen3-Coder-Next-FP8` | Official, needs A100/H100 80GB |
| **AWQ 4-bit** ⭐ | ~40-46 GB | `bullpoint/Qwen3-Coder-Next-AWQ-4bit` | Best price/perf, vLLM Marlin kernels |
| **GPTQ 4-bit** | ~40-46 GB | `btbtyler09/Qwen3-Coder-Next-GPTQ-4bit` | Limited support for qwen3_next arch |
| **GGUF Q4_K** | ~40-46 GB | `unsloth/Qwen3-Coder-Next-GGUF` | For llama.cpp, not ideal for vLLM |

**Recommendation: AWQ 4-bit** — best throughput with Marlin kernels in vLLM, fits on a single 48GB GPU.

---

## Inference Server: vLLM

**Why vLLM over others:**
- Most mature ecosystem, battle-tested in production
- First-class AWQ support with fast Marlin kernels (~741 tok/s)
- Native OpenAI-compatible API (works directly with Claude Code)
- Built-in tool/function calling support
- Prefix caching (great for agent workloads with repeated system prompts)
- TGI is in maintenance mode (Dec 2025); SGLang is faster raw but less mature

> You already have an SGLang template (`9cm6igvxvy`) for the FP8 variant (needs 2x H100).
> This proposal is a **much cheaper alternative** using 4-bit quantization on a single GPU.

---

## GPU Options (cheapest first)

| GPU | VRAM | On-Demand $/hr | Fits AWQ 4-bit? | Notes |
|-----|------|----------------|-----------------|-------|
| **RTX A6000** | 48 GB | **$0.33** | ✅ ~6-8 GB free for KV cache | Cheapest, limited context window |
| **A40** | 48 GB | **$0.35** | ✅ ~6-8 GB free for KV cache | Similar to A6000 |
| **L40S** | 48 GB | $0.79 | ✅ ~6-8 GB free for KV cache | Newer arch, faster |
| **A100 PCIe** | 80 GB | $1.19 | ✅ ~35 GB free for KV cache | Comfortable, full context |
| **A100 SXM** | 80 GB | $1.39 | ✅ ~35 GB free for KV cache | Fastest A100 variant |

### Recommendation

| Option | GPU | Cost | Max context | Best for |
|--------|-----|------|-------------|----------|
| **Budget** ⭐ | RTX A6000 (48 GB) | **$0.33/hr** | ~32K tokens | Short agent tasks, cost-sensitive |
| **Balanced** | A100 PCIe (80 GB) | **$1.19/hr** | ~128K+ tokens | Long context agent sessions |

> **Why 48GB works:** The MoE architecture activates only ~3B params per token, so KV cache is tiny compared to a dense 80B model. Going from 4K → 256K context costs only ~7 GB extra. On a 48GB GPU with ~6-8 GB free after model load, you can comfortably run ~32K context.

---

## Proposed RunPod Pod Template

### Option A: Budget — RTX A6000 (48 GB) — $0.33/hr

```
Name:               Qwen3-Coder-Next-vLLM-AWQ-4bit
Image:              vllm/vllm-openai:latest
Container Disk:     100 GB
Volume:             100 GB
Volume Mount:       /workspace
Ports:              8000/http
Start Jupyter:      true
Start SSH:          true

Environment Variables:
  HF_TOKEN:         <your-hf-token>

Docker Command / Override start command:
  python -m vllm.entrypoints.openai.api_server \
    --model bullpoint/Qwen3-Coder-Next-AWQ-4bit \
    --quantization awq_marlin \
    --max-model-len 32768 \
    --gpu-memory-utilization 0.92 \
    --max-num-seqs 4 \
    --enable-prefix-caching \
    --enable-auto-tool-choice \
    --tool-call-parser hermes \
    --host 0.0.0.0 \
    --port 8000

GPU:                1x RTX A6000 (48 GB)
Cost:               ~$0.33/hr on-demand
```

### Option B: Balanced — A100 (80 GB) — $1.19/hr

```
Name:               Qwen3-Coder-Next-vLLM-AWQ-4bit-A100
Image:              vllm/vllm-openai:latest
Container Disk:     100 GB
Volume:             100 GB
Volume Mount:       /workspace
Ports:              8000/http
Start Jupyter:      true
Start SSH:          true

Environment Variables:
  HF_TOKEN:         <your-hf-token>

Docker Command / Override start command:
  python -m vllm.entrypoints.openai.api_server \
    --model bullpoint/Qwen3-Coder-Next-AWQ-4bit \
    --quantization awq_marlin \
    --max-model-len 131072 \
    --gpu-memory-utilization 0.92 \
    --max-num-seqs 8 \
    --enable-prefix-caching \
    --enable-auto-tool-choice \
    --tool-call-parser hermes \
    --host 0.0.0.0 \
    --port 8000

GPU:                1x A100 PCIe (80 GB)
Cost:               ~$1.19/hr on-demand
```

---

## Key vLLM flags explained

| Flag | Purpose |
|------|---------|
| `--model bullpoint/Qwen3-Coder-Next-AWQ-4bit` | 4-bit AWQ quantized model (765K downloads, compressed-tensors format) |
| `--quantization awq_marlin` | Use fast Marlin kernels for AWQ inference |
| `--max-model-len 32768/131072` | Max context length (limited by available VRAM) |
| `--gpu-memory-utilization 0.92` | Use 92% of GPU memory (leave headroom for system) |
| `--max-num-seqs 4/8` | Max concurrent requests (lower = more memory per request) |
| `--enable-prefix-caching` | Cache repeated prefixes — great for agent system prompts |
| `--enable-auto-tool-choice` | Enable automatic tool/function calling |
| `--tool-call-parser hermes` | Tool call format parser (Hermes style, compatible with Qwen models) |

---

## Claude Code Configuration

Once the pod is running, configure Claude Code to use it:

```json
{
  "model": "bullpoint/Qwen3-Coder-Next-AWQ-4bit",
  "apiBaseUrl": "https://<pod-id>-8000.proxy.runpod.net/v1",
  "apiKey": "not-needed"
}
```

The vLLM server exposes an OpenAI-compatible API at `/v1/chat/completions`.

---

## Cost Comparison

| Setup | GPU | Quantization | Cost/hr | Context |
|-------|-----|-------------|---------|---------|
| This (Budget) | 1x RTX A6000 | AWQ 4-bit | **$0.33** | ~32K |
| This (Balanced) | 1x A100 80GB | AWQ 4-bit | **$1.19** | ~128K |
| Existing SGLang FP8 | 2x H100 | FP8 | **~$5.38** | 256K |

The AWQ 4-bit on a single A6000 is **16x cheaper** than the FP8 on 2x H100.
