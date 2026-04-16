import { NextRequest } from 'next/server';

const MAX_BODY_SIZE = 64 * 1024; // 64 KB

export async function parseJsonBody(req: NextRequest): Promise<{ data: unknown } | { error: Response }> {
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
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
