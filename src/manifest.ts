import { htmlEscape, PRESET_BY_KEY } from './config';
import type { LogoProduct, SizePreset } from './config';

const DEFAULT_MANIFEST_PRESET_KEYS = ['favicon-32', 'favicon-64', 'apple-touch-180'];

function presetFilename(preset: SizePreset): string {
  if (preset.format === 'ico') return 'favicon.ico';
  if (preset.format === 'svg') return 'logo.svg';
  if (preset.width === preset.height) return `logo-${preset.width}.png`;
  return `logo-${preset.width}x${preset.height}.png`;
}

function presetManifestTag(preset: SizePreset, safePath: string): string | null {
  const file = presetFilename(preset);
  switch (preset.key) {
    case 'favicon-32':
    case 'favicon-64':
      return `<link rel="icon" type="image/png" sizes="${preset.width}x${preset.height}" href="${safePath}${file}">`;
    case 'apple-touch-180':
      return `<link rel="apple-touch-icon" sizes="${preset.width}x${preset.height}" href="${safePath}${file}">`;
    case 'favicon-ico':
      return `<link rel="icon" type="image/x-icon" href="${safePath}${file}">`;
    case 'social-media-og':
      return `<meta property="og:image" content="${safePath}${file}">`;
    default:
      return null;
  }
}

export function generateManifest(
  product: LogoProduct,
  basePath = '/',
  selectedPresets: SizePreset[] = DEFAULT_MANIFEST_PRESET_KEYS.map((k) => PRESET_BY_KEY.get(k)!),
): string {
  const safePath = basePath.endsWith('/') ? basePath : basePath + '/';
  const escapedName = htmlEscape(product.name);
  const escapedColor = htmlEscape(product.color);

  const linkTags = selectedPresets
    .map((p) => presetManifestTag(p, safePath))
    .filter((tag): tag is string => tag !== null);

  return [
    ...linkTags,
    `<meta name="application-name" content="${escapedName}">`,
    `<meta name="theme-color" content="${escapedColor}">`,
  ].join('\n');
}
