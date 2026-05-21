---
description: Project configuration — cluster, layout, deployment model
---

# Project Config

- **Project**: Cellarwood `server` — Kubernetes Infrastructure as Code for the Cellarwood property.
- **Cluster**: single-node microk8s, kubeconfig context **`microk8s-wood`**. The node is `lukas-nuc`, reachable at `lukas@192.168.8.188`.
- **Edge**: a `cloudflared` tunnel runs on the **host** (systemd service on wood-node, not inside the cluster — see memory `cloudflared-on-host`). It terminates `*.cellarwood.org` traffic and forwards to the cluster's NodePort `30080` (HTTP) / `30443` (HTTPS), where Traefik picks it up.
- **Layout**:
  - `helm/<chart>/` — Helm-managed releases (currently `traefik`, `test-website`).
  - `kustomize/<workload>/{base,overlays/<instance>}/` — Kustomize-managed workloads with per-instance overlays (currently `openclaw`; one overlay = one namespace = one isolated instance).
- **Deployment style**: declarative IaC checked into git, applied imperatively from a workstation (`helm upgrade --install` / `kubectl apply -k`). No GitOps controller yet.
- **Secrets**: imperative `kubectl create secret`. Only placeholder `secret.example.yaml` files are committed; populated `secret.yaml` / `secret.local.yaml` / `secrets.local.yaml` are gitignored.
- **Storage**: the cluster relies on microk8s' `hostpath-storage` addon for the default StorageClass (`microk8s-hostpath`). PVCs in this repo intentionally leave `storageClassName` unset.
- **Multi-context warning**: the workstation's kubeconfig also has a `microk8s` context pointing at a different cluster. **Always** verify `kubectl config current-context` returns `microk8s-wood` before any mutation, or pass `--context microk8s-wood` explicitly.
