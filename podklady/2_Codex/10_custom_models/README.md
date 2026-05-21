# Custom models

Prompt: `Can you search the cheapest Subaru Impreza and Toyota RAV4 in Czech republic?`

### LMStudio (Local)
Need to enable Local Server in UI !!!

Qwen 3.5 9B (Quantized)
WORKS !!!
Multi-tool calls - OK

GPT-OSS-20B (Quantized)  
WORKS !!! But with sometimes errors.

### vLLM (Local)

Qwen 3.5 9B (Quantized)
Works with errors

GPT-OSS-20B (Quantized)  
Errors


### vLLM (Remote)

GPT-OSS-120B (Quantized)
Error: `tool type custom not supported`

Qwen 3.5 35B (Quantized)
Error: `{"error":{"message":"Unexpected message role.","type":"BadRequestError","param":null,"code":400}}`


### LiteLLM (Local) + vLLM (Remote)

Run `OPENAI_API_KEY=sk-hBr7zAV2tgUCQSveu30pRg codex --model runpod-qwen-35-35B`

Qwen 3.5 35B (Quantized)
Does not work properly


### LiteLLM (Local) + OpenRouter (Remote)

GPT-OSS-120B (Quantized)
Works



# Start

Run `export CODEX_HOME=/home/lukas/Projects/Temp/imagegen_comparison/codex_local/.codex`



# Directly

Run `codex --oss -m gpt-oss:20b` 

Run `OPENAI_BASE_URL=http://localhost:11434/v1 OPENAI_API_KEY=ollama codex --model qwen3-coder`


# LiteLLM

Run `OPENAI_BASE_URL=http://localhost:4000/v1 OPENAI_API_KEY=sk-H8jSt-u8_KBiXp4CzkwkXA codex --model runpod-community-gpt-oss`

Run `OPENAI_BASE_URL=http://localhost:4000/v1 OPENAI_API_KEY=sk-H8jSt-u8_KBiXp4CzkwkXA codex --model runpod-qwen-25-coder`