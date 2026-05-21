---
description: "Step 1: Understand — read code, ask questions, identify gaps before any implementation"
---

# Step 1: Understand

- Read relevant charts / overlays / values / manifests and identify impacted resources (which namespace, which release, which workload).
- Ask clarifying questions if requirements are ambiguous (e.g. "should this be a new namespace or live in `test`?", "is this exposed via Traefik or loopback-only?").
- Identify gaps in the current design and opportunities for improvement (missing resource limits, hardcoded values that belong in `values.yaml`, secrets in the wrong place).
- Understand the requirement completely before proceeding.
- **For bug reports / incidents**: reproduce the issue first before attempting a fix. Cheapest probes:
  - `kubectl get pods,svc,ingressroute -A` to confirm the resource exists and is healthy.
  - `kubectl describe <kind>/<name> -n <ns>` for events.
  - `kubectl logs deploy/<name> -n <ns> --tail=200` (and `-c <container>` for multi-container pods).
  - `curl --resolve <host>:80:192.168.8.188 http://<host>/` to probe the cluster edge directly, bypassing cloudflared.
  - `ssh lukas@192.168.8.188 'systemctl status cloudflared; journalctl -u cloudflared --no-pager -n 100'` if traffic doesn't reach the cluster at all.
