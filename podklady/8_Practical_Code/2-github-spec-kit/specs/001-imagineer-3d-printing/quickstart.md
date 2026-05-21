# Quickstart: Imagineer Local Development

**Feature**: 001-imagineer-3d-printing
**Date**: 2026-05-05

This guide brings up the entire Imagineer stack on a developer laptop in under 10 minutes. After completing it, you will have:

- The Next.js web app running on `http://localhost:3000`
- The worker process consuming jobs from a local Redis
- Postgres, Redis, MinIO (S3-compatible), and a mock generation provider running in Docker
- Seeded material catalog (PLA, PETG, Tough Resin, TPU)
- One end-to-end smoke test covering the P1 user story (text-to-print) using the mock provider

## Prerequisites

- macOS or Linux. (Windows via WSL2 works but is not the primary supported path.)
- Node.js 22 LTS via nvm/asdf/Volta (`node --version` ⇒ `v22.x`)
- pnpm 9+ (`corepack enable && corepack prepare pnpm@latest --activate`)
- Docker Desktop or OrbStack (`docker compose` available)
- A Stripe test-mode account (free; only needed to exercise checkout)
- A Resend test API key (free; emails are rendered to a local viewer if absent)

## Step 1 — Clone & install

```bash
git clone <repo>
cd imagineer
pnpm install
```

## Step 2 — Spin up local infrastructure

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

This starts:

| Service | Port | Purpose |
|---|---|---|
| `postgres` | 5432 | Application database |
| `redis` | 6379 | BullMQ queue + idempotency cache |
| `minio` | 9000 (API), 9001 (console) | S3-compatible object storage stand-in for R2 |
| `mock-generation` | 8787 | Returns a canned GLB after a configurable delay; substitutes for Meshy in local + CI |

Verify everything is up:

```bash
docker compose -f infra/docker/docker-compose.yml ps
```

## Step 3 — Configure environment

Copy the example env file and fill in your test-mode keys:

```bash
cp .env.example .env
```

Required variables:

```env
# Database
DATABASE_URL=postgres://imagineer:imagineer@localhost:5432/imagineer

# Redis
REDIS_URL=redis://localhost:6379

# Object storage (MinIO local stand-in)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=imagineer
S3_SECRET_KEY=imagineer
S3_BUCKET_UPLOADS=imagineer-uploads
S3_BUCKET_MODELS=imagineer-models
S3_BUCKET_THUMBNAILS=imagineer-thumbnails

# Generation provider — point at the mock by default
GENERATION_PROVIDER=meshy
MESHY_BASE_URL=http://localhost:8787
MESHY_API_KEY=mock-key

# Auth (Auth.js)
AUTH_SECRET=$(openssl rand -hex 32)
AUTH_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=re_test_xxx

# Stripe (test mode)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Shipping (Shippo test mode)
SHIPPO_API_KEY=shippo_test_xxx

# Address validation
SMARTYSTREETS_AUTH_ID=test
SMARTYSTREETS_AUTH_TOKEN=test
```

The `packages/config` loader validates this with Zod on boot — a missing required key fails fast with a readable error before any service starts.

## Step 4 — Migrate & seed

```bash
pnpm --filter @imagineer/db migrate
pnpm --filter @imagineer/db seed
```

Seeding creates:
- 4 materials with their PrusaSlicer profiles wired up
- ~16 colors across the materials
- An `operator@example.com` account with the admin role (no password — sign in via magic link)

## Step 5 — Start the dev processes

In two terminals (or via `pnpm dev` which starts both via Turborepo):

```bash
# Terminal 1 — Next.js web app
pnpm --filter @imagineer/web dev

# Terminal 2 — Worker
pnpm --filter @imagineer/worker dev
```

Open `http://localhost:3000`.

## Step 6 — Smoke test (P1 — text-to-print)

The Playwright smoke suite drives the full P1 path against the mock generation provider. Run it:

```bash
pnpm test:e2e --grep "P1: text-to-print"
```

What it asserts (mirroring spec User Story 1 acceptance scenarios):

1. Visiting `/` → entering "a chess knight shaped like a dragon" in the prompt input → submitting → an interactive 3D preview appears within 30 s (the mock provider is configured for fast turnaround).
2. The viewer responds to rotate/zoom/pan (`OrbitControls` events fire).
3. Clicking "Approve & continue" → selecting PLA/White → seeing a firm price + delivery date before a Stripe Checkout link appears.
4. Following the Stripe Checkout test-card flow → returning to `/orders/<id>` → the order status visibly transitions through `paid → in_production` (driven by the worker).
5. The `order_in_production` email is rendered (visible in the local Resend viewer at `http://localhost:3000/_email/preview`).

A green run confirms:
- Web ↔ worker integration is healthy (queue, DB, R2 stand-in)
- Stripe webhook signature verification works against the local CLI listener (started by the test script via `stripe listen --forward-to localhost:3000/api/webhooks/stripe`)
- The spec's P1 acceptance scenarios 1–3 pass end-to-end

## Step 7 — Optional smoke tests for P2 and P3

```bash
pnpm test:e2e --grep "P2: image-to-print"
pnpm test:e2e --grep "P3: material selection"
```

## Common Issues

| Symptom | Cause | Fix |
|---|---|---|
| `pnpm dev` exits immediately with `ECONNREFUSED 127.0.0.1:5432` | Postgres container not yet healthy | Run `docker compose ... ps` and wait for `healthy`; then re-run. |
| Generation hangs in `queued` forever | Worker not running | Start `pnpm --filter @imagineer/worker dev`; check its log for `consumer ready`. |
| Stripe webhook signature verification fails | `STRIPE_WEBHOOK_SECRET` mismatch | Re-run `stripe listen --print-secret` and update `.env`. |
| 3D viewer is blank in Safari | WebGL2 disabled in Develop menu | Enable WebGL2; verify with `chrome://gpu` equivalent. |

## Stopping

```bash
docker compose -f infra/docker/docker-compose.yml down
```

Add `-v` to wipe volumes (database + uploads) for a clean slate.
