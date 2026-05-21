# Implementation Plan: Imagineer — On-Demand Custom 3D Printing

**Branch**: `001-imagineer-3d-printing` | **Date**: 2026-05-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-imagineer-3d-printing/spec.md`

## Summary

Imagineer is a customer-facing web platform that turns a text prompt or reference image into a printed physical object delivered to the customer's door. The implementation centres on three asynchronous pipelines tied together by a Postgres-backed job model: (1) **AI 3D generation** via a third-party generation provider (Meshy AI primary, abstracted behind an internal interface for swap), (2) **print-readiness validation** via PrusaSlicer headless CLI run inside a worker process, and (3) **fulfillment** via Stripe Checkout for payment + Shippo for shipping labels. The customer-facing surface is a single Next.js 14 app (App Router; Server Components for marketing/static, Client Components for the 3D viewer); long-running work is offloaded to a separate Node worker consuming a BullMQ queue on Redis. Three.js (via React Three Fiber) renders the in-browser preview from GLB. The MVP slices along the three user stories so P1 (text-to-print) is independently shippable.

## Technical Context

**Language/Version**: TypeScript 5.5+ (strict), Node.js 22 LTS

**Primary Dependencies**:
- Web app: Next.js 14 (App Router), React 18, Tailwind CSS, shadcn/ui, React Three Fiber + drei (Three.js), TanStack Query, React Hook Form + Zod
- API/auth: Auth.js v5, Stripe Node SDK, Resend (email), React Email
- Worker: BullMQ, Pino, child_process to PrusaSlicer CLI
- Generation provider: Meshy AI HTTP API (text-to-3D and image-to-3D); Tripo3D as documented fallback
- Shipping: Shippo Node SDK
- Address validation: SmartyStreets US Street Address API
- ORM: Drizzle ORM with Postgres driver

**Storage**:
- Postgres 16 (Neon serverless for MVP) — Customer, Order, GenerationJob, Model, Material, Shipment, ContentPolicyDecision
- Redis (Upstash) — BullMQ queue, idempotency keys, session-bound generation cache
- Object storage: Cloudflare R2 (S3-compatible) — uploaded reference images, generated GLB previews, sliced STL files, preview thumbnails

**Testing**:
- Unit: Vitest
- E2E: Playwright (against the Next.js app + a mocked generation provider)
- Worker integration: Vitest + Testcontainers (Postgres + Redis)
- Type-only verification: `tsc --noEmit` per Constitution Principle II

**Target Platform**:
- Server runtime: Linux (Vercel for the Next.js app, Fly.io for the worker, Neon for Postgres, Upstash for Redis, R2 for object storage)
- Client runtime: Current versions of Chrome, Safari, Firefox, Edge on desktop and iOS/Android; WebGL2 required for the 3D viewer; non-WebGL devices fall back to a generated thumbnail carousel

**Project Type**: Web application (frontend + API + background workers in a single TypeScript monorepo)

**Performance Goals** (derived from spec SC-001..SC-008):
- Median end-to-end "submit prompt → first viewable preview" ≤ 90 s (SC-007). Decomposes into: API accept ≤ 200 ms, generation provider median ≤ 70 s, GLB transfer + viewer paint ≤ 15 s on a 25 Mbps connection.
- Address validation API call ≤ 500 ms p95 (so it can run inline before payment per SC-008).
- 3D viewer steady-state ≥ 60 fps on a mid-range 2022 laptop with a model up to 5 MB GLB.

**Constraints**:
- **External-dependency latency**: generation provider, Stripe, SmartyStreets, Shippo, and Resend are all out-of-process; every call wrapped with timeout + bounded retry + observability hook.
- **Long-running jobs**: a generation can take 30–120 s; must be queued and not block any HTTP request. Vercel Functions are bypassed for these — workers run on Fly.io.
- **Idempotency**: Stripe webhooks and BullMQ job retries must be idempotent against the Order/GenerationJob state machines.
- **Content policy**: content-policy decisions must be made before the generation provider is called (cheap pre-check) AND verified again on the returned model (post-check, in case the provider produced borderline content).
- **PII boundary**: shipping address + email are PII; live in Postgres only, never in logs, never in object storage filenames.

**Scale/Scope**:
- Launch target: 100 orders/day at steady state, peaks of 10 concurrent generations.
- ~30 customer-facing screens/states (landing, prompt entry, preview+approve, material selector, checkout, account, order history, order detail, status emails).
- ~10 internal/admin states (operator dashboard for the in-house print queue, content-policy review queue).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The ratified constitution at `.specify/memory/constitution.md` is **scoped to Dex** (an Electron desktop orchestrator for Claude Code). Imagineer is a different product class (customer-facing web platform). The check below evaluates each principle's applicability and verdict for *this* feature.

| Principle / Section | Applicability to Imagineer | Verdict |
|---|---|---|
| I. Workflow Discipline (NON-NEGOTIABLE) | Process — applies to any project | PASS — plan ratified before code; bug investigations will reproduce first per the principle. |
| II. Test Before Report (NON-NEGOTIABLE) | Process — applies | PASS — every change will state a DoD checklist; UI changes verified via Playwright; type checks via `tsc --noEmit`; no completion claim without runtime verification. |
| III. Simplicity & YAGNI | Universal | PASS — single Next.js app + single worker process for MVP; no microservices, no GraphQL, no per-domain services. Functions kept under 100 lines. Errors fail fast at boundaries. |
| IV. Platform-Agnostic Core | Dex-specific (`src/core/` no Electron) | INAPPLICABLE AS WRITTEN — spirit preserved: business logic lives in framework-agnostic TypeScript modules under `packages/domain/` and is imported by both the Next.js app and the worker. No Next.js or Vercel-specific imports leak into domain code. |
| V. Continuous Cleanliness | Universal | PASS — dead code removed in same change; no `TODO` comments (issues tracked in spec-kit / GH); diagrams in mermaid; agent will not run `git commit` without explicit user instruction. |
| Technology Stack Constraints (Electron, React 18 renderer + IPC, CSS custom properties, no Tailwind, no React Router, etc.) | Dex-specific — locks a desktop stack | DEVIATION — logged in Complexity Tracking. Imagineer is a web platform; a desktop/IPC stack does not fit the product. **Recommend re-scoping the constitution before `/speckit.tasks` so the gate is non-ambiguous on subsequent runs.** |
| Development Workflow & Quality Gates (`dex-ecommerce` fixture path, `electron-chrome` MCP, `~/.dex/` log tree) | Dex-specific operational details | INAPPLICABLE AS WRITTEN — replaced for Imagineer with: Playwright for end-to-end verification against `pnpm dev`; Pino structured logs to stdout (collected by Vercel/Fly.io); Sentry for error capture. |
| Governance | Process | PASS — any deviation is logged in Complexity Tracking (below). |

**Gate result**: PASS conditional on the user accepting the constitution-scope finding. The five core process principles are honoured. The Dex-specific tech-stack and operational sections do not apply to a web product.

**Recommendation before `/speckit.tasks`**: amend the constitution to either (a) make the Tech Stack and Workflow sections explicitly Dex-only, or (b) ratify a separate `specs/001-imagineer-3d-printing/constitution.md` for this product. This plan proceeds under interpretation (a).

**Re-evaluation after Phase 1 design**: still PASS on the same basis. No new violations introduced by the design (data model, contracts, quickstart all stay within the same boundaries declared above).

## Project Structure

### Documentation (this feature)

```text
specs/001-imagineer-3d-printing/
├── spec.md              # Feature specification (already written)
├── plan.md              # This file
├── research.md          # Phase 0 output — provider/library decisions with rationale
├── data-model.md        # Phase 1 output — entity schema + state machines
├── quickstart.md        # Phase 1 output — local-dev bring-up + smoke test
├── contracts/           # Phase 1 output
│   ├── api.openapi.yaml # Customer + admin REST contract
│   └── events.md        # Async event contracts (BullMQ jobs, Stripe webhooks, generation provider callbacks)
├── checklists/
│   └── requirements.md  # From /speckit.specify
└── tasks.md             # /speckit.tasks output (not yet generated)
```

### Source Code (repository root)

Imagineer is a TypeScript monorepo managed with **pnpm workspaces** + **Turborepo**. Root layout:

```text
apps/
├── web/                       # Next.js 14 app — customer-facing pages + API routes + admin dashboard
│   ├── app/                   # App Router (route groups: (marketing), (order-flow), (account), admin)
│   ├── components/            # UI components (3D viewer, prompt input, material selector, checkout step)
│   ├── lib/                   # Web-only adapters (auth client, fetcher wrappers)
│   └── tests/                 # Playwright e2e + component tests
└── worker/                    # Long-running job consumer (BullMQ)
    ├── src/
    │   ├── consumers/         # generation, print-readiness, fulfillment-handoff, email
    │   └── slicer/            # PrusaSlicer wrapper (child_process)
    └── tests/

