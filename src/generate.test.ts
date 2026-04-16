import { describe, it, expect } from 'vitest';
import { optimize } from 'svgo';
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

  it('user-controlled name is escaped in SVG output', async () => {
    const product: LogoProduct = { name: '<img onerror=alert(1)>', color: '#000000', type: 'text-only' };
    const result = await generateProduct(product);
    // Angle brackets must be entity-escaped — the raw <img> tag must not appear
    expect(result.optimizedSvg).not.toContain('<img');
    // The escaped version should be present as safe text content
    expect(result.optimizedSvg).toContain('&lt;img');
  });

  it('SVGO preset-default does NOT strip script tags (documenting actual behavior)', () => {
    // Documents that SVGO does NOT remove <script> elements.
    // Our safety relies on never generating <script> in generateSvg(), not on SVGO.
    const maliciousSvg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="10" height="10"/></svg>';
    const result = optimize(maliciousSvg, { plugins: ['preset-default'] });
    expect(result.data).toContain('<script>');
  });

  it('javascript: URIs in name do not produce executable SVG attributes', async () => {
    const product: LogoProduct = { name: 'javascript:alert(1)', color: '#000000', type: 'text-only' };
    const result = await generateProduct(product);
    expect(result.optimizedSvg).not.toMatch(/href\s*=\s*["']javascript:/);
  });
});
