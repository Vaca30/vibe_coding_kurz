# Phase 0 Research: Imagineer

**Feature**: 001-imagineer-3d-printing
**Date**: 2026-05-05
**Purpose**: Resolve every technology and provider choice surfaced by the Technical Context in `plan.md`. Each decision is recorded with its rationale and the alternatives considered, so a reader landing on `tasks.md` can understand *why* without re-running the search.

---

## 1. AI 3D Generation Provider

**Decision**: **Meshy AI** as the primary provider for both text-to-3D and image-to-3D, accessed via its asynchronous HTTP API. **Tripo3D** wired in as a documented secondary provider behind the same internal interface, dormant by default.

**Rationale**:
- Meshy supports both input modes the spec requires (text + image) under one API surface, returning GLB (preview-ready) and a refined high-poly variant suitable for slicing.
- Asynchronous job model — submit returns a job id, poll or webhook for completion — fits the BullMQ worker pattern cleanly.
- Median wall time for a "preview-quality" model is reported in the 30–90 s range, which fits SC-007 (median ≤ 90 s prompt-to-preview).
- Pricing is per-generation, predictable, and includes commercial-use rights, which is necessary because we resell the printed object.

**Alternatives considered**:
- **Tripo3D**: comparable quality on text-to-3D, sometimes better on image-to-3D, slightly cheaper per generation. Kept as a fallback so we are never single-vendor — but its API shape is similar enough that one adapter abstraction covers both.
- **Stability AI Stable Fast 3D / SF3D**: open-weights, can self-host. Rejected for MVP because self-hosting GPU inference adds a whole infra surface (GPU nodes, model storage, autoscaling) that contradicts YAGNI at 100 orders/day. Revisit if per-generation cost becomes the dominant unit economics line.
- **OpenAI / Google text-to-3D**: not a published GA product as of planning date.

**Adapter contract** (`packages/providers/generation`): a single `GenerationProvider` interface with `submit(input: TextOrImageInput): Promise<ProviderJobId>` and `poll(id: ProviderJobId): Promise<JobStatus>`. Both Meshy and Tripo implement this. Output is normalised to `{ glbUrl, refinedGlbUrl?, previewThumbnailUrl, providerJobId }`.

---

## 2. Print-Readiness Validation & Slicing

**Decision**: **PrusaSlicer 2.7+ headless CLI** wrapped in a child_process from the worker, with a per-material Prusa `.ini` profile pinned in `infra/prusaslicer/`.

**Rationale**:
- PrusaSlicer is the de-facto industry standard for FDM/SLA slicing and is open source. Its CLI emits structured output — print time, filament/resin volume, layer count, bounding box — that maps directly to the spec's SC-002 (firm price + delivery estimate before payment).
- Wall-thickness and manifold checks are performed by the slicer's pre-process step; failure modes are surfaced as exit codes + stderr messages we parse into a typed verdict.
- Self-hosting is acceptable here (CPU only, no GPU) because slicing is bursty and deterministic.

**Alternatives considered**:
- **CuraEngine**: comparable, also open source, but its CLI surface is less stable across versions and the profile ecosystem is smaller.
- **Slant3D / Hubs API**: managed service, would let us skip slicing entirely. Rejected for MVP because the spec mandates *in-house* fulfillment (Assumption: "in-house fulfillment"); we still need slicing for our own queue.
- **three-bvh-csg / @thatopen/components in Node**: in-process geometry validation in TypeScript. Rejected because it doesn't produce a sliceable G-code file or accurate volume/time estimates — we'd reinvent the slicer.

**Worker shape**: `apps/worker/src/slicer/` exposes `slice(stlPath, material): Promise<SliceVerdict>`. A failed verdict feeds back into the GenerationJob state machine (`needs_repair` or `rejected`).

---

## 3. Web Framework & Rendering Strategy

**Decision**: **Next.js 14 App Router** with Server Components for marketing/account/admin and Client Components for the interactive 3D preview and material selector.

**Rationale**:
- App Router's per-route boundary maps cleanly to the spec's user stories: `(marketing)` (server-rendered, SEO-relevant), `(order-flow)` (client-rendered around the 3D viewer + Stripe Elements), `(account)` (mixed), `admin/` (mostly server, gated by middleware).
- Streaming and Suspense let us render the page shell instantly while the 3D viewer hydrates with the GLB once it's ready (SC-001/SC-007).
- Same-process API routes for short, customer-facing endpoints (`POST /api/generations` to enqueue, `POST /api/orders/checkout` to start Stripe). Long-running work goes to the worker via BullMQ, not into a function.

