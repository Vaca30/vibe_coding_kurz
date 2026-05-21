import { appendEvent, db, order } from '@imagineer/db';
import { transition } from '@imagineer/domain';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = (await req.json().catch(() => ({}))) as { reason?: string };
  if (!body.reason || body.reason.length === 0) {
    return NextResponse.json({ error: 'reason required' }, { status: 400 });
  }

  const o = await db.query.order.findFirst({ where: eq(order.id, params.id) });
  if (!o) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const next = transition(o.status, { type: 'reprint_requested' });
  if (!next.ok) return NextResponse.json({ error: 'illegal' }, { status: 409 });

  await db.update(order).set({ status: next.value }).where(eq(order.id, o.id));
  await appendEvent(o.id, 'reprint_requested', { reason: body.reason }, `customer:${o.customerId}`);
  return NextResponse.json({ status: next.value });
}
