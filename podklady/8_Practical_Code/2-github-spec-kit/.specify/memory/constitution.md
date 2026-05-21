<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 1.1.0
Bump rationale: MINOR — scopes the Technology Stack Constraints and
Development Workflow & Quality Gates sections explicitly to Dex (the original
product). Adds new "Cross-Project Principles" framing so the five core
principles bind every product in this repo while product-specific operational
details live under product-named subsections. No principle was removed or
weakened (no MAJOR); change is structural plus a new Imagineer subsection
(more than a clarification, hence not PATCH).

Triggered by: /speckit.plan for feature 001-imagineer-3d-printing surfaced a
gate-conflict — the Tech Stack section described an Electron desktop app, but
Imagineer is a customer-facing web platform. This amendment closes that gate
finding so subsequent /speckit.* runs are non-ambiguous.

Modified sections:
  - Technology Stack Constraints → renamed to "Product-Specific Stacks" with
    a "Dex (desktop orchestrator)" subsection containing the original content
    verbatim, plus a new "Imagineer (customer web platform)" subsection
    capturing the stack ratified in specs/001-imagineer-3d-printing/plan.md.
  - Development Workflow & Quality Gates → split into shared rules + a
    "Dex-specific operations" subsection (fixture path, electron-chrome MCP,
    ~/.dex log tree) + an "Imagineer-specific operations" subsection
    (Playwright, Pino + Vercel/Fly logs, Sentry).

Unchanged: all five Core Principles (I–V), Governance, version-policy text.

