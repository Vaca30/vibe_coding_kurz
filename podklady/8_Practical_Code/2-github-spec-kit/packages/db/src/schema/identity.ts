import { sql } from 'drizzle-orm';
import {
  boolean,
  char,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const customer = pgTable('customer', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: text('email').notNull().unique(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  displayName: text('display_name'),
  marketingOptIn: boolean('marketing_opt_in').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const address = pgTable(
  'address',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customer.id, { onDelete: 'cascade' }),
    recipientName: text('recipient_name').notNull(),
    street1: text('street1').notNull(),
    street2: text('street2'),
    city: text('city').notNull(),
    state: char('state', { length: 2 }).notNull(),
    postalCode: text('postal_code').notNull(),
    country: char('country', { length: 2 }).notNull().default('US'),
    dpvMatchCode: text('dpv_match_code').notNull(),
    validatedAt: timestamp('validated_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byCustomer: index('address_customer_idx').on(t.customerId) }),
);

export const authEmailToken = pgTable(
  'auth_email_token',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { withTimezone: true }).notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.identifier, t.token] }) }),
);

export type Customer = typeof customer.$inferSelect;
export type NewCustomer = typeof customer.$inferInsert;
export type Address = typeof address.$inferSelect;
export type NewAddress = typeof address.$inferInsert;