**Alternatives considered**:
- **Remix**: comparable DX. Rejected because Vercel/Next is the default deployment target and the team's prior 3D + Three.js examples are predominantly Next.
- **SvelteKit / SolidStart**: smaller community for the React-Three-Fiber ecosystem we depend on.
- **SPA with separate API**: would force two repos, two deploy pipelines, two auth surfaces. Violates YAGNI at MVP scale.

---

## 4. In-Browser 3D Preview

**Decision**: **React Three Fiber (R3F)** + **drei** helpers, rendering GLB via `useGLTF`. The viewer is wrapped in a `<Suspense>` boundary so the surrounding page can render without blocking on the model load.

**Rationale**:
- R3F is the React-idiomatic wrapper around Three.js; matches the rest of the stack.
- `drei` provides ready-made `OrbitControls`, `Environment`, and `Bounds` helpers that satisfy FR-006 (rotate/zoom/pan + sensible default framing) without bespoke camera math.
- GLB is the right wire format: compact, supports embedded materials and textures, and is what Meshy returns natively.

**Alternatives considered**:
- **model-viewer (Google web component)**: simpler API, fewer customisation hooks. Rejected because we want fine control over the loading state, error fallback, and preview-vs-final variant switching.
- **babylon.js**: heavier bundle, less React-native ecosystem.

**Fallback**: devices without WebGL2 receive a generated still-image carousel (six fixed angles rendered server-side after generation completes). Implemented via R3F's `useFrame` snapshot in a headless Puppeteer pass triggered by the worker.

---

## 5. State Management (Client)

**Decision**: **TanStack Query** for all server-derived state (generation job status, order, material catalog), **React Context** for ephemeral session state (current draft prompt, candidate models being compared). No Redux, no Zustand.

**Rationale**:
- TanStack Query's `useQuery` + `refetchInterval` gives us long-poll behaviour for generation status without writing a state machine.
- `useMutation` + optimistic update fits the "approve model" UX where we want the UI to advance immediately.
- Context is enough for the small piece of session-only state; reaching for Zustand would be premature.

**Alternatives considered**:
- **SWR**: comparable. Rejected because TanStack Query has richer mutation/optimistic handling and is better documented for the App Router server-action interaction we want.
- **Zustand**: would introduce a global store before there's a real cross-route shared state need.

---

## 6. Auth

**Decision**: **Auth.js v5** (Next.js adapter) with **email magic link** as the only sign-in method for MVP. **Guest checkout** is implemented as "enter email → magic-link sign-in inside the order flow"; a Customer record is created on first email submission.

**Rationale**:
- Magic link removes password handling entirely (no password reset flow, no breach risk for MVP) — a meaningful simplification.
- Auth.js is open source, well-maintained, and the official adapter for Next.js App Router is stable.
- The "guest checkout = magic-link mid-flow" pattern means there is exactly one identity model in the system; no second-class anonymous user objects to reconcile later.

**Alternatives considered**:
- **Clerk**: turnkey, beautiful UI components, but vendor-locks identity into Clerk's data model and is unnecessary expense at MVP volume.
- **Email + password**: adds password storage, reset flow, breach hygiene, lockout policy — all surface area we don't need to satisfy the spec.
- **OAuth (Google/Apple)**: deferred. Easy to add later via Auth.js providers if signups stall.

---

## 7. Payments

**Decision**: **Stripe Checkout (hosted)** for MVP, `payment_intent.succeeded` webhook drives the Order state transition into `paid`. Billing address is collected by Stripe; shipping address is collected separately in our app and validated via SmartyStreets *before* the Checkout session is created (so we never charge an undeliverable order — supports SC-008).

