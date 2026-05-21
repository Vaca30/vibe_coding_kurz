import * as Sentry from '@sentry/node';

let initialised = false;

export function initSentry(opts: { dsn?: string; environment?: string; release?: string } = {}): void {
  if (initialised) return;
  if (!opts.dsn) return; // safe no-op when DSN absent
  const release = opts.release ?? process.env.SENTRY_RELEASE;
  Sentry.init({
    dsn: opts.dsn,
    environment: opts.environment ?? process.env.NODE_ENV ?? 'development',
    ...(release ? { release } : {}),
    tracesSampleRate: 0.1,
  });
  initialised = true;
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!initialised) return;
  Sentry.captureException(err, context ? { extra: context } : undefined);
}
