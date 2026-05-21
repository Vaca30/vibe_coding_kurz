import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { customer } from './identity.ts';

export const generationInputKind = pgEnum('generation_input_kind', ['text', 'image']);
export const generationProvider = pgEnum('generation_provider', ['meshy', 'tripo']);
export const generationStatus = pgEnum('generation_status', [
  'queued',
  'running',
  'succeeded',
  'refused',
  'failed',
]);

export const generationJob = pgTable(
  'generation_job',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    customerId: uuid('customer_id').references(() => customer.id, { onDelete: 'set null' }),
    sessionId: text('session_id').notNull(),
    inputKind: generationInputKind('input_kind').notNull(),
    inputText: text('input_text'),
    inputImageUri: text('input_image_uri'),
    provider: generationProvider('provider').notNull(),
    providerJobId: text('provider_job_id'),
    status: generationStatus('status').notNull(),
    failureReason: text('failure_reason'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    costUnitsUsd: numeric('cost_units_usd', { precision: 8, scale: 4 }),
  },
  (t) => ({
    byCustomer: index('gen_customer_idx').on(t.customerId, t.submittedAt),
    bySession: index('gen_session_idx').on(t.sessionId, t.submittedAt),
    byStatus: index('gen_status_idx').on(t.status, t.submittedAt),
  }),
);

export const model = pgTable('model', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  generationJobId: uuid('generation_job_id')
    .notNull()
    .references(() => generationJob.id, { onDelete: 'cascade' }),
  glbUri: text('glb_uri').notNull(),
  refinedGlbUri: text('refined_glb_uri'),
  stlUri: text('stl_uri'),
  thumbnailUri: text('thumbnail_uri').notNull(),
  boundingBoxMm: jsonb('bounding_box_mm').$type<{ x: number; y: number; z: number }>().notNull(),
  volumeMm3: numeric('volume_mm3', { precision: 12, scale: 2 }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const policyStage = pgEnum('policy_stage', ['pre_check', 'post_check']);

export const contentPolicyDecision = pgTable(
  'content_policy_decision',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    generationJobId: uuid('generation_job_id')
      .notNull()
      .references(() => generationJob.id, { onDelete: 'cascade' }),
    stage: policyStage('stage').notNull(),
    ruleId: text('rule_id').notNull(),
    customerMessage: text('customer_message').notNull(),
    evidence: jsonb('evidence'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byJob: index('policy_job_idx').on(t.generationJobId) }),
);

export type GenerationJob = typeof generationJob.$inferSelect;
export type NewGenerationJob = typeof generationJob.$inferInsert;
export type Model = typeof model.$inferSelect;
export type NewModel = typeof model.$inferInsert;
export type ContentPolicyDecision = typeof contentPolicyDecision.$inferSelect;
