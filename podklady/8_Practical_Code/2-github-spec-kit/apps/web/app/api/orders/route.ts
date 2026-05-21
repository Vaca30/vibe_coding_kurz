import {
  appendEvent,
  address,
  color,
  customer,
  db,
  material,
  model,
  order,
  printReadinessVerdict,
} from '@imagineer/db';
import { calculatePricing } from '@imagineer/domain';
import { smartystreetsValidator } from '@imagineer/providers';
import { orderDraft } from '@imagineer/shared';
import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { auth } from '~/auth.ts';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = await req.json();
  const parsed = orderDraft.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }
  const draft = parsed.data;

  // Load related entities so we can validate constraints.
  const m = await db.query.model.findFirst({ where: eq(model.id, draft.modelId) });
  const mat = await db.query.material.findFirst({ where: eq(material.id, draft.materialId) });
  const col = await db.query.color.findFirst({ where: eq(color.id, draft.colorId) });
  if (!m || !mat || !col) return NextResponse.json({ error: 'unknown entity' }, { status: 404 });
  if (!mat.isAvailable || !col.isAvailable) {
    return NextResponse.json(
      { error: 'unavailable', reason: mat.unavailableReason ?? col.unavailableReason },
      { status: 409 },
    );
  }
  const verdict = await db.query.printReadinessVerdict.findFirst({
    where: and(eq(printReadinessVerdict.modelId, m.id), eq(printReadinessVerdict.materialId, mat.id)),
  });
  if (verdict?.verdict === 'rejected') {
    return NextResponse.json({ error: 'model not printable in this material' }, { status: 409 });
  }

  // Validate the address before any payment.
  const addrCheck = await smartystreetsValidator.validate(draft.address);
  if (!addrCheck.isDeliverable) {
    return NextResponse.json({ error: 'undeliverable', explanation: addrCheck.explanation }, { status: 422 });
  }

  // Find or create customer + address rows.
  const c = await db
    .insert(customer)
    .values({ email: session.user.email, displayName: session.user.name ?? null })
    .onConflictDoUpdate({ target: customer.email, set: { updatedAt: new Date() } })
    .returning({ id: customer.id });
  const customerId = c[0]?.id;
  if (!customerId) throw new Error('failed to upsert customer');

  const [addr] = await db
    .insert(address)
    .values({
      customerId,
      recipientName: draft.address.recipientName,
      street1: draft.address.street1,
      street2: draft.address.street2 ?? null,
      city: draft.address.city,
      state: draft.address.state,
      postalCode: draft.address.postalCode,
      dpvMatchCode: addrCheck.dpvMatchCode,
      validatedAt: new Date(),
    })
    .returning({ id: address.id });
  if (!addr) throw new Error('failed to insert address');

  const volume = verdict?.materialVolumeMm3 ? Number(verdict.materialVolumeMm3) : 125_000;
  const shippingCents = 599;
  const pricing = calculatePricing({
    volumeMm3: volume,
    costPerMm3Usd: Number(mat.costPerMm3Usd),
    shippingCents,
    taxRate: 0,
  });
  const eta = new Date();
  eta.setDate(eta.getDate() + mat.leadTimeDays + 3);

  const [o] = await db
    .insert(order)
    .values({
      customerId,
      modelId: m.id,
      materialId: mat.id,
      colorId: col.id,
      addressId: addr.id,
      status: 'draft',
      subtotalCents: pricing.subtotalCents,
      shippingCents: pricing.shippingCents,
      taxCents: pricing.taxCents,
      totalCents: pricing.totalCents,
      estimatedDeliveryAt: eta.toISOString().slice(0, 10),
    })
    .returning();
  if (!o) throw new Error('failed to insert order');

  await appendEvent(o.id, 'placed', { totalCents: o.totalCents }, `customer:${customerId}`);

  return NextResponse.json(o, { status: 201 });
}
