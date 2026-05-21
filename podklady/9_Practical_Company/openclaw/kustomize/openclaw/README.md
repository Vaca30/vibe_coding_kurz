# openclaw

Per-instance OpenClaw deployments. One overlay = one namespace = one fully isolated assistant (its own state, its own chat-app links, its own LLM keys).

```
.
├── base/                  # vendored upstream manifests, image pinned
└── overlays/
    ├── _template/         # copy to start a new instance
    └── lukas/             # the first real instance
```

## One-time cluster prep

The base PVC has no `storageClassName`, so it relies on the cluster default. microk8s ships none by default — enable hostpath storage once:

```bash
microk8s enable hostpath-storage   # provides the `microk8s-hostpath` default StorageClass
```

If you later swap to longhorn/NFS, set it as the default StorageClass; no overlay change needed.

## Bootstrap a new instance

```bash
INSTANCE=lukas

# 1. Namespace + Secret (Secrets are imperative; never commit populated YAML)
#    OPENCLAW_GATEWAY_TOKEN is the only required key. Add LLM API keys only if
#    you want pay-per-token billing for that provider. If you prefer subscription
#    OAuth (ChatGPT/Codex, Claude Pro/Max — see "LLM provider auth" below), skip
#    that provider's API key entirely.
kubectl create namespace openclaw-$INSTANCE
kubectl -n openclaw-$INSTANCE create secret generic openclaw-secrets \
  --from-literal=OPENCLAW_GATEWAY_TOKEN="$(openssl rand -hex 32)"

# 2. Apply the overlay
kubectl apply -k kustomize/openclaw/overlays/$INSTANCE

# 3. Log in to the LLM provider (see "LLM provider auth" below)

# 4. Reach the Control UI to run `openclaw onboard` (loopback bind → port-forward)
kubectl -n openclaw-$INSTANCE port-forward svc/openclaw 18789:18789
# Then open http://localhost:18789
```

To add a second instance later: `cp -r overlays/_template overlays/<name>`, replace every `OPENCLAW_INSTANCE` placeholder with `<name>`, and repeat the bootstrap steps with `INSTANCE=<name>`.

## LLM provider auth

OpenClaw supports two billing models for each provider:

| Path | When to use | How |
|---|---|---|
| **Subscription (OAuth)** | You already pay ChatGPT Plus/Pro or Claude Pro/Max and want the agent to use that quota | Run the in-pod `auth login` command below |
| **API key (pay-per-token)** | Programmatic billing, or providers without a subscription tier (Gemini, OpenRouter) | Add the key to `openclaw-secrets` |

The deployment marks every API key except `OPENCLAW_GATEWAY_TOKEN` as `optional`, so leaving an env var unset is fine.

### Subscription OAuth (ChatGPT / Codex)

```bash
kubectl -n openclaw-$INSTANCE exec -it deploy/openclaw -c gateway -- \
  node /app/dist/index.js models auth login --provider openai-codex --set-default
```

The CLI prompts interactively for the auth method (pick the OAuth / device-code option), then prints a URL + short code. Open the URL in any browser (your laptop is fine), sign in with the ChatGPT account whose subscription you want to use, paste the code, approve. The CLI completes inside the pod and writes `auth-profiles.json` to `/home/node/.openclaw/agents/default/agent/` — on the PVC, so it survives pod restarts. Refresh tokens are rotated automatically; no periodic re-login.

Two non-obvious flags:

- **`-it`** is required: this subcommand explicitly errors with "models auth login requires an interactive TTY" when stdin is not a TTY.
- **`--set-default`** points the agent's default model at the subscription provider (`openai-codex/gpt-5.5`). Without it, the auth profile is saved but the default model stays on `openai/gpt-5.5` — the API-key route — and the first inference call fails with "No API key found for provider openai". You can also flip it after the fact with `models set openai-codex/gpt-5.5`.

To verify the end-to-end path:

