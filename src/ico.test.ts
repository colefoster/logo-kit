import { describe, it, expect } from 'vitest';
import { generateIco } from './ico';

const SIMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <rect width="100" height="100" fill="blue"/>
</svg>`;

describe('generateIco', () => {
  it('returns a buffer with correct ICO magic bytes', async () => {
    const buf = await generateIco(SIMPLE_SVG);

    // Magic bytes: 00 00 01 00
    expect(buf[0]).toBe(0x00);
    expect(buf[1]).toBe(0x00);
    expect(buf[2]).toBe(0x01);
    expect(buf[3]).toBe(0x00);
  });

  it('contains 3 directory entries', async () => {
    const buf = await generateIco(SIMPLE_SVG);

    const count = buf.readUInt16LE(4);
    expect(count).toBe(3);
  });

  it('directory entries describe sizes 16, 32, 48', async () => {
    const buf = await generateIco(SIMPLE_SVG);

    const sizes = [16, 32, 48];
    sizes.forEach((size, i) => {
      const entryOffset = 6 + i * 16;
      expect(buf[entryOffset]).toBe(size);
      expect(buf[entryOffset + 1]).toBe(size);
    });
  });
});
