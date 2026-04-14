# Logo Kit

## Tech Stack
- Next.js 15 (App Router) with React 19
- TypeScript (strict mode)
- Tailwind CSS 3
- lucide-static (icon SVGs read from node_modules at runtime)
- SVGO (SVG optimization)
- Sharp (PNG rasterization)
- Vitest (testing)
- Deployed at logo-kit.fostered.dev

## Project Layout
- `app/` — Next.js App Router pages, layouts, and API routes
- `app/api/` — API route handlers (preview, icons, download, up)
- `app/LogoGenerator.tsx` — Main client component ('use client')
- `src/` — Core generation logic (config, svg, generate, raster, manifest)
- `src/config.ts` — LogoProduct type, isLogoProduct() validator, escaping utilities

## Conventions
- Health check endpoint: GET /up — must return HTTP 200 with no auth required. Verify the file path matches the expected URL (app/api/up/route.ts serves /api/up, NOT /up — reconcile if the monitoring URL differs)
- Do NOT commit build artifacts: tsconfig.tsbuildinfo, .next/, next-env.d.ts (auto-generated), *.tsbuildinfo
- SVG rendering in browser: use <img> with blob URLs to sandbox script execution — never use dangerouslySetInnerHTML for SVG
- useEffect dependency arrays must satisfy the React exhaustive-deps lint rule — use useCallback or inline logic
- SVGO preset-default strips scripts from SVGs but this is implicit — do not rely on it alone for user-facing SVG rendering
- Input validation: all API routes validate with isLogoProduct() before processing; icon names validated against /^[a-z0-9-]+$/ to prevent path traversal
- File naming in API routes: use route.ts in nested directories (e.g., app/api/download/route.ts)
- No additional UI component libraries — use Tailwind CSS only for styling
- Existing utilities to reuse: generateProduct() for SVG, rasterizeSvg() for PNGs, generateManifest() for HTML snippet, sanitizeSlug() for filenames
- Before pushing: always run `npm run build` locally to verify the build succeeds. A broken build = a dead site.
- next-env.d.ts: let Next.js regenerate this file — never edit it manually or commit a version that imports from .next/


## Known Pitfalls
These issues have occurred before — avoid repeating them:
- **build_failure**: 
- **rejection**: Stream file not found
- **rejection**: The implementation satisfies most acceptance criteria and is generally well-structured. However, there is a high-severity XSS issue with dangerouslySetInnerHTML rendering SVG from the API, and a medium issue with the missing dependency array warning in useEffect.
[high] XSS via dangerouslySetInnerHTML at LogoGenerator.tsx:186. The SVG response from /api/preview is rendered directly into the DOM via dangerouslySetInnerHTML. While the server-side does validate with isLogoProduct() and sanitizes the name via xmlEscape(), the SVG returned from SVGO optimization could theoretically be manipulated if the SVGO pipeline or icon files are compromised. More concretely, the product name is XML-escaped but the icon SVG content loaded from lucide-static files is NOT sanitized — it's read from disk and embedded directly (svg.ts:extractIconPaths). If a malicious icon SVG contained <script> or event handlers (onload, onerror), they would execute in the browser. The SVGO preset-default plugin does strip scripts, which mitigates this, but the defense is implicit rather than explicit. Recommendation: Either (a) add an explicit DOMPurify sanitization step on the client before dangerouslySetInnerHTML, or (b) render the SVG inside an <img> tag using a data URI or blob URL (which sandboxes script execution), or (c) at minimum document that the SVGO optimization is the security boundary and add a test verifying script tags are stripped from optimized output.
[medium] useEffect has a missing dependency: `buildPayload` function is called inside the effect but not listed in the dependency array (LogoGenerator.tsx:44-74). The dependency array is [config], which is correct in practice since buildPayload is a pure function of its argument and config captures all state changes. However, the React linter will flag this. Move buildPayload outside the component or wrap it in useCallback, or inline the logic in the effect.
[medium] The `next-env.d.ts` file in the diff (line 3) contains `import './.next/types/routes.d.ts'` — this is an auto-generated file that references build artifacts. It should be in .gitignore and not committed, as it may cause issues on fresh clones before the first build. Standard Next.js practice is to let `next build` or `next dev` regenerate it.
[low] The error response parsing at LogoGenerator.tsx:56 uses `as { error?: string }` type assertion. If the error response is not JSON (e.g., a 500 HTML page), res.json() is caught, but the fallback object could be improved. This is minor since it already has the .catch() fallback.
[low] No initial preview on mount. The useEffect fires on mount with the default config, which is good — the user sees a preview immediately. However, there's a brief 300ms delay before the first fetch due to the debounce. Consider fetching immediately on mount (skip debounce for the initial render) for a snappier first load.
[low] The `next-env.d.ts` import line `import './.next/types/routes.d.ts'` is non-standard for Next.js 15. Normally this file only has `/// <reference>` directives, not import statements. Verify this was auto-generated and not manually edited.
- **rejection**: The LogoGenerator.tsx UI changes are solid polish — keeping the previous preview visible while loading, showing an 'Updating…' indicator, and improving error display. However, a large build artifact was committed.
[medium] `tsconfig.tsbuildinfo` is a TypeScript incremental build cache file and should not be committed. It's a build artifact that changes on every compilation and adds noise to the repo. Add it to `.gitignore` and remove it from the commit.
[low] When `error` is truthy AND `previewUrl` is set, the error message now renders below the preview (`<p>` tag at line ~228) while the old preview image remains visible. This is reasonable UX, but consider whether showing a stale preview alongside an error could confuse users — e.g., if the error is about an invalid config, the preview still shows the last valid result with no visual indication it's outdated (only the dim loading state, which clears when loading finishes with an error).

## Learned Patterns
- [health_failure] Logo Kit health check failed: HTTP 404 from https://logo-kit.fostered.dev/up
