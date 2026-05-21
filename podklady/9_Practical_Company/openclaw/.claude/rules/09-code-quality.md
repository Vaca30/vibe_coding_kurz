---
description: "Reference: IaC quality standards — idempotency, separation, secrets hygiene, anti-patterns"
---

# Reference: Code Quality

Write IaC that is **simple, idempotent, and production-ready**. Prioritize clarity over cleverness.

## Principles

1. **Simplicity First** (KISS) — prefer a 20-line chart that does one thing to a 200-line one with knobs nobody uses.
2. **Idempotency** — applying the same manifest twice must produce the same cluster state. Avoid `Job`s without `restartPolicy: OnFailure`/`Never` semantics, avoid mutating webhooks that depend on apply order.
3. **DRY** — extract repeated label/selector/name strings into `_helpers.tpl` (Helm) or `commonLabels` / patches (Kustomize). Never inline-duplicate a label map.
4. **YAGNI** — don't add `values.yaml` knobs for environments that don't exist. Add them when the second environment lands.
5. **Separation of concerns** — chart templates describe *shape*; `values.yaml` describes *config*; secrets are *imperative*. Don't mix them.
6. **Vendored upstream is read-only** — anything under `kustomize/*/base/` is a mirror; customise via overlays.

## Manifest organisation

- Every container has `resources.requests` AND `resources.limits` set. No exceptions for "it's small".
- Every Deployment/StatefulSet has `livenessProbe` and `readinessProbe` (or a documented reason it can't).
- Labels follow the recommended Kubernetes label set: `app.kubernetes.io/name`, `app.kubernetes.io/instance`, `app.kubernetes.io/managed-by`.
- Namespace names match release/overlay names; one workload per namespace unless they genuinely need to share network identity.
- Resources are scoped to a namespace; never use `default` for project workloads.

## Secrets

- **Never** commit populated Secret manifests. Use `kubectl create secret` imperatively.
- Every `secret.example.yaml` lists the required keys with placeholder values so the next operator knows what to populate.
- API keys, tunnel tokens, and TLS material never appear in `values.yaml`. Reference them via `envFrom.secretRef` / `valueFrom.secretKeyRef`.

## Error handling at apply time

- Fail fast: if `helm upgrade --install` warns, stop and read it — don't paper over with `--force`.
- Use `helm upgrade --atomic` for risky changes so partial failures roll back.
- Validate inputs at the chart boundary: in `values.yaml` document required vs optional, and use `{{ required "foo is required" .Values.foo }}` for genuinely required values.

## Anti-Patterns to Avoid

- No commented-out manifest blocks "just in case" — git remembers.
- No TODO comments in YAML — open an issue or fix it now.
- No hardcoded namespaces in chart templates — derive from `.Release.Namespace` or the kustomize `namespace:` directive.
- No hardcoded image tags in `templates/` — pin in `values.yaml` (Helm) or `images:` block (Kustomize base).
- No `latest` image tags. Pin a real tag.
- No premature multi-environment splitting before there's a second environment.
- No silent `--force` / `--replace` / `kubectl delete` to "make it apply" — figure out *why* it conflicts.
