import { NextRequest } from 'next/server';

const MAX_BODY_SIZE = 8 * 1024; // 8 KB — logo config is tiny

export async function parseJsonBody(req: NextRequest): Promise<{ data: unknown } | { error: Response }> {
  const contentLengthRaw = req.headers.get('content-length');
  const contentLength = contentLengthRaw !== null ? Number(contentLengthRaw) : null;

  if (contentLength !== null && (Number.isNaN(contentLength) || contentLength > MAX_BODY_SIZE)) {
    return { error: Response.json({ error: 'Request body too large' }, { status: 413 }) };
  }

  try {
    const text = await req.text();
    if (text.length > MAX_BODY_SIZE) {
      return { error: Response.json({ error: 'Request body too large' }, { status: 413 }) };
    }
    return { data: JSON.parse(text) };
  } catch {
    return { error: Response.json({ error: 'Invalid JSON' }, { status: 400 }) };
  }
}
