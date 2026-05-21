---
description: "Task list for Imagineer — On-Demand Custom 3D Printing"
---

# Tasks: Imagineer — On-Demand Custom 3D Printing

**Input**: Design documents from `/specs/001-imagineer-3d-printing/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/api.openapi.yaml, contracts/events.md, research.md, quickstart.md

**Tests**: Per `research.md` §17 and Constitution Principle II ("Test Before Report — NON-NEGOTIABLE"), each user story phase ends with a Playwright E2E task that exercises the story's acceptance scenarios end-to-end. Inline unit tests for `packages/domain` are included where the logic is non-trivial (pricing, state machines, content policy). No strict TDD is requested.

**Organization**: Tasks are grouped by user story (P1 → P3 from `spec.md`) so each story is independently completable, testable, and demonstrable.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: User story label (US1, US2, US3) — required for user-story phases only
- File paths are absolute under the repo root unless they describe an action (e.g. "configure GitHub Actions")

## Path Conventions

Imagineer is a TypeScript monorepo (per `plan.md` Project Structure). Top-level layout:

- `apps/web/` — Next.js 14 app (frontend + API routes + admin)
- `apps/worker/` — BullMQ worker
- `packages/domain/` — pure TS business logic
- `packages/db/` — Drizzle schema, migrations, queries
- `packages/providers/` — outbound integrations (one folder per provider)
- `packages/shared/` — cross-cutting types, Zod schemas, email templates
- `packages/config/` — env loader, feature flags
- `infra/docker/`, `infra/prusaslicer/` — local infra + slicer profiles

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Bring the empty repo to "everyone can `pnpm install` + `pnpm dev` with mocks".

- [x] T001 Initialize pnpm + Turborepo monorepo at repo root (`package.json` with workspaces, `pnpm-workspace.yaml`, `turbo.json`)
- [x] T002 [P] Create base `tsconfig.base.json` and per-package `tsconfig.json` extending it across `apps/*` and `packages/*`
- [x] T003 [P] Configure Biome (lint + format) at repo root in `biome.json`; add `pnpm lint`, `pnpm format` scripts in root `package.json`
- [x] T004 [P] Add lefthook in `lefthook.yml` for pre-commit (lint, typecheck) and pre-push (unit tests)
- [x] T005 [P] Create GitHub Actions workflow `.github/workflows/ci.yml` running install → typecheck → lint → unit → Playwright E2E against the mock provider
- [x] T006 Author `infra/docker/docker-compose.yml` with `postgres:16`, `redis:7`, `minio` (with bucket-init sidecar), and `mock-generation` services per `quickstart.md` Step 2
- [x] T007 [P] Implement mock generation provider in `infra/mocks/generation/` — Node HTTP server returning a canned GLB at `/v2/text-to-3d` and `/v2/image-to-3d` after a configurable delay; Dockerfile + entrypoint
- [x] T008 Implement Zod-validated env loader in `packages/config/src/env.ts` with all required keys per `quickstart.md` Step 3; throw on missing/invalid at boot
- [x] T009 [P] Wire Pino logger in `packages/shared/src/logger.ts` with redaction of PII fields (email, address.*); export `createLogger(scope)`
- [x] T010 [P] Wire Sentry initialisation in `packages/shared/src/sentry.ts` with `init({ dsn, environment, tracesSampleRate })`; safe-no-op when DSN absent
- [x] T011 Author root `.env.example`, `README.md` (links to `quickstart.md`), and `CONTRIBUTING.md` (workflow rules from constitution)

**Checkpoint**: `pnpm install && docker compose -f infra/docker/docker-compose.yml up -d` succeeds; `pnpm typecheck` passes (with empty packages).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, state machines, providers — everything every user story depends on. **No user-story work begins until this phase is complete.**

### Database (`packages/db`)

- [x] T012 Define Drizzle schema for `customer`, `address`, `auth_email_token` in `packages/db/src/schema/identity.ts` matching `data-model.md`
- [x] T013 Define Drizzle schema for `generation_job`, `model`, `content_policy_decision` in `packages/db/src/schema/generation.ts`
- [x] T014 Define Drizzle schema for `material`, `color`, `print_readiness_verdict` in `packages/db/src/schema/catalog.ts`
- [x] T015 Define Drizzle schema for `order`, `payment`, `shipment`, `order_event`, `webhook_event_log` in `packages/db/src/schema/order.ts`
- [x] T016 Configure `drizzle-kit` in `packages/db/drizzle.config.ts`; add `pnpm --filter @imagineer/db migrate` and `migrate:create` scripts
- [x] T017 Generate the initial migration `packages/db/migrations/0000_initial.sql` from the schema; commit migration + snapshot
- [x] T018 Implement seed script `packages/db/src/seed.ts` inserting 4 materials (`pla-standard`, `petg-durable`, `resin-tough`, `tpu-flexible`) with their colors and `prusa_profile_path`s; idempotent (safe re-run)
- [x] T019 [P] Implement append-only `order_event` helper in `packages/db/src/queries/order-events.ts` (`appendEvent(orderId, type, payload, actor)`) — guards no-UPDATE/no-DELETE policy

### Shared types & schemas (`packages/shared`)

- [x] T020 [P] Author Zod schemas for every API request/response in `api.openapi.yaml` under `packages/shared/src/schemas/api/` (one file per resource: `generation.ts`, `model.ts`, `catalog.ts`, `address.ts`, `order.ts`, `webhook.ts`)
- [x] T021 [P] Author Zod schemas for every BullMQ payload in `events.md` under `packages/shared/src/schemas/events/` (`generation.ts`, `print-readiness.ts`, `fulfillment-handoff.ts`, `email.ts`)

### Domain logic (`packages/domain`)

- [x] T022 Implement Order state machine in `packages/domain/src/order/state-machine.ts` with the legal transitions from `data-model.md`; expose `transition(order, event): Result<Order, IllegalTransition>`
- [x] T023 [P] Unit tests for Order state machine in `packages/domain/src/order/state-machine.test.ts` covering every legal + illegal transition
- [x] T024 Implement GenerationJob state machine in `packages/domain/src/generation/state-machine.ts`
- [x] T025 [P] Unit tests for GenerationJob state machine in `packages/domain/src/generation/state-machine.test.ts`
- [x] T026 Implement pricing function in `packages/domain/src/pricing/calculate.ts` (`totalCents(model, material, color, address, shipping, tax) → cents`) per `data-model.md` Pricing Function
- [x] T027 [P] Unit tests for pricing in `packages/domain/src/pricing/calculate.test.ts` (volumes, overhead multiplier, currency rounding)
- [x] T028 Implement content-policy rule set in `packages/domain/src/policy/rules.ts` (keyword/regex blocklist + identifiable-person heuristics); expose `precheck(input) → PolicyVerdict`
- [x] T029 [P] Unit tests for content-policy rules in `packages/domain/src/policy/rules.test.ts` covering every rule_id

### Providers — adapters + interfaces

- [x] T030 Define provider interfaces in `packages/providers/src/index.ts`: `GenerationProvider`, `PaymentProvider`, `ShippingProvider`, `AddressValidator`, `StorageProvider`, `EmailProvider`
- [x] T031 [P] Implement `StorageProvider` for S3/R2/MinIO in `packages/providers/src/storage/s3.ts` using `@aws-sdk/client-s3` (presigned PUT/GET, multipart upload)
- [x] T032 [P] Implement Meshy adapter in `packages/providers/src/generation/meshy.ts` (submit text/image, poll status, normalise response to `{ glbUrl, thumbnailUrl, providerJobId }`)
- [x] T033 [P] Implement Tripo3D adapter in `packages/providers/src/generation/tripo.ts` against the same interface (kept dormant; selected via `GENERATION_PROVIDER` env)
- [x] T034 [P] Implement Stripe payment adapter in `packages/providers/src/payments/stripe.ts` (`createCheckoutSession`, `verifyWebhook`, `refund`)
- [x] T035 [P] Implement Shippo shipping adapter in `packages/providers/src/shipping/shippo.ts` (`quoteRates`, `createLabel`, `verifyWebhook`)
- [x] T036 [P] Implement SmartyStreets address adapter in `packages/providers/src/address/smartystreets.ts` (`validate(address) → AddressValidation`)
- [x] T037 [P] Implement Resend email adapter in `packages/providers/src/email/resend.ts` (`send({ to, subject, react })`)

### Web app scaffold (`apps/web`)

- [x] T038 Initialise Next.js 14 (App Router, TypeScript, Tailwind, no ESLint init — Biome is repo-wide) in `apps/web/`
- [x] T039 Configure Tailwind in `apps/web/tailwind.config.ts` and shadcn/ui (`components.json`, base components: `button`, `input`, `card`, `dialog`, `sonner`)
- [x] T040 Set up route groups in `apps/web/app/`: `(marketing)/`, `(order-flow)/`, `(account)/`, `admin/` with stub `page.tsx` files
- [x] T041 Wire Auth.js v5 in `apps/web/auth.ts` with magic-link provider (Resend) and Drizzle adapter against `packages/db`
- [x] T042 [P] Create global layout in `apps/web/app/layout.tsx` with header, footer, Sentry boundary, Toaster, TanStack Query provider
- [x] T043 [P] Implement `apps/web/middleware.ts` enforcing auth on `(account)/*` and admin role on `admin/*`
- [x] T044 [P] Configure Playwright in `apps/web/playwright.config.ts` (Chromium, baseURL `http://localhost:3000`, `webServer` running `pnpm dev`)

### Worker scaffold (`apps/worker`)

- [x] T045 Initialise Node entry point in `apps/worker/src/index.ts` registering BullMQ workers for queues `generation`, `print-readiness`, `fulfillment-handoff`, `email`
- [x] T046 [P] Create per-queue consumer skeletons in `apps/worker/src/consumers/{generation,print-readiness,fulfillment-handoff,email}.ts` that log job receipt and exit cleanly (real logic added per user story)
- [x] T047 Implement PrusaSlicer wrapper in `apps/worker/src/slicer/prusaslicer.ts` (`slice(stlPath, profilePath) → SliceVerdict`); locate binary via `PRUSASLICER_BIN` env, default `/usr/bin/prusa-slicer`
- [x] T048 [P] Add `infra/prusaslicer/` profiles: `pla-standard.ini`, `petg-durable.ini`, `resin-tough.ini`, `tpu-flexible.ini` (committed, validated by integration test in T049)
- [x] T049 [P] Integration test in `apps/worker/tests/slicer.test.ts` using Testcontainers Postgres + Redis + a tiny GLB fixture, asserting each profile produces a non-empty STL

**Checkpoint**: `pnpm typecheck && pnpm test:unit` is green; `pnpm --filter @imagineer/web dev` and `pnpm --filter @imagineer/worker dev` start without errors against the local infra. No user flow works yet.

---

## Phase 3: User Story 1 - Text-to-Print Custom Object (Priority: P1) 🎯 MVP

**Goal**: A first-time visitor can type a prompt, see a 3D preview, approve it, pick the default material, see a price + delivery estimate, pay via Stripe Checkout, and receive milestone emails.

**Independent Test**: Run `pnpm test:e2e --grep "P1: text-to-print"` — Playwright drives the full happy path against the mock generation provider and Stripe test mode; the printed-object delivery is asserted via the `delivered` Order state transition triggered by a mock Shippo webhook.

### Generation pipeline

- [x] T050 [US1] Implement `POST /api/generations` route at `apps/web/app/api/generations/route.ts` — validates body (text input only for P1) with `packages/shared/src/schemas/api/generation.ts`, runs `policy.precheck`, inserts `generation_job` row, enqueues `generation` BullMQ job, returns 202 with the job
- [x] T051 [US1] Implement `GET /api/generations/[id]` polling route at `apps/web/app/api/generations/[id]/route.ts` returning the job + nested model when `succeeded`
- [x] T052 [US1] Implement `generation` worker consumer in `apps/worker/src/consumers/generation.ts` — reads job, calls `MeshyAdapter.submit`, polls until terminal, on success inserts `model` row + uploads thumbnail, fans out one `print-readiness` job per material (P1 only fans out for `pla-standard`)
- [x] T053 [US1] Implement `print-readiness` worker consumer in `apps/worker/src/consumers/print-readiness.ts` — slices model against the material profile via `slicer.slice`, writes `print_readiness_verdict`, on `ready`/`repaired` uploads STL and writes `model.stl_uri`

### Customer flow UI

- [x] T054 [US1] Build marketing landing page at `apps/web/app/(marketing)/page.tsx` with hero copy + the prompt input form
- [x] T055 [US1] Implement prompt input component in `apps/web/components/prompt-input.tsx` (controlled, character counter 3–500, submit posts to `/api/generations`)
- [x] T056 [US1] Build generation status page at `apps/web/app/(order-flow)/generations/[id]/page.tsx` — uses TanStack Query `useQuery` with `refetchInterval: 2000` until terminal state; shows skeleton loader, then `<ModelPreview />` on success, error toast on failure
- [x] T057 [P] [US1] Build 3D preview component in `apps/web/components/model-preview.tsx` using React Three Fiber + drei (`useGLTF`, `OrbitControls`, `Bounds`, `Environment 'studio'`); wrapped in `<Suspense>`; receives `glbUri` prop
- [x] T058 [P] [US1] Build "regenerate" affordance in `apps/web/components/regenerate-button.tsx` posting to `/api/generations/[id]/regenerate` with the free-quota check (counts session-bound jobs in TanStack Query cache)
- [x] T059 [US1] Implement `POST /api/generations/[id]/regenerate` route at `apps/web/app/api/generations/[id]/regenerate/route.ts` — enforces 3-free-per-session quota using a Redis counter keyed by session id; returns 402 when exceeded
- [x] T060 [US1] Implement `POST /api/models/[id]/approve` route at `apps/web/app/api/models/[id]/approve/route.ts` setting `approved_at`; returns updated model
- [x] T061 [US1] Build "Approve & continue" button in `apps/web/components/approve-button.tsx` calling the approve endpoint then routing to `/order/new?modelId=...`

### Order draft + price + address

- [x] T062 [US1] Implement `GET /api/catalog/materials` at `apps/web/app/api/catalog/materials/route.ts` returning the seeded materials with per-model `price_cents` + `lead_time_days` (joins `print_readiness_verdict`); P1 returns only `pla-standard`
- [x] T063 [US1] Build order configurator page at `apps/web/app/(order-flow)/order/new/page.tsx` — shows the chosen model, default material/color (PLA/White), price, lead time, address form
- [x] T064 [P] [US1] Build address form component in `apps/web/components/address-form.tsx` with React Hook Form + Zod; on blur calls `/api/addresses/validate`
- [x] T065 [US1] Implement `POST /api/addresses/validate` route at `apps/web/app/api/addresses/validate/route.ts` calling `SmartyStreetsAdapter.validate`; returns normalised address + DPV verdict
- [x] T066 [US1] Implement `POST /api/orders` route at `apps/web/app/api/orders/route.ts` — validates body, ensures address `dpv_match_code ∈ {Y,S}`, ensures `print_readiness_verdict` for chosen material is not `rejected`, computes price via `pricing.calculate`, inserts `order` + `address` rows, returns 201 with the draft order

### Checkout + payment

- [x] T067 [US1] Implement `POST /api/orders/[id]/checkout` route at `apps/web/app/api/orders/[id]/checkout/route.ts` — calls `StripeAdapter.createCheckoutSession` with `success_url=/orders/[id]?ok=1` and `cancel_url=/order/new?modelId=...&cancelled=1`; transitions order `draft → awaiting_payment`; returns checkout URL
- [x] T068 [US1] Build checkout step in `apps/web/app/(order-flow)/order/new/page.tsx` — "Continue to payment" button calls the checkout endpoint and `window.location.assign`s the returned URL
- [x] T069 [US1] Implement `POST /api/webhooks/stripe` route at `apps/web/app/api/webhooks/stripe/route.ts` — verifies signature via `StripeAdapter.verifyWebhook`, logs event id to `webhook_event_log` (idempotent guard), handles `payment_intent.succeeded` (transition to `paid`, enqueue `fulfillment-handoff`), `payment_intent.payment_failed`, `checkout.session.expired`

### Fulfilment + shipping + emails

- [x] T070 [US1] Implement `fulfillment-handoff` worker consumer in `apps/worker/src/consumers/fulfillment-handoff.ts` — quotes Shippo USPS Ground Advantage rate, creates label, inserts `shipment` row, transitions order `paid → in_production`, enqueues `email` (template `order_in_production`)
- [x] T071 [US1] Implement `POST /api/webhooks/shippo` route at `apps/web/app/api/webhooks/shippo/route.ts` — verifies HMAC, on `delivered` event sets `shipment.delivered_at` + transitions order `shipped → delivered`, enqueues `email` (`order_delivered`)
- [x] T072 [US1] Implement `email` worker consumer in `apps/worker/src/consumers/email.ts` — renders the requested React Email template via `ResendAdapter.send`, appends `order_event`
- [x] T073 [P] [US1] Author React Email templates in `packages/shared/src/email-templates/{magic-link,order-in-production,order-shipped,order-delivered}.tsx`
- [x] T074 [US1] Wire email-template preview route at `apps/web/app/_email/preview/page.tsx` for local dev (rendered server-side, lists all templates with sample data)

### Order status surface

- [x] T075 [US1] Build order detail page at `apps/web/app/(account)/orders/[id]/page.tsx` showing status, model thumbnail, material/color, address, total, tracking link (when `shipment` exists); polls every 30 s
- [x] T076 [P] [US1] Build order list page at `apps/web/app/(account)/orders/page.tsx` listing the authenticated customer's orders most recent first
- [x] T077 [US1] Implement `GET /api/orders` and `GET /api/orders/[id]` routes at `apps/web/app/api/orders/route.ts` and `apps/web/app/api/orders/[id]/route.ts`

### Operator surface (minimal for P1)

- [x] T078 [US1] Build admin print queue at `apps/web/app/admin/queue/page.tsx` listing `in_production` orders with STL download link and "Mark print failed" + "Mark shipped" actions
- [x] T079 [US1] Implement `POST /api/admin/orders/[id]/print-failed` route at `apps/web/app/api/admin/orders/[id]/print-failed/route.ts` — appends `order_event`, transitions `in_production → reprint → in_production` (clearing reprint counter), enqueues a fresh `fulfillment-handoff`-equivalent slot (no extra charge per FR-017)

### End-to-end verification

- [x] T080 [US1] Author Playwright E2E suite `apps/web/tests/e2e/p1-text-to-print.spec.ts` covering acceptance scenarios 1–5 of User Story 1: prompt → preview within budget → approve → material/price → address validation → Stripe test-card → order in_production → mock Shippo `delivered` → order detail shows delivered + tracking → assert `order_delivered` email rendered in the local preview

**Checkpoint**: P1 is fully functional and demonstrable. The MVP business loop (idea → physical object → money) works end-to-end against mocks.

---

## Phase 4: User Story 2 - Image-to-Print from a Reference Photo (Priority: P2)

**Goal**: A customer uploads a reference photo instead of typing a prompt and reaches the same approval-and-purchase flow as P1.

**Independent Test**: Run `pnpm test:e2e --grep "P2: image-to-print"` — Playwright uploads a fixture image and asserts the same downstream flow as P1.

- [x] T081 [US2] Implement `POST /api/uploads/image` route at `apps/web/app/api/uploads/image/route.ts` — issues a presigned R2 PUT URL via `StorageProvider`, returns `{ image_uri, upload_url, expires_at }`
- [x] T082 [US2] Build image upload component in `apps/web/components/image-upload.tsx` — accepts JPEG/PNG ≤10 MB, uploads directly to the presigned URL, shows preview thumbnail, returns the `image_uri`
- [x] T083 [US2] Extend prompt input on `apps/web/app/(marketing)/page.tsx` with a tab toggle "Describe it" / "Upload a photo"
- [x] T084 [US2] Extend `POST /api/generations` (T050) to accept `kind: 'image'` payloads — validates `image_uri` belongs to the session, runs image-aware policy precheck (filename + EXIF inspection)
- [x] T085 [US2] Extend Meshy adapter (T032) image-to-3D path in `packages/providers/src/generation/meshy.ts` — submits to `/v2/image-to-3d` with the public R2 URL of the uploaded image
- [x] T086 [US2] Extend generation status page (T056) with "Add a clarifying hint" affordance for image inputs — pre-fills the regenerate request with the original `image_uri` + a `hint` field
- [x] T087 [US2] Extend content-policy rules (T028) with image-specific rule_ids (`image.contains-real-person` placeholder leaning on provider post-check; `image.brand-logo-detected` placeholder)
- [x] T088 [US2] Author Playwright E2E suite `apps/web/tests/e2e/p2-image-to-print.spec.ts` covering acceptance scenarios 1–3 of User Story 2: upload → preview → approve → checkout → and the trademark-refusal path with a fixture image labelled as a known brand

**Checkpoint**: P2 ships independently; both prompt entry modes converge on the same downstream flow.

---

## Phase 5: User Story 3 - Material and Color Selection with Transparent Tradeoffs (Priority: P3)

**Goal**: Customer can switch among ≥3 materials and several colors per material; price, lead time, and material description update live; out-of-stock combinations cannot be selected.

**Independent Test**: Run `pnpm test:e2e --grep "P3: material selection"` — Playwright switches materials/colors on an approved model and asserts price/lead-time/availability behaviour.

- [x] T089 [US3] Expand seed (T018) to ensure all four materials with full color palettes are seeded; add an "out-of-stock" fixture material seeded with `is_available=false` for testing
- [x] T090 [US3] Update `generation` consumer (T052) to fan out `print-readiness` jobs for **all** materials (not just `pla-standard`)
- [x] T091 [US3] Update `GET /api/catalog/materials` (T062) to return all materials with per-material `price_cents`, `lead_time_days`, `is_available`, `unavailable_reason`, `restock_estimated_at`, and the per-material color list
- [x] T092 [US3] Build `<MaterialSelector />` in `apps/web/components/material-selector.tsx` — radio-group of materials with description, price-delta, lead-time-delta; emits `onChange(materialId)`
- [x] T093 [P] [US3] Build `<ColorPicker />` in `apps/web/components/color-picker.tsx` — swatches for the selected material's colors, disables unavailable swatches with tooltip showing `restock_estimated_at`
- [x] T094 [US3] Replace the static "PLA/White" block on `apps/web/app/(order-flow)/order/new/page.tsx` with `<MaterialSelector />` + `<ColorPicker />`; price, lead time, and `estimated_delivery_at` recompute on each change via TanStack Query (no extra fetch — material list is preloaded)
- [x] T095 [US3] Update `POST /api/orders` (T066) to enforce `material.is_available` and `color.is_available` server-side; return 409 with the unavailable reason if violated
- [x] T096 [P] [US3] Add a "Material details" disclosure in `apps/web/components/material-details.tsx` — surfaces `description`, durability/finish hints, and a small set of representative photos from `packages/shared/src/material-media/`
- [x] T097 [US3] Author Playwright E2E suite `apps/web/tests/e2e/p3-material-selection.spec.ts` covering acceptance scenarios 1–3 of User Story 3: switch materials → assert price/lead time updates → switch to out-of-stock material → assert disabled and reason visible → confirm restock date rendered

**Checkpoint**: P3 ships independently; the order configurator becomes meaningfully richer without disturbing P1/P2 happy paths.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Hardening and operator/customer surfaces that span all three stories.

- [x] T098 [P] Implement reprint-request endpoint `POST /api/orders/[id]/reprint-request` at `apps/web/app/api/orders/[id]/reprint-request/route.ts` (FR-018) — appends `order_event`, surfaces in operator queue
- [x] T099 [P] Build operator content-policy review page at `apps/web/app/admin/policy/page.tsx` listing recent `content_policy_decision` rows with the matched evidence
- [x] T100 [P] Add rate-limiting middleware on `/api/generations` and `/api/uploads/image` in `apps/web/middleware.ts` using Upstash Redis (10 generations / hour / session for unauthenticated users)
- [x] T101 [P] Add per-route observability spans in `apps/web/lib/instrumentation.ts` and `apps/worker/src/instrumentation.ts` (OpenTelemetry SDK; collector deferred per `research.md` §14)
- [x] T102 [P] Implement the headless-Puppeteer six-angle thumbnail fallback for non-WebGL devices in `apps/worker/src/consumers/thumbnail-fallback.ts` triggered after generation success
- [x] T103 [P] Author production deploy runbook in `docs/operations/deploy.md` covering Vercel project linking, Fly.io app + Postgres + Redis bootstrap, R2 bucket policy, Stripe webhook registration
- [x] T104 [P] Configure Sentry release tagging in CI (T005) so each deploy associates errors with a commit SHA
- [x] T105 [P] Performance pass: profile `<ModelPreview />` in `apps/web/components/model-preview.tsx` against a 5 MB fixture GLB on a mid-range laptop; document the measurement and tune `Bounds` damping / `gl.dpr` to keep ≥60 fps
- [x] T106 [P] Accessibility pass on `(order-flow)` route group with axe-core in Playwright; fix any WCAG 2.1 AA violations found
- [x] T107 Update root `README.md` with the supported `pnpm` script catalogue and a one-screen architecture diagram in mermaid
- [x] T108 Final regression: run all three Playwright suites in the same `pnpm test:e2e` invocation; ensure no cross-story interference (shared Postgres state, mock-provider order)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: starts immediately
- **Foundational (Phase 2)**: depends on Setup; **blocks every user story**
- **US1 (Phase 3)**: depends on Foundational
- **US2 (Phase 4)**: depends on Foundational; can run in parallel with US1 once T050 (the `POST /api/generations` route) and T056 (the status page) are scaffolded — most US2 tasks extend US1 endpoints rather than re-implementing them
- **US3 (Phase 5)**: depends on Foundational + the order configurator from US1 (T063, T066, T067) — wait for those four tasks before US3 starts
- **Polish (Phase 6)**: depends on whichever stories the polish item targets; T100/T101/T102/T104/T105/T106 can start as soon as their target is complete

### User Story Dependencies (recommended sequencing)

- **US1 (P1)** — independent. Ship first.
- **US2 (P2)** — independent of US3; can be developed in parallel with US1 by a second contributor once T050+T056 land.
- **US3 (P3)** — depends on US1's order configurator (T063, T066, T067). Cannot start before those are merged.

### Within Each User Story

- Schema-touching tasks before feature tasks (Foundational already covers this — no new schema in story phases except seed expansion in T089).
- Server routes before client components that consume them (e.g. T065 before the address form in T064 is wired live; T062 before T092).
- Worker consumers can be built in parallel with their producer routes (e.g. T052 in parallel with T050) because both sides import the same Zod schemas from `packages/shared`.

### Parallel Opportunities

- All Phase 1 [P] tasks (T002–T011) run in parallel after T001.
- Phase 2 splits cleanly into four parallel tracks once T012–T015 (the Drizzle schemas) merge: shared types (T020–T021), domain logic (T022–T029), providers (T031–T037), web/worker scaffolds (T038–T049).
- Within US1, the UI tasks marked [P] (T057, T058, T064, T073, T076) can be built in parallel with their corresponding API routes.
- US1 and US2 can be developed in parallel by two contributors after the US1 generation pipeline scaffold (T050, T052, T056) is merged.

---

## Parallel Example: Phase 2 Foundational

```bash
# After T012–T015 (Drizzle schemas) and T017 (initial migration) merge,
# four contributors can split the foundational work:

# Contributor A — Domain logic
T022 Order state machine + T023 tests
T024 GenerationJob state machine + T025 tests
T026 Pricing function + T027 tests
T028 Content-policy rules + T029 tests

# Contributor B — Providers
T030 Provider interfaces
T031 Storage adapter
T032 Meshy adapter
T033 Tripo adapter
T034 Stripe adapter
T035 Shippo adapter
T036 SmartyStreets adapter
T037 Resend adapter

# Contributor C — Shared schemas
T020 API Zod schemas
T021 Event Zod schemas

# Contributor D — App scaffolds
T038–T044 Web app scaffold
T045–T049 Worker scaffold + slicer
```

---

## Implementation Strategy

### MVP first (User Story 1 only)

1. Complete Phase 1 (T001–T011) — local dev environment works end-to-end with mocks.
2. Complete Phase 2 (T012–T049) — schema, state machines, providers, and scaffolds in place.
3. Complete Phase 3 (T050–T080) — text-to-print works end-to-end against the mock provider and Stripe test mode.
4. **STOP and validate**: `pnpm test:e2e --grep "P1: text-to-print"` is green. Demo the loop end-to-end.
5. Decide: deploy a private MVP for stakeholder feedback, or proceed straight to US2/US3.

### Incremental delivery

1. Setup + Foundational → infrastructure ready
2. Add US1 → MVP demoable, deploy to a private URL
3. Add US2 → image-input customers unlocked
4. Add US3 → richer material/color selection
5. Add Polish → operator + customer trust surfaces, performance, a11y

### Parallel team strategy

With 2–3 contributors after Foundational lands:

- One contributor owns US1 (largest phase by volume).
- A second contributor takes US2 in parallel once T050+T056 are merged (US2 mostly extends US1 endpoints).
- A third contributor picks up Polish items as their dependencies free up.

---

## Notes

- **Constitution recap**: every task ends with the runtime verification its phase requires (Constitution Principle II "Test Before Report"). For UI tasks that means running the relevant Playwright spec or manually clicking through; for server tasks it means hitting the endpoint via curl + asserting the DB state; for worker tasks it means enqueueing a fixture job and tailing the worker log.
- **No git commits** unless explicitly instructed by the user (Constitution Principle V).
- **No `TODO` comments** in code — open items go on this task list or in a follow-up issue.
- **Open action item from `/speckit.plan`**: amend `.specify/memory/constitution.md` to scope its Tech Stack and Workflow sections to Dex (or ratify a parallel constitution for Imagineer). This does not block task execution but should be resolved before any code is committed so the gate is non-ambiguous on subsequent runs.
- **[P]** tasks operate on different files, with no incomplete dependencies — safe to parallelise across contributors or LLM agents.
- **[Story]** label maps every user-story task to its spec.md priority, preserving the independent-shippability of each story.
