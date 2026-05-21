# Imagineer — Production Deploy Runbook

This document describes the bootstrap of the Imagineer production stack. Re-run individual sections only when a vendor or component changes.

## Vendors

| Component | Vendor | Why |
|---|---|---|
| Web (Next.js) | Vercel | Native Next.js host, preview per PR |
| Worker (BullMQ consumer) | Fly.io | Long-running process, single region close to printers |
| Postgres | Neon | Serverless branches per PR |
| Redis | Upstash | Serverless |
| Object storage | Cloudflare R2 | Zero egress fees |
| Generation provider | Meshy AI | Primary; Tripo3D dormant fallback |
| Payments | Stripe | Hosted Checkout |
| Shipping | Shippo | Multi-carrier |
| Address validation | SmartyStreets | US-only, sub-500 ms p95 |
| Email | Resend | React Email integration |
| Errors | Sentry | Web + worker |

## One-time setup

### 1. Domains & DNS

- Apex `imagineer.example.com` → Vercel.
- `worker.imagineer.example.com` → Fly.io app (internal; no public TLS needed if only Stripe/Shippo webhooks hit the web app).

### 2. Cloudflare R2

```sh
wrangler r2 bucket create imagineer-uploads
wrangler r2 bucket create imagineer-models
wrangler r2 bucket create imagineer-thumbnails
```

Public-read on the `models` and `thumbnails` buckets; private on `uploads`. Issue an R2 access key + secret with read/write on all three. Lifecycle rules: `imagineer-uploads/*` deleted after 30 days; the others retained.

### 3. Neon Postgres

Create a project. The `main` branch is production. PR previews each get a branch via Vercel's Neon integration. After creating: copy `DATABASE_URL` into the Vercel + Fly secret stores.

### 4. Upstash Redis

Create a global database. Copy `REDIS_URL` (RESP TLS form) into both stores.

### 5. Stripe

- Activate live mode.
- Add a webhook endpoint at `https://imagineer.example.com/api/webhooks/stripe` listening to `payment_intent.succeeded`, `payment_intent.payment_failed`, `checkout.session.expired`. Copy the webhook secret.
- Enable Stripe Tax (US) if you want sales tax computed at checkout.

### 6. Shippo

- Live mode account, enable USPS + UPS rates.
- Webhook endpoint at `https://imagineer.example.com/api/webhooks/shippo`. Copy the HMAC secret.

### 7. SmartyStreets

US Street Address API plan with at least 250k lookups/month.

### 8. Resend

- Verify the sending domain.
- Add `EMAIL_FROM=hello@imagineer.example.com` (or chosen alias).

### 9. Sentry

- Create one project per app (`imagineer-web`, `imagineer-worker`).
- DSNs go into Vercel + Fly env.
- Wire `SENTRY_RELEASE` from the CI workflow's commit SHA so errors associate with deploys.

## Environment variables

The same `.env.example` from the repo root, with these prod-only differences:

- `NODE_ENV=production`
- `S3_PUBLIC_BASE_URL=https://models.imagineer.example.com` (R2 custom domain, not the auto-generated one)
- `STRIPE_SUCCESS_URL=https://imagineer.example.com/orders/{ORDER_ID}?ok=1`

## Deploys

### Web (Vercel)

`main` is the production branch. Every PR gets a preview URL with a Neon branch behind it. Vercel project setting:

- Build command: `pnpm --filter @imagineer/web build`
- Install command: `pnpm install --frozen-lockfile`
- Output: Next.js standalone

### Worker (Fly.io)

```sh
flyctl launch --name imagineer-worker --org imagineer --region ewr
flyctl secrets set DATABASE_URL=… REDIS_URL=… …  # full set from .env.example
flyctl deploy
```

`fly.toml` sets `auto_stop_machines = false` because we want consumers always-on.

### Migrations

Ship migrations via `pnpm --filter @imagineer/db migrate` from the Vercel build hook. Drizzle's migrator is idempotent.

## Operational runbook

| Symptom | First check |
|---|---|
| Generations stuck in `queued` | `flyctl logs -a imagineer-worker` → confirm consumer is up |
| Payments succeed but order stays `awaiting_payment` | Stripe webhook log → `webhook_event_log` table |
| Address validation slow | SmartyStreets dashboard (US Street API latency) |
| Print queue empty but orders are `paid` | `fulfillment-handoff` queue depth in Upstash |

## Rollback

Vercel → "Promote previous deployment". Fly → `flyctl deploy --image <prior-image>`. Database migrations are forward-only; for destructive issues, restore the Neon branch from a point-in-time snapshot.