Templates requiring updates:
  - ✅ .specify/templates/plan-template.md — Constitution Check is runtime-
    resolved; new product subsections automatically considered by the gate.
  - ✅ .specify/templates/spec-template.md — no change needed.
  - ✅ .specify/templates/tasks-template.md — no change needed.
  - ✅ .claude/CLAUDE.md, .claude/rules/*.md — Dex-specific content remains
    accurate; no edit required.

Deferred / TODO: none.
-->

# Dex Constitution

## Core Principles

### I. Workflow Discipline (NON-NEGOTIABLE)

Every prompt that results in a code change MUST follow the five-step workflow in
order: **Understand → Plan → Implement → Test → Report**. Steps MUST NOT be
skipped or reordered. The Plan step MAY be skipped only for trivial changes
(typo, one-line fix, config tweak), and only after explicitly stating the intent
to proceed. For bug reports, the Understand step MUST include reproducing the
issue (via logs, audit JSON, or the chrome-devtools MCP) before any fix is
attempted.

**Rationale**: The orchestrator engine and Electron/IPC surface are tightly
coupled across processes. Ad-hoc edits without a planning step produce
regressions across the renderer↔main boundary that are expensive to diagnose
through the per-run log tree. Process discipline is cheaper than debugging.

### II. Test Before Report (NON-NEGOTIABLE)

No change MAY be reported as complete without prior verification. The agent
MUST write a Definition of Done checklist into the conversation before testing,
then exercise the change. UI/renderer changes MUST be verified through the
`electron-chrome` MCP (CDP port 9333) against the dev server. Core engine
changes MUST at minimum pass `npx tsc --noEmit`. IPC/main process changes MUST
be verified by inspecting `~/.dex/dev-logs/electron.log` for clean startup and
exercising the affected `window.dexAPI.*` round-trips. Non-testable changes
(docs, comments, build scripts) MUST state explicitly why no runtime test
applies.

**Rationale**: TypeScript compilation and unit tests verify code correctness,
not feature correctness. The user has been burned repeatedly by "looks right"
changes that broke at runtime. Self-verification is the agent's responsibility,
never the user's.

### III. Simplicity & YAGNI

Code MUST favor the simplest design that satisfies current requirements.
Speculative abstractions, unused indirection, and forward-compatibility scaffolds
are forbidden. Functions SHOULD remain under 20 lines and MUST stay under 100.
Naming MUST be self-documenting; comments explain *why*, never *what*. Errors
MUST fail fast and explicitly with typed exceptions; silent catches are
forbidden. Inputs MUST be validated at system boundaries (IPC handlers, file I/O,
external SDK calls), not redundantly in internal helpers.

**Rationale**: The codebase is already three layers (main, core, renderer) with
an SDK-driven async event stream on top. Every additional abstraction multiplies
the surface for divergence between the audit JSON, log tree, and live state.

### IV. Platform-Agnostic Core

`src/core/` MUST contain zero Electron imports and zero references to
`window.*`, `ipcMain`, or `webContents`. The orchestrator engine MUST be
runnable as plain Node.js so it can be exercised standalone without booting the
Electron shell. All bridging between core and Electron MUST happen in
`src/main/ipc/`. New shared types MUST live in `src/core/types.ts` and be
imported by both sides.

**Rationale**: The "Ralph Wiggum" spawn pattern depends on the orchestrator
being process-agnostic. Coupling it to Electron blocks unit tests, blocks future
headless modes, and forces every regression to be reproduced through the full
desktop UI.

### V. Continuous Cleanliness

Code MUST be cleaned as it is written, not "later". Dead code (unused
functions, variables, imports, types, commented-out blocks) MUST be removed in
the same change that orphans it. `TODO` comments are forbidden — open work goes
into spec-kit task files or GitHub issues, never code. Diagrams MUST be authored
in mermaid. The agent MUST NOT run `git commit` (or any destructive git command)
unless the user explicitly instructs it.

**Rationale**: This repo accumulates orchestrator state, log trees, and audit
JSON per run; sloppy code rot compounds with that operational surface and makes
the diagnostic tooling (DEBUG badge → log file pivot) unreliable. The git
prohibition exists because the user maintains commit semantics deliberately.

## Product-Specific Stacks

The five Core Principles above bind every product in this repository.
Tech-stack constraints are product-scoped — each subsection below is
authoritative only for that product. Deviations MUST be justified in a
Complexity Tracking entry on the relevant plan and approved by the user before
implementation.

### Dex (desktop orchestrator)

- **Runtime shell**: Electron with frameless `BrowserWindow` and a custom title
  bar.
- **Renderer**: React 18 with local `useState`/`useEffect` for state
  management. Redux, Zustand, MobX, and equivalent global stores are forbidden.
- **Routing**: None. The renderer is a single-page app; no React Router.
- **Styling**: CSS Custom Properties only (Catppuccin-inspired dark theme).
  Tailwind, CSS-in-JS runtimes, and CSS frameworks are forbidden.
- **Animations**: GSAP, scoped to step-insertion in the Agent Trace timeline.
- **Icons**: Lucide React.
- **Build**: Vite for the renderer; TypeScript with `strict` mode across all
  three layers.
- **Orchestration**: `@anthropic-ai/claude-agent-sdk` via the `query()` async
  generator with `PreToolUse`, `PostToolUse`, `SubagentStart`, and
  `SubagentStop` hooks for step capture.
- **IPC**: `ipcMain.handle` for request/response, `webContents.send` for event
  streaming. The renderer surface MUST be exposed exclusively through
  `contextBridge.exposeInMainWorld("dexAPI", ...)` in the preload script.
- **Scripting**: TypeScript/Node.js by default. Shell scripts only for trivial
  one-liners.

### Imagineer (customer web platform)

Authoritative source: `specs/001-imagineer-3d-printing/plan.md`. Summary:

- **Runtime**: Node.js 22 LTS (or current LTS) on Linux servers; modern
  evergreen browsers on the client (WebGL2 required for the 3D viewer).
- **Web app**: Next.js 14 (App Router), React 18, Tailwind CSS, shadcn/ui.
  React Three Fiber + drei for the 3D viewer. TanStack Query for server state;
  React Context for ephemeral session state. No Redux/Zustand at MVP scale.
- **Worker**: Standalone Node process consuming BullMQ queues on Redis. Long-
  running jobs MUST NOT live inside Vercel Functions.
- **Auth**: Auth.js v5, magic-link only at MVP.
- **Storage**: Postgres via Drizzle ORM; Redis (Upstash) for queues +
  idempotency cache; S3-compatible object storage (Cloudflare R2 in prod,
  MinIO in local dev) for images/models/STLs.
- **Outbound integrations**: Stripe Checkout (payment), Shippo (shipping),
  SmartyStreets (address validation), Resend (email), Meshy/Tripo (3D
  generation). Each lives behind a small interface in `packages/providers/`
  so it is swappable.
- **Domain core**: Pure TypeScript modules in `packages/domain/` — no Next.js
  or framework imports — shared between `apps/web` and `apps/worker`. This is
  the Principle IV (Platform-Agnostic Core) realisation for Imagineer.
- **Build**: pnpm workspaces + Turborepo; Biome for lint/format; TypeScript
  `strict` everywhere.

## Development Workflow & Quality Gates

The following rules are universal:

- **Plan approval**: For non-trivial changes, the agent MUST present a plan and
  obtain user approval before writing code. Iteration on the plan is preferred
  over rework on the implementation.
- **Definition of Done**: Each change MUST have an explicit DoD checklist
  written into the conversation before the Test step begins.
- **Reporting**: The Report step MUST state what was implemented, what was
  tested with what evidence (screenshots, log excerpts, test output), and
  whether spec/feature documentation was updated or why it was skipped.

### Dex-specific operations

- **End-to-end UI verification**: Any change exercising the welcome → loop
  start → autonomous run path MUST drive the app against the `dex-ecommerce`
  example project, reset via `scripts/reset-example-to.sh` to a checkpoint
  appropriate for the affected stage. The fixture script and
  `prune-example-branches.sh` are the only authorized destructive paths against
  `dex-ecommerce`; they MUST NOT be run against any other repo.
- **Dev server authority**: The agent is authorized to start and restart
  `dev-setup.sh` in the background and MUST wait for the readiness lines
  (`ready in` in `vite.log`, `DevTools listening on ws://127.0.0.1:9333` in
  `electron.log`) before issuing CDP commands.
- **Diagnostics order**: When investigating runtime issues, the agent MUST
  consult sources in escalating cost order: `~/.dex/dev-logs/`, then per-run
  logs at `~/.dex/logs/<project>/<runId>/`, then per-project state at
  `<projectDir>/.dex/`, then audit JSON at `<projectDir>/.dex/runs/<runId>.json`,
  then renderer DevTools console via the chrome-devtools MCP, then the in-app
  DEBUG badge. Cheaper sources MUST be exhausted before more expensive ones.

### Imagineer-specific operations

- **End-to-end UI verification**: Use Playwright against `pnpm dev`, with the
  mock generation provider in `infra/mocks/generation/` substituted for Meshy
  and Stripe in test mode. One Playwright suite per spec user story (`P1: …`,
  `P2: …`, `P3: …`).
- **Dev server authority**: The agent is authorized to run
  `docker compose -f infra/docker/docker-compose.yml up -d` and start
  `pnpm dev` (web + worker via Turborepo) in the background.
- **Diagnostics order**: stdout (Pino JSON) → Vercel/Fly.io log streams →
  Sentry → Postgres `order_event` audit table → R2/MinIO object inspection.
  Cheaper sources first.

## Governance

This constitution supersedes all other practices in the repository. In any
conflict between this document and a rule file under `.claude/rules/`, this
document wins, and the conflicting rule MUST be reconciled or removed in the
same change that surfaces the conflict.

**Amendment procedure**: Amendments are proposed by editing
`.specify/memory/constitution.md` via the `/speckit.constitution` flow. Each
amendment MUST include an updated Sync Impact Report at the top of the file
listing modified principles, added/removed sections, and the templates
re-validated. Amendments take effect when the file is committed.

**Versioning policy**: Semantic versioning applies to this document.
- **MAJOR** — Backward-incompatible governance changes, principle removal, or
  redefinition that invalidates prior compliance reasoning.
- **MINOR** — New principle or section added, or material expansion of an
  existing principle's scope.
- **PATCH** — Clarifications, wording fixes, typo corrections, or refinements
  that do not change the binding meaning.

**Compliance review**: Every PR/review MUST verify compliance with the
principles above. Any complexity that violates a principle MUST be recorded in
the Complexity Tracking section of the relevant plan with the simpler
alternative and the reason it was rejected. Use `.claude/CLAUDE.md` and the
files under `.claude/rules/` for runtime development guidance; both must remain
consistent with this constitution.

**Version**: 1.1.0 | **Ratified**: 2026-05-05 | **Last Amended**: 2026-05-05
