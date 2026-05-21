import { z } from 'zod';

export const textGenerationInput = z.object({
  kind: z.literal('text'),
  prompt: z.string().min(3).max(500),
});

export const imageGenerationInput = z.object({
  kind: z.literal('image'),
  imageUri: z.string().min(1),
  hint: z.string().max(500).optional(),
});

export const generationInput = z.discriminatedUnion('kind', [
  textGenerationInput,
  imageGenerationInput,
]);

export const generationStatus = z.enum(['queued', 'running', 'succeeded', 'refused', 'failed']);

export const generationJob = z.object({
  id: z.string().uuid(),
  status: generationStatus,
  submittedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  failureReason: z.string().nullable(),
  model: z
    .object({
      id: z.string().uuid(),
      glbUri: z.string().url(),
      thumbnailUri: z.string().url(),
      boundingBoxMm: z.object({ x: z.number(), y: z.number(), z: z.number() }),
      approvedAt: z.string().datetime().nullable(),
    })
    .nullable(),
});

export type GenerationInput = z.infer<typeof generationInput>;
export type GenerationJobDto = z.infer<typeof generationJob>;
