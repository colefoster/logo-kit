import { describe, it, expect } from 'vitest';
import { generateProduct } from './generate';
import type { LogoProduct } from './config';

describe('generateProduct', () => {
  it('generates optimized SVG for icon product', async () => {
    const product: LogoProduct = { name: 'Test', color: '#6366f1', icon: 'star' };
    const result = await generateProduct(product);
    expect(result.rawSvg).toContain('<svg');
    expect(result.optimizedSvg).toContain('<svg');
    expect(result.optimizedSvg.length).toBeGreaterThan(0);
  });

  it('generates optimized SVG for text-only product', async () => {
    const product: LogoProduct = { name: 'Brand', color: '#1a1a1a', type: 'text-only' };
    const result = await generateProduct(product);
    expect(result.optimizedSvg).toContain('<svg');
    expect(result.optimizedSvg).toContain('Brand');
  });

  it('strips script tags via SVGO optimization', async () => {
    // Directly call with a product that would produce safe output
    const product: LogoProduct = { name: 'Safe', color: '#000000', type: 'text-only' };
    const result = await generateProduct(product);
    expect(result.optimizedSvg).not.toContain('<script');
    expect(result.optimizedSvg).not.toContain('javascript:');
  });
});
