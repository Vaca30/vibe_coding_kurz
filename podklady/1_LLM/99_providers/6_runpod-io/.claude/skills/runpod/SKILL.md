# RunPod Pod Monitoring & Management

Monitor, troubleshoot, and manage RunPod GPU pods for LLM inference.

## Check Pod Status (GraphQL API)

```bash
curl -s -X POST "https://api.runpod.io/graphql?api_key=$RUNPOD_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "query { pod(input: { podId: \"<POD_ID>\" }) { id name desiredStatus runtime { uptimeInSeconds ports { ip isIpPublic privatePort publicPort type } gpus { id gpuUtilPercent memoryUtilPercent } } } }"}'
```

Key indicators:
- `uptimeInSeconds` keeps resetting to low values → **crash loop**
- `ports: null` → container hasn't started yet (image pull or crash)
- `gpuUtilPercent: 0` + `memoryUtilPercent: 0` → model not loaded yet

## Pod Logs

**Pod logs are NOT available via the GraphQL API or REST API.**

Access logs through:
1. **Web console**: https://www.runpod.io/console/pods → expand pod → click **Logs**
2. **SSH into the pod** (requires `22/tcp` in template ports):
   ```bash
   ssh root@<pod-id>-22.proxy.runpod.net
   ```

Always include `22/tcp` in template ports for SSH access.

## Check if vLLM Server is Ready

```bash
curl -s "https://<pod-id>-8000.proxy.runpod.net/v1/models"
```

- Returns JSON with model list → **ready**
- Empty response or timeout → still loading model
- 404 → proxy reachable but server not up yet

## Proxy URL Pattern

```
https://<pod-id>-<port>.proxy.runpod.net
```

Example: `https://abc123-8000.proxy.runpod.net`

## Common Failure Patterns

### 1. CUDA Version Mismatch
```
nvidia-container-cli: requirement error: unsatisfied condition: cuda>=12.9
```
**Fix**: Use a pinned vLLM image version instead of `:latest`. Example: `vllm/vllm-openai:v0.10.2` (CUDA 12.6). Community cloud machines may have older CUDA drivers.

### 2. dockerStartCmd Duplicating Entrypoint
The `vllm/vllm-openai` image has its own entrypoint. If `dockerStartCmd` includes `python -m vllm.entrypoints.openai.api_server`, it gets doubled. Pass **only the arguments**:
```json
["--model", "org/model-name", "--quantization", "awq", "--port", "8000"]
```
NOT:
```json
["python", "-m", "vllm.entrypoints.openai.api_server", "--model", "..."]
```

### 3. New Model Architectures
Models with custom architectures (e.g., `qwen3_next`) need:
```
--trust-remote-code
```

### 4. CUDA Graph Issues
If the model crashes during warmup, add:
```
--enforce-eager
```
This disables CUDA graph capture (slightly slower but more compatible).

### 5. Out of Memory
If `--max-model-len` is too large for available VRAM:
- Reduce `--max-model-len` (try 32768 first, increase from there)
- Reduce `--gpu-memory-utilization` (0.90 is safe, 0.95 is aggressive)
- Reduce `--max-num-seqs` (fewer concurrent requests = less KV cache)

## Useful GraphQL Queries

### List all pods
```bash
curl -s -X POST "https://api.runpod.io/graphql?api_key=$RUNPOD_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "query { myself { pods { id name desiredStatus runtime { uptimeInSeconds } } } }"}'
```

### Deploy pod from template
```bash
curl -s -X POST "https://api.runpod.io/graphql?api_key=$RUNPOD_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { podFindAndDeployOnDemand(input: { name: \"my-pod\", templateId: \"<TPL_ID>\", gpuTypeId: \"NVIDIA A100 80GB PCIe\", gpuCount: 1, cloudType: COMMUNITY }) { id desiredStatus costPerHr } }"}'
```

## Template Checklist

When creating a RunPod template for vLLM:
- [ ] Pin the image version (never use `:latest` on community cloud)
- [ ] Include `22/tcp` in ports for SSH
- [ ] Include `8000/http` for vLLM API
- [ ] Set `HF_TOKEN` env var for gated models
- [ ] Pass only args in `dockerStartCmd` (not the full python command)
- [ ] Add `--trust-remote-code` for non-standard architectures
- [ ] Start with conservative `--max-model-len` (32768) and increase after confirming it works
