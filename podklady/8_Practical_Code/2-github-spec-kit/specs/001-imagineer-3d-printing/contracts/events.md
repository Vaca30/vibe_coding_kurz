# Async Event Contracts

**Feature**: 001-imagineer-3d-printing
**Date**: 2026-05-05

This document specifies the asynchronous boundaries that complement the REST contract in `api.openapi.yaml`: BullMQ job payloads consumed by `apps/worker`, inbound webhooks from third parties, and outbound notifications to customers. These are stable contracts the worker and the providers must agree on.

All payload shapes are TypeScript-style; the canonical Zod schemas live in `packages/shared/src/events/`.

---

## 1. BullMQ Job Queues

Each queue is consumed by exactly one consumer in `apps/worker/src/consumers/`. Retry policy is per-queue. All jobs carry a `jobId` matching the corresponding domain entity id, which makes the queue idempotent: re-enqueueing the same `jobId` is a no-op once the job has succeeded.

### `generation`

**Producer**: `POST /api/generations` HTTP handler.
**Consumer**: `apps/worker/src/consumers/generation.ts`.
**Concurrency**: 8 (matches projected peak of 10 concurrent generations with headroom).
**Retry**: 3 attempts, exponential backoff base 30 s.

**Payload**:

```ts
{
  jobId: string;            // generation_job.id (uuid)
  customerId: string | null;
  sessionId: string;
  input:
    | { kind: 'text'; prompt: string }
    | { kind: 'image'; imageUri: string; hint?: string };
  provider: 'meshy' | 'tripo';
}
```

**Side effects on success**:
- `generation_job.status = 'succeeded'`, `provider_job_id` set, `completed_at` set, `cost_units_usd` recorded.
- One `model` row inserted with `glb_uri`, `thumbnail_uri`, `bounding_box_mm`.
- A `print-readiness` job is enqueued for each material in the catalog (worker-owned fan-out).

**Side effects on refusal/failure**:
- `generation_job.status = 'refused'` or `'failed'`, `failure_reason` set.
- If refused, one `content_policy_decision` row inserted with `stage = 'post_check'`.

---

### `print-readiness`

**Producer**: `generation` consumer fans out one job per material after a successful generation.
**Consumer**: `apps/worker/src/consumers/print-readiness.ts`.
**Concurrency**: 4 (slicer is CPU-bound; tuned for the worker VM size).
**Retry**: 2 attempts, exponential backoff base 60 s.

**Payload**:

```ts
{
  modelId: string;     // model.id
  materialId: string;  // material.id
}
```

**Side effects**:
- Slices the GLB against the material's PrusaSlicer profile.
- Writes one `print_readiness_verdict` row.
- On `verdict = 'ready'` or `'repaired'`, uploads the resulting STL to R2 and writes `model.stl_uri` (last-writer-wins is fine; STL is deterministic for a given GLB+profile).

---

### `fulfillment-handoff`

**Producer**: Stripe webhook handler on `payment_intent.succeeded`.
**Consumer**: `apps/worker/src/consumers/fulfillment-handoff.ts`.
**Concurrency**: 4.
**Retry**: 5 attempts, exponential backoff base 30 s. (More retries here because shipping APIs are flakier.)

**Payload**:

```ts
{
  orderId: string;
}
```

**Side effects**:
- Quotes a Shippo rate for the chosen carrier/service.
- Generates a label and writes a `shipment` row.
- Transitions `order.status` from `paid` → `in_production`.
- Enqueues an `email` job (`order_in_production`).
- Pushes the order onto the operator queue surfaced by `GET /api/admin/queue`.

---

### `email`

**Producer**: Order state machine transitions.
**Consumer**: `apps/worker/src/consumers/email.ts`.
**Concurrency**: 16.
**Retry**: 5 attempts, exponential backoff base 60 s.

**Payload**:

```ts
{
  template:
    | 'order_received'
    | 'order_in_production'
    | 'order_shipped'
    | 'order_delivered'
    | 'reprint_scheduled'
    | 'magic_link';
  to: string;          // email
  data: Record<string, unknown>; // template-specific
}
```

**Side effects**:
- Renders the React Email template, sends via Resend.
- Records the message id in `order_event` for the corresponding order (when applicable).

---

## 2. Inbound Webhooks

### Stripe (`POST /api/webhooks/stripe`)

**Auth**: `Stripe-Signature` header verified with the configured webhook secret. Reject with 400 if invalid.

**Handled event types**:

| Event | Action |
|---|---|
| `payment_intent.succeeded` | Upsert `payment` row, transition Order `awaiting_payment → paid`, enqueue `fulfillment-handoff`. |
| `payment_intent.payment_failed` | Upsert `payment` with `status='failed'`, `failed_reason`. Order remains `awaiting_payment` for customer retry. |
| `checkout.session.expired` | Transition Order `awaiting_payment → cancelled`. |
| `charge.refunded` | Append `order_event` with payload, no status transition (refund accompanies a manual cancel/reprint flow). |

**Idempotency**: `event.id` written to `webhook_event_log(provider='stripe', event_id, processed_at)`. Replays are no-ops.

**Response**: always `200` once persisted, regardless of internal state. Stripe re-delivers on non-2xx.

---

### Shippo (`POST /api/webhooks/shippo`)

**Auth**: shared-secret HMAC in the `X-Shippo-Signature` header.

**Handled event types**:

| Event | Action |
|---|---|
| `track_updated` (in_transit / out_for_delivery) | Append `order_event`; no state change. |
| `track_updated` (delivered) | Set `shipment.delivered_at`, transition Order `shipped → delivered`, enqueue `email` (`order_delivered`). |
| `track_updated` (failure / returned) | Append `order_event`; surface to operator queue. |

---

### Generation Provider (`POST /api/webhooks/generation`)

**Auth**: provider-issued bearer token in `Authorization` header.

**Handled event types**:

| Event | Action |
|---|---|
| `job.succeeded` | Same path as the `generation` consumer's poll-based success — write Model row, fan out print-readiness. |
| `job.failed` | Same path as the consumer's failure handling. |

**Note**: webhooks are an optimisation — the worker also polls. Both paths converge on the same idempotent transition (`generation_job.status` is monotonic).

---

## 3. Outbound Customer Notifications

Triggered by Order/GenerationJob state transitions. All emails are rendered from React Email templates in `packages/shared/src/email-templates/`.

| Trigger | Template | Subject (example) |
|---|---|---|
| `order.placed_at` set (Order `draft → awaiting_payment` transition skipped if Stripe Checkout takes over before email is queued; this template is reserved for future use). | `order_received` | "We've received your order." |
| `order.production_started_at` set | `order_in_production` | "Your Imagineer print is on the printer." |
| `order.shipped_at` set | `order_shipped` | "Shipped — track your Imagineer order." |
| `order.delivered_at` set | `order_delivered` | "Delivered. Tell us how it turned out." |
| Order enters `reprint` from `in_production` | `reprint_scheduled` | "Quick update — we're reprinting your order." |
| Magic-link sign-in requested | `magic_link` | "Your sign-in link." |

Every send is recorded in `order_event` (when applicable) so the audit trail in FR-019 is complete.

---

## 4. State Machine Cross-Reference

The state machines in `data-model.md` are the authoritative source for what transitions are legal. Every event handler above MUST go through `packages/domain/order` or `packages/domain/generation` rather than writing directly to the DB — those modules guard the legal-transition table and emit the corresponding `order_event` rows atomically.
