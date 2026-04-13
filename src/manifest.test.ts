import { describe, it, expect } from 'vitest';
import { generateManifest } from './manifest';
import type { LogoProduct } from './config';

describe('generateManifest', () => {
  it('generates HTML tags for a product', () => {
    const product: LogoProduct = { name: 'My App', color: '#6366f1', icon: 'star' };
    const manifest = generateManifest(product);
    expect(manifest).toContain('rel="icon"');
    expect(manifest).toContain('my-app');
    expect(manifest).toContain('#6366f1');
    expect(manifest).toContain('My App');
  });

  it('HTML-escapes product name', () => {
    const product: LogoProduct = { name: '<Test>', color: '#ff0000', icon: 'star' };
    const manifest = generateManifest(product);
    expect(manifest).not.toContain('<Test>');
    expect(manifest).toContain('&lt;Test&gt;');
  });

  it('uses base path', () => {
    const product: LogoProduct = { name: 'App', color: '#ff0000', icon: 'star' };
    const manifest = generateManifest(product, '/assets/');
    expect(manifest).toContain('/assets/');
  });
});
