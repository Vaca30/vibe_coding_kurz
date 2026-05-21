import { db, generationJob, contentPolicyDecision } from '@imagineer/db';
import { precheck } from '@imagineer/domain';
import { generationInput } from '@imagineer/shared';
import { NextResponse } from 'next/server';
import { generationQueue } from '~/lib/queue.ts';
import { readSessionId } from '~/lib/session-server.ts';

// POST /api/generations — submit a generation job. Accepts both text prompts
// (US1) and image references (US2).

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = generationInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input', issues: parsed.error.issues }, { status: 400 });
  }

  const sessionId = readSessionId(req);
  const verdict = precheck(
    parsed.data.kind === 'text'
      ? { kind: 'text', prompt: parsed.data.prompt }
      : { kind: 'image', ...(parsed.data.hint ? { hint: parsed.data.hint } : {}) },
  );
  if (!verdict.allowed) {
    const [job] = await db
      .insert(generationJob)
      .values({
        sessionId,
        inputKind: parsed.data.kind,
        inputText: parsed.data.kind === 'text' ? parsed.data.prompt : null,
        inputImageUri: parsed.data.kind === 'image' ? parsed.data.imageUri : null,
        provider: 'meshy',
        status: 'refused',
        failureReason: verdict.customerMessage,
      })
      .returning({ id: generationJob.id });
    if (!job) throw new Error('failed to insert refused generation job');
    await db.insert(contentPolicyDecision).values({
      generationJobId: job.id,
      stage: 'pre_check',
      ruleId: verdict.ruleId,
      customerMessage: verdict.customerMessage,
    });
    return NextResponse.json(
      { id: job.id, ruleId: verdict.ruleId, customerMessage: verdict.customerMessage },
      { status: 422 },
    );
  }

  const [job] = await db
    .insert(generationJob)
    .values({
      sessionId,
      inputKind: parsed.data.kind,
      inputText: parsed.data.kind === 'text' ? parsed.data.prompt : null,
      inputImageUri: parsed.data.kind === 'image' ? parsed.data.imageUri : null,
      provider: 'meshy',
      status: 'queued',
    })
    .returning({ id: generationJob.id });
  if (!job) throw new Error('failed to insert generation job');

  const queueInput =
    parsed.data.kind === 'text'
      ? ({ kind: 'text' as const, prompt: parsed.data.prompt })
      : ({
          kind: 'image' as const,
          imageUri: parsed.data.imageUri,
          ...(parsed.data.hint ? { hint: parsed.data.hint } : {}),
        });

  await generationQueue().add('generation', {
    jobId: job.id,
    customerId: null,
    sessionId,
    input: queueInput,
    provider: 'meshy',
  });

  return NextResponse.json({ id: job.id, status: 'queued' }, { status: 202 });
}
