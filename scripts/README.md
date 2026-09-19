# scripts

Developer scripts. None of these is deployed or imported by the app.

## Data pipelines

Run with Node's TypeScript strip-types (`node --experimental-strip-types`).

- `sync-card-data.ts` — rebuild `public/data` from the public TCG dataset.
- `extract-colors.ts` — batch-extract dominant colours per card, for vibe search.
- `write-draft-templates.ts` — regenerate the draft template files.

## Verification

Each needs the dev server running (`npm run dev`). On a machine whose Chromium is not the
build Playwright pins, set `PLAYWRIGHT_CHROMIUM_PATH` to it first.

- `node scripts/verify-export.mjs` — drives the browser through placing art in a merged pocket
  and exporting, then reads the PDF back and prints each page's trim and bleed size in
  centimetres plus the number of embedded images. This is how print sizes are checked in
  software. It is not a substitute for printing a sheet and measuring it.
- `node scripts/a11y.mjs` — reports controls with no accessible name, interactive targets under
  24 px, images with no `alt` attribute, and the `h1` count, for the landing page, the style
  guide and the editor.
- `node scripts/final-shots.mjs` — regenerates `docs/screenshots/`, reporting any console error
  raised while each screen was captured.
