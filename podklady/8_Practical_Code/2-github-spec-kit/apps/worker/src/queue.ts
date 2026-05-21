import { env } from '@imagineer/config';
import { Queue, Worker, type Processor, type WorkerOptions } from 'bullmq';
import IORedis from 'ioredis';

export const redisConnection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

export const queues = {
  generation: new Queue('generation', { connection: redisConnection }),
  printReadiness: new Queue('print-readiness', { connection: redisConnection }),
  fulfillmentHandoff: new Queue('fulfillment-handoff', { connection: redisConnection }),
  email: new Queue('email', { connection: redisConnection }),
} as const;

export function createWorker<T>(
  name: string,
  processor: Processor<T>,
  opts: Partial<WorkerOptions> = {},
): Worker<T> {
  return new Worker<T>(name, processor, { connection: redisConnection, ...opts });
}
