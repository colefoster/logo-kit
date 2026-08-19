import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { rasterizeSvg } from './raster';
import { generateSvg } from './svg';
import { letterboxColor } from './config';
import type { LogoProduct } from './config';

const ICON_PRODUCT: LogoProduct = { name: 'Acme', color: '#6366f1', type: 'icon', icon: 'star' };
const SVG = generateSvg(ICON_PRODUCT);

async function pixel(png: Buffer, x: number, y: number) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const offset = (y * info.width + x) * info.channels;
  return { r: data[offset], g: data[offset + 1], b: data[offset + 2], a: data[offset + 3] };
}

describe('rasterizeSvg', () => {
  it('produces the exact requested dimensions', async () => {
    const png = await rasterizeSvg(SVG, 180, 180);
    const meta = await sharp(png).metadata();
    expect(meta.width).toBe(180);
    expect(meta.height).toBe(180);
  });

  it('contains rather than crops a square logo into a wide social card', async () => {
    // 1200x630 from a 128x128 source: `fit: cover` (Sharp's default) would scale to
    // 1200 wide and slice the top and bottom off, taking the product name with it.
    // With `contain` the logo is a 630x630 square centred in the frame, so the
    // horizontal edges are letterbox, not logo.
    const png = await rasterizeSvg(SVG, 1200, 630, { flattenTo: letterboxColor(ICON_PRODUCT) });
    const meta = await sharp(png).metadata();
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(630);

    // Far-left column is outside the centred square -> it is the letterbox fill.
    const edge = await pixel(png, 2, 315);
    expect(edge).toMatchObject({ r: 0x63, g: 0x66, b: 0xf1, a: 255 });
  });

  it('leaves no transparency anywhere on a flattened card', async () => {
    // Letterboxing alone left the logo's own rounded corners transparent, which
    // showed as white notches inset from the edges of the social card. Assert on
    // the channel count: `ensureAlpha` would paper over exactly this bug.
    const png = await rasterizeSvg(SVG, 1200, 630, { flattenTo: letterboxColor(ICON_PRODUCT) });
    const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
    expect(info.channels).toBe(3);

    // The logo square is centred, so its top-left rounded corner sits at x~=285.
    // That is the pixel that used to be transparent.
    const cornerAt = (x: number, y: number) => {
      const offset = (y * info.width + x) * info.channels;
      return [data[offset], data[offset + 1], data[offset + 2]];
    };
    expect(cornerAt(290, 3)).toEqual([0x63, 0x66, 0xf1]);
    expect(cornerAt(5, 5)).toEqual([0x63, 0x66, 0xf1]);
  });

  it('defaults to a transparent letterbox, so favicons keep their alpha', async () => {
    const png = await rasterizeSvg(SVG, 400, 100);
    const edge = await pixel(png, 2, 50);
    expect(edge.a).toBe(0);
  });
});

describe('letterboxColor', () => {
  it('matches the product colour for icon logos', () => {
    expect(letterboxColor(ICON_PRODUCT)).toBe('#6366f1');
  });

  it('uses white for text-only logos, whose text is drawn in the product colour', () => {
    expect(letterboxColor({ name: 'Acme', color: '#6366f1', type: 'text-only' })).toBe('#ffffff');
  });

  it('treats a missing type as an icon logo', () => {
    expect(letterboxColor({ name: 'Acme', color: '#123456' })).toBe('#123456');
  });
});
