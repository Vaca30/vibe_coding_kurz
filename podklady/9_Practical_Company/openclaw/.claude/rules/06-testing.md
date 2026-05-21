---
description: "Step 4: Testing — lint, dry-run, apply, verify against microk8s-wood"
---

# Step 4: Testing

**Every change must be verified against the running cluster before reporting completion. No exceptions.**

## 4a. Define your Definition of Done

Before testing, **write out your DoD checklist in the conversation** so the user can see what you intend to verify. Example:

> **Definition of Done for "add staging chart for foo-app":**
> - [ ] `helm lint helm/foo-app` passes with no errors
> - [ ] `helm template foo-app helm/foo-app -n foo` renders cleanly and contains the expected `Deployment`, `Service`, `IngressRoute`
> - [ ] Server-side dry-run succeeds (`helm upgrade ... --dry-run=server`)
> - [ ] `helm upgrade --install` followed by `kubectl rollout status deploy/foo-app -n foo` returns success within 60s
> - [ ] `curl --resolve foo.cellarwood.org:80:192.168.8.188 http://foo.cellarwood.org/` returns the expected response

## 4b. Test in order — cheapest first

Each step is faster and safer than the next. Don't skip ahead.

### 1. Static lint and render (no cluster contact)

```bash
# Helm
helm lint helm/<chart>
helm template <release> helm/<chart> -n <ns> -f helm/<chart>/values.yaml | less

# Kustomize
kubectl kustomize kustomize/<workload>/overlays/<instance> | less
```

Look for: unresolved templates (`<no value>`), missing required labels, hardcoded namespaces, missing resource limits, secrets accidentally rendered with real values.

### 2. Confirm context

```bash
kubectl config current-context   # MUST print: microk8s-wood
```

If not, fix it (`kubectl config use-context microk8s-wood`) or pass `--context microk8s-wood` to every subsequent command.

### 3. Server-side dry-run (cheap cluster contact, no mutation)

```bash
# Helm
helm upgrade --install <release> helm/<chart> -n <ns> --create-namespace \
  -f helm/<chart>/values.yaml --dry-run=server

# Kustomize
kubectl apply -k kustomize/<workload>/overlays/<instance> --dry-run=server
```

This catches conflicts with what's already in the cluster (immutable field changes, CRD-validation errors) that pure template rendering misses.

### 4. Apply

```bash
# Helm
helm upgrade --install <release> helm/<chart> -n <ns> --create-namespace -f helm/<chart>/values.yaml

# Kustomize
kubectl apply -k kustomize/<workload>/overlays/<instance>
```

For risky upgrades (CRD-touching, schema-changing) add `--atomic --timeout 2m` to Helm so failures auto-rollback.

### 5. Wait for ready

```bash
kubectl rollout status deploy/<name> -n <ns> --timeout=120s
kubectl -n <ns> get pod,svc,ingressroute
```

A `Running` pod is not a healthy pod. Check `READY` column and recent restart counts.

### 6. Smoke test the actual behaviour

**Inside the cluster** (skip cloudflared, exercise Traefik + your service):

```bash
curl -fsS --resolve <host>:80:192.168.8.188 http://<host>/ -o /dev/null -w '%{http_code}\n'
```

**Through cloudflared** (full edge path, only after the cluster-side probe succeeds):

```bash
curl -fsS https://<host>/ -o /dev/null -w '%{http_code}\n'
```

For loopback-only workloads (e.g. OpenClaw in default config) use `kubectl port-forward` instead:

```bash
kubectl -n <ns> port-forward svc/<name> <localport>:<svcport>
curl -fsS http://localhost:<localport>/healthz
```

## 4c. Diagnostics — when something is wrong

Check in order, cheapest to most expensive.

### Cluster events and pod state

```bash
kubectl -n <ns> get events --sort-by=.lastTimestamp | tail -20
kubectl -n <ns> describe pod/<name>      # look for the Events: section at the bottom
kubectl -n <ns> get pod <name> -o yaml   # full status incl. container statuses, lastState
```

### Logs

```bash
kubectl -n <ns> logs deploy/<name> --tail=200
kubectl -n <ns> logs deploy/<name> -c <container> --tail=200   # multi-container pods
kubectl -n <ns> logs deploy/<name> --previous                  # last crash
```

### Helm release state

```bash
helm -n <ns> list
helm -n <ns> status <release>
helm -n <ns> get values <release>
helm -n <ns> get manifest <release>
helm -n <ns> history <release>           # for rollback decisions
```

### Traefik specifically

```bash
kubectl -n core-ingress logs deploy/traefik --tail=100
kubectl get ingressroute -A
kubectl -n <ns> describe ingressroute/<name>
# Traefik dashboard (insecure mode, in-cluster only — port-forward it):
kubectl -n core-ingress port-forward deploy/traefik 9000:9000
# then open http://localhost:9000/dashboard/
```

### Host-side: cloudflared

cloudflared is **not** in the cluster. When traffic reaches Traefik fine over NodePort but fails through the public hostname, the tunnel is the culprit:

```bash
ssh lukas@192.168.8.188 'systemctl status cloudflared'
ssh lukas@192.168.8.188 'sudo journalctl -u cloudflared --no-pager -n 200'
ssh lukas@192.168.8.188 'sudo cat /etc/cloudflared/config.yml'   # tunnel routing
```

Mutating cloudflared (restart, config edit) requires explicit user confirmation — see `CLAUDE.md` § Standing authorizations.

### MicroK8s itself

```bash
ssh lukas@192.168.8.188 'microk8s status'
ssh lukas@192.168.8.188 'microk8s kubectl get nodes'
```

## 4d. Non-testable changes

If a change is purely documentary (README, comments in YAML that don't affect rendering, gitignore tweaks): explicitly state why no cluster test is needed. Run `helm template` / `kubectl kustomize` anyway to confirm the diff is truly zero.

## 4e. Fix and repeat

If a test fails: read the error, fix the chart/overlay, re-lint, re-template, re-apply. Repeat until DoD passes. If you find yourself rolling forward more than twice without progress, `helm rollback` or `kubectl apply -k` an older overlay and step back to understand before continuing.
