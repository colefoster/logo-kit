import { describe, it, expect } from 'vitest';
import { generateManifest } from './manifest';
import { PRESET_BY_KEY } from './config';
import type { LogoProduct } from './config';

describe('generateManifest', () => {
  it('generates favicon link tags by default', () => {
    const product: LogoProduct = { name: 'My App', color: '#6366f1', icon: 'star' };
    const manifest = generateManifest(product);
    expect(manifest).toContain('rel="icon"');
    expect(manifest).toContain('favicon-32.png');
    expect(manifest).toContain('favicon-64.png');
    expect(manifest).toContain('apple-touch-180.png');
  });

  it('includes application-name and theme-color', () => {
    const product: LogoProduct = { name: 'My App', color: '#6366f1', icon: 'star' };
    const manifest = generateManifest(product);
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

  it('includes OG image tag when social-media-og preset is selected', () => {
    const product: LogoProduct = { name: 'App', color: '#ff0000', icon: 'star' };
    const presets = [PRESET_BY_KEY.get('social-media-og')!];
    const manifest = generateManifest(product, './', presets);
    expect(manifest).toContain('og:image');
    expect(manifest).toContain('social-media-og.png');
  });

  it('includes favicon.ico link when favicon-ico preset is selected', () => {
    const product: LogoProduct = { name: 'App', color: '#ff0000', icon: 'star' };
    const presets = [PRESET_BY_KEY.get('favicon-ico')!];
    const manifest = generateManifest(product, './', presets);
    expect(manifest).toContain('image/x-icon');
    expect(manifest).toContain('favicon.ico');
  });

  it('includes apple-touch-icon when apple-touch-180 preset is selected', () => {
    const product: LogoProduct = { name: 'App', color: '#ff0000', icon: 'star' };
    const presets = [PRESET_BY_KEY.get('apple-touch-180')!];
    const manifest = generateManifest(product, './', presets);
    expect(manifest).toContain('apple-touch-icon');
    expect(manifest).toContain('apple-touch-180.png');
  });

  it('omits tags for presets with no manifest role (e.g. app-icon-512)', () => {
    const product: LogoProduct = { name: 'App', color: '#ff0000', icon: 'star' };
    const presets = [PRESET_BY_KEY.get('app-icon-512')!];
    const manifest = generateManifest(product, './', presets);
    expect(manifest).not.toContain('rel="icon"');
    expect(manifest).not.toContain('og:image');
    // still has meta tags
    expect(manifest).toContain('application-name');
  });
});
