import sharp from 'sharp';

export async function rasterizeSvg(svgString: string, width: number, height: number): Promise<Buffer> {
  return sharp(Buffer.from(svgString))
    .resize(width, height)
    .png()
    .toBuffer();
}
