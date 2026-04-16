import { rasterizeSvg } from './raster';

const ICO_SIZES = [16, 32, 48];

export async function generateIco(svgString: string): Promise<Buffer> {
  const pngs = await Promise.all(
    ICO_SIZES.map(size => rasterizeSvg(svgString, size, size))
  );

  const count = ICO_SIZES.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = count * dirEntrySize;
  const dataOffset = headerSize + dirSize;

  const totalSize = dataOffset + pngs.reduce((sum, png) => sum + png.length, 0);
  const buf = Buffer.alloc(totalSize);

  // ICO header: reserved(2) + type=1(2) + count(2)
  buf.writeUInt16LE(0, 0);
  buf.writeUInt16LE(1, 2);
  buf.writeUInt16LE(count, 4);

  let offset = dataOffset;
  pngs.forEach((png, i) => {
    const size = ICO_SIZES[i];
    const entryOffset = headerSize + i * dirEntrySize;

    // Directory entry: width(1) + height(1) + colorCount(1) + reserved(1) +
    //                  planes(2) + bitCount(2) + bytesInRes(4) + imageOffset(4)
    buf.writeUInt8(size === 256 ? 0 : size, entryOffset);
    buf.writeUInt8(size === 256 ? 0 : size, entryOffset + 1);
    buf.writeUInt8(0, entryOffset + 2);  // colorCount
    buf.writeUInt8(0, entryOffset + 3);  // reserved
    buf.writeUInt16LE(1, entryOffset + 4);  // planes
    buf.writeUInt16LE(32, entryOffset + 6); // bitCount
    buf.writeUInt32LE(png.length, entryOffset + 8);
    buf.writeUInt32LE(offset, entryOffset + 12);

    png.copy(buf, offset);
    offset += png.length;
  });

  return buf;
}
