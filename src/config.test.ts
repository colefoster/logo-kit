import { describe, it, expect } from 'vitest';
import { isLogoProduct, xmlEscape, htmlEscape, isExportSelection, SIZE_PRESETS } from './config';

describe('isLogoProduct', () => {
  it('accepts valid icon product', () => {
    expect(isLogoProduct({ name: 'Test', color: '#ff0000', icon: 'star' })).toBe(true);
  });

  it('accepts valid text-only product', () => {
    expect(isLogoProduct({ name: 'Test', color: '#ff0000', type: 'text-only' })).toBe(true);
  });

  it('accepts valid product with fontSize', () => {
    expect(isLogoProduct({ name: 'Test', color: '#ff0000', icon: 'star', fontSize: 32 })).toBe(true);
  });

  it('rejects missing name', () => {
    expect(isLogoProduct({ color: '#ff0000', icon: 'star' })).toBe(false);
  });

  it('rejects empty name', () => {
    expect(isLogoProduct({ name: '', color: '#ff0000', icon: 'star' })).toBe(false);
  });

  it('rejects invalid color format', () => {
    expect(isLogoProduct({ name: 'Test', color: 'red', icon: 'star' })).toBe(false);
  });

  it('rejects invalid color with script', () => {
    expect(isLogoProduct({ name: 'Test', color: 'javascript:alert(1)', icon: 'star' })).toBe(false);
  });

  it('rejects missing icon when type is icon', () => {
    expect(isLogoProduct({ name: 'Test', color: '#ff0000', type: 'icon' })).toBe(false);
  });

  it('rejects invalid icon name with path traversal', () => {
    expect(isLogoProduct({ name: 'Test', color: '#ff0000', icon: '../etc/passwd' })).toBe(false);
  });

  it('rejects icon with uppercase letters', () => {
    expect(isLogoProduct({ name: 'Test', color: '#ff0000', icon: 'Star' })).toBe(false);
  });

  it('rejects invalid type', () => {
    expect(isLogoProduct({ name: 'Test', color: '#ff0000', icon: 'star', type: 'unknown' })).toBe(false);
  });

  it('rejects negative fontSize', () => {
    expect(isLogoProduct({ name: 'Test', color: '#ff0000', icon: 'star', fontSize: -1 })).toBe(false);
  });

  it('rejects zero fontSize', () => {
    expect(isLogoProduct({ name: 'Test', color: '#ff0000', icon: 'star', fontSize: 0 })).toBe(false);
  });

  it('rejects NaN fontSize', () => {
    expect(isLogoProduct({ name: 'Test', color: '#ff0000', icon: 'star', fontSize: NaN })).toBe(false);
  });

  it('accepts undefined fontSize (omitted)', () => {
    expect(isLogoProduct({ name: 'Test', color: '#ff0000', icon: 'star' })).toBe(true);
  });

  it('accepts 3-digit hex color', () => {
    expect(isLogoProduct({ name: 'Test', color: '#fff', icon: 'star' })).toBe(true);
  });

  it('accepts 8-digit hex color', () => {
    expect(isLogoProduct({ name: 'Test', color: '#ff000080', icon: 'star' })).toBe(true);
  });
});

describe('xmlEscape', () => {
  it('escapes < and >', () => {
    expect(xmlEscape('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes &', () => {
    expect(xmlEscape('a & b')).toBe('a &amp; b');
  });

  it('escapes quotes', () => {
    expect(xmlEscape('"hello"')).toBe('&quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(xmlEscape("it's")).toBe('it&apos;s');
  });
});

describe('htmlEscape', () => {
  it('escapes HTML special characters', () => {
    expect(htmlEscape('<b>test</b>')).toBe('&lt;b&gt;test&lt;/b&gt;');
  });
});

describe('isExportSelection', () => {
  it('accepts valid preset names', () => {
    expect(isExportSelection({ presets: ['Favicon 32×32', 'Logo 1x'] })).toBe(true);
  });

  it('accepts empty presets array', () => {
    expect(isExportSelection({ presets: [] })).toBe(true);
  });

  it('accepts all known preset names', () => {
    const allNames = SIZE_PRESETS.map((p) => p.name);
    expect(isExportSelection({ presets: allNames })).toBe(true);
  });

  it('rejects unknown preset name', () => {
    expect(isExportSelection({ presets: ['Not A Real Preset'] })).toBe(false);
  });

  it('rejects mix of valid and invalid preset names', () => {
    expect(isExportSelection({ presets: ['Favicon 32×32', 'bogus'] })).toBe(false);
  });

  it('rejects non-array presets', () => {
    expect(isExportSelection({ presets: 'Favicon 32×32' })).toBe(false);
  });

  it('rejects null', () => {
    expect(isExportSelection(null)).toBe(false);
  });

  it('rejects non-object', () => {
    expect(isExportSelection('Favicon 32×32')).toBe(false);
  });

  it('rejects missing presets field', () => {
    expect(isExportSelection({})).toBe(false);
  });

  it('rejects array items that are not strings', () => {
    expect(isExportSelection({ presets: [42] })).toBe(false);
  });
});
