import sharp from 'sharp';

export interface RasterOptions {
  /**
   * Composite the logo onto an opaque background of this colour.
   *
   * Only worth it for a non-square target. Letterboxing alone leaves both the
   * padding bands *and* the logo's own rounded corners transparent, which renders
   * as white notches in the corners of an otherwise solid social card. Flattening
   * merges all of it into one tile.
   */
  flattenTo?: string;
}

/**
 * Rasterize a square logo SVG to PNG at exactly width x height.
 *
 * Sharp defaults to fit:'cover', which for a non-square target (the 1200x630
 * social card) center-crops the square source and cuts the product name clean
 * off. `contain` scales to fit and pads instead.
 */
export async function rasterizeSvg(
  svgString: string,
  width: number,
  height: number,
  options: RasterOptions = {},
): Promise<Buffer> {
  const background = options.flattenTo ?? { r: 0, g: 0, b: 0, alpha: 0 };

  let pipeline = sharp(Buffer.from(svgString)).resize(width, height, {
    fit: 'contain',
    background,
  });

  if (options.flattenTo) {
    pipeline = pipeline.flatten({ background: options.flattenTo });
  }

  return pipeline.png().toBuffer();
}
