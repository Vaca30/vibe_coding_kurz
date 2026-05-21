import { db, generationJob, model } from '@imagineer/db';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const job = await db.query.generationJob.findFirst({ where: eq(generationJob.id, params.id) });
  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const m =
    job.status === 'succeeded'
      ? await db.query.model.findFirst({ where: eq(model.generationJobId, job.id) })
      : undefined;

  return NextResponse.json({
    id: job.id,
    status: job.status,
    submittedAt: job.submittedAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
    failureReason: job.failureReason,
    model: m
      ? {
          id: m.id,
          glbUri: m.glbUri,
          thumbnailUri: m.thumbnailUri,
          boundingBoxMm: m.boundingBoxMm,
          approvedAt: m.approvedAt?.toISOString() ?? null,
        }
      : null,
  });
}
