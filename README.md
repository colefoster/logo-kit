# Logo Kit

A **web app that generates a logo and its icon set from a small form** — pick a name, a colour, and a Lucide icon, and download a ZIP of SVG, PNGs, a `favicon.ico`, and the HTML `<link>` tags that reference them.

> **The SVG is the source; everything else is derived from it.** The logo is built as a 128×128 SVG, run through SVGO, and every other file in the kit is rasterised from that same optimised string with Sharp. There is no upload — you can't bring your own artwork.

## Install

```bash
npm install
```

## Run

```bash
npm run dev      # http://localhost:3000
npm run build
npm test         # 58 vitest tests
```

Note: `npm start` is `node server.js`, and there is no `server.js` in the repo — that script is broken. Use `npm run dev`, or `npx next start` after a build.

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

The OG card is worth calling out — it is the same square logo resized to 1200×630, not a separate wide layout.

## How it fits together

```
src/config.ts     presets, filenames, validation guards, escaping
src/svg.ts        reads the Lucide icon's paths, builds the 128×128 SVG
src/generate.ts   SVGO preset-default
src/raster.ts     Sharp -> PNG
src/ico.ts        writes the ICO container by hand (header + directory + PNGs)
src/manifest.ts   the HTML snippet
app/api/preview   POST product -> SVG
app/api/download  POST product + selected presets -> streamed ZIP
app/api/icons     GET the icon name list
```

`src/ico.ts` builds the ICO byte-by-byte rather than pulling in a dependency — 6-byte header, a 16-byte directory entry per size, then the PNG payloads.

### Guards

- Icon names must match `/^[a-z0-9-]+$/` **and** exist in `lucide-static`, checked server-side before any file read.
- All user strings are XML-escaped into the SVG and HTML-escaped into the manifest.
- Request bodies are capped at 8 KB; rasterisation runs at most 3 wide per request.
- `middleware.ts` rate-limits `/api/download` and `/api/preview` to 30 requests per minute per IP, in process memory — fine for one container, not for a horizontally scaled deploy.

## Incomplete

`LogoConfig` and `parseConfig()` in `src/config.ts` describe a `products` array for generating several logos from one config. Nothing imports them — the UI and both API routes handle exactly one product per request.
