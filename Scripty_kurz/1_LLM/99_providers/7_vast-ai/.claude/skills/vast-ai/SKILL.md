---
name: vast-ai
description: >
  This skill should be used when the user asks about Vast.ai GPU cloud instances.
  Covers searching for GPU offers, renting machines, listing instances, checking
  instance status, starting, stopping, rebooting, destroying instances, and
  viewing instance logs via the Vast.ai REST API. Trigger phrases include
  "rent a GPU on vast.ai", "search vast.ai offers", "list my vast.ai instances",
  "destroy vast.ai instance", "show vast.ai logs", "create a vast.ai instance",
  "find cheap GPUs", "stop my GPU instance", "check vast.ai instance status".
---

# Vast.ai Instance Management

Manage Vast.ai GPU instances: search offers, create, list, inspect, start/stop, reboot, destroy, and view logs.

**Authentication**: All API calls use the `VASTAI_KEY` environment variable (already set in the OS).

**Base URL**: `https://console.vast.ai`

**Placeholders**: `<INSTANCE_ID>`, `<OFFER_ID>`, `<RESULT_URL>` — replace with actual values.

**Error responses**: Failed API calls return `{"success": false, "msg": "error description"}`. Check the `success` field before processing results.

---

## List All Instances

```bash
curl -s -H "Authorization: Bearer $VASTAI_KEY" \
  "https://console.vast.ai/api/v0/instances/" | jq .
```

Response contains `instances_found` (count) and `instances` (array). Key fields per instance:
- `id`, `actual_status`, `cur_state`, `gpu_name`, `num_gpus`
- `ssh_host`, `ssh_port`, `public_ipaddr`
- `dph_total` (cost $/hr), `label`, `image_uuid`
- `start_date`, `end_date`, `time_remaining`

---

## Show Single Instance

```bash
curl -s -H "Authorization: Bearer $VASTAI_KEY" \
  "https://console.vast.ai/api/v0/instances/<INSTANCE_ID>/" | jq .
```

Returns detailed info (100+ fields) about a specific instance.

---

## Search GPU Offers

Find available machines to rent.

```bash
curl -s -X POST "https://console.vast.ai/api/v0/bundles/" \
  -H "Authorization: Bearer $VASTAI_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 10,
    "type": "ondemand",
    "gpu_name": {"eq": "RTX_4090"},
    "num_gpus": {"eq": 1},
    "gpu_ram": {"gte": 24000},
    "dph_total": {"lte": 0.5},
    "reliability": {"gte": 0.95},
    "disk_space": {"gte": 50},
    "order": [["dph_total", "asc"]]
  }' | jq .
```

### Common filter operators
- `eq` - equals
- `gte` / `lte` - greater/less than or equal
- `gt` / `lt` - greater/less than
- `in` / `notin` - value in/not in array (e.g., `{"in": ["US", "CA"]}`)

### Common filter fields
- `gpu_name`: GPU model (e.g., `RTX_4090`, `A100_SXM4`, `H100_SXM5`)
- `num_gpus`: Number of GPUs
- `gpu_ram`: GPU memory in MB
- `dph_total`: Price per hour in USD
- `reliability`: Machine reliability score (0-1)
- `geolocation`: Country code
- `cpu_cores`, `cpu_ram`, `disk_space`, `inet_down`, `inet_up`
- `type`: `ondemand`, `bid`, or `reserved`

### Sorting
- `order`: Array of `[field, "asc"|"desc"]` pairs

---

## Create Instance (Rent a Machine)

First search for offers, then use the offer's `id` to create an instance.

```bash
curl -s -X PUT "https://console.vast.ai/api/v0/asks/<OFFER_ID>/" \
  -H "Authorization: Bearer $VASTAI_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "vllm/vllm-openai:latest",
    "disk": 50,
    "runtype": "ssh",
    "label": "my-gpu-instance",
    "onstart": "echo 'Instance started'",
    "env": {"HF_TOKEN": "hf_xxx"}
  }' | jq .
```

### Required fields
- `image`: Docker image URI (e.g., `vllm/vllm-openai:latest`, `pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime`)

### Optional fields
- `disk`: Disk space in GB
- `runtype`: `ssh`, `jupyter`, `args`, `ssh_proxy`, `ssh_direct`, `jupyter_proxy`, `jupyter_direct`
- `price`: Bid price in $/hr (for bid-type offers)
- `label`: Human-readable label
- `onstart`: Shell commands to run on startup
- `env`: Environment variables (object)
- `args`: Container arguments (array)
- `use_jupyter_lab`: Boolean for JupyterLab
- `jupyter_dir`: Jupyter working directory

Response: `{"success": true, "new_contract": <INSTANCE_ID>}`

### Connect via SSH

After the instance reaches `running` status, connect using `ssh_host` and `ssh_port` from the instance details:

```bash
ssh -p <SSH_PORT> root@<SSH_HOST> -i ~/.ssh/id_ed25519_runpod
```

---

## Manage Instance (Start / Stop / Label)

**Note**: Stopping an instance will interrupt any running workloads (training jobs, inference servers). Confirm with the user before stopping.

```bash
curl -s -X PUT "https://console.vast.ai/api/v0/instances/<INSTANCE_ID>/" \
  -H "Authorization: Bearer $VASTAI_KEY" \
  -H "Content-Type: application/json" \
  -d '{"state": "running"}' | jq .
```

### Body options (at least one required)
- `state`: `"running"` or `"stopped"`
- `label`: String (max 1024 chars) to update the instance label

---

## Reboot Instance

Stops and restarts the container without losing GPU priority.

```bash
curl -s -X PUT "https://console.vast.ai/api/v0/instances/reboot/<INSTANCE_ID>/" \
  -H "Authorization: Bearer $VASTAI_KEY" | jq .
```

---

## Destroy Instance

Permanently removes the instance. This action is irreversible.

```bash
curl -s -X DELETE "https://console.vast.ai/api/v0/instances/<INSTANCE_ID>/" \
  -H "Authorization: Bearer $VASTAI_KEY" | jq .
```

Response: `{"success": true, "msg": "Instance destroyed successfully"}`

**Always confirm with the user before destroying an instance.**

---

## Show Instance Logs

Logs are retrieved in two steps: request logs, then fetch from the returned URL.

### Step 1: Request logs

```bash
curl -s -X PUT "https://console.vast.ai/api/v0/instances/request_logs/<INSTANCE_ID>" \
  -H "Authorization: Bearer $VASTAI_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tail": "100"}' | jq .
```

### Optional body
- `tail`: Number of lines (as string)
- `filter`: Grep filter string
- `daemon_logs`: `"true"` for system/daemon logs instead of container logs

### Step 2: Fetch logs from returned URL

The response contains `result_url` — fetch the logs from that S3 URL. Note: there may be a short delay (a few seconds) before logs are available. If the URL returns empty, retry after 3-5 seconds.

```bash
curl -s "<RESULT_URL>"
```

---

## Workflow Tips

1. **Finding and renting a GPU**: Search offers -> pick best offer -> create instance -> wait for it to start -> check status
2. **Monitoring**: List instances to check `actual_status` and `cur_state`
3. **Troubleshooting**: Show logs to diagnose issues, reboot if stuck
4. **Cleanup**: Destroy instances you no longer need to stop billing
5. **Cost control**: Use `dph_total` filter when searching to cap hourly cost
