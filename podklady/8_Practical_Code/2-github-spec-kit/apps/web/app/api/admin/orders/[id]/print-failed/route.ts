import { appendEvent, db, order } from '@imagineer/db';
import { transition } from '@imagineer/domain';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { fulfillmentQueue } from '~/lib/queue.ts';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const o = await db.query.order.findFirst({ where: eq(order.id, params.id) });
  if (!o) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const toReprint = transition(o.status, { type: 'print_failed' });
  if (!toReprint.ok) return NextResponse.json({ error: 'illegal' }, { status: 409 });
  const back = transition(toReprint.value, { type: 'reprint_scheduled' });
  if (!back.ok) return NextResponse.json({ error: 'illegal' }, { status: 409 });

  await db.update(order).set({ status: back.value }).where(eq(order.id, o.id));
  await appendEvent(o.id, 'print_failed', {}, 'operator:admin');
  await appendEvent(o.id, 'reprint_scheduled', { extraCost: 0 }, 'system');
  await fulfillmentQueue().add('fulfillment-handoff', { orderId: o.id });

  return NextResponse.json(o);
}
