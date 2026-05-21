import { addressInput } from '@imagineer/shared';
import { smartystreetsValidator } from '@imagineer/providers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = addressInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }
  const verdict = await smartystreetsValidator.validate(parsed.data);
  return NextResponse.json(verdict);
}
