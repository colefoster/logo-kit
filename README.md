# Logo Kit

A **web app that generates a logo and its icon set from a small form** — pick a name, a colour, and a Lucide icon, and download a ZIP of SVG, PNGs, a `favicon.ico`, and the HTML `<link>` tags that reference them.

> **The SVG is the source; everything else is derived from it.** The logo is built as a 128×128 SVG, run through SVGO, and every other file in the kit is rasterised from that same optimised string with Sharp. There is no upload — you can't bring your own artwork.

## Install

```bash
npm install
```

## Run

```bash
npm run dev        # http://localhost:3000
npm run build      # next build + copy static assets into .next/standalone
npm start          # serves the standalone build; honours PORT and HOSTNAME
npm test           # 88 vitest tests
npm run typecheck
```

## What you put in

The single page (`app/LogoGenerator.tsx`) has four inputs:

| Input | Notes |
|---|---|
| Product name | ≤ 100 chars, drawn as bold sans-serif text |
| Colour | hex; the rounded background square, and the `theme-color` meta |
| Type | **Icon + Text** or **Text Only** |
| Icon | typeahead over every icon in `lucide-static`, served by `/api/icons` |
| Font size | optional, defaults to 24 |

The preview re-renders on a 300 ms debounce by POSTing to `/api/preview`, which returns the optimised SVG. It's displayed through an `<img>` with a blob URL, so an SVG can never execute script in the page.

## What you get out

Ten presets, each individually checkable. The default selection is the first four plus the SVG.

| Preset | File | Size |
|---|---|---|
| Favicon 32 | `favicon-32.png` | 32×32 |
| Favicon 64 | `favicon-64.png` | 64×64 |
| Apple Touch Icon | `apple-touch-180.png` | 180×180 |
| Favicon ICO | `favicon.ico` | 16, 32 and 48 in one file |
| Social Media OG | `social-media-og.png` | 1200×630 |
| App Icon | `app-icon-512.png` | 512×512 |
| Logo 1x / 2x / 4x | `logo-1x.png` … | 128, 256, 512 |
| Original SVG | `logo.svg` | 128×128 |

**Delivery is a single ZIP**, streamed from `/api/download` — never individual file downloads. Everything sits under a `{slug}/` folder, where the slug is the product name lowercased with non-`[a-z0-9-]` characters replaced by `-`. Alongside the images the ZIP contains `manifest.html`: the `<link rel="icon">`, `apple-touch-icon`, `og:image`, `application-name` and `theme-color` tags for exactly the presets you selected, pointing at `./`.

The OG card is worth calling out — it is the same square logo, scaled to fit 1200×630 and letterboxed with the logo's own colour, not a separate wide layout. It is the one export that gets flattened to fully opaque; square presets keep their alpha so a favicon still has transparent corners.

## How it fits together

```
src/config.ts     presets, filenames, validation guards, escaping
src/svg.ts        reads the Lucide icon's paths, builds the 128×128 SVG
src/generate.ts   SVGO preset-default
src/raster.ts     Sharp -> PNG
src/ico.ts        writes the ICO container by hand (header + directory + PNGs)
src/manifest.ts   the HTML snippet
src/rate-limit.ts fixed-window buckets and client-IP resolution
src/api-utils.ts  8 KB-capped JSON body parsing
app/api/preview   POST product -> SVG
app/api/download  POST product + selected presets -> streamed ZIP
app/api/icons     GET the icon name list
```

`src/ico.ts` builds the ICO byte-by-byte rather than pulling in a dependency — 6-byte header, a 16-byte directory entry per size, then the PNG payloads.

### Guards

- Icon names must match `/^[a-z0-9-]+$/` **and** exist in `lucide-static`, checked server-side before any file read.
- All user strings are XML-escaped into the SVG and HTML-escaped into the manifest.
- Request bodies are capped at 8 KB; rasterisation runs at most 3 wide per request.
- `proxy.ts` rate-limits per IP in process memory, with separate budgets: 90/min for `/api/preview` (which fires once per debounced keystroke pause) and 12/min for `/api/download` (which does the Sharp work). Client identity comes from `cf-connecting-ip` first, since that is the one header the client cannot set. Fine for one process, not for a horizontally scaled deploy.

## Incomplete

`LogoConfig` and `parseConfig()` in `src/config.ts` describe a `products` array for generating several logos from one config. Nothing imports them — the UI and both API routes handle exactly one product per request.

## Production

Deployed at **logo-kit.fostered.dev** behind nginx and a Cloudflare tunnel, with
systemd socket activation for scale-to-zero: after 5 minutes idle the Node process
exits, and the next request queues in the kernel backlog while it boots. That makes
cold start a user-visible number, which is why the build is `output: 'standalone'` —
46 MB of traced dependencies instead of a 450 MB `node_modules`.

```bash
rsync -a --exclude node_modules --exclude .next --exclude .git ./ ash:/opt/logo-kit/
ssh ash 'cd /opt/logo-kit && npm ci --omit=dev && npm run build'
```

The icon set is read off disk by name at runtime, so `next build` cannot trace it —
`outputFileTracingIncludes` in `next.config.js` pulls `lucide-static/icons` into the
standalone output explicitly. Set `LUCIDE_ICONS_DIR` to override the lookup.
