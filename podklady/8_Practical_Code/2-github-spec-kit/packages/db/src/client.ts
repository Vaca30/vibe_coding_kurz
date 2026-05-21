import { env } from '@imagineer/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.ts';

let pool: ReturnType<typeof postgres> | undefined;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (!dbInstance) {
    pool = postgres(env.DATABASE_URL, { max: 10 });
    dbInstance = drizzle(pool, { schema });
  }
  return dbInstance;
}

export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_t, prop: string) {
    return getDb()[prop as keyof ReturnType<typeof getDb>];
  },
});

export async function closeDb(): Promise<void> {
  if (pool) await pool.end({ timeout: 5 });
  pool = undefined;
  dbInstance = undefined;
}
