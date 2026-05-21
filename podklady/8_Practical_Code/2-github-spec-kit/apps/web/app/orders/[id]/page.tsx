import { db, order, shipment } from '@imagineer/db';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await db.query.order.findFirst({ where: eq(order.id, id) });
  if (!o) notFound();
  const ship = await db.query.shipment.findFirst({ where: eq(shipment.orderId, o.id) });

  return (
    <section className="mx-auto max-w-2xl px-6 py-10" data-testid="order-detail">
      <h2 className="text-2xl font-semibold">Order {o.id.slice(0, 8)}</h2>
      <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <Row label="Status" value={o.status} testId="order-status" />
        <Row label="Total" value={`$${(o.totalCents / 100).toFixed(2)}`} />
        <Row label="Estimated delivery" value={String(o.estimatedDeliveryAt)} />
        <Row label="Placed" value={o.placedAt.toLocaleString()} />
        {o.paidAt ? <Row label="Paid" value={o.paidAt.toLocaleString()} /> : null}
        {o.shippedAt ? <Row label="Shipped" value={o.shippedAt.toLocaleString()} /> : null}
        {o.deliveredAt ? <Row label="Delivered" value={o.deliveredAt.toLocaleString()} /> : null}
      </dl>
      {ship ? (
        <p className="mt-6 text-sm">
          Tracking:{' '}
          <a className="text-accent hover:underline" href={ship.trackingUrl} target="_blank" rel="noreferrer">
            {ship.trackingNumber}
          </a>
        </p>
      ) : null}
    </section>
  );
}

function Row({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <>
      <dt className="text-foreground/60">{label}</dt>
      <dd className="font-medium" {...(testId ? { 'data-testid': testId } : {})}>
        {value}
      </dd>
    </>
  );
}
