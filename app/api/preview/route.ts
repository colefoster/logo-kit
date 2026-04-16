import { NextRequest } from 'next/server';
import { isLogoProduct } from '@/src/config';
import { generateProduct } from '@/src/generate';
import { isKnownIcon } from '@/src/svg';
import { parseJsonBody } from '@/src/api-utils';

export async function POST(req: NextRequest): Promise<Response> {
  const parsed = await parseJsonBody(req);
  if ('error' in parsed) return parsed.error;

  if (!isLogoProduct(parsed.data)) {
    return Response.json({ error: 'Invalid product config' }, { status: 400 });
  }

  const product = parsed.data;

  // Validate icon exists server-side
  if (product.type !== 'text-only' && product.icon && !isKnownIcon(product.icon)) {
    return Response.json({ error: 'Unknown icon' }, { status: 400 });
  }

  try {
    const { optimizedSvg } = await generateProduct(product);
    return new Response(optimizedSvg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    console.error('Preview generation failed:', err);
    return Response.json({ error: 'Generation failed' }, { status: 500 });
  }
}
