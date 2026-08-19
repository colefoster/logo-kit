import { NextRequest } from 'next/server';
import { isLogoProduct, isExportSelection, sanitizeSlug, letterboxColor, PRESET_BY_KEY, DEFAULT_EXPORT_KEYS, presetFilename } from '@/src/config';
import type { LogoProduct, SizePreset } from '@/src/config';
import { generateProduct } from '@/src/generate';
import { isKnownIcon } from '@/src/svg';
import { rasterizeSvg } from '@/src/raster';
import { generateIco } from '@/src/ico';
import { generateManifest } from '@/src/manifest';
import { parseJsonBody } from '@/src/api-utils';
import archiver from 'archiver';
import { Readable } from 'stream';

// Cap concurrent Sharp rasterizations per request to avoid memory/CPU blowup
const MAX_CONCURRENT_RASTER = 3;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function POST(req: NextRequest): Promise<Response> {
  const parsed = await parseJsonBody(req);
  if ('error' in parsed) return parsed.error;

  const body = parsed.data;

  if (typeof body !== 'object' || body === null) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const obj = body as Record<string, unknown>;

  if (!isLogoProduct(obj)) {
    return Response.json({ error: 'Invalid product config' }, { status: 400 });
  }

  // Validate icon exists server-side (not just the regex check in isLogoProduct)
  if (obj['type'] !== 'text-only' && typeof obj['icon'] === 'string' && !isKnownIcon(obj['icon'])) {
    return Response.json({ error: 'Unknown icon' }, { status: 400 });
  }

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
    const product = obj as unknown as LogoProduct;
    const { optimizedSvg } = await generateProduct(product);
    const slug = sanitizeSlug(product.name);
    const background = letterboxColor(product);

    // Several presets share dimensions (app-icon-512 and logo-4x are both 512x512),
    // and rasterizing 512px twice on a small box is pure waste. Key by the render
    // inputs so identical renders are awaited once.
    const renders = new Map<string, Promise<Buffer>>();
    function render(key: string, fn: () => Promise<Buffer>): Promise<Buffer> {
      const existing = renders.get(key);
      if (existing) return existing;
      const started = fn();
      renders.set(key, started);
      return started;
    }

    const fileEntries = await mapWithConcurrency(
      selectedPresets,
      MAX_CONCURRENT_RASTER,
      async (preset) => {
        const filename = presetFilename(preset);
        if (preset.format === 'svg') {
          return { filename, data: Buffer.from(optimizedSvg) };
        }
        if (preset.format === 'ico') {
          return { filename, data: await render('ico', () => generateIco(optimizedSvg)) };
        }
        const data = await render(`png:${preset.width}x${preset.height}`, () =>
          rasterizeSvg(optimizedSvg, preset.width, preset.height, background),
        );
        return { filename, data };
      },
    );

    const manifest = generateManifest(product, './', selectedPresets);
    const encodedSlug = encodeURIComponent(slug);

    // Stream archive directly to the response. Every entry is an in-memory Buffer
    // by this point, so an archiver error is unlikely -- but an unhandled 'error'
    // on a Node stream takes the whole process down, and this process serves
    // every other request too.
    const archive = archiver('zip');
    archive.on('error', (err) => {
      console.error('Archive stream failed:', err);
      archive.destroy(err);
    });
    for (const { filename, data } of fileEntries) {
      archive.append(data, { name: `${slug}/${filename}` });
    }
    archive.append(manifest, { name: `${slug}/manifest.html` });
    archive.finalize();

    // Convert Node stream to Web stream for Response
    const webStream = Readable.toWeb(archive) as unknown as ReadableStream;

    return new Response(webStream, {
      headers: {
        'Content-Type': 'application/zip',
        'Cache-Control': 'no-store',
        'Content-Disposition': `attachment; filename="${slug}-logo-kit.zip"; filename*=UTF-8''${encodedSlug}-logo-kit.zip`,
      },
    });
  } catch (err) {
    console.error('Download generation failed:', err);
    return Response.json({ error: 'Generation failed' }, { status: 500 });
  }
}
