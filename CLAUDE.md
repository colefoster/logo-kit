# Logo Kit

# Next.js Conventions

## Stack
Next.js + TypeScript + Tailwind CSS.

## Code Style
- Use App Router with server components by default
- Client components only when interactivity is required (`'use client'`)
- Use TypeScript strict mode — no `any` types
- Colocate components with their pages when single-use

## Testing
- Write tests with Vitest or Jest: `npm test`
- Test API routes and server actions
- Use `@testing-library/react` for component tests

## Security
- Never commit .env files
- Validate all API route inputs with zod or similar
- Use `next/headers` for auth checks in server components

# Builder Agent Instructions

- You are an autonomous builder. Implement the task completely — don't leave TODOs.
- Read existing code before writing new code. Match the existing style.
- Write tests for every change. Run the test suite before finishing.
- Keep changes small and focused on the task. Don't refactor unrelated code.
- If you need something from a human (API key, design decision, etc.), output:
  ```json
  {"human_actions_needed": [{"action": "description of what you need"}]}
  ```
- If acceptance criteria are provided, verify each one is met.
- Do NOT run any git commands. No `git add`, `git commit`, `git push`, `git checkout`, etc. The harness handles all git operations after you finish.
- Do NOT attempt to push code to GitHub or any remote. You have no SSH keys or GitHub credentials. Any attempt will fail and waste turns.

## Product Overview
Logo Kit is a config-driven logo and favicon generator. Users define products in a config file with name, color, icon, and styling options. The tool generates SVG logos, optimized SVGs, rasterized PNGs (favicons), and HTML head snippets for web integration. A Next.js web UI has been scaffolded for public-facing usage.

## Tech Stack
- TypeScript (strict, no `any`)
- Next.js 15 (App Router) — web UI with API routes
- SVG generation and optimization (SVGO)
- PNG rasterization via Sharp
- Lucide icons (lucide-static)
- Vitest for testing
- Tailwind CSS + PostCSS
- Docker + docker-compose for deployment

## Key Files
### Core generation (CLI origin)
- `src/svg.ts` — SVG logo generation (text rendering, icon embedding, color fills)
- `src/config.ts` — Config parsing and validation (includes security sanitization)
- `src/generate.ts` — Main generation pipeline orchestration
- `src/manifest.ts` — HTML head snippet generation (favicon links, meta tags)
- `src/raster.ts` — PNG rasterization from SVG via Sharp

### Web UI (Next.js)
- `app/page.tsx` — Landing/main page
- `app/api/generate/route.ts` — API endpoint for logo generation
- `app/api/preview/route.ts` — API endpoint for logo preview
- `app/api/up/route.ts` — Health check endpoint
- `server.js` — Custom Next.js server

### Tests
- `src/svg.test.ts`, `src/config.test.ts`, `src/generate.test.ts`, `src/manifest.test.ts`

### Config
- `example/config.json` — Example config file for the CLI

## Security Requirements (MUST follow)
Previous builds were rejected for security issues. All input interpolated into SVG/HTML must be sanitized:
- **XML-escape** product `name` before embedding in SVG `<text>` elements (escape `<`, `>`, `&`, `"`, `'`)
- **Validate `color`** matches hex pattern `/^#[0-9a-fA-F]{3,8}$/` during config parsing — never interpolate raw color into SVG attributes
- **Sanitize slugs** to `[a-z0-9-]` only — reject or strip path separators and `..` segments to prevent path traversal
- **HTML-escape** any user-derived values in generated HTML attributes
- **Validate `icon`** names match `/^[a-z0-9-]+$/` to prevent directory traversal in icon file lookups
- **Rasterize from optimized SVG** (`optimizedSvg`), not the raw SVG, so PNGs match the saved `.svg` file

## Config Schema
Products are defined with these fields:
- `name` (string, required) — product display name
- `color` (string, required) — hex color for the logo
- `icon` (string, conditional) — icon name from the icons directory. Required when `type` is `"icon"` or omitted. Optional when `type` is `"text-only"`.
- `type` (string, optional) — `"icon"` (default) or `"text-only"`. Controls which logo layout is rendered.
- `fontSize` (number, optional) — text size in SVG units for the product name (future: being added)

