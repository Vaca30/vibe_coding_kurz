import { appendEvent, db, order, shipment } from '@imagineer/db';
import { transition } from '@imagineer/domain';
import { shippoShipping } from '@imagineer/providers';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { emailQueue } from '~/lib/queue.ts';

export async function POST(req: Request) {
  const sig = req.headers.get('x-shippo-signature') ?? '';
  const raw = await req.text();

  let evt: ReturnType<typeof shippoShipping.verifyWebhook>;
  try {
    evt = shippoShipping.verifyWebhook(raw, sig);
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 400 });
  }

  const data = evt.data as { tracking_number?: string; tracking_status?: { status?: string } };
  const trackingNumber = data.tracking_number;
  if (!trackingNumber) return NextResponse.json({ ok: true, ignored: 'no tracking number' });

  const ship = await db.query.shipment.findFirst({ where: eq(shipment.trackingNumber, trackingNumber) });
  if (!ship) return NextResponse.json({ ok: true, missing: true });

  const status = data.tracking_status?.status?.toLowerCase();
  if (status === 'transit' || status === 'pre_transit') {
    await db.update(shipment).set({ dispatchedAt: new Date() }).where(eq(shipment.id, ship.id));
    const o = await db.query.order.findFirst({ where: eq(order.id, ship.orderId) });
    if (o) {
      const next = transition(o.status, { type: 'shipped' });
      if (next.ok) {
        await db.update(order).set({ status: next.value, shippedAt: new Date() }).where(eq(order.id, o.id));
        await appendEvent(o.id, 'shipped', { trackingNumber }, 'webhook:shippo');
        await emailQueue().add('email', { template: 'order_shipped', to: '', data: { orderId: o.id, trackingNumber, trackingUrl: ship.trackingUrl } });
      }
    }
  } else if (status === 'delivered') {
    await db.update(shipment).set({ deliveredAt: new Date() }).where(eq(shipment.id, ship.id));
    const o = await db.query.order.findFirst({ where: eq(order.id, ship.orderId) });
    if (o) {
      const next = transition(o.status, { type: 'delivered' });
      if (next.ok) {
        await db.update(order).set({ status: next.value, deliveredAt: new Date() }).where(eq(order.id, o.id));
        await appendEvent(o.id, 'delivered', { trackingNumber }, 'webhook:shippo');
        await emailQueue().add('email', { template: 'order_delivered', to: '', data: { orderId: o.id } });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
