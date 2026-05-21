import { z } from 'zod';

export const addressInput = z.object({
  recipientName: z.string().min(1).max(100),
  street1: z.string().min(1).max(200),
  street2: z.string().max(200).nullable().optional(),
  city: z.string().min(1).max(100),
  state: z.string().length(2),
  postalCode: z.string().min(5).max(10),
});

export const addressValidation = z.object({
  isDeliverable: z.boolean(),
  dpvMatchCode: z.enum(['Y', 'S', 'D', 'N']),
  normalized: addressInput.nullable(),
  explanation: z.string().nullable(),
});

export type AddressInput = z.infer<typeof addressInput>;
export type AddressValidation = z.infer<typeof addressValidation>;
