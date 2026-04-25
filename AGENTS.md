# Exoape-Sources Codex Instructions

## Mission

Build a repeatable recovery pipeline for public browser-served website source assets from the URLs in `targets.txt`.

We are interested in:
- HTML
- JavaScript
- CSS
- source maps
- JSON / API responses
- WASM
- shader files
- route manifests
- framework build manifests
- dependency/package clues

Ignore by default:
- images
- videos
- fonts
- large media
- tracking pixels
- analytics beacons

Do not attempt to bypass authentication, paywalls, server restrictions, private APIs, rate limits, or access controls. Only collect files that are publicly served to a normal browser session.

## Required approach

Use a hybrid pipeline:

1. Static fetch:
   - Fetch initial HTML.
   - Parse script/link tags.
   - Save HTML, JS, CSS, JSON-like manifests.

2. Runtime browser capture:
   - Use Playwright Chromium.
   - Visit each URL.
   - Intercept network responses.
   - Save JS, CSS, HTML, JSON, WASM, source maps, text/plain, shaders.
   - Ignore fonts/media unless needed for code understanding.

3. Interaction coverage:
   - Wait for network idle where possible.
   - Scroll page top to bottom.
   - Trigger hover/click only for safe navigation/UI expansion.
   - Follow same-origin internal links up to a conservative limit.

4. Source-map hunting:
   - For every JS file, check:
     - existing sourceMappingURL comment
     - file.js.map
     - file.map
   - Save maps to `maps/`.
   - If maps include `sourcesContent`, reconstruct original source files to `reconstructed/`.

5. Bundle cleanup:
   - Save untouched files in `raw/`.
   - Save formatted/de-minified readable files in `extracted/`.
   - Never overwrite raw captures.

6. Reporting:
   - Produce `reports/inventory.md`.
   - Include all URLs visited.
   - Include every captured JS/CSS/HTML/JSON/map file.
   - Include failures and HTTP statuses.
   - Include which targets had source maps and which did not.

## Repo hygiene

Do not commit tokens, secrets, cookies, local browser profiles, or `.env` files.

Keep scripts reusable and documented.

Prefer one master command:

```bash
npm run recover
