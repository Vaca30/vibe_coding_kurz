import { initSentry, createLogger } from '@imagineer/shared';
import { env } from '@imagineer/config';
import { startGenerationConsumer } from './consumers/generation.ts';
import { startPrintReadinessConsumer } from './consumers/print-readiness.ts';
import { startFulfillmentConsumer } from './consumers/fulfillment-handoff.ts';
import { startEmailConsumer } from './consumers/email.ts';
import { redisConnection } from './queue.ts';

initSentry(env.SENTRY_DSN ? { dsn: env.SENTRY_DSN } : {});
const log = createLogger('worker');

async function main(): Promise<void> {
  const stops = [
    startGenerationConsumer(),
    startPrintReadinessConsumer(),
    startFulfillmentConsumer(),
    startEmailConsumer(),
  ];
  log.info('worker started');

  const shutdown = async (signal: string): Promise<void> => {
    log.info({ signal }, 'shutting down');
    for (const stop of stops) await stop();
    await redisConnection.quit();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err: unknown) => {
  log.error({ err }, 'fatal');
  process.exit(1);
});
