import { appendEvent, customer, db, order } from '@imagineer/db';
import { transition } from '@imagineer/domain';
import { stripePayments } from '@imagineer/providers';
import { env } from '@imagineer/config';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const o = await db.query.order.findFirst({ where: eq(order.id, params.id) });
  if (!o) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const c = await db.query.customer.findFirst({ where: eq(customer.id, o.customerId) });
  if (!c) return NextResponse.json({ error: 'customer missing' }, { status: 500 });

  const next = transition(o.status, { type: 'checkout_started' });
  if (!next.ok) {
    return NextResponse.json({ error: 'order not in draft state' }, { status: 409 });
  }

  const successUrl = env.STRIPE_SUCCESS_URL.replace('{ORDER_ID}', o.id);
  const session = await stripePayments.createCheckoutSession({
    orderId: o.id,
    customerEmail: c.email,
    amountCents: o.totalCents,
    currency: 'USD',
    description: `Imagineer order ${o.id.slice(0, 8)}`,
    successUrl,
    cancelUrl: env.STRIPE_CANCEL_URL,
  });

  await db.update(order).set({ status: next.value }).where(eq(order.id, o.id));
  await appendEvent(o.id, 'checkout_started', { stripeSessionExpiresAt: session.expiresAt.toISOString() }, 'system');

  return NextResponse.json({ checkoutUrl: session.url, expiresAt: session.expiresAt.toISOString() });
}
