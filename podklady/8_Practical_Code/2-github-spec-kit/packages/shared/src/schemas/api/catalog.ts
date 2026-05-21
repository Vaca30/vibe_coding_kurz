import { z } from 'zod';

export const colorOption = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  displayName: z.string(),
  hex: z.string().regex(/^#[0-9a-f]{6}$/i),
  isAvailable: z.boolean(),
});

export const materialOption = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  displayName: z.string(),
  description: z.string(),
  colors: z.array(colorOption),
  priceCents: z.number().int().nonnegative(),
  leadTimeDays: z.number().int().nonnegative(),
  isAvailable: z.boolean(),
  unavailableReason: z.string().nullable(),
  restockEstimatedAt: z.string().date().nullable(),
});

export type ColorOption = z.infer<typeof colorOption>;
export type MaterialOption = z.infer<typeof materialOption>;
