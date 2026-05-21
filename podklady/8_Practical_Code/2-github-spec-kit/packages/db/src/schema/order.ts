import { sql } from 'drizzle-orm';
import {
  char,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { address, customer } from './identity.ts';
import { color, material } from './catalog.ts';
import { model } from './generation.ts';

export const orderStatus = pgEnum('order_status', [
  'draft',
  'awaiting_payment',
  'paid',
  'in_production',
  'reprint',
  'shipped',
  'delivered',
  'reprint_requested',
  'cancelled',
]);

export const order = pgTable(
  'order',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customer.id),
    modelId: uuid('model_id')
      .notNull()
      .references(() => model.id),
    materialId: uuid('material_id')
      .notNull()
      .references(() => material.id),
    colorId: uuid('color_id')
      .notNull()
      .references(() => color.id),
    addressId: uuid('address_id')
      .notNull()
      .references(() => address.id),
    status: orderStatus('status').notNull(),
    subtotalCents: integer('subtotal_cents').notNull(),
    shippingCents: integer('shipping_cents').notNull(),
    taxCents: integer('tax_cents').notNull(),
    totalCents: integer('total_cents').notNull(),
    currency: char('currency', { length: 3 }).notNull().default('USD'),
    estimatedDeliveryAt: date('estimated_delivery_at').notNull(),
    placedAt: timestamp('placed_at', { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    productionStartedAt: timestamp('production_started_at', { withTimezone: true }),
    shippedAt: timestamp('shipped_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    idempotencyKey: text('idempotency_key').unique(),
  },
  (t) => ({
    byCustomer: index('order_customer_idx').on(t.customerId, t.placedAt),
    byStatus: index('order_status_idx').on(t.status),
  }),
);

export const paymentStatus = pgEnum('payment_status', [
  'requires_action',
  'processing',
  'succeeded',
  'failed',
]);

export const payment = pgTable('payment', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid('order_id')
    .notNull()
    .references(() => order.id, { onDelete: 'cascade' }),
  stripePaymentIntentId: text('stripe_payment_intent_id').notNull().unique(),
  amountCents: integer('amount_cents').notNull(),
  status: paymentStatus('status').notNull(),
  failedReason: text('failed_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  succeededAt: timestamp('succeeded_at', { withTimezone: true }),
});

export const shipment = pgTable('shipment', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid('order_id')
    .notNull()
    .references(() => order.id, { onDelete: 'cascade' })
    .unique(),
  carrier: text('carrier').notNull(),
  serviceLevel: text('service_level').notNull(),
  trackingNumber: text('tracking_number').notNull(),
  trackingUrl: text('tracking_url').notNull(),
  labelUri: text('label_uri').notNull(),
  dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orderEvent = pgTable(
  'order_event',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    orderId: uuid('order_id')
      .notNull()
      .references(() => order.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').notNull(),
    actor: text('actor').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byOrder: index('order_event_order_idx').on(t.orderId, t.createdAt) }),
);

export const webhookEventLog = pgTable(
  'webhook_event_log',
  {
    provider: text('provider').notNull(),
    eventId: text('event_id').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ pk: unique('webhook_event_pk').on(t.provider, t.eventId) }),
);

export type Order = typeof order.$inferSelect;
export type NewOrder = typeof order.$inferInsert;
export type Payment = typeof payment.$inferSelect;
export type Shipment = typeof shipment.$inferSelect;
export type OrderEvent = typeof orderEvent.$inferSelect;
