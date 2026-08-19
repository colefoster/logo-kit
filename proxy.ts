import { NextRequest, NextResponse } from 'next/server';
import { LIMITS, type Bucket, checkRateLimit, clientIpFrom, routeClass } from '@/src/rate-limit';

const BUCKETS = new Map<string, Bucket>();

export function proxy(req: NextRequest) {
  const cls = routeClass(req.nextUrl.pathname);
  if (!cls) return NextResponse.next();

  const key = `${cls}:${clientIpFrom(req.headers)}`;
  const { allowed, retryAfter } = checkRateLimit(BUCKETS, key, LIMITS[cls]);

  if (!allowed) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${retryAfter}s.` },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/download/:path*', '/api/preview/:path*'],
};
