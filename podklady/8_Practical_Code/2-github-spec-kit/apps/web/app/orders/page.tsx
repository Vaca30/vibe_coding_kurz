import { db, order } from '@imagineer/db';
import { desc, eq } from 'drizzle-orm';
import { auth } from '~/auth.ts';
import { customer } from '@imagineer/db';

export const dynamic = 'force-dynamic';

export default async function OrdersListPage() {
  const session = await auth();
  if (!session?.user?.email) {
    return <Shell>Sign in to see your orders.</Shell>;
  }
  const c = await db.query.customer.findFirst({ where: eq(customer.email, session.user.email) });
  if (!c) return <Shell>No orders yet.</Shell>;
  const rows = await db.select().from(order).where(eq(order.customerId, c.id)).orderBy(desc(order.placedAt));

  if (rows.length === 0) return <Shell>No orders yet.</Shell>;

  return (
    <Shell>
      <h2 className="text-2xl font-semibold">Your orders</h2>
      <ul className="mt-6 divide-y divide-border">
        {rows.map((o) => (
          <li key={o.id} className="py-4 flex items-center justify-between">
            <div>
              <p className="font-medium">Order {o.id.slice(0, 8)}</p>
              <p className="text-sm text-foreground/60">{o.status} · ${(o.totalCents / 100).toFixed(2)}</p>
            </div>
            <a className="text-sm text-accent hover:underline" href={`/orders/${o.id}`}>
              View
            </a>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <section className="mx-auto max-w-3xl px-6 py-10">{children}</section>;
}