```bash
kubectl -n openclaw-$INSTANCE exec deploy/openclaw -c gateway -- \
  node /app/dist/index.js agent --agent default --message "ping"
```

Do **not** also set `OPENAI_API_KEY` in `openclaw-secrets` — pick one path per provider.

### Subscription OAuth (Claude Pro / Max)

```bash
kubectl -n openclaw-$INSTANCE exec -it deploy/openclaw -c gateway -- \
  node /app/dist/index.js models auth login --provider anthropic
```

## Slack channel (Socket Mode, per-instance)

Each instance gets its own Slack app at `api.slack.com/apps` (one app = one bot identity; multiple instances need separate apps with diverging names + slash commands).

**App manifest** — Socket Mode, no public ingress required. Replace `<name>` in three places (display name, bot user, slash command) with the overlay name:

```json
{
  "display_information": { "name": "OpenClaw — <name>" },
  "features": {
    "bot_user": { "display_name": "claw-<name>", "always_online": true },
    "app_home": { "home_tab_enabled": true, "messages_tab_enabled": true, "messages_tab_read_only_enabled": false },
    "assistant_view": {
      "assistant_description": "Your personal OpenClaw assistant.",
      "suggested_prompts": [{ "title": "Summarize my day", "message": "What's on my schedule?" }]
    },
    "slash_commands": [{ "command": "/claw-<name>", "description": "Send a message to OpenClaw", "should_escape": false }]
  },
  "oauth_config": { "scopes": { "bot": [
    "app_mentions:read","assistant:write","channels:history","channels:read","chat:write","commands",
    "emoji:read","files:read","files:write","groups:history","groups:read","im:history","im:read","im:write",
    "mpim:history","mpim:read","mpim:write","pins:read","pins:write","reactions:read","reactions:write",
    "usergroups:read","users:read"
  ] } },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": { "bot_events": [
      "app_home_opened","app_mention","assistant_thread_started","assistant_thread_context_changed",
      "channel_rename","member_joined_channel","member_left_channel",
      "message.channels","message.groups","message.im","message.mpim",
      "pin_added","pin_removed","reaction_added","reaction_removed"
    ] }
  }
}
```

After creating the app: generate an app-level token (`xapp-...`) with `connections:write` scope, then *Install to Workspace* to get the bot token (`xoxb-...`).

**Wire into the instance** — tokens go in the Secret; channel config goes in `openclaw.json` (via `config patch`, written to the PVC). The base already mounts the env vars (`SLACK_APP_TOKEN`, `SLACK_BOT_TOKEN`) from `openclaw-secrets` with `optional: true`, so each overlay only needs to populate the Secret keys to activate Slack.

```bash
kubectl -n openclaw-$INSTANCE patch secret openclaw-secrets --type=merge -p \
  '{"stringData":{"SLACK_APP_TOKEN":"xapp-...","SLACK_BOT_TOKEN":"xoxb-..."}}'
kubectl -n openclaw-$INSTANCE rollout restart deployment/openclaw
kubectl -n openclaw-$INSTANCE rollout status deployment/openclaw

kubectl -n openclaw-$INSTANCE exec -i deploy/openclaw -c gateway -- \
  node /app/dist/index.js config patch --stdin <<'JSON5'
{
  channels: {
    slack: {
      enabled: true,
      mode: "socket",
      webhookPath: "/slack/events",
      userTokenReadOnly: true,
      groupPolicy: "open",
      appToken: { source: "env", provider: "default", id: "SLACK_APP_TOKEN" },
      botToken: { source: "env", provider: "default", id: "SLACK_BOT_TOKEN" }
    }
  }
}
JSON5

kubectl -n openclaw-$INSTANCE rollout restart deployment/openclaw
```

**Pairing**: first DM from a new user prints a code; approve it once per user:

```bash
kubectl -n openclaw-$INSTANCE exec deploy/openclaw -c gateway -- \
  node /app/dist/index.js pairing approve slack <code>
```

