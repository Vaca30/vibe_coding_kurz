# 2_subagent_spawns_subagent

Codex example for `subagent -> subagent`.

This scenario uses a production-style incident investigation in `./my-ecommerce`.

Pull via `git clone https://github.com/lukaskellerstein/my-ecommerce.git`

## Prompt

```text
Spawn incident_commander to investigate why newly added products are not showing up in search in ./my-ecommerce. Let it delegate deeper if the issue spans ingestion and user impact.
```

`incident_commander` is the first-level worker. It can spawn:

- `timeline_reconstructor`
- `customer_impact_analyst`

This folder sets `agents.max_depth = 2` so that a subagent can delegate one level deeper.

## Current Status

On `codex-cli 0.117.0`, the first-level worker does attempt deeper delegation, but the nested flow is not currently reliable.

Reproduction:

```text
codex exec --json "Spawn incident_commander to investigate why newly added products are not showing up in search in ./4_subagents/my-ecommerce. Let it delegate deeper if the issue spans ingestion and user impact."
```

Observed behavior:

- the top-level session successfully spawns `incident_commander`
- the nested investigation path then hits `invalid agent id agent_...` inside the router
- the child falls back to local investigation instead of integrating a deeper worker report

So if this exercise appears not to spawn the second-level subagent, the blocker is currently the CLI/toolchain id handling rather than the local `agents.max_depth` configuration.
