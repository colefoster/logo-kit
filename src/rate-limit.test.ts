import { describe, it, expect } from 'vitest';
import {
  LIMITS,
  WINDOW_MS,
  checkRateLimit,
  clientIpFrom,
  routeClass,
  type Bucket,
} from './rate-limit';

describe('routeClass', () => {
  it('classifies the two expensive routes', () => {
    expect(routeClass('/api/preview')).toBe('preview');
    expect(routeClass('/api/download')).toBe('download');
  });

  it('ignores everything else', () => {
    expect(routeClass('/')).toBeNull();
    expect(routeClass('/api/icons')).toBeNull();
    expect(routeClass('/api/up')).toBeNull();
  });
});

describe('clientIpFrom', () => {
  it('prefers cf-connecting-ip', () => {
    const headers = new Headers({
      'cf-connecting-ip': '203.0.113.9',
      'x-forwarded-for': '198.51.100.1, 127.0.0.1',
      'x-real-ip': '127.0.0.1',
    });
    expect(clientIpFrom(headers)).toBe('203.0.113.9');
  });

  it('falls back to the first x-forwarded-for hop', () => {
    const headers = new Headers({ 'x-forwarded-for': '198.51.100.1, 127.0.0.1' });
    expect(clientIpFrom(headers)).toBe('198.51.100.1');
  });

  it('never returns the local proxy hop in preference to a real client', () => {
    const headers = new Headers({ 'x-forwarded-for': '198.51.100.1', 'x-real-ip': '127.0.0.1' });
    expect(clientIpFrom(headers)).not.toBe('127.0.0.1');
  });

  it('degrades to a sentinel with no headers', () => {
    expect(clientIpFrom(new Headers())).toBe('unknown');
  });
});

describe('checkRateLimit', () => {
  function drain(buckets: Map<string, Bucket>, key: string, max: number, n: number, now = 0) {
    let last = { allowed: true, retryAfter: 0 };
    for (let i = 0; i < n; i++) last = checkRateLimit(buckets, key, max, now);
    return last;
  }

  it('allows exactly max requests in a window', () => {
    const buckets = new Map<string, Bucket>();
    expect(drain(buckets, 'k', 3, 3).allowed).toBe(true);
    expect(checkRateLimit(buckets, 'k', 3, 0).allowed).toBe(false);
  });

  it('reports a positive retry-after when blocked', () => {
    const buckets = new Map<string, Bucket>();
    drain(buckets, 'k', 1, 2);
    const blocked = checkRateLimit(buckets, 'k', 1, 0);
    expect(blocked.retryAfter).toBeGreaterThan(0);
    expect(blocked.retryAfter).toBeLessThanOrEqual(WINDOW_MS / 1000);
  });

  it('resets once the window has elapsed', () => {
    const buckets = new Map<string, Bucket>();
    drain(buckets, 'k', 1, 2);
    expect(checkRateLimit(buckets, 'k', 1, WINDOW_MS + 1).allowed).toBe(true);
  });

  it('keys are independent, so previews cannot exhaust the download budget', () => {
    const buckets = new Map<string, Bucket>();
    drain(buckets, 'preview:1.2.3.4', LIMITS.preview, LIMITS.preview + 5);
    expect(checkRateLimit(buckets, 'preview:1.2.3.4', LIMITS.preview, 0).allowed).toBe(false);
    expect(checkRateLimit(buckets, 'download:1.2.3.4', LIMITS.download, 0).allowed).toBe(true);
  });

  it('gives download a tighter budget than preview', () => {
    expect(LIMITS.download).toBeLessThan(LIMITS.preview);
  });
});
