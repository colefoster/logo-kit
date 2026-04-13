import { describe, it, expect } from 'vitest';
import { generateSvg } from './svg';
import type { LogoProduct } from './config';

describe('generateSvg', () => {
  it('generates SVG with icon and text', () => {
    const product: LogoProduct = { name: 'Test App', color: '#6366f1', icon: 'star' };
    const svg = generateSvg(product);
    expect(svg).toContain('<svg');
    expect(svg).toContain('Test App');
    expect(svg).toContain('#6366f1');
    expect(svg).toContain('<rect');
  });

  it('generates text-only SVG without rect', () => {
    const product: LogoProduct = { name: 'My Brand', color: '#1a1a1a', type: 'text-only' };
    const svg = generateSvg(product);
    expect(svg).toContain('<svg');
    expect(svg).toContain('My Brand');
    expect(svg).toContain('#1a1a1a');
    expect(svg).not.toContain('<rect');
    expect(svg).toContain('text-anchor="middle"');
    expect(svg).toContain('dominant-baseline="central"');
  });

  it('XML-escapes product name', () => {
    const product: LogoProduct = { name: '<script>alert(1)</script>', color: '#ff0000', type: 'text-only' };
    const svg = generateSvg(product);
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });

  it('uses custom fontSize', () => {
    const product: LogoProduct = { name: 'Test', color: '#ff0000', type: 'text-only', fontSize: 48 };
    const svg = generateSvg(product);
    expect(svg).toContain('font-size="48"');
  });

  it('uses default fontSize when not specified', () => {
    const product: LogoProduct = { name: 'Test', color: '#ff0000', type: 'text-only' };
    const svg = generateSvg(product);
    expect(svg).toContain('font-size="24"');
  });

  it('uses custom fontSize for icon type', () => {
    const product: LogoProduct = { name: 'Test', color: '#ff0000', icon: 'star', fontSize: 32 };
    const svg = generateSvg(product);
    expect(svg).toContain('font-size="32"');
  });

  it('produces valid SVG viewBox', () => {
    const product: LogoProduct = { name: 'Test', color: '#ff0000', type: 'text-only' };
    const svg = generateSvg(product);
    expect(svg).toContain('viewBox="0 0 128 128"');
  });
});
