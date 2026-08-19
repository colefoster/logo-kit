import { validateLogoProduct } from '@/src/config';
import { generateProduct } from '@/src/generate';
import { isKnownIcon } from '@/src/svg';
import { parseJsonBody } from '@/src/api-utils';

export async function POST(req: Request): Promise<Response> {
  const parsed = await parseJsonBody(req);
  if ('error' in parsed) return parsed.error;

  const validated = validateLogoProduct(parsed.data);
  if (!validated.ok) {
    return Response.json({ error: validated.error }, { status: 400 });
  }

  const product = validated.value;

  // The regex guard only proves the name is shaped like an icon name; this proves
  // the file exists, which also closes off path traversal by construction.
  if ((product.type ?? 'icon') !== 'text-only' && product.icon && !isKnownIcon(product.icon)) {
    return Response.json({ error: `No icon named "${product.icon}"` }, { status: 400 });
  }

  try {
    const { optimizedSvg } = await generateProduct(product);
    return new Response(optimizedSvg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Preview generation failed:', err);
    return Response.json({ error: 'Generation failed' }, { status: 500 });
  }
}
