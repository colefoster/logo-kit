const MAX_BODY_SIZE = 8 * 1024; // 8 KB — logo config is tiny

export type ParsedBody = { data: unknown } | { error: Response };

/**
 * Read and parse a small JSON body, rejecting anything oversized.
 *
 * Takes a plain `Request` (NextRequest is one) so it is testable without a Next
 * server. Content-Length is only a hint -- a chunked request has none -- so the
 * decoded length is checked too.
 */
export async function parseJsonBody(req: Request): Promise<ParsedBody> {
  const tooLarge = () => ({
    error: Response.json({ error: 'Request body too large' }, { status: 413 }),
  });

  const contentLengthRaw = req.headers.get('content-length');
  if (contentLengthRaw !== null) {
    const contentLength = Number(contentLengthRaw);
    if (Number.isNaN(contentLength) || contentLength > MAX_BODY_SIZE) return tooLarge();
  }

  let text: string;
  try {
    text = await req.text();
  } catch {
    return { error: Response.json({ error: 'Could not read request body' }, { status: 400 }) };
  }

  if (text.length > MAX_BODY_SIZE) return tooLarge();

  try {
    return { data: JSON.parse(text) };
  } catch {
    return { error: Response.json({ error: 'Invalid JSON' }, { status: 400 }) };
  }
}
