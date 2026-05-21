import { appendEvent, db, order, payment, webhookEventLog } from '@imagineer/db';
import { transition } from '@imagineer/domain';
import { stripePayments } from '@imagineer/providers';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { fulfillmentQueue } from '~/lib/queue.ts';

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'no signature' }, { status: 400 });
  const raw = await req.text();

  let evt: ReturnType<typeof stripePayments.verifyWebhook>;
  try {
    evt = stripePayments.verifyWebhook(raw, sig);
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 400 });
  }

  // Idempotency.
  const inserted = await db
    .insert(webhookEventLog)
    .values({ provider: 'stripe', eventId: evt.eventId })
    .onConflictDoNothing()
    .returning({ eventId: webhookEventLog.eventId });
  if (inserted.length === 0) return NextResponse.json({ ok: true, idempotent: true });

  const intent = (evt.data as { object: { id: string; metadata?: { order_id?: string }; amount?: number; last_payment_error?: { message: string } } }).object;
  const orderId = intent.metadata?.order_id;
  if (!orderId) return NextResponse.json({ ok: true, ignored: 'no order id' });

  if (evt.type === 'payment_intent.succeeded') {
    const o = await db.query.order.findFirst({ where: eq(order.id, orderId) });
    if (!o) return NextResponse.json({ ok: true, missing: true });
    await db.insert(payment).values({
      orderId,
      stripePaymentIntentId: intent.id,
      amountCents: intent.amount ?? o.totalCents,
      status: 'succeeded',
      succeededAt: new Date(),
    }).onConflictDoNothing();
    const next = transition(o.status, { type: 'payment_succeeded' });
    if (next.ok) {
      await db.update(order).set({ status: next.value, paidAt: new Date() }).where(eq(order.id, orderId));
      await appendEvent(orderId, 'paid', { intent: intent.id }, 'webhook:stripe');
      await fulfillmentQueue().add('fulfillment-handoff', { orderId });
    }
  } else if (evt.type === 'payment_intent.payment_failed') {
    await db.insert(payment).values({
      orderId,
      stripePaymentIntentId: intent.id,
      amountCents: intent.amount ?? 0,
      status: 'failed',
      failedReason: intent.last_payment_error?.message ?? 'unknown',
    }).onConflictDoNothing();
    await appendEvent(orderId, 'payment_failed', { intent: intent.id }, 'webhook:stripe');
  } else if (evt.type === 'checkout.session.expired') {
    const o = await db.query.order.findFirst({ where: eq(order.id, orderId) });
    if (o) {
      const next = transition(o.status, { type: 'checkout_expired' });
      if (next.ok) {
        await db.update(order).set({ status: next.value, cancelledAt: new Date() }).where(eq(order.id, orderId));
        await appendEvent(orderId, 'checkout_expired', {}, 'webhook:stripe');
      }
    }
  }

  return NextResponse.json({ ok: true });
}