The first user approved is auto-promoted to command owner; subsequent approvals can be done from Slack itself (`/claw-<name> pairing approve slack <code>`).

**What works, what doesn't**:

| Interface | Works | Notes |
|---|---|---|
| DM to bot | ✅ | First message triggers pairing flow |
| `@claw-<name>` in channel | ✅ | Invite bot to channel first |
| AI Assistant sidebar | ✅ | Uses `assistant_view` from manifest |
| `/claw-<name>` slash command | ❌ | Slack's 3-second ack deadline doesn't fit LLM inference latency. Use `@` instead. Leaving the command in the manifest is harmless. |

### API key (any provider)

Add to the Secret at creation time, or patch it later:

```bash
kubectl -n openclaw-$INSTANCE patch secret openclaw-secrets \
  --type=merge -p='{"stringData":{"ANTHROPIC_API_KEY":"sk-ant-..."}}'
kubectl -n openclaw-$INSTANCE rollout restart deploy/openclaw
```

The deployment reads `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, and `OPENROUTER_API_KEY` from `openclaw-secrets` (all `optional`).

## Exposing an instance publicly

Default = loopback bind, reachable only via `port-forward`. To expose an instance through Traefik (→ existing cloudflared tunnel on wood-node):

1. Uncomment `ingressroute.yaml` under `resources:` and the `patches:` block in the overlay's `kustomization.yaml`.
2. Edit the host in `ingressroute.yaml` and the `origins` array in `configmap-patch.yaml` to match.
3. `kubectl apply -k kustomize/openclaw/overlays/<name>`
4. Add the DNS record `<name>-claw.cellarwood.org → wood-node` (via Cloudflare).

The configmap patch flips the gateway bind from `loopback` to `any` — without it the IngressRoute hits a closed port inside the pod.

## Verify

```bash
kubectl -n openclaw-$INSTANCE get pod,pvc,svc
kubectl -n openclaw-$INSTANCE logs deploy/openclaw -c gateway --tail=50
kubectl -n openclaw-$INSTANCE port-forward svc/openclaw 18789:18789 &
curl -fsS http://localhost:18789/healthz
```

Pod restart should survive any chat-app link (`kubectl -n openclaw-$INSTANCE rollout restart deploy/openclaw`, then send a test message).

## Refreshing the vendored base

The five files under `base/` are vendored from [`openclaw/openclaw/scripts/k8s/manifests`](https://github.com/openclaw/openclaw/tree/main/scripts/k8s/manifests). Treat them as read-only mirrors; apply customisations only in overlays.

To refresh:

```bash
cd kustomize/openclaw/base
for f in kustomization.yaml configmap.yaml deployment.yaml pvc.yaml service.yaml; do
  curl -fsSL -o "$f" "https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/k8s/manifests/$f"
done
# After refresh, re-add the `images:` block in kustomization.yaml that pins the tag.
```

Image policy: the base tracks `ghcr.io/openclaw/openclaw:latest` with `imagePullPolicy: Always` patched in (upstream sets `IfNotPresent`, which would defeat `:latest`). The upstream deployment also references the non-existent `:slim` tag, so we always need this override.

Pin to a specific release tag for reproducibility by editing `newTag:` in `base/kustomization.yaml` (e.g. `newTag: "2026.3.1"`); the imagePullPolicy patch stays in either case.

## Out of scope

- **Sealed-secrets / external-secrets**: imperative `kubectl create secret` is enough while OpenClaw is the only secret-bearing workload here. Revisit when the second app lands.
- **NetworkPolicy**: upstream doesn't ship one; the gateway already binds to loopback by default. Add per-namespace policies if/when a public-facing instance needs lockdown.
- **Helm**: upstream is Kustomize-only. The per-instance shape (one namespace per overlay) is cleaner in Kustomize than in Helm values, so we don't wrap it.
