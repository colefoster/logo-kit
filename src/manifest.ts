import { htmlEscape } from './config';
import type { LogoProduct } from './config';

export function generateManifest(product: LogoProduct, basePath = '/'): string {
  const slug = product.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const safePath = basePath.endsWith('/') ? basePath : basePath + '/';
  const escapedName = htmlEscape(product.name);
  const escapedColor = htmlEscape(product.color);
  return [
    `<link rel="icon" type="image/png" sizes="32x32" href="${safePath}${slug}-32.png">`,
    `<link rel="icon" type="image/png" sizes="64x64" href="${safePath}${slug}-64.png">`,
    `<link rel="apple-touch-icon" sizes="180x180" href="${safePath}${slug}-180.png">`,
    `<meta name="application-name" content="${escapedName}">`,
    `<meta name="theme-color" content="${escapedColor}">`,
  ].join('\n');
}
