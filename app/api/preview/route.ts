import { NextRequest } from 'next/server';
import { isLogoProduct } from '@/src/config';
import { generateProduct } from '@/src/generate';

export async function POST(req: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!isLogoProduct(body)) {
    return Response.json({ error: 'Invalid product config' }, { status: 400 });
  }

  try {
    const { optimizedSvg } = await generateProduct(body);
    return new Response(optimizedSvg, {
      headers: { 'Content-Type': 'image/svg+xml' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
