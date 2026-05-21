import { db, generationJob, model, contentPolicyDecision, material } from '@imagineer/db';
import { generationTransition } from '@imagineer/domain';
import { selectGenerationProvider, s3Storage } from '@imagineer/providers';
import { type GenerationJobPayload, createLogger } from '@imagineer/shared';
import { env } from '@imagineer/config';
import { eq } from 'drizzle-orm';
import { createWorker, queues } from '../queue.ts';

const log = createLogger('worker.generation');

export function startGenerationConsumer(): () => Promise<void> {
  const w = createWorker<GenerationJobPayload>(
    'generation',
    async (job) => {
      const { jobId, input, provider } = job.data;
      log.info({ jobId }, 'processing generation');
      const dbJob = await db.query.generationJob.findFirst({ where: eq(generationJob.id, jobId) });
      if (!dbJob) throw new Error(`generation_job ${jobId} not found`);

      const next = generationTransition(dbJob.status, { type: 'provider_accepted' });
      if (!next.ok) throw next.error;
      await db
        .update(generationJob)
        .set({ status: next.value, provider })
        .where(eq(generationJob.id, jobId));

      const providerImpl = selectGenerationProvider();
      const submitInput =
        input.kind === 'text'
          ? ({ kind: 'text', prompt: input.prompt } as const)
          : ({
              kind: 'image' as const,
              imageUrl: s3Storage.publicUrl({ bucket: env.S3_BUCKET_UPLOADS, key: input.imageUri }),
              ...(input.hint ? { hint: input.hint } : {}),
            } as const);
      const submitted = await providerImpl.submit(submitInput);
      await db
        .update(generationJob)
        .set({ providerJobId: submitted.providerJobId })
        .where(eq(generationJob.id, jobId));

      // Polling — up to 5 minutes for the mock + Meshy. Bulky in production
      // (we'd switch to a webhook-driven path), fine for MVP.
      const start = Date.now();
      while (Date.now() - start < 5 * 60_000) {
        await new Promise((r) => setTimeout(r, 3000));
        const status = await providerImpl.poll(submitted.providerJobId);
        if (status.state === 'queued' || status.state === 'running') continue;

        if (status.state === 'failed') {
          await db
            .update(generationJob)
            .set({ status: 'failed', failureReason: status.reason, completedAt: new Date() })
            .where(eq(generationJob.id, jobId));
          await db.insert(contentPolicyDecision).values({
            generationJobId: jobId,
            stage: 'post_check',
            ruleId: 'provider.failed',
            customerMessage: 'Generation failed. Please try again with a different prompt.',
            evidence: { reason: status.reason },
          });
          return;
        }

        if (status.state !== 'succeeded') throw new Error(`unexpected provider state: ${(status as { state: string }).state}`);
        const [glbBytes, thumbBytes] = await Promise.all([
          fetch(status.glbUrl).then(async (r) => new Uint8Array(await r.arrayBuffer())),
          fetch(status.thumbnailUrl).then(async (r) => new Uint8Array(await r.arrayBuffer())),
        ]);
        const glbKey = `models/${jobId}.glb`;
        const thumbKey = `thumbnails/${jobId}.png`;
        await s3Storage.putObject({ bucket: env.S3_BUCKET_MODELS, key: glbKey, body: glbBytes, contentType: 'model/gltf-binary' });
        await s3Storage.putObject({ bucket: env.S3_BUCKET_THUMBNAILS, key: thumbKey, body: thumbBytes, contentType: 'image/png' });

        const [inserted] = await db
          .insert(model)
          .values({
            generationJobId: jobId,
            glbUri: s3Storage.publicUrl({ bucket: env.S3_BUCKET_MODELS, key: glbKey }),
            thumbnailUri: s3Storage.publicUrl({ bucket: env.S3_BUCKET_THUMBNAILS, key: thumbKey }),
            boundingBoxMm: { x: 50, y: 50, z: 50 }, // mock cube; real impl reads from GLB
          })
          .returning({ id: model.id });

        if (!inserted) throw new Error('failed to insert model');

        await db
          .update(generationJob)
          .set({ status: 'succeeded', completedAt: new Date() })
          .where(eq(generationJob.id, jobId));

        const materials = await db.select({ id: material.id }).from(material);
        for (const m of materials) {
          await queues.printReadiness.add('print-readiness', { modelId: inserted.id, materialId: m.id });
        }
        return;
      }
      throw new Error(`generation timed out after 5 minutes for job ${jobId}`);
    },
    { concurrency: 8 },
  );
  return async () => {
    await w.close();
  };
}
