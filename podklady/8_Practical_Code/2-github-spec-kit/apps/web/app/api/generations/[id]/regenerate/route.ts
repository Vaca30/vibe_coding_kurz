import { db, generationJob } from '@imagineer/db';
import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { generationQueue } from '~/lib/queue.ts';
import { readSessionId } from '~/lib/session-server.ts';

const FREE_QUOTA = 3;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = readSessionId(req);
  const original = await db.query.generationJob.findFirst({ where: eq(generationJob.id, params.id) });
  if (!original) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const used = await db
    .select({ id: generationJob.id })
    .from(generationJob)
    .where(and(eq(generationJob.sessionId, session)));
  if (used.length >= FREE_QUOTA) {
    const body = (await req.json().catch(() => ({}))) as { acceptPaidRegeneration?: boolean };
    if (!body.acceptPaidRegeneration) {
      return NextResponse.json(
        { error: 'free quota exhausted', quota: FREE_QUOTA, used: used.length },
        { status: 402 },
      );
    }
  }

  const [job] = await db
    .insert(generationJob)
    .values({
      sessionId: session,
      inputKind: original.inputKind,
      inputText: original.inputText,
      inputImageUri: original.inputImageUri,
      provider: original.provider,
      status: 'queued',
    })
    .returning({ id: generationJob.id });
  if (!job) throw new Error('failed to insert regeneration job');

  const input =
    original.inputKind === 'text'
      ? ({ kind: 'text', prompt: original.inputText ?? '' } as const)
      : ({ kind: 'image', imageUri: original.inputImageUri ?? '' } as const);

  await generationQueue().add('generation', {
    jobId: job.id,
    customerId: original.customerId,
    sessionId: session,
    input,
    provider: original.provider,
  });

  return NextResponse.json({ id: job.id, status: 'queued' }, { status: 202 });
}
