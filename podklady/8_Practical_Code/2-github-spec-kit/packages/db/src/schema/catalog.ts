import { sql } from 'drizzle-orm';
import {
  boolean,
  char,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { model } from './generation.ts';

export const printProcess = pgEnum('print_process', ['fdm', 'sla']);

export const material = pgTable('material', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  slug: text('slug').notNull().unique(),
  displayName: text('display_name').notNull(),
  description: text('description').notNull(),
  process: printProcess('process').notNull(),
  minWallThicknessMm: numeric('min_wall_thickness_mm', { precision: 5, scale: 3 }).notNull(),
  buildVolumeMm: jsonb('build_volume_mm').$type<{ x: number; y: number; z: number }>().notNull(),
  costPerMm3Usd: numeric('cost_per_mm3_usd', { precision: 8, scale: 6 }).notNull(),
  leadTimeDays: integer('lead_time_days').notNull(),
  prusaProfilePath: text('prusa_profile_path').notNull(),
  isAvailable: boolean('is_available').notNull().default(true),
  unavailableReason: text('unavailable_reason'),
  restockEstimatedAt: date('restock_estimated_at'),
});

export const color = pgTable(
  'color',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    materialId: uuid('material_id')
      .notNull()
      .references(() => material.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    displayName: text('display_name').notNull(),
    hex: char('hex', { length: 7 }).notNull(),
    isAvailable: boolean('is_available').notNull().default(true),
    unavailableReason: text('unavailable_reason'),
  },
  (t) => ({ uniqueSlug: unique('color_material_slug').on(t.materialId, t.slug) }),
);

export const printVerdict = pgEnum('print_verdict', ['ready', 'repaired', 'rejected']);

export const printReadinessVerdict = pgTable(
  'print_readiness_verdict',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    modelId: uuid('model_id')
      .notNull()
      .references(() => model.id, { onDelete: 'cascade' }),
    materialId: uuid('material_id')
      .notNull()
      .references(() => material.id, { onDelete: 'cascade' }),
    verdict: printVerdict('verdict').notNull(),
    minWallThicknessMm: numeric('min_wall_thickness_mm', { precision: 5, scale: 3 }).notNull(),
    sliceTimeSeconds: integer('slice_time_seconds').notNull(),
    printTimeSeconds: integer('print_time_seconds'),
    materialVolumeMm3: numeric('material_volume_mm3', { precision: 12, scale: 2 }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byModel: index('verdict_model_idx').on(t.modelId),
    uniquePair: unique('verdict_model_material').on(t.modelId, t.materialId),
  }),
);

export type Material = typeof material.$inferSelect;
export type Color = typeof color.$inferSelect;
export type PrintReadinessVerdict = typeof printReadinessVerdict.$inferSelect;
