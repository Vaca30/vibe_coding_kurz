---
description: "Reference: Technology stack — microk8s, Helm, Kustomize, Traefik, cloudflared"
---

# Reference: Technology Stack

## Cluster

- **Distribution**: MicroK8s (snap-installed) on a single-node host (`lukas-nuc`, `192.168.8.188`).
- **Context**: `microk8s-wood` (kubectl). A second `microk8s` context exists in kubeconfig and points elsewhere — never assume; always verify.
- **Addons in use**: `hostpath-storage` (provides `microk8s-hostpath` as the default StorageClass).
- **Node access**: SSH `lukas@192.168.8.188` for host-side inspection. Cluster-side work goes via kubectl from the workstation.

## Packaging

- **Helm v3** — preferred for first-party charts and for wrapping upstream charts with our values (e.g. Traefik). Layout: `helm/<chart>/{Chart.yaml,values.yaml,templates/}`.
- **Kustomize** — used when upstream ships Kustomize-only or when "one overlay per instance" is cleaner than Helm values. Layout: `kustomize/<workload>/{base,overlays/<instance>}`.

## Ingress / Edge

- **Ingress controller**: Traefik (installed via the upstream `traefik/traefik` chart in `core-ingress` namespace).
  - Service type: NodePort. HTTP on `30080`, HTTPS on `30443`.
  - Dashboard runs in insecure mode (port-forward only).
  - Routes defined as Traefik `IngressRoute` CRDs (not vanilla `Ingress`).
- **Public edge**: `cloudflared` runs as a systemd service **on the host** (not in-cluster — see memory `cloudflared-on-host`). It terminates `*.cellarwood.org` and forwards to `localhost:30080` on wood-node.
- **DNS**: Cloudflare for `cellarwood.org`. New hostnames need a DNS record pointing at the tunnel.

## Workloads

- `helm/traefik` — ingress controller.
- `helm/test-website` — nginx sanity check at `www.cellarwood.org`.
- `kustomize/openclaw/` — per-instance OpenClaw assistants (one namespace = one instance).

## Tooling (workstation)

- `kubectl` v1.35-compatible client.
- `helm` v3.20+.
- `kustomize` is invoked via `kubectl -k` (no separate binary required).
- `ssh` for host-side access. SSH key already authorised on wood-node.

## Scripting & Automation

- Default: shell scripts for the imperative bootstrap recipes (matches `kubectl`/`helm`/`ssh`-shaped work).
- Use TypeScript/Node only when the task genuinely needs structured data manipulation. Avoid pulling in a runtime just to wrap kubectl calls.
- No GitOps controller (ArgoCD/Flux) is installed yet. If/when one is added, this section gets the canonical entry.