## Text-Only Logo Implementation Notes
Text-only logos render the product name as styled SVG text with NO background rectangle, NO border, and NO icon. Key design guidance:
- Use a transparent background (no `<rect>` fill)
- Center the text horizontally and vertically in the SVG viewBox
- Use the product `color` as the text fill color
- Keep the viewBox consistent with icon-based logos so rasterization produces correct PNG sizes
- The same pipeline applies: SVG → SVGO optimize → Sharp rasterize → manifest generation
- Validation: when `type` is `"text-only"`, skip icon validation entirely (don't require or validate `icon` field)
- When `type` is omitted or `"icon"`, all existing behavior is unchanged — full backwards compatibility

## Conventions
- Use strict TypeScript — no `any` types
- Validate all config values at parse time in `isLogoProduct` before they reach SVG/HTML generation
- Feature tests over unit tests — test the full generation pipeline end-to-end
- Keep the CLI stateless — all config comes from the config file, all output goes to the output directory

## Known Issues
- Health check at https://logo-kit.fostered.dev/up returns 404 — the `app/api/up/route.ts` file exists but the app may not be properly deployed or the Next.js build may be failing in Docker (check Dockerfile for build suppression issues similar to Fostered)
- Task #7 (security hardening) was rejected because the security code ALREADY EXISTS on main in `src/config.ts`. The diff was empty because the feature branch had no changes vs main. **Resolution**: the Builder should verify the security code is present before making changes. If it's already there, the task should be marked complete rather than re-attempted with an empty PR.
- Task #5 (web UI) is marked idle but the Next.js scaffold already exists on main (app router, API routes, Tailwind, Docker). The task may be partially or fully complete — the Builder should verify what's missing against the acceptance criteria before starting new work.

## Deployment
- URL: https://logo-kit.fostered.dev
- Docker-based deployment (Dockerfile + docker-compose.yml)
- Custom server.js for Next.js
- Health check: GET /api/up (currently failing)

## Task Implementation Notes

### fontSize implementation
- Add `fontSize` as optional number to the product interface in `src/config.ts`
- Validate in `isLogoProduct`: if present, must be a positive finite number
- In `src/svg.ts`, use `product.fontSize ?? <current hardcoded value>` for the `<text>` element's `font-size` attribute
- Do NOT change the SVG viewBox or layout — fontSize only affects the text element
- Add a test in `src/svg.test.ts` that generates SVG with a custom fontSize and asserts the `font-size` attribute value in the output
- Add a test in `src/config.test.ts` that validates fontSize parsing (valid number, missing/undefined, invalid values like negative/NaN)
- Update `example/config.json` to show fontSize usage in at least one product entry

### text-only implementation
**Independent of fontSize** — text-only logos do NOT depend on the fontSize feature. Use the existing hardcoded font-size value for text. fontSize support can be layered on later. Previous tasks (#17, #19) failed partly due to an incorrect dependency on fontSize (#16). These are separate features that can be built in any order.

- Add `type` as optional `"icon" | "text-only"` to the product interface in `src/config.ts`
- Validate `type` in `isLogoProduct`: if present, must be `"icon"` or `"text-only"`; if absent, default to `"icon"` behavior (backwards compatible)
- In config validation: when `type === "text-only"`, skip icon field requirement entirely — do NOT call icon validation, do NOT require `icon` in the config
- In `src/svg.ts`: create a separate rendering branch for text-only:
  - No background `<rect>` element (transparent background)
  - No icon embedding
  - Render only centered `<text>` with `fill={product.color}` and `text-anchor="middle"` / `dominant-baseline="central"`
  - Use same viewBox (e.g. `0 0 128 128`) — center text at midpoint (64, 64)
- The rest of the pipeline (SVGO, Sharp, manifest) should work unchanged since they operate on SVG strings
- Add a text-only entry to `example/config.json` like: `{ "name": "My Brand", "color": "#1a1a1a", "type": "text-only" }`

### Health check fix
- The route file `app/api/up/route.ts` exists. The health URL is `https://logo-kit.fostered.dev/up` but the API route is at `app/api/up/route.ts` — the actual URL should be `/api/up`, not `/up`. Check whether the health check URL is misconfigured (should be `/api/up`) or whether there's a rewrite rule needed.
- App Router requires `export async function GET()` (named export, not default export) — verify this in the route file
- Check that `next.config.js` doesn't exclude the /api/up path
- Check that the Dockerfile runs `npm run build` successfully and serves from `.next`
- Check `server.js` for any custom routing that might interfere with API routes
- **Debug approach**: First verify the route file exports correctly, then check if the Docker build succeeds, then check if the custom server proxies API routes properly

## Interactive UI Implementation Notes

### Form + Preview architecture
- Use React client components (`"use client"`) for the form — Next.js App Router requires this for interactive state.
- The form state should be a single object matching the logo config schema: `{ name, color, type, icon?, fontSize? }`.
- Debounce preview requests (~300ms) to avoid hammering the API on every keystroke. Use a simple `setTimeout`/`clearTimeout` pattern or a `useDebouncedValue` hook.
- Fetch the preview SVG from `/api/preview` via POST with the config as JSON body. Render the returned SVG string using `dangerouslySetInnerHTML` inside a fixed-size container.
- The `/api/preview` route already exists — check its current implementation before building. It likely accepts config and returns SVG. If it doesn't match this contract, update it.
- Conditionally show/hide the icon field based on `type` value. When `type === "text-only"`, omit `icon` from the request entirely.

### ZIP download implementation
- Use `archiver` (npm package) for ZIP creation — it streams and handles large files well. Alternative: `jszip` works but is more memory-heavy.
- The download endpoint should reuse the existing generation pipeline from `src/generate.ts` but write to a temporary directory (use `os.tmpdir()` + unique subfolder), then ZIP the contents.
- Clean up the temp directory after streaming the ZIP response.
- On the client side, use `fetch` + `URL.createObjectURL` + programmatic `<a>` click to trigger the download. Don't use `window.open` — it doesn't handle POST bodies.

### Icon picker implementation
- The `lucide-static` package contains SVG files in its installed directory. To get the icon list, read the package's icon names at build time or from an API endpoint.
- For performance with 1000+ icons, consider: lazy loading (show first ~100, load more on scroll), or a simple CSS `max-height` + `overflow-y: scroll` container. Full virtualization (e.g. react-window) is overkill for this use case — just limit initial render and filter aggressively.
- Each icon in the grid can render the SVG inline (small, ~24x24px) with the icon name below it.

## Homepage Generator (Goal #16) — Active Goal

Goal #16 supersedes Goal #15. The homepage should BE the product — a single-page inline logo generator. Previous task #28 (under goal #15) failed; the new tasks under #16 are a fresh start. Goal #15 tasks (#28, #29, #30) should be ignored — work only on #31, #32, #33.

### Key implementation guidance
- The homepage (`app/page.tsx`) should import a `"use client"` component that manages all form state. Keep the page component itself as a server component wrapper if possible, or make it a client component if simpler.
- **Do not over-engineer.** A single `LogoGenerator` client component with `useState` for the config object is sufficient. No Redux, no context providers, no form libraries.
- The `/api/preview` route already exists — read it first and adapt it if needed rather than building from scratch. It should accept `{ name, color, type?, icon?, fontSize? }` as POST body and return SVG.
- For the ZIP download, install `archiver` (not `jszip`). Use `os.tmpdir()` for temp files. Clean up with `fs.rm(dir, { recursive: true })` in a `finally` block.
- Lucide icon names can be derived from the `lucide-static` package's file listing at build time or by reading `node_modules/lucide-static/icons/` at runtime from an API endpoint.

## Known Pitfalls
These issues have occurred before — avoid repeating them:
- **rejection**: The implementation satisfies most acceptance criteria and is generally well-structured. However, there is a high-severity XSS issue with dangerouslySetInnerHTML rendering SVG from the API, and a medium issue with the missing dependency array warning in useEffect.
[high] XSS via dangerouslySetInnerHTML at LogoGenerator.tsx:186. The SVG response from /api/preview is rendered directly into the DOM via dangerouslySetInnerHTML. While the server-side does validate with isLogoProduct() and sanitizes the name via xmlEscape(), the SVG returned from SVGO optimization could theoretically be manipulated if the SVGO pipeline or icon files are compromised. More concretely, the product name is XML-escaped but the icon SVG content loaded from lucide-static files is NOT sanitized — it's read from disk and embedded directly (svg.ts:extractIconPaths). If a malicious icon SVG contained <script> or event handlers (onload, onerror), they would execute in the browser. The SVGO preset-default plugin does strip scripts, which mitigates this, but the defense is implicit rather than explicit. Recommendation: Either (a) add an explicit DOMPurify sanitization step on the client before dangerouslySetInnerHTML, or (b) render the SVG inside an <img> tag using a data URI or blob URL (which sandboxes script execution), or (c) at minimum document that the SVGO optimization is the security boundary and add a test verifying script tags are stripped from optimized output.
[medium] useEffect has a missing dependency: `buildPayload` function is called inside the effect but not listed in the dependency array (LogoGenerator.tsx:44-74). The dependency array is [config], which is correct in practice since buildPayload is a pure function of its argument and config captures all state changes. However, the React linter will flag this. Move buildPayload outside the component or wrap it in useCallback, or inline the logic in the effect.
[medium] The `next-env.d.ts` file in the diff (line 3) contains `import './.next/types/routes.d.ts'` — this is an auto-generated file that references build artifacts. It should be in .gitignore and not committed, as it may cause issues on fresh clones before the first build. Standard Next.js practice is to let `next build` or `next dev` regenerate it.
[low] The error response parsing at LogoGenerator.tsx:56 uses `as { error?: string }` type assertion. If the error response is not JSON (e.g., a 500 HTML page), res.json() is caught, but the fallback object could be improved. This is minor since it already has the .catch() fallback.
[low] No initial preview on mount. The useEffect fires on mount with the default config, which is good — the user sees a preview immediately. However, there's a brief 300ms delay before the first fetch due to the debounce. Consider fetching immediately on mount (skip debounce for the initial render) for a snappier first load.
[low] The `next-env.d.ts` import line `import './.next/types/routes.d.ts'` is non-standard for Next.js 15. Normally this file only has `/// <reference>` directives, not import statements. Verify this was auto-generated and not manually edited.
- **rejection**: Stream file not found
- **build_failure**: 

## Learned Patterns
- [rejection] The implementation satisfies most acceptance criteria and is generally well-structured. However, there is a high-severity XSS issue with dangerouslySetInnerHTML rendering SVG from the API, and a medium issue with the missing dependency array warning in useEffect.
[high] XSS via dangerouslySetInnerHTML at LogoGenerator.tsx:186. The SVG response from /api/preview is rendered directly into the DOM via dangerouslySetInnerHTML. While the server-side does validate with isLogoProduct() and sanitizes the name via xmlEscape(), the SVG returned from SVGO optimization could theoretically be manipulated if the SVGO pipeline or icon files are compromised. More concretely, the product name is XML-escaped but the icon SVG content loaded from lucide-static files is NOT sanitized — it's read from disk and embedded directly (svg.ts:extractIconPaths). If a malicious icon SVG contained <script> or event handlers (onload, onerror), they would execute in the browser. The SVGO preset-default plugin does strip scripts, which mitigates this, but the defense is implicit rather than explicit. Recommendation: Either (a) add an explicit DOMPurify sanitization step on the client before dangerouslySetInnerHTML, or (b) render the SVG inside an <img> tag using a data URI or blob URL (which sandboxes script execution), or (c) at minimum document that the SVGO optimization is the security boundary and add a test verifying script tags are stripped from optimized output.
[medium] useEffect has a missing dependency: `buildPayload` function is called inside the effect but not listed in the dependency array (LogoGenerator.tsx:44-74). The dependency array is [config], which is correct in practice since buildPayload is a pure function of its argument and config captures all state changes. However, the React linter will flag this. Move buildPayload outside the component or wrap it in useCallback, or inline the logic in the effect.
[medium] The `next-env.d.ts` file in the diff (line 3) contains `import './.next/types/routes.d.ts'` — this is an auto-generated file that references build artifacts. It should be in .gitignore and not committed, as it may cause issues on fresh clones before the first build. Standard Next.js practice is to let `next build` or `next dev` regenerate it.
[low] The error response parsing at LogoGenerator.tsx:56 uses `as { error?: string }` type assertion. If the error response is not JSON (e.g., a 500 HTML page), res.json() is caught, but the fallback object could be improved. This is minor since it already has the .catch() fallback.
[low] No initial preview on mount. The useEffect fires on mount with the default config, which is good — the user sees a preview immediately. However, there's a brief 300ms delay before the first fetch due to the debounce. Consider fetching immediately on mount (skip debounce for the initial render) for a snappier first load.
[low] The `next-env.d.ts` import line `import './.next/types/routes.d.ts'` is non-standard for Next.js 15. Normally this file only has `/// <reference>` directives, not import statements. Verify this was auto-generated and not manually edited.
- [rejection] Stream file not found
- [build_failure] 
- [health_failure] Logo Kit health check failed: HTTP 404 from https://logo-kit.fostered.dev/up
