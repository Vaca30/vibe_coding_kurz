import { db, order, shipment } from '@imagineer/db';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const o = await db.query.order.findFirst({ where: eq(order.id, params.id) });
  if (!o) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const ship = await db.query.shipment.findFirst({ where: eq(shipment.orderId, o.id) });
  return NextResponse.json({ ...o, shipment: ship ?? null });
}
