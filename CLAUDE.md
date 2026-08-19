## Coding Conventions

## Architecture
- Next.js 16 App Router with React 19, TypeScript strict mode, Tailwind CSS 3
- Built with `output: 'standalone'`; `npm start` runs `.next/standalone/server.js`
- Core logic lives in `src/` (config.ts, svg.ts, generate.ts, raster.ts, manifest.ts)
- API routes in `app/api/` — each is a `route.ts` in a nested directory
- Single client component: `app/LogoGenerator.tsx` ('use client')

## Key Functions to Reuse
- `generateProduct(product)` → `{ rawSvg, optimizedSvg }` — SVG generation + SVGO optimization
- `rasterizeSvg(svg, width, height, { flattenTo })` — Sharp PNG rasterization, `fit: 'contain'`; pass `flattenTo` for non-square targets so they come out opaque
- `generateManifest(product, basePath)` — HTML favicon/meta snippet
- `sanitizeSlug(value)` — Safe filename from product name
- `validateLogoProduct(v)` — validation returning the offending field's message; `isLogoProduct(v)` is the boolean guard over it
- `letterboxColor(product)` — the colour a non-square export should be padded with
- `xmlEscape(str)` / `htmlEscape(str)` — Output escaping

## Validation Pattern
- All API routes validate with `validateLogoProduct()` before processing, and return its message so the UI can show which field is wrong
- Icon names validated against `/^[a-z0-9-]+$/` to prevent path traversal
- Return HTTP 400 with `{ error: string }` for invalid input

## Security Rules
- SVG rendered in browser via `<img>` with blob URLs — NEVER use dangerouslySetInnerHTML
- SVGO preset-default strips scripts from SVGs
- All user strings XML-escaped before embedding in SVG, HTML-escaped in manifest

## ZIP Structure
- All files go under `{slug}/` folder in the ZIP
- Use `archiver` library (already a dependency) for ZIP creation
- Filenames come from `presetFilename()`: `logo.svg`, `favicon.ico`, `manifest.html`, else `{preset.key}.png`

## Testing
- Vitest for unit tests, files named `*.test.ts` next to source
- Vitest only collects `src/**/*.test.ts`, so logic that needs testing belongs in `src/`, not in a route handler
- Run `npm run build` to verify — broken build = broken deploy
- Assert on what would actually fail: an image test that calls `ensureAlpha()` before checking for transparency can never fail

## Styling
- Tailwind CSS only — no component libraries
- Responsive: design for mobile-first, enhance for desktop

## Dependencies
- sharp (rasterization), archiver (ZIP), svgo (optimization), lucide-static (icons)
- Prefer implementing simple formats (like ICO) directly over adding dependencies
