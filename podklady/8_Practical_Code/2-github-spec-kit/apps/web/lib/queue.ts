import { env } from '@imagineer/config';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

let connection: IORedis | undefined;
function getConnection(): IORedis {
  if (!connection) connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  return connection;
}

export function generationQueue(): Queue {
  return new Queue('generation', { connection: getConnection() });
}

export function fulfillmentQueue(): Queue {
  return new Queue('fulfillment-handoff', { connection: getConnection() });
}

export function emailQueue(): Queue {
  return new Queue('email', { connection: getConnection() });
}
