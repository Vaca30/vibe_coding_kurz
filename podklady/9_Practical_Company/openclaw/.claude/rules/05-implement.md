---
description: "Step 4: Implement — IaC editing rules, Helm and Kustomize layout"
---

# Step 4: Implement

Write clean IaC from the start. Follow these rules during implementation:

- Do NOT commit via `git` unless explicitly instructed by the user.
- When creating diagrams or graphs, use `mermaid`.
- Refactor continuously — extract repeated values into `values.yaml` / overlays the moment you see duplication.
- Remove dead code — unused chart templates, commented-out manifest blocks, abandoned overlays.
- After editing: re-render with `helm template` / `kubectl kustomize` and skim the diff before applying anywhere.

## Helm charts (`helm/<chart>/`)

Standard Helm v3 layout. One release per chart, deployed via `helm upgrade --install <release> ./helm/<chart>`.

- `Chart.yaml` — name, version, appVersion. Bump `version` when chart templates change; bump `appVersion` when the underlying image changes.
- `values.yaml` — defaults; everything that might differ per environment lives here, not hardcoded in templates.
- `templates/` — manifests with Go templating. Use `_helpers.tpl` for label/name helpers, never inline duplicated label blocks.
- Resource requests/limits are **mandatory** for every container — see `helm/test-website/values.yaml` for the minimum-viable shape.

Current charts:

- `helm/traefik/` — values override for the upstream `traefik/traefik` chart (NodePort 30080/30443, dashboard insecure-mode for now, forwarded-headers trust for cloudflared).
- `helm/test-website/` — local sanity chart (nginx) wired to `www.cellarwood.org` via a Traefik IngressRoute.

## Kustomize workloads (`kustomize/<workload>/`)

Used when upstream ships Kustomize-only or when the per-instance model (one overlay = one namespace) is cleaner than Helm values.

- `base/` — vendored upstream manifests, image tag pinned via `images:` in `base/kustomization.yaml`. Treat as read-only mirrors; never customise here.
- `overlays/_template/` — copy-paste seed for new instances. All placeholders use the literal token to be replaced (e.g. `OPENCLAW_INSTANCE`).
- `overlays/<instance>/` — one real instance. Each overlay:
  - Sets `namespace:` in `kustomization.yaml`.
  - Patches `ConfigMap` for instance-specific config.
  - Ships a `secret.example.yaml` (placeholders only — never populated).
  - Optionally adds an `ingressroute.yaml` (commented out in `kustomization.yaml` by default for loopback-only mode).

Current workloads:

- `kustomize/openclaw/` — per-instance OpenClaw assistants. See `kustomize/openclaw/README.md` for the bootstrap recipe.

## Secrets

- **Never** commit populated Secret manifests. `**/secret.yaml`, `**/secret.local.yaml`, `**/secrets.local.yaml` are gitignored.
- Create secrets imperatively: `kubectl -n <ns> create secret generic <name> --from-literal=KEY=VALUE`.
- Document the required keys in `secret.example.yaml` (placeholders) so the next operator knows what to populate.

## Repository structure

```
server/
├── README.md
├── helm/
│   ├── traefik/
│   │   └── values.yaml             # override values for upstream traefik chart
│   └── test-website/
│       ├── Chart.yaml
│       ├── values.yaml
│       └── templates/
└── kustomize/
    └── openclaw/
        ├── README.md
        ├── base/                   # vendored upstream, image pinned
        └── overlays/
            ├── _template/          # copy to start a new instance
            └── <instance>/         # one namespace, one assistant
```
