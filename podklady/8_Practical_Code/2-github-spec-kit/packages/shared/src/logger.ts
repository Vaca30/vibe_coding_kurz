import pino from 'pino';

export type Logger = pino.Logger;

const PII_KEYS = ['email', 'address', 'street1', 'street2', 'recipient_name', 'phone', 'token'];

const root = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: { paths: PII_KEYS.flatMap((k) => [k, `*.${k}`, `*.*.${k}`]), censor: '[redacted]' },
  base: { app: 'imagineer' },
});

export function createLogger(scope: string): Logger {
  return root.child({ scope });
}
