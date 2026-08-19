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

// The UI and the server guard must agree on this, or the form silently offers
// values the API rejects.
export const MAX_FONT_SIZE = 200;
export const MAX_NAME_LENGTH = 100;

/**
 * Colour to letterbox a non-square export with. An icon logo already paints a
 * full-bleed rounded rect in `color`, so matching it makes the padding invisible;
 * text-only logos draw the text itself in `color`, so padding with it would erase
 * the logo -- pad with white there.
 */
export function letterboxColor(product: LogoProduct): string {
  return (product.type ?? 'icon') === 'text-only' ? '#ffffff' : product.color;
}

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

// Only the four lengths CSS actually accepts. The old /{3,8}/ let #12345 through,
// which lands in the SVG as an invalid fill and renders black.
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const ICON_NAME_RE = /^[a-z0-9-]+$/;

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

export type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Validate an untrusted product config, reporting *which* field is wrong.
 *
 * The API used to answer every bad field with "Invalid product config", so a
 * mistyped colour and a missing name were indistinguishable in the UI.
 */
export function validateLogoProduct(v: unknown): Validated<LogoProduct> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    return { ok: false, error: 'Config must be a JSON object' };
  }
  const obj = v as Record<string, unknown>;

  if (typeof obj['name'] !== 'string' || obj['name'].trim() === '') {
    return { ok: false, error: 'Name is required' };
  }
  if (obj['name'].length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Name must be ${MAX_NAME_LENGTH} characters or fewer` };
  }

  if (typeof obj['color'] !== 'string' || !HEX_COLOR_RE.test(obj['color'])) {
    return { ok: false, error: 'Color must be a hex value like #6366f1' };
  }

  if ('type' in obj && obj['type'] !== 'icon' && obj['type'] !== 'text-only') {
    return { ok: false, error: 'Type must be "icon" or "text-only"' };
  }

  const type = (obj['type'] as LogoProduct['type']) ?? 'icon';

  if (type !== 'text-only' && (typeof obj['icon'] !== 'string' || !ICON_NAME_RE.test(obj['icon']))) {
    return { ok: false, error: 'Pick an icon (lowercase letters, digits and dashes)' };
  }

  if ('fontSize' in obj && obj['fontSize'] !== undefined) {
    const fontSize = obj['fontSize'];
    if (
      typeof fontSize !== 'number' ||
      !Number.isFinite(fontSize) ||
      fontSize <= 0 ||
      fontSize > MAX_FONT_SIZE
    ) {
      return { ok: false, error: `Font size must be between 1 and ${MAX_FONT_SIZE}` };
    }
  }

  return { ok: true, value: obj as unknown as LogoProduct };
}

export function isLogoProduct(v: unknown): v is LogoProduct {
  return validateLogoProduct(v).ok;
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
    const validated = validateLogoProduct(p);
    if (!validated.ok) {
      throw new Error(`Product at index ${i} is invalid: ${validated.error}`);
    }
    return validated.value;
  });
  return { products };
}
