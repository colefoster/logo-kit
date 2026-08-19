// Simple in-memory fixed-window rate limiter, per IP, per route class.
// For a single-process deployment this is adequate; swap for Redis if horizontally scaled.
export const WINDOW_MS = 60 * 1000;

// Preview fires once per debounced keystroke pause, so it needs far more headroom
// than the zip endpoint, which does the actual Sharp work. A single shared budget
// meant a user simply typing a product name could lock themselves out of downloads.
export const LIMITS = {
  preview: 90,
  download: 12,
} as const;

export type RouteClass = keyof typeof LIMITS;

const MAX_BUCKETS = 10_000;

export interface Bucket {
  count: number;
  resetAt: number;
}

export function routeClass(pathname: string): RouteClass | null {
  if (pathname.startsWith('/api/preview')) return 'preview';
  if (pathname.startsWith('/api/download')) return 'download';
  return null;
}

/**
 * cf-connecting-ip is set by Cloudflare and cannot be spoofed by the client.
 * x-real-ip is only ever the local cloudflared hop here, so it comes last.
 */
export function clientIpFrom(headers: Headers): string {
  const cf = headers.get('cf-connecting-ip');
  if (cf?.trim()) return cf.trim();

  const forwarded = headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  if (first) return first;

  const realIp = headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  return 'unknown';
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
}

export function checkRateLimit(
  buckets: Map<string, Bucket>,
  key: string,
  max: number,
  now: number = Date.now(),
): RateLimitResult {
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    // Sweep before inserting, so a flood of single-shot IPs cannot grow the map
    // past the cap. The previous version only swept on the already-tracked path,
    // which is the one path where growth is impossible.
    if (buckets.size >= MAX_BUCKETS) {
      for (const [k, v] of buckets) {
        if (v.resetAt <= now) buckets.delete(k);
      }
    }
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  bucket.count++;
  if (bucket.count > max) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }

  return { allowed: true, retryAfter: 0 };
}
