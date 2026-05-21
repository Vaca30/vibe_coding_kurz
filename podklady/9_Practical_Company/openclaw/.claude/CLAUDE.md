# WORKFLOW — MANDATORY FOR ANY PROMPT THAT RESULTS IN CHANGES

**If you are going to use the Edit or Write tool, or run any cluster-mutating `kubectl` / `helm` / SSH command, you MUST complete all applicable steps below before reporting completion.** This applies to every type of work: chart edits, new Helm releases, values tweaks, ingress / DNS changes, host-side config — no exceptions.

Execute these steps in order. Do NOT skip steps.

1. **Understand** — Read relevant charts/values/manifests, ask clarifying questions, identify gaps. For bugs: reproduce with `kubectl`/`curl`/logs first.
2. **Plan** — Create a plan, get user approval, iterate if needed *(skip for trivial changes)*
3. **Implement** — Edit the chart / values
4. **Test** — Define DoD checklist, lint → dry-run → apply → verify, repeat until it works *(see `rules/06-testing.md`)*
5. **Report** — Short summary: what was changed, what was tested, current cluster state

**NEVER report completion without first verifying the resulting cluster state.** If you `helm upgrade --install` and stop without checking `kubectl rollout status` and an edge probe, you have failed. Verification is YOUR responsibility — the user should never need to ask you to test.

**Trivial changes** (typo in a values comment, README tweak, indentation fix in a chart template that doesn't change rendered output): skip step 2. State what you'll do and proceed.

## Standing authorizations — do NOT ask before doing these

These actions are pre-approved against the `microk8s-wood` context. Run them yourself when the situation calls for it.

### Read-only inspection (always safe)

- Any `kubectl get / describe / logs / top / explain / api-resources` — across any namespace on `microk8s-wood`.
- Any `helm list / status / get values / get manifest / history` against installed releases.
- `helm template ...` and `helm lint ...` — pure local rendering, no cluster contact.
- `kubectl --dry-run=server` / `kubectl --dry-run=client` to validate manifests.
- `curl` / `wget` probes against `http://192.168.8.188:30080`, `http://192.168.8.188:30443`, or hostnames resolved to the same (e.g. `curl --resolve www.cellarwood.org:80:192.168.8.188 ...`).
- `ssh lukas@192.168.8.188` for **read-only** host inspection: `systemctl status cloudflared`, `journalctl -u cloudflared --no-pager -n 100`, `ip a`, `ss -tlnp`, file reads under `/etc/cloudflared/` and similar config dirs.

### Pre-approved mutations against `microk8s-wood`

These mutate cluster state but are scoped to this project's namespaces (`core-ingress`, `test`, every `openclaw-*` namespace, and any namespace whose chart or overlay lives under `helm/` or `kustomize/` in this repo). You may run them without asking:

- `helm upgrade --install <release> ./helm/<chart> -n <ns> --create-namespace [-f ...]` for charts that live in this repo. Follow with `kubectl rollout status` to detect failure (or pass `--atomic`).
- `helm rollback <release> <rev> -n <ns>` to revert a release this repo manages.
- `kubectl apply -k kustomize/<workload>/overlays/<name>` for overlays that live in this repo.
- `kubectl rollout restart deployment/<name> -n <ns>` for deployments managed by this repo's charts/overlays.
- `kubectl delete pod <name> -n <ns>` to force-recycle a single pod (e.g. to pick up a ConfigMap change).

### Requires confirmation — always ask first

- `helm uninstall` (removes the release including PVCs depending on `--keep-history` behaviour).
- `kubectl delete namespace` — never run without explicit user confirmation.
- `kubectl delete <kind>` for resources not owned by this repo's Helm releases.
- Any mutation on a context other than `microk8s-wood` (e.g. the `microk8s` context that also exists in kubeconfig).
- Mutating SSH commands on `lukas@192.168.8.188` — `systemctl restart/start/stop`, edits to `/etc/`, package installs, `cloudflared` reconfigs.
- `git push`, `git push --force`, branch deletes on origin — never commit unless the user explicitly asks (see global instruction).
- Anything touching secrets, TLS material, tokens, or `kubeconfig` files.

When in doubt: ask. The cluster is small and shared with the host's cloudflared edge; a bad apply takes down `www.cellarwood.org`.
