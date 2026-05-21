# Imagineer

On-demand custom 3D printing — describe an object or upload a photo, preview a generated 3D model in your browser, approve it, and we print and ship it.

See `specs/001-imagineer-3d-printing/spec.md` for the product spec, `plan.md` for the implementation plan, and `quickstart.md` for local-dev bring-up.

## Repo layout

```
apps/web/        Next.js 14 customer + admin app
apps/worker/     Long-running BullMQ consumer (generation, slicing, fulfillment, email)
packages/
  config/        Zod-validated env loader + feature flags
  shared/        Cross-cutting types, Zod schemas, logger, Sentry, email templates
  domain/        Pure-TS business logic (state machines, pricing, content policy)
  db/            Drizzle schema, migrations, queries
  providers/     Outbound integrations (Stripe, Meshy, Shippo, SmartyStreets, Resend, S3/R2)
infra/
  docker/        Local Postgres + Redis + MinIO + mock-generation
  mocks/         Hermetic stand-ins for external services
  prusaslicer/   Per-material slicer profiles
specs/           Spec-kit feature folders
```

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm infra:up
pnpm --filter @imagineer/db migrate
pnpm --filter @imagineer/db seed
pnpm dev
```

Open http://localhost:3000.

## Common scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Start web + worker in parallel |
| `pnpm typecheck` | TypeScript check across all packages |
| `pnpm lint` | Biome check |
| `pnpm test:unit` | Vitest across all packages |
| `pnpm test:e2e` | Playwright suites against local dev |
| `pnpm infra:up` / `pnpm infra:down` | Local Docker stack |

## Constitution

This project is bound by `.specify/memory/constitution.md` (v1.1.0). The five Core Principles — Workflow Discipline, Test Before Report, Simplicity & YAGNI, Platform-Agnostic Core, Continuous Cleanliness — apply to every change.