packages/
├── domain/                    # Pure TS business logic — entities, state machines, content-policy rules
│   └── src/
│       ├── order/             # Order state machine
│       ├── generation/        # GenerationJob state machine
│       ├── pricing/           # Price-from-volume calculator
│       └── policy/            # Content-policy rule set
├── db/                        # Drizzle schema, migrations, typed query helpers
│   ├── schema/
│   └── migrations/
├── providers/                 # Outbound integrations (each behind a small interface)
│   ├── generation/            # Meshy primary + Tripo fallback adapter
│   ├── payments/              # Stripe wrapper
│   ├── shipping/              # Shippo wrapper
│   ├── address/               # SmartyStreets wrapper
│   ├── storage/               # R2 (S3) wrapper
│   └── email/                 # Resend wrapper
├── shared/                    # Cross-cutting types + Zod schemas (request/response shapes shared web<->worker)
└── config/                    # Runtime env loader (Zod-validated), feature flags

infra/
├── docker/                    # Local Postgres + Redis + MinIO (R2 stand-in) for dev
└── prusaslicer/               # Pinned PrusaSlicer binary + base profile per material
```

**Structure Decision**: **Web application monorepo (Option 2 from the template, adapted)**. Rationale: the product has both a customer-facing UI surface and a long-running backend pipeline that cannot run inside a serverless function; a single repo with clear `apps/web` + `apps/worker` separation lets us share `packages/domain` (the platform-agnostic business logic per Constitution Principle IV's spirit) and `packages/db` between them without service boundaries. This avoids the YAGNI violation a microservice split would introduce at MVP scale (100 orders/day target).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Constitution scope mismatch — the ratified constitution's Tech Stack section describes a desktop Electron stack; this plan adopts a web stack (Next.js, Tailwind, Auth.js) instead. | The ratified constitution belongs to a different product (Dex). Imagineer cannot ship as an Electron desktop app — the spec mandates a browser-based 3D preview, customer accounts, payment, and shipping, all of which are web-platform problems. | (a) Forcing Imagineer into Electron would make it undeliverable to the customer audience defined in the spec (gift-buyers, hobbyists with no software to install) and would still require a backend service for fulfillment, doubling the surface. (b) Skipping Imagineer to keep constitutional purity is not an option — the spec is the user's chosen feature. **Action item**: before `/speckit.tasks`, amend `.specify/memory/constitution.md` to either explicitly scope the Tech Stack section to Dex, or ratify a parallel constitution for Imagineer. |
| Two runtime processes (Next.js app + dedicated worker) instead of one. | Generation jobs take 30–120 s; serverless function timeouts and connection-pool overhead make this fail unreliably inside the web tier. | Single Vercel deployment with a synchronous `/api/generate` endpoint was rejected because Vercel function caps and the customer-visible failure mode (request times out mid-generation, no recovery) make it unworkable. The worker also lets generation, slicing, and fulfillment retries be observed and replayed independently. |
| Two object stores in dev (R2 in prod, MinIO in dev) | Local dev cannot depend on a real R2 account; MinIO is the standard S3-compatible local stand-in. | Pointing dev at a real R2 bucket was rejected because it leaks credentials into developer machines and rate-limits parallel test runs. |
