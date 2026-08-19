/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,

  // Standalone emits a self-contained .next/standalone with only the traced
  // subset of node_modules, which is both what `npm start` runs and what keeps
  // the cold start cheap on the box.
  output: 'standalone',

  // The icon set is read off disk at runtime by name (readdirSync + readFileSync),
  // so Next's static tracing cannot see it. Without this the standalone build
  // has no icons at all.
  outputFileTracingIncludes: {
    '/api/**/*': ['./node_modules/lucide-static/icons/**'],
  },
};

module.exports = nextConfig;
