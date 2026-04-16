# Project 10 = Custom models 

### LMStudio (Local)
Need to enable Local Server in UI !!!

**Qwen 3.5 9B (Quantized)**

Does not work properly, tool calls are problem.

```json
"env": {
    "ANTHROPIC_BASE_URL": "http://localhost:1234",
    "ANTHROPIC_API_KEY": "",
    "ANTHROPIC_AUTH_TOKEN": "",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "qwen/qwen3.5-9b",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "qwen/qwen3.5-9b",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "qwen/qwen3.5-9b",
    "CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS": "1",
    "CLAUDE_CODE_ATTRIBUTION_HEADER": "0"
  }
```


**GPT-OSS-20B (Quantized)**

Does not work properly, tool calls are problem.

```json
"env": {
    "ANTHROPIC_BASE_URL": "http://localhost:1234",
    "ANTHROPIC_API_KEY": "",
    "ANTHROPIC_AUTH_TOKEN": "",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "openai/gpt-oss-20b",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "openai/gpt-oss-20b",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "openai/gpt-oss-20b",
    "CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS": "1",
    "CLAUDE_CODE_ATTRIBUTION_HEADER": "0"
  }
```


## Runpod - vLLM

### GPT-OSS 120B

Does not work properly, tool calls are problem.

```json
"env": {
    "ANTHROPIC_BASE_URL": "https://j8cjcikq0yeeyc-8000.proxy.runpod.net",
    "ANTHROPIC_API_KEY": "",
    "ANTHROPIC_AUTH_TOKEN": "",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "openai/gpt-oss-120b",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "openai/gpt-oss-120b",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "openai/gpt-oss-120b",
    "CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS": "1",
    "CLAUDE_CODE_ATTRIBUTION_HEADER": "0"
  }
```

### Qwen 3.5 35B

Does not work properly, tool calls are problem.

```json
"env": {
    "ANTHROPIC_BASE_URL": "https://v4thm4unvhcgjq-8000.proxy.runpod.net",
    "ANTHROPIC_API_KEY": "",
    "ANTHROPIC_AUTH_TOKEN": "",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "Qwen/Qwen3.5-35B-A3B-GPTQ-Int4",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "Qwen/Qwen3.5-35B-A3B-GPTQ-Int4",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "Qwen/Qwen3.5-35B-A3B-GPTQ-Int4",
    "CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS": "1",
    "CLAUDE_CODE_ATTRIBUTION_HEADER": "0"
  }
```





# THE BEST - LiteLLM + Local (vLLM)

Qwen 3.5 - 9B

Works, with mistakes, but main painpoint is limited context size.

```json
"env": {
    "ANTHROPIC_BASE_URL": "http://localhost:4000",
    "ANTHROPIC_API_KEY": "sk-Y1H-Ak3g_slhJ4B4Qv5rdQ",
    "ANTHROPIC_AUTH_TOKEN": "sk-Y1H-Ak3g_slhJ4B4Qv5rdQ",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "local-qwen3.5-9b",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "local-qwen3.5-9b",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "local-qwen3.5-9b",
    "CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS": "1",
    "CLAUDE_CODE_ATTRIBUTION_HEADER": "0"
  }
```



# THE BEST - LiteLLM + LMStudio

GPT-OSS-20B (Quantized)

Works, with mistakes, but main painpoint is limited context size.

```json
"env": {
    "ANTHROPIC_BASE_URL": "http://localhost:4000",
    "ANTHROPIC_API_KEY": "sk-Y1H-Ak3g_slhJ4B4Qv5rdQ",
    "ANTHROPIC_AUTH_TOKEN": "sk-Y1H-Ak3g_slhJ4B4Qv5rdQ",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "lms-gpt-oss-20b",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "lms-gpt-oss-20b",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "lms-gpt-oss-20b",
    "CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS": "1",
    "CLAUDE_CODE_ATTRIBUTION_HEADER": "0"
  }
```

Qwen 3.5 - 9B

Works, with mistakes, but main painpoint is limited context size.

```json
"env": {
    "ANTHROPIC_BASE_URL": "http://localhost:4000",
    "ANTHROPIC_API_KEY": "sk-Y1H-Ak3g_slhJ4B4Qv5rdQ",
    "ANTHROPIC_AUTH_TOKEN": "sk-Y1H-Ak3g_slhJ4B4Qv5rdQ",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "lms-qwen3.5-9b",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "lms-qwen3.5-9b",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "lms-qwen3.5-9b",
    "CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS": "1",
    "CLAUDE_CODE_ATTRIBUTION_HEADER": "0"
  }
```


# THE BEST - LiteLLM + RunPod.io (vLLM)

Qwen 3.5 35B (Quantized)
https://console.runpod.io/deploy?template=bj6wpgkit1&ref=59ep3odb

Works, not perfect though.

Run on A100 80GB PCIe - 1.3$/hr

```json
"env": {
    "ANTHROPIC_BASE_URL": "http://localhost:4000",
    "ANTHROPIC_API_KEY": "sk-Y1H-Ak3g_slhJ4B4Qv5rdQ",
    "ANTHROPIC_AUTH_TOKEN": "sk-Y1H-Ak3g_slhJ4B4Qv5rdQ",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "claude-sonnet-4-20250514",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "claude-opus-4-20250514",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "claude-haiku-4-20250514",
    "CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS": "1",
    "CLAUDE_CODE_ATTRIBUTION_HEADER": "0"
  }
```


# THE BEST - LiteLLM + OpenRouter

Qwen3 Coder 480B A35B
https://openrouter.ai/qwen/qwen3-coder

Works, not perfect though.

```json

"env": {
    "ANTHROPIC_BASE_URL": "http://localhost:4000",
    "ANTHROPIC_API_KEY": "sk-Y1H-Ak3g_slhJ4B4Qv5rdQ",
    "ANTHROPIC_AUTH_TOKEN": "sk-Y1H-Ak3g_slhJ4B4Qv5rdQ",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "qwen3-coder",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "qwen3-coder",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "qwen3-coder",
    "CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS": "1",
    "CLAUDE_CODE_ATTRIBUTION_HEADER": "0"
  }
```