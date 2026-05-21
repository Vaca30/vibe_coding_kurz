# GitHub Copilot SDK — TypeScript Tutorial

This folder mirrors the structure of the Claude Agent SDK course but uses the
[GitHub Copilot SDK](https://github.com/github/copilot-sdk) instead.

Every numbered example introduces one concept; later examples build on earlier
ones.

## Prerequisites

* Node.js 18+
* A GitHub Copilot subscription, **or** an API key for a supported provider
  (OpenAI, Azure, Anthropic) if you want to use BYOK in `1b_local_model.ts`.

The Copilot CLI binary is bundled with the `@github/copilot-sdk` package, so
you do not need to install it separately.

## Install

```bash
cd typescript
npm install
```

Authenticate (one of):

```bash
# Option A — log in to your GitHub Copilot account once:
npx @github/copilot auth login

# Option B — set a token in the environment:
export GH_TOKEN=ghp_...
```

## Run an example

```bash
npx tsx src/1_single_agent/0a_simplest_agent.ts
```

## Layout

```
src/1_single_agent/   one concept per file (simplest → skills/plugins/marketplace)
src/2_multi_agent/    collaboration, supervisor, swarm patterns
src/3_workflows/      sequential, parallel, conditional, loop pipelines
```

## Mapping notes (Claude Agent SDK ↔ Copilot SDK)

| Claude SDK                                | Copilot SDK equivalent                                              |
| ----------------------------------------- | ------------------------------------------------------------------- |
| `query()` (stateless)                     | A short-lived `CopilotSession` (sessions are always stateful)       |
| `ClaudeSDKClient` (stateful)              | `CopilotSession` — built-in conversation memory                     |
| `streaming: true` + partial messages      | `streaming: true` + `assistant.message_delta` events                |
| Local model via env vars                  | `provider: { ... }` (BYOK)                                          |
| `systemPrompt`                            | `systemMessage: { mode: "append"\|"replace"\|"customize", ... }`    |
| `permissionMode`                          | `onPermissionRequest` callback                                      |
| `outputFormat: { type: "json_schema" }`   | Not native — examples use prompt-driven JSON + `zod` parsing        |
| `allowedTools: [...]`                     | `availableTools: [...]` / `excludedTools: [...]`                    |
| `tool()` + `createSdkMcpServer`           | `defineTool()` (returns a `Tool` you pass to the session)           |
| `mcpServers: {...}`                       | `mcpServers: {...}` (same idea, slightly different schema)          |
| Hooks (`PreToolUse`, etc.)                | Hooks (`onPreToolUse`, `onPostToolUse`, …)                          |
| `AgentDefinition`                         | `customAgents: [{ name, description, prompt, tools, ... }]`         |
| Skills (`.claude/skills/<name>/SKILL.md`) | Skills (`./skills/<name>/SKILL.md`, `skillDirectories: [...]`)      |
| Plugins                                   | Not native — example shows a folder layout convention               |
| Marketplace                               | Not native — example shows a git-cloned plugin index                |

## Authentication & BYOK

The Copilot SDK supports several auth methods (logged-in user, `GH_TOKEN`,
custom OAuth). For BYOK, configure a `provider` on the session — see
[`src/1_single_agent/1b_local_model.ts`](src/1_single_agent/1b_local_model.ts).
