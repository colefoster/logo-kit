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

  if (typeof obj['name'] !== 'string' || obj['name'].trim() === '') return false;
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
