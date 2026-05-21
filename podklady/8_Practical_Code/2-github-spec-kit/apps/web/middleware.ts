import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Coarse rate-limiting for unauthenticated submission endpoints. Uses an
// in-memory token bucket per IP, keyed on the route. Adequate for MVP scale
// (single-region, single instance); switch to Upstash Redis when we deploy a
// second app instance.

const buckets = new Map<string, { tokens: number; refilledAt: number }>();
const LIMITS: Record<string, { tokensPerHour: number; capacity: number }> = {
  '/api/generations': { tokensPerHour: 10, capacity: 10 },
  '/api/uploads/image': { tokensPerHour: 20, capacity: 20 },
};

function take(key: string, limit: { tokensPerHour: number; capacity: number }): boolean {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: limit.capacity, refilledAt: now };
    buckets.set(key, bucket);
  }
  const elapsedHours = (now - bucket.refilledAt) / 3_600_000;
  bucket.tokens = Math.min(limit.capacity, bucket.tokens + elapsedHours * limit.tokensPerHour);
  bucket.refilledAt = now;
  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const limit = LIMITS[pathname];
  if (!limit) return NextResponse.next();
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'anon';
  const key = `${ip}:${pathname}`;
  if (!take(key, limit)) {
    return NextResponse.json({ error: 'rate limited' }, { status: 429 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/generations', '/api/uploads/image'],
};
