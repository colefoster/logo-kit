// `next build` with output:'standalone' deliberately leaves static assets out of
// .next/standalone -- the docs expect a CDN to serve them. We serve them from the
// same Node process, so copy them in and the standalone dir becomes runnable as-is.
import { cp, access } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const standalone = join(root, '.next', 'standalone');

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(standalone))) {
  console.error('postbuild: .next/standalone missing -- is output:"standalone" set?');
  process.exit(1);
}

await cp(join(root, '.next', 'static'), join(standalone, '.next', 'static'), { recursive: true });

if (await exists(join(root, 'public'))) {
  await cp(join(root, 'public'), join(standalone, 'public'), { recursive: true });
}

console.log('postbuild: copied static assets into .next/standalone');
