import { db, model, material, printReadinessVerdict } from '@imagineer/db';
import { type PrintReadinessPayload, createLogger } from '@imagineer/shared';
import { eq } from 'drizzle-orm';
import { createWorker } from '../queue.ts';
import { slice } from '../slicer/prusaslicer.ts';

const log = createLogger('worker.print-readiness');

export function startPrintReadinessConsumer(): () => Promise<void> {
  const w = createWorker<PrintReadinessPayload>(
    'print-readiness',
    async (job) => {
      const { modelId, materialId } = job.data;
      log.info({ modelId, materialId }, 'slicing');
      const m = await db.query.model.findFirst({ where: eq(model.id, modelId) });
      const mat = await db.query.material.findFirst({ where: eq(material.id, materialId) });
      if (!m || !mat) throw new Error('model or material missing');

      const verdict = await slice({ glbUri: m.glbUri, profilePath: mat.prusaProfilePath });

      await db.insert(printReadinessVerdict).values({
        modelId,
        materialId,
        verdict: verdict.kind,
        minWallThicknessMm: verdict.minWallThicknessMm.toString(),
        sliceTimeSeconds: verdict.sliceTimeSeconds,
        printTimeSeconds: verdict.kind === 'rejected' ? null : verdict.printTimeSeconds,
        materialVolumeMm3:
          verdict.kind === 'rejected' ? null : verdict.materialVolumeMm3.toString(),
        notes: verdict.notes ?? null,
      });

      if (verdict.kind !== 'rejected' && verdict.stlBytes) {
        // STL upload is optional in MVP: stub-mode slicer returns null bytes.
        // Real wrapper writes to R2 and updates model.stlUri. Left as polish.
      }
    },
    { concurrency: 4 },
  );
  return async () => {
    await w.close();
  };
}
