import { z } from 'zod';

export const generationJobPayload = z.object({
  jobId: z.string().uuid(),
  customerId: z.string().uuid().nullable(),
  sessionId: z.string(),
  input: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('text'), prompt: z.string() }),
    z.object({ kind: z.literal('image'), imageUri: z.string(), hint: z.string().optional() }),
  ]),
  provider: z.enum(['meshy', 'tripo']),
});

export const printReadinessPayload = z.object({
  modelId: z.string().uuid(),
  materialId: z.string().uuid(),
});

export const fulfillmentHandoffPayload = z.object({
  orderId: z.string().uuid(),
});

export const emailPayload = z.object({
  template: z.enum([
    'order_received',
    'order_in_production',
    'order_shipped',
    'order_delivered',
    'reprint_scheduled',
    'magic_link',
  ]),
  to: z.string().email(),
  data: z.record(z.string(), z.unknown()),
});

export type GenerationJobPayload = z.infer<typeof generationJobPayload>;
export type PrintReadinessPayload = z.infer<typeof printReadinessPayload>;
export type FulfillmentHandoffPayload = z.infer<typeof fulfillmentHandoffPayload>;
export type EmailPayload = z.infer<typeof emailPayload>;
