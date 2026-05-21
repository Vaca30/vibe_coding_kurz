import { z } from 'zod';
import { addressInput } from './address.ts';

export const orderStatus = z.enum([
  'draft',
  'awaiting_payment',
  'paid',
  'in_production',
  'reprint',
  'shipped',
  'delivered',
  'reprint_requested',
  'cancelled',
]);

export const orderDraft = z.object({
  modelId: z.string().uuid(),
  materialId: z.string().uuid(),
  colorId: z.string().uuid(),
  address: addressInput,
});

export const order = z.object({
  id: z.string().uuid(),
  status: orderStatus,
  subtotalCents: z.number().int(),
  shippingCents: z.number().int(),
  taxCents: z.number().int(),
  totalCents: z.number().int(),
  currency: z.string().length(3),
  estimatedDeliveryAt: z.string().date(),
  placedAt: z.string().datetime(),
  paidAt: z.string().datetime().nullable(),
  shippedAt: z.string().datetime().nullable(),
  deliveredAt: z.string().datetime().nullable(),
});

export type OrderDraft = z.infer<typeof orderDraft>;
export type OrderDto = z.infer<typeof order>;
