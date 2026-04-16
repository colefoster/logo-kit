import { htmlEscape, PRESET_BY_KEY, DEFAULT_EXPORT_KEYS, presetFilename } from './config';
import type { LogoProduct, SizePreset } from './config';

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
  selectedPresets: SizePreset[] = DEFAULT_EXPORT_KEYS.map((k) => PRESET_BY_KEY.get(k)!),
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
