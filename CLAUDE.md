## Coding Conventions

## Architecture
- Next.js 15 App Router with React 19, TypeScript strict mode, Tailwind CSS 3
- Core logic lives in `src/` (config.ts, svg.ts, generate.ts, raster.ts, manifest.ts)
- API routes in `app/api/` — each is a `route.ts` in a nested directory
- Single client component: `app/LogoGenerator.tsx` ('use client')

## Key Functions to Reuse
- `generateProduct(product)` → `{ rawSvg, optimizedSvg }` — SVG generation + SVGO optimization
- `rasterizeSvg(svg, width, height)` — Sharp-based PNG rasterization (after task 1 updates the signature)
- `generateManifest(product, basePath)` — HTML favicon/meta snippet
- `sanitizeSlug(value)` — Safe filename from product name
- `isLogoProduct(v)` — Input validation guard for API routes
- `xmlEscape(str)` / `htmlEscape(str)` — Output escaping

## Validation Pattern
- All API routes validate with `isLogoProduct()` before processing
- Icon names validated against `/^[a-z0-9-]+$/` to prevent path traversal
- Return HTTP 400 with `{ error: string }` for invalid input

## Security Rules
- SVG rendered in browser via `<img>` with blob URLs — NEVER use dangerouslySetInnerHTML
- SVGO preset-default strips scripts from SVGs
- All user strings XML-escaped before embedding in SVG, HTML-escaped in manifest

## ZIP Structure
- All files go under `{slug}/` folder in the ZIP
- Use `archiver` library (already a dependency) for ZIP creation
- Filename convention: `logo.svg`, `logo-{width}.png` (square), `logo-{width}x{height}.png` (non-square), `favicon.ico`, `manifest.html`

## Testing
- Vitest for unit tests, files named `*.test.ts` next to source
- Run `npm run build` to verify — broken build = broken deploy

## Styling
- Tailwind CSS only — no component libraries
- Responsive: design for mobile-first, enhance for desktop

## Dependencies
- sharp (rasterization), archiver (ZIP), svgo (optimization), lucide-static (icons)
- Prefer implementing simple formats (like ICO) directly over adding dependencies
