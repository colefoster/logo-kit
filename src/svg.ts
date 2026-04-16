import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { xmlEscape } from './config';
import type { LogoProduct } from './config';

const VIEWBOX_SIZE = 128;
const DEFAULT_FONT_SIZE = 24;
const ICON_SIZE = 64;
const ICON_X = 32;
const ICON_Y = 16;
const TEXT_Y = 104;

function lucideIconsDir(): string {
  return join(process.cwd(), 'node_modules', 'lucide-static', 'icons');
}

// Cache icon paths and icon list at module level — they're static after deploy
const iconPathsCache = new Map<string, string>();
let iconNamesCache: string[] | null = null;

export function extractIconPaths(iconName: string): string {
  const cached = iconPathsCache.get(iconName);
  if (cached !== undefined) return cached;

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

export function listIconNames(): string[] {
  if (iconNamesCache) return iconNamesCache;

  const dir = lucideIconsDir();
  iconNamesCache = readdirSync(dir)
    .filter((f: string) => f.endsWith('.svg'))
    .map((f: string) => f.replace(/\.svg$/, ''));
  return iconNamesCache;
}
