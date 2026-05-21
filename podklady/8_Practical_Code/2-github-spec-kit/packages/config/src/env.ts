import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default('auto'),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET_UPLOADS: z.string().min(1),
  S3_BUCKET_MODELS: z.string().min(1),
  S3_BUCKET_THUMBNAILS: z.string().min(1),
  S3_PUBLIC_BASE_URL: z.string().url(),

  GENERATION_PROVIDER: z.enum(['meshy', 'tripo']).default('meshy'),
  MESHY_BASE_URL: z.string().url(),
  MESHY_API_KEY: z.string().min(1),
  TRIPO_BASE_URL: z.string().url().optional(),
  TRIPO_API_KEY: z.string().optional(),

  AUTH_SECRET: z.string().min(16),
  AUTH_URL: z.string().url(),

  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().email(),

  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_SUCCESS_URL: z.string().min(1),
  STRIPE_CANCEL_URL: z.string().min(1),

  SHIPPO_API_KEY: z.string().min(1),
  SHIPPO_WEBHOOK_SECRET: z.string().min(1),

  SMARTYSTREETS_AUTH_ID: z.string().min(1),
  SMARTYSTREETS_AUTH_TOKEN: z.string().min(1),

  PRUSASLICER_BIN: z.string().default('/usr/bin/prusa-slicer'),
  SENTRY_DSN: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}

export const env = new Proxy({} as Env, {
  get(_target, prop: string) {
    if (!cached) cached = loadEnv();
    return cached[prop as keyof Env];
  },
});
