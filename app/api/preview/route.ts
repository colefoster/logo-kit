import { NextRequest } from 'next/server';
import { isLogoProduct } from '@/src/config';
import { generateProduct } from '@/src/generate';
import { parseJsonBody } from '@/src/api-utils';

export async function POST(req: NextRequest): Promise<Response> {
  const parsed = await parseJsonBody(req);
  if ('error' in parsed) return parsed.error;

  if (!isLogoProduct(parsed.data)) {
    return Response.json({ error: 'Invalid product config' }, { status: 400 });
  }

  try {
    const { optimizedSvg } = await generateProduct(parsed.data);
    return new Response(optimizedSvg, {
      headers: { 'Content-Type': 'image/svg+xml' },
    });
  } catch (err) {
    console.error('Preview generation failed:', err);
    return Response.json({ error: 'Generation failed' }, { status: 500 });
  }
}
