import sharp from 'sharp';

export async function rasterizeSvg(svgString: string, size: number): Promise<Buffer> {
  return sharp(Buffer.from(svgString))
    .resize(size, size)
    .png()
    .toBuffer();
}
