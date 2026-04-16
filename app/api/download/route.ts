import { NextRequest } from 'next/server';
import { isLogoProduct, isExportSelection, sanitizeSlug, PRESET_BY_KEY, DEFAULT_EXPORT_KEYS, presetFilename } from '@/src/config';
import type { SizePreset } from '@/src/config';
import { generateProduct } from '@/src/generate';
import { rasterizeSvg } from '@/src/raster';
import { generateIco } from '@/src/ico';
import { generateManifest } from '@/src/manifest';
import archiver from 'archiver';

export async function POST(req: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const obj = body as Record<string, unknown>;

  if (!isLogoProduct(obj)) {
    return Response.json({ error: 'Invalid product config' }, { status: 400 });
  }

  // Extract exports before narrowing — obj still has the full shape
  const rawExports = obj['exports'];
  let selectedPresets: SizePreset[];

  if (rawExports === undefined) {
    selectedPresets = DEFAULT_EXPORT_KEYS.map((k) => PRESET_BY_KEY.get(k)!);
  } else {
    if (!isExportSelection(rawExports)) {
      return Response.json({ error: 'Invalid exports selection: presets must be an array of valid preset keys' }, { status: 400 });
    }
    if (rawExports.presets.length === 0) {
      return Response.json({ error: 'At least one export preset must be selected' }, { status: 400 });
    }
    selectedPresets = rawExports.presets.map((k) => PRESET_BY_KEY.get(k)!);
  }

  try {
    const product = obj as unknown as import('@/src/config').LogoProduct;
    const { optimizedSvg } = await generateProduct(product);
    const slug = sanitizeSlug(product.name);

    // Generate all rasterizations in parallel
    const fileEntries = await Promise.all(
      selectedPresets.map(async (preset) => {
        const filename = presetFilename(preset);
        if (preset.format === 'svg') {
          return { filename, data: Buffer.from(optimizedSvg) };
        }
        if (preset.format === 'ico') {
          const data = await generateIco(optimizedSvg);
          return { filename, data };
        }
        // png
        const data = await rasterizeSvg(optimizedSvg, preset.width, preset.height);
        return { filename, data };
      })
    );

    const manifest = generateManifest(product, './', selectedPresets);

    const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
      const archive = archiver('zip');
      const chunks: Buffer[] = [];

      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      for (const { filename, data } of fileEntries) {
        archive.append(data, { name: `${slug}/${filename}` });
      }
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
