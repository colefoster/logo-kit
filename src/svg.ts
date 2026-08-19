import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { xmlEscape } from './config';
import type { LogoProduct } from './config';

const VIEWBOX_SIZE = 128;
const DEFAULT_FONT_SIZE = 24;
const ICON_SIZE = 64;
const ICON_X = 32;
const ICON_Y = 16;
const TEXT_Y = 104;

let iconsDirCache: string | null = null;

/**
 * Locate the lucide-static icon directory.
 *
 * The standalone build chdir's into `.next/standalone`, where the traced copy of
 * node_modules lives, so cwd resolution holds in both dev and production -- but a
 * missing tracing include used to surface as a bare ENOENT from readdirSync deep
 * in a request. Fail loudly and once instead, and allow an explicit override.
 */
function lucideIconsDir(): string {
  if (iconsDirCache) return iconsDirCache;

  const candidates = [
    process.env['LUCIDE_ICONS_DIR'],
    join(process.cwd(), 'node_modules', 'lucide-static', 'icons'),
  ].filter((c): c is string => Boolean(c));

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      iconsDirCache = candidate;
      return candidate;
    }
  }

  throw new Error(
    `lucide-static icons not found. Looked in: ${candidates.join(', ')}. ` +
      'A standalone build needs outputFileTracingIncludes for node_modules/lucide-static/icons.',
  );
}

// Cache icon paths and icon list at module level — they're static after deploy
const iconPathsCache = new Map<string, string>();
let iconNamesCache: string[] | null = null;
let iconNamesSet: Set<string> | null = null;

export function isKnownIcon(iconName: string): boolean {
  if (!iconNamesSet) {
    iconNamesSet = new Set(listIconNames());
  }
  return iconNamesSet.has(iconName);
}

export function extractIconPaths(iconName: string): string {
  const cached = iconPathsCache.get(iconName);
  if (cached !== undefined) return cached;

  if (!isKnownIcon(iconName)) {
    return '';
  }

  const iconPath = join(lucideIconsDir(), `${iconName}.svg`);
  const svgContent = readFileSync(iconPath, 'utf-8');
  const match = svgContent.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
  const paths = match ? match[1].trim() : '';

  iconPathsCache.set(iconName, paths);
  return paths;
}

export function generateSvg(product: LogoProduct): string {
  const type = product.type ?? 'icon';
  const escapedName = xmlEscape(product.name);
  const color = product.color;

  if (type === 'text-only') {
    const fontSize = product.fontSize ?? DEFAULT_FONT_SIZE;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}" width="${VIEWBOX_SIZE}" height="${VIEWBOX_SIZE}">
  <text
    x="${VIEWBOX_SIZE / 2}"
    y="${VIEWBOX_SIZE / 2}"
    font-family="sans-serif"
    font-size="${fontSize}"
    font-weight="bold"
    fill="${color}"
    text-anchor="middle"
    dominant-baseline="central"
  >${escapedName}</text>
</svg>`;
  }

  // Icon-based logo
  const fontSize = product.fontSize ?? DEFAULT_FONT_SIZE;
  const iconPaths = extractIconPaths(product.icon!);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}" width="${VIEWBOX_SIZE}" height="${VIEWBOX_SIZE}">
  <rect width="${VIEWBOX_SIZE}" height="${VIEWBOX_SIZE}" rx="16" fill="${color}" />
  <g transform="translate(${ICON_X}, ${ICON_Y}) scale(${ICON_SIZE / 24})" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
    ${iconPaths}
  </g>
  <text
    x="${VIEWBOX_SIZE / 2}"
    y="${TEXT_Y}"
    font-family="sans-serif"
    font-size="${fontSize}"
    font-weight="bold"
    fill="white"
    text-anchor="middle"
    dominant-baseline="central"
  >${escapedName}</text>
</svg>`;
}

export function listIconNames(): readonly string[] {
  if (iconNamesCache) return iconNamesCache;

  const dir = lucideIconsDir();
  iconNamesCache = readdirSync(dir)
    .filter((f: string) => f.endsWith('.svg'))
    .map((f: string) => f.replace(/\.svg$/, ''))
    .sort();
  return iconNamesCache;
}
