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
    const png = await rasterizeSvg(SVG, 1200, 630, letterboxColor(ICON_PRODUCT));
    const meta = await sharp(png).metadata();
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(630);

    // Far-left column is outside the centred square -> it is the letterbox fill.
    const edge = await pixel(png, 2, 315);
    expect(edge).toMatchObject({ r: 0x63, g: 0x66, b: 0xf1, a: 255 });
  });

  it('letterboxes with the icon background colour so the card reads as one tile', async () => {
    const png = await rasterizeSvg(SVG, 1200, 630, letterboxColor(ICON_PRODUCT));
    const edge = await pixel(png, 5, 5);
    const insideLogo = await pixel(png, 600, 315);
    // Both opaque, and the corner matches the logo's own background colour.
    expect(edge.a).toBe(255);
    expect(insideLogo.a).toBe(255);
    expect(edge.r).toBe(0x63);
  });

  it('defaults to a transparent letterbox', async () => {
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
