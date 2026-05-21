import type { PgDatabase } from 'drizzle-orm/pg-core';
import { db } from '../client.ts';
import { orderEvent } from '../schema/order.ts';

// Append-only — there is intentionally no `update` or `delete` helper here.
// The audit trail (FR-019) must be immutable.

export type Actor =
  | 'system'
  | `customer:${string}`
  | `operator:${string}`
  | `webhook:${'stripe' | 'shippo' | 'generation'}`;

export async function appendEvent(
  orderId: string,
  eventType: string,
  payload: Record<string, unknown>,
  actor: Actor,
  client: { insert: typeof db.insert } = db,
): Promise<void> {
  await client.insert(orderEvent).values({ orderId, eventType, payload, actor });
}

// Re-exported so callers can pass a transaction in via dependency injection
// without importing from drizzle-orm directly.
export type DbLike = PgDatabase<never>;
