# server

Kubernetes infrastructure for Cellarwood, deployed to the `microk8s-wood` cluster.

## Deploy

```bash
# Point kubectl at the wood cluster
kubectl config use-context microk8s-wood

# Traefik (ingress controller)
helm repo add traefik https://traefik.github.io/charts
helm repo update
helm upgrade --install traefik traefik/traefik \
  -f helm/traefik/values.yaml \
  -n core-ingress --create-namespace

# Test website — sanity check that ingress + DNS are wired up
helm upgrade --install test-website ./helm/test-website \
  -n test --create-namespace
```

After both releases are ready, `http://www.cellarwood.org` (resolved to the cluster's node IP on port 30080) should serve the test page.

## Workloads

- `helm/traefik` — ingress controller (NodePort 30080/30443, fronted by cloudflared on wood-node).
- `helm/test-website` — sanity-check static page served at `www.cellarwood.org`.
- `kustomize/openclaw` — per-instance OpenClaw assistants; see `kustomize/openclaw/README.md`.
