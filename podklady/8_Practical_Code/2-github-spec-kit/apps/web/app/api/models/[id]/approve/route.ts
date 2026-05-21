import { db, model } from '@imagineer/db';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const [updated] = await db
    .update(model)
    .set({ approvedAt: new Date() })
    .where(eq(model.id, params.id))
    .returning({ id: model.id, approvedAt: model.approvedAt });
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ id: updated.id, approvedAt: updated.approvedAt?.toISOString() });
}