**Rationale**:
- Hosted Checkout means Stripe handles PCI scope, Apple/Google Pay rendering, 3DS, and tax. We integrate with one webhook and one redirect URL.
- Stripe's webhook signature verification + idempotent event handling (event id table) covers FR-014 cleanly.
- Refunds (for the spec's reprint/return path, FR-018) are one Stripe Dashboard action plus a state transition.

**Alternatives considered**:
- **Stripe Elements (embedded)**: better UX cohesion, but adds PCI surface and frontend complexity we don't need for MVP.
- **Lemon Squeezy / Paddle**: merchant-of-record options, useful for tax but heavier integration. Revisit when international shipping is on the roadmap.

---

## 8. Address Validation

**Decision**: **SmartyStreets US Street Address API**, called inline before the Stripe Checkout session is created.

**Rationale**:
- Sub-500 ms p95 hits our perf budget for inline validation.
- Returns a `dpv_match_code` and component-level normalisation (street/city/state/ZIP+4) — sufficient to bounce undeliverable addresses before payment per SC-008.
- US-only, which matches the spec's single-region MVP assumption.

**Alternatives considered**:
- **Lob**: comparable. SmartyStreets has slightly faster median latency in published benchmarks.
- **USPS Web Tools**: free, but slower and rate-limited; not appropriate for inline checkout.
- **Skip validation, rely on Stripe**: rejected because Stripe Checkout's address autocomplete does not guarantee deliverability.

---

## 9. Shipping & Labels

**Decision**: **Shippo** for rate quoting at checkout and label generation at fulfillment. USPS Ground Advantage as the default carrier, with UPS Ground as the expedited option.

**Rationale**:
- Shippo is multi-carrier behind one API and one bill — minimises integration count.
- Real-time rate quotes at checkout let us show a firm shipping price (FR-012).
- Tracking webhooks support the milestone notifications in FR-016.

**Alternatives considered**:
- **EasyPost**: comparable, slightly more enterprise-leaning pricing. Shippo's docs/SDKs are better for the Node + small-volume case.
- **Carrier-direct integrations (USPS, UPS)**: 4× the integration work and 4× the failure modes for no MVP gain.

---

## 10. Email & Notifications

**Decision**: **Resend** as the transactional email provider, with templates authored in **React Email**. The four spec-required milestones (order received / in production / shipped / delivered) are fired by the worker after each Order state transition. SMS deferred (out of scope for MVP).

**Rationale**:
- Resend has a clean API, generous free tier, and React Email integration removes the "HTML email is a different language" problem.
- The four templates can be co-located with the rest of the React tree, share components, and be previewed in dev.

**Alternatives considered**:
- **Postmark / SendGrid**: mature, fine. Resend wins on DX and React Email support for a Next.js codebase.
- **Mailgun**: deliverability is solid, DX is dated.

---

## 11. Database & ORM

**Decision**: **Postgres 16** (Neon serverless) + **Drizzle ORM** with `drizzle-kit` for migrations.

**Rationale**:
- Neon's branch-per-PR model lets every preview deployment have a real database without seed-data heroics.
- Drizzle is type-safe, lightweight, generates SQL we can read, and avoids the heavy Prisma engine + binary distribution problem in the worker container.
- Postgres comfortably handles the projected scale (100 orders/day → ~36k orders/year, single-digit GB).

**Alternatives considered**:
- **Prisma**: more popular, but the engine binary inflates worker images and the type model leaks `null | undefined` patterns we'd rather avoid.
- **Kysely**: similar ergonomics to Drizzle but no first-class migration story.
- **SQLite (Turso)**: charming for a v0, but we need real concurrency (worker + web tier writing simultaneously) and ACID for payment-state transitions.

---

## 12. Job Queue

**Decision**: **BullMQ** on **Upstash Redis** (or local Redis in dev). Queues: `generation`, `print-readiness`, `fulfillment-handoff`, `email`. Each queue is consumed by a single concern in `apps/worker/src/consumers/`.

**Rationale**:
- BullMQ supports retries with exponential backoff, dead-letter queues, and per-job idempotency keys — the building blocks the spec's reliability requirements (FR-017 reprint on failure, idempotent webhook handling) need.
- One Redis instance covers queue + idempotency-key cache + session-bound preview cache.

**Alternatives considered**:
- **Inngest / Temporal**: powerful, but the workflow-as-code abstraction is overkill for four straight-line pipelines.
- **pg-boss**: avoids the second datastore. Rejected because we want Redis for idempotency-key caching anyway, and BullMQ has stronger backoff/DLQ ergonomics.

---

## 13. Object Storage

**Decision**: **Cloudflare R2** in production, **MinIO** locally (S3-compatible). Buckets:
- `imagineer-uploads/` — customer-uploaded reference images, lifecycle-deleted at 30 days
- `imagineer-models/` — generated GLB previews + sliced STLs, retained for the order's lifetime + 90 days
- `imagineer-thumbnails/` — six-angle still-image fallbacks, retained alongside models

**Rationale**:
- R2 has zero egress fees — important because GLB/STL files can be 1–10 MB each and the customer may load them many times during the preview/regenerate loop.
- S3-compatible API means the same SDK code works against MinIO in dev and R2 in prod (`packages/providers/storage`).

**Alternatives considered**:
- **AWS S3**: egress fees would dominate at modest scale.
- **Vercel Blob**: tightly coupled to Vercel; worker on Fly.io would pay a premium.

---

## 14. Observability

**Decision**: **Sentry** for error capture (web + worker), **Pino** for structured logs to stdout (collected by Vercel + Fly.io), **OpenTelemetry SDK** wired but only emitting to console for MVP (collector deferred).

**Rationale**:
- Sentry is the standard error-capture choice and integrates cleanly with both Next.js and arbitrary Node workers.
- Pino is fast and emits one-JSON-per-line, which is exactly what Vercel/Fly want.
- OTel SDK in place but no collector yet means we don't ship the abstraction we're not using, but adding a collector later is a config-only change.

**Alternatives considered**:
- **Datadog / New Relic**: all-in-one. Rejected for MVP cost; the build is small enough that Sentry + log-tail is sufficient.

---

## 15. Hosting & Deploy

**Decision**:
- **Web** → Vercel (Next.js native, preview deployments per PR, Edge runtime not used — Node runtime only because Stripe SDK).
- **Worker** → Fly.io (single VM region matching the printer's location for low data-egress between worker and R2; multi-region trivial later).
- **Postgres** → Neon (serverless branches).
- **Redis** → Upstash (serverless).
- **Object storage** → Cloudflare R2.
- **CI** → GitHub Actions (lint, typecheck, unit, Playwright e2e on each PR; deploy on `main`).

**Rationale**: each piece is the lowest-friction managed option in its category that doesn't lock us in. All five vendors are swappable behind their respective adapters in `packages/providers/`.

---

## 16. Content Policy Pre-check

**Decision**: A **two-stage policy gate**: (1) cheap rule-based pre-check on the prompt or image filename/EXIF before calling the generation provider — keyword/regex blocklist for explicit categories (weapons, real-person names, registered trademarks). (2) Provider-side moderation flag verified on the returned model; if flagged, the model is hidden from the customer and a `ContentPolicyDecision` is recorded.

**Rationale**:
- Pre-check keeps cost down (we don't pay the provider for refused jobs) and gives the customer immediate feedback (FR-005).
- Post-check catches policy violations the pre-check misses because it relies on the provider's own moderation signals.
- Both stages write to the same `ContentPolicyDecision` table for auditability.

**Alternatives considered**:
- **Provider-only**: rejected — slower and more expensive, and we still want to refuse obvious cases without paying.
- **Pre-check only**: rejected — inadequate for image inputs where we cannot inspect intent without rendering.

---

## 17. Testing Strategy

**Decision**:
- **Unit (Vitest)** for `packages/domain` (pure functions: state machines, pricing, content-policy rules).
- **Integration (Vitest + Testcontainers)** for `apps/worker` consumers and `packages/db` queries — runs against a real ephemeral Postgres + Redis.
- **E2E (Playwright)** for the customer journeys defined in the spec's user stories — runs against `pnpm dev` with a mocked generation provider that returns a canned GLB after a configurable delay.
- **Type verification (`tsc --noEmit`)** in CI on every PR per Constitution Principle II.

**Rationale**: matches the spec's three user stories one-for-one in the Playwright suite (one suite per priority), and isolates the slow/expensive bits (real generation provider) from the inner test loop.

**Alternatives considered**:
- **Cypress**: comparable. Playwright wins on multi-browser, parallelism, and Next.js docs alignment.
- **Storybook for component tests**: deferred — no design-system pressure at MVP scale.

---

## Summary of Resolved Unknowns

The Technical Context in `plan.md` declared no explicit `NEEDS CLARIFICATION` markers — the spec's Assumptions section already absorbed the three product-level unknowns (single-region, in-house fulfillment, dynamic-quote pricing). This research document records the **technology-level** decisions left open by the spec, all of which now have a concrete answer with rationale and a documented fallback.
