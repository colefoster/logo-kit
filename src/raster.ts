import sharp from 'sharp';

/**
 * Rasterize a square logo SVG to PNG at exactly width x height.
 *
 * Sharp's default fit is `cover`, which for a non-square target (the 1200x630
 * social card) center-crops a square source and cuts the product name clean off.
 * `contain` letterboxes instead; `background` fills the letterbox bands so the
 * card still reads as one solid tile rather than a logo on transparency.
 */
export async function rasterizeSvg(
  svgString: string,
  width: number,
  height: number,
  background: sharp.Color = { r: 0, g: 0, b: 0, alpha: 0 },
): Promise<Buffer> {
  return sharp(Buffer.from(svgString))
    .resize(width, height, { fit: 'contain', background })
    .png()
    .toBuffer();
}
