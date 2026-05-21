import { describe, expect, it } from 'vitest';
import { loadEnv } from './env.ts';

const minimal = {
  DATABASE_URL: 'postgres://u:p@h:5432/d',
  REDIS_URL: 'redis://h:6379',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_ACCESS_KEY: 'k',
  S3_SECRET_KEY: 's',
  S3_BUCKET_UPLOADS: 'u',
  S3_BUCKET_MODELS: 'm',
  S3_BUCKET_THUMBNAILS: 't',
  S3_PUBLIC_BASE_URL: 'http://localhost:9000',
  MESHY_BASE_URL: 'http://localhost:8787',
  MESHY_API_KEY: 'k',
  AUTH_SECRET: '0123456789abcdef0123456789abcdef',
  AUTH_URL: 'http://localhost:3000',
  RESEND_API_KEY: 'k',
  EMAIL_FROM: 'a@b.com',
  STRIPE_SECRET_KEY: 'sk',
  STRIPE_WEBHOOK_SECRET: 'wh',
  STRIPE_SUCCESS_URL: 'http://localhost:3000/ok',
  STRIPE_CANCEL_URL: 'http://localhost:3000/cancel',
  SHIPPO_API_KEY: 'sh',
  SHIPPO_WEBHOOK_SECRET: 'sw',
  SMARTYSTREETS_AUTH_ID: 'a',
  SMARTYSTREETS_AUTH_TOKEN: 't',
} as NodeJS.ProcessEnv;

describe('loadEnv', () => {
  it('parses a complete environment', () => {
    const env = loadEnv(minimal);
    expect(env.DATABASE_URL).toBe('postgres://u:p@h:5432/d');
    expect(env.GENERATION_PROVIDER).toBe('meshy');
  });

  it('rejects missing required fields with a readable error', () => {
    const broken = { ...minimal };
    delete broken.DATABASE_URL;
    expect(() => loadEnv(broken)).toThrow(/DATABASE_URL/);
  });

  it('rejects malformed URLs', () => {
    expect(() => loadEnv({ ...minimal, AUTH_URL: 'not-a-url' })).toThrow(/AUTH_URL/);
  });
});
