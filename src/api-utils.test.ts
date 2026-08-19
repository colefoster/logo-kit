import { describe, it, expect } from 'vitest';
import { parseJsonBody } from './api-utils';

function post(body: string, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
  });
}

async function errorOf(parsed: Awaited<ReturnType<typeof parseJsonBody>>) {
  if (!('error' in parsed)) throw new Error('expected an error response');
  return { status: parsed.error.status, body: await parsed.error.json() };
}

describe('parseJsonBody', () => {
  it('parses a valid body', async () => {
    const parsed = await parseJsonBody(post(JSON.stringify({ name: 'Acme' })));
    expect(parsed).toEqual({ data: { name: 'Acme' } });
  });

  it('rejects malformed JSON with 400', async () => {
    const { status, body } = await errorOf(await parseJsonBody(post('{ nope')));
    expect(status).toBe(400);
    expect(body).toEqual({ error: 'Invalid JSON' });
  });

  it('rejects a body over the size cap with 413', async () => {
    const huge = JSON.stringify({ name: 'x'.repeat(9000) });
    const { status } = await errorOf(await parseJsonBody(post(huge)));
    expect(status).toBe(413);
  });

  it('rejects an oversized content-length before reading the body', async () => {
    const { status } = await errorOf(
      await parseJsonBody(post('{}', { 'content-length': '999999' })),
    );
    expect(status).toBe(413);
  });

  it('rejects a non-numeric content-length', async () => {
    const { status } = await errorOf(await parseJsonBody(post('{}', { 'content-length': 'abc' })));
    expect(status).toBe(413);
  });

  it('still enforces the cap when content-length is absent', async () => {
    // Mimics a chunked upload: no content-length, oversized payload.
    const req = {
      headers: new Headers(),
      text: async () => 'x'.repeat(9000),
    } as unknown as Request;
    const { status } = await errorOf(await parseJsonBody(req));
    expect(status).toBe(413);
  });

  it('accepts a body exactly at the cap', async () => {
    const filler = 'a'.repeat(8 * 1024 - 12);
    const body = JSON.stringify({ n: filler });
    expect(body.length).toBeLessThanOrEqual(8 * 1024);
    expect(await parseJsonBody(post(body))).toEqual({ data: { n: filler } });
  });
});
