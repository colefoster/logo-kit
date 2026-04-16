import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory sliding window rate limiter per IP.
// For a single-container deployment this is adequate; swap for Redis if horizontally scaled.
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30;     // per window per IP
const BUCKETS = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = BUCKETS.get(ip);

  if (!bucket || bucket.resetAt < now) {
    BUCKETS.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  bucket.count++;
  if (bucket.count > RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  // Opportunistic cleanup — cap map size
  if (BUCKETS.size > 10000) {
    for (const [key, value] of BUCKETS) {
      if (value.resetAt < now) BUCKETS.delete(key);
    }
  }

  return { allowed: true, retryAfter: 0 };
}

export function middleware(req: NextRequest) {
  // Only rate-limit the expensive API routes
  if (!req.nextUrl.pathname.startsWith('/api/download') &&
      !req.nextUrl.pathname.startsWith('/api/preview')) {
    return NextResponse.next();
  }

  const ip = getClientIp(req);
  const { allowed, retryAfter } = checkRateLimit(ip);

  if (!allowed) {
    return new NextResponse(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
        },
      },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/download/:path*', '/api/preview/:path*'],
};
