import { NextRequest } from 'next/server';
import { isLogoProduct, isExportSelection, sanitizeSlug, PRESET_BY_KEY } from '@/src/config';
import type { SizePreset } from '@/src/config';
import { generateProduct } from '@/src/generate';
import { rasterizeSvg } from '@/src/raster';
import { generateIco } from '@/src/ico';
import { generateManifest } from '@/src/manifest';
import archiver from 'archiver';

const DEFAULT_EXPORT_KEYS = ['svg', 'favicon-32', 'favicon-64', 'apple-touch-180'];

function presetFilename(preset: SizePreset): string {
  if (preset.format === 'ico') return 'favicon.ico';
  if (preset.format === 'svg') return 'logo.svg';
  if (preset.width === preset.height) return `logo-${preset.width}.png`;
  return `logo-${preset.width}x${preset.height}.png`;
}

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

  const rawExports = (body as unknown as Record<string, unknown>)['exports'];
  let selectedPresets: SizePreset[];

  if (rawExports === undefined) {
    selectedPresets = DEFAULT_EXPORT_KEYS.map((k) => PRESET_BY_KEY.get(k)!);
  } else {
    if (!isExportSelection(rawExports)) {
      return Response.json({ error: 'Invalid exports selection: presets must be an array of valid preset keys' }, { status: 400 });
    }
    selectedPresets = rawExports.presets.map((k) => PRESET_BY_KEY.get(k)!);
  }

  try {
    const { optimizedSvg } = await generateProduct(body);
    const slug = sanitizeSlug(body.name);

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

    const manifest = generateManifest(body, './', selectedPresets);

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
