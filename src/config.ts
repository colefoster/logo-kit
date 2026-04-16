export interface LogoProduct {
  name: string;
  color: string;
  icon?: string;
  type?: 'icon' | 'text-only';
  fontSize?: number;
}

export interface LogoConfig {
  products: LogoProduct[];
}

export type ExportFormat = 'svg' | 'png' | 'ico';

export interface SizePreset {
  key: string;
  name: string;
  width: number;
  height: number;
  format: ExportFormat;
}

export const SIZE_PRESETS: SizePreset[] = [
  { key: 'favicon-32',       name: 'Favicon 32×32',         width: 32,   height: 32,  format: 'png' },
  { key: 'favicon-64',       name: 'Favicon 64×64',         width: 64,   height: 64,  format: 'png' },
  { key: 'apple-touch-180',  name: 'Apple Touch Icon',      width: 180,  height: 180, format: 'png' },
  { key: 'favicon-ico',      name: 'Favicon ICO 32×32',     width: 32,   height: 32,  format: 'ico' },
  { key: 'social-media-og',  name: 'Social Media OG',       width: 1200, height: 630, format: 'png' },
  { key: 'app-icon-512',     name: 'App Icon 512×512',      width: 512,  height: 512, format: 'png' },
  { key: 'logo-1x',          name: 'Logo 1x',               width: 128,  height: 128, format: 'png' },
  { key: 'logo-2x',          name: 'Logo 2x',               width: 256,  height: 256, format: 'png' },
  { key: 'logo-4x',          name: 'Logo 4x',               width: 512,  height: 512, format: 'png' },
  { key: 'svg',              name: 'Original SVG',          width: 0,    height: 0,   format: 'svg' },
];

export const PRESET_BY_KEY = new Map(SIZE_PRESETS.map((p) => [p.key, p]));

export const DEFAULT_EXPORT_KEYS = ['svg', 'favicon-32', 'favicon-64', 'apple-touch-180', 'favicon-ico'];

export function presetFilename(preset: SizePreset): string {
  if (preset.format === 'ico') return 'favicon.ico';
  if (preset.format === 'svg') return 'logo.svg';
  return `${preset.key}.png`;
}

export interface ExportSelection {
  presets: string[];
}

export function isExportSelection(v: unknown): v is ExportSelection {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;
  if (!Array.isArray(obj['presets'])) return false;
  return obj['presets'].every((item) => typeof item === 'string' && PRESET_BY_KEY.has(item));
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;
const ICON_NAME_RE = /^[a-z0-9-]+$/;
const SLUG_RE = /^[a-z0-9-]+$/;

export function sanitizeSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

export function xmlEscape(str: string): string {
  return str.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&apos;';
      default: return c;
    }
  });
}

export function htmlEscape(str: string): string {
  return str.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return c;
    }
  });
}

export function isLogoProduct(v: unknown): v is LogoProduct {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;

  if (typeof obj['name'] !== 'string' || obj['name'].trim() === '' || obj['name'].length > 100) return false;
  if (typeof obj['color'] !== 'string' || !HEX_COLOR_RE.test(obj['color'])) return false;

  if ('type' in obj) {
    if (obj['type'] !== 'icon' && obj['type'] !== 'text-only') return false;
  }

  const type = (obj['type'] as string | undefined) ?? 'icon';

  if (type !== 'text-only') {
    if (typeof obj['icon'] !== 'string' || !ICON_NAME_RE.test(obj['icon'])) return false;
  }

  if ('fontSize' in obj && obj['fontSize'] !== undefined) {
    if (typeof obj['fontSize'] !== 'number' || !isFinite(obj['fontSize']) || obj['fontSize'] <= 0) {
      return false;
    }
  }

  return true;
}

export function parseConfig(raw: unknown): LogoConfig {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Config must be a JSON object');
  }
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj['products'])) {
    throw new Error('Config must have a "products" array');
  }
  const products = obj['products'].map((p, i) => {
    if (!isLogoProduct(p)) {
      throw new Error(`Product at index ${i} is invalid`);
    }
    return p;
  });
  return { products };
}
