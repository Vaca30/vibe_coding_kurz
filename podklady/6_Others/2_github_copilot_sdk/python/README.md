# GitHub Copilot SDK — Python Tutorial

This folder mirrors the structure of the Claude Agent SDK course but uses the
[GitHub Copilot SDK](https://github.com/github/copilot-sdk) instead.

Every numbered example introduces one concept; later examples build on earlier
ones.

## Prerequisites

* Python 3.11+
* A GitHub Copilot subscription, **or** an API key for a supported provider
  (OpenAI, Azure, Anthropic) if you want to use BYOK in `1b_local_model.py`.

The Copilot CLI binary is bundled with the `github-copilot-sdk` package, so
you do not need to install it separately.

## Install

```bash
cd python
pip install -e .
```

Authenticate (one of):

```bash
# Option A — log in to your GitHub Copilot account once:
copilot auth login

# Option B — set a token in the environment:
export GH_TOKEN=ghp_...
```

## Run an example

```bash
python 1_single_agent/0a_simplest_agent.py
```

## Layout

```
1_single_agent/   one concept per file (simplest → skills/plugins/marketplace)
2_multi_agent/    collaboration, supervisor, swarm patterns
3_workflows/      sequential, parallel, conditional, loop pipelines
```

## Mapping notes (Claude Agent SDK ↔ Copilot SDK)

| Claude SDK                                | Copilot SDK equivalent                                              |
| ----------------------------------------- | ------------------------------------------------------------------- |
| `query()` (stateless)                     | A short-lived `CopilotSession` (sessions are always stateful)       |
| `ClaudeSDKClient` (stateful)              | `CopilotSession` — built-in conversation memory                     |
| `streaming=True` + partial messages       | `streaming=True` + `assistant.message_delta` events                 |
| Local model via env vars                  | `provider=ProviderConfig(...)` (BYOK)                               |
| `system_prompt`                           | `system_message={"mode": "append"\|"replace"\|"customize", ...}`    |
| `permission_mode`                         | `on_permission_request` callback                                    |
| `output_format=json_schema`               | Not native — examples use prompt-driven JSON + `pydantic` parsing   |
| `allowed_tools=[...]`                     | `available_tools=[...]` / `excluded_tools=[...]`                    |
| `@tool` + `create_sdk_mcp_server`         | `@define_tool` decorator (returns a `Tool` you pass to the session) |
| `mcp_servers={...}`                       | `mcp_servers={...}` (same idea, slightly different schema)          |
| Hooks (`PreToolUse`, etc.)                | Hooks (`on_pre_tool_use`, `on_post_tool_use`, …)                    |
| `AgentDefinition`                         | `custom_agents=[{name, description, prompt, tools, ...}]`           |
| Skills (`.claude/skills/<name>/SKILL.md`) | Skills (`./skills/<name>/SKILL.md`, `skill_directories=[...]`)      |
| Plugins                                   | Not native — example shows a folder layout convention               |
| Marketplace                               | Not native — example shows a git-cloned plugin index                |

## Authentication & BYOK

The Copilot SDK supports several auth methods (logged-in user, `GH_TOKEN`,
custom OAuth). For BYOK, configure a `ProviderConfig` on the session — see
[`1_single_agent/1b_local_model.py`](1_single_agent/1b_local_model.py).
