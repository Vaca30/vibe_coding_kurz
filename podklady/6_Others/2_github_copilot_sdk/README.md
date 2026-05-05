# GitHub Copilot SDK — Tutorial

Hands-on tutorial covering every major capability of the
[GitHub Copilot SDK](https://github.com/github/copilot-sdk), in both
**Python** and **TypeScript**.

The lesson plan mirrors the layout of the Claude Agent SDK course:
single-agent fundamentals → multi-agent patterns → workflow orchestration.

## Contents

| Folder                                           | Topic                                                                            |
| ------------------------------------------------ | -------------------------------------------------------------------------------- |
| [`python/`](python/)                             | Python tutorial (uses `github-copilot-sdk`)                                      |
| [`typescript/`](typescript/)                     | TypeScript tutorial (uses `@github/copilot-sdk`)                                 |

Each language directory has the same lesson layout:

```
1_single_agent/
  0a/0b   first session, then with streaming
  1a/1b   model selection, BYOK with a local model
  2a/2b   session options + per-section system-prompt customization
  3       structured output (prompt-driven, validated with pydantic/zod)
  4a/b/c  predefined tools / custom in-process tools / external MCP
  5       session memory (within run + resume across runs)
  6       hooks (pre/post tool, user prompt)
  7       custom (sub-)agents
  8       custom agents with their own tools
  9_skills        skill files (SKILL.md) and discovery
  10_plugins      ad-hoc plugin convention (manifest + skills + agents)
  11_marketplace  multi-plugin index loaded from a folder
2_multi_agent/
  1 collaboration / 2 supervisor / 3 swarm
3_workflows/
  1 sequential / 2 parallel / 3 conditional / 4 loop
```

## Prerequisites

* A GitHub Copilot subscription (or BYOK to OpenAI/Azure/Anthropic).
* Python 3.11+ **or** Node.js 18+ depending on which side you're using.

The Copilot CLI binary is bundled with both SDKs, so no separate installation
is required.

## Quick start

```bash
# Python
cd python
pip install -e .
python 1_single_agent/0a_simplest_agent.py

# TypeScript
cd typescript
npm install
npx tsx src/1_single_agent/0a_simplest_agent.ts
```

Each language directory has its own `README.md` with installation and auth
details, and a Claude → Copilot mapping table for readers coming from the
Claude Agent SDK course.
