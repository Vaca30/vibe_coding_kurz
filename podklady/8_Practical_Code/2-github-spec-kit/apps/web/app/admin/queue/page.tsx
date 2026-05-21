import { db, order, shipment } from '@imagineer/db';
import { desc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function AdminQueuePage() {
  const rows = await db
    .select()
    .from(order)
    .where(eq(order.status, 'in_production'))
    .orderBy(desc(order.placedAt));

  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <h2 className="text-2xl font-semibold">Print queue</h2>
      <table className="mt-6 w-full text-sm">
        <thead className="text-left text-foreground/60">
          <tr>
            <th className="py-2">Order</th>
            <th>Tracking</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(async (o) => {
            const ship = await db.query.shipment.findFirst({ where: eq(shipment.orderId, o.id) });
            return (
              <tr key={o.id} className="border-t border-border">
                <td className="py-3">
                  <a className="text-accent hover:underline" href={`/orders/${o.id}`}>
                    {o.id.slice(0, 8)}
                  </a>
                </td>
                <td>{ship?.trackingNumber ?? '—'}</td>
                <td>
                  <form action={`/api/admin/orders/${o.id}/print-failed`} method="post" className="inline">
                    <button type="submit" className="btn-secondary text-xs">
                      Mark print failed
                    </button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 ? <p className="mt-6 text-sm text-foreground/60">Queue is empty.</p> : null}
    </section>
  );
}
