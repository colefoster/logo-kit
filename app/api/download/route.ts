import { NextRequest } from 'next/server';
import { isLogoProduct, sanitizeSlug } from '@/src/config';
import { generateProduct } from '@/src/generate';
import { rasterizeSvg } from '@/src/raster';
import { generateManifest } from '@/src/manifest';
import archiver from 'archiver';

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
    const [png32, png64, png180] = await Promise.all([
      rasterizeSvg(optimizedSvg, 32, 32),
      rasterizeSvg(optimizedSvg, 64, 64),
      rasterizeSvg(optimizedSvg, 180, 180),
    ]);

    // Use name:'logo' so manifest references logo-32.png etc., matching fixed filenames
    const manifest = generateManifest({ name: 'logo', color: body.color }, './');
    const slug = sanitizeSlug(body.name);

    const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
      const archive = archiver('zip');
      const chunks: Buffer[] = [];

      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      archive.append(optimizedSvg, { name: `${slug}/logo.svg` });
      archive.append(png32, { name: `${slug}/logo-32.png` });
      archive.append(png64, { name: `${slug}/logo-64.png` });
      archive.append(png180, { name: `${slug}/logo-180.png` });
      archive.append(manifest, { name: `${slug}/manifest.html` });
      archive.finalize();
    });

    return new Response(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${slug}-logo-kit.zip"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
