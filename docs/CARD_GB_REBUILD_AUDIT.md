# Card GB Rebuild — Phase 1 Audit

**Branch:** `fable/michi-card-gb-rebuild` (based on `cursor/v1-unattended-scaffold-9ebb`, the PR #2 draft)
**Date:** 19 Sep 2026
**Scope:** keep the tested domain logic, rebuild the interface around a Card GB-derived visual system.

---

## 1. Baseline verification (before any change)

Commands come from `package.json`. Every one was run on a clean `npm install`.

| Check | Command | Result |
| --- | --- | --- |
| Unit tests | `npm test` | **PASS** — 25 files, 116 tests |
| Type check | `npx tsc --noEmit` | **FAIL** — 1 error |
| Lint | `npm run lint` | **FAIL** — 7 errors, 2 warnings |
| Production build | `npm run build` | **FAIL** — 2 errors |
| Playwright | `npx playwright test` | **BLOCKED** — 6/6 failed before reaching the app |

Raw logs are reproduced below so the failures are not hidden.

### 1.1 Build failure (blocking)

```
Error: next/font: Failed to fetch Fraunces from Google Fonts.
Error: next/font: Failed to fetch Nunito from Google Fonts.
```

`app/layout.tsx` calls `next/font/google` for Fraunces and Nunito. That performs a network
fetch to `fonts.googleapis.com` at build time. The build cannot succeed without it. In this
environment the host is refused by egress policy, but the dependency is real anywhere the
build runs offline or behind a restrictive proxy.

### 1.2 Type-check failure

```
app/layout.tsx(23,50): error TS2304: Cannot find name 'LayoutProps'.
```

`LayoutProps<'/'>` is a Next.js generated global that is only emitted once a successful build
has written `.next/types`. Because the build fails (1.1), the type never exists, so the
type check fails too. The two failures are linked.

### 1.3 Lint failures

All seven are in the presentation layer, and all describe real defects rather than style nits:

| File | Rule | Meaning |
| --- | --- | --- |
| `binder/BinderPrototype.tsx:22` | `react-hooks/set-state-in-effect` | render mode decided in an effect → first paint is wrong, then corrects |
| `editor/MediaLibrary.tsx:41` | `react-hooks/set-state-in-effect` | object URLs built in an effect → cascading render |
| `editor/Studio.tsx:128` | `react-hooks/set-state-in-effect` | same pattern for the 2D/3D mode |
| `landing/LandingDesk.tsx:32` | `react-hooks/set-state-in-effect` | same pattern on the landing binder |
| `editor/SlotGrid.tsx:128,129` | `react-hooks/immutability` | loop counters mutated while building JSX |
| `persistence/memorySupabase.ts:17` | `no-this-alias` | test double only |

The four `set-state-in-effect` hits are the mechanism behind the visible first-paint flash:
the server renders one render mode, the client immediately swaps to another.

### 1.4 Playwright blocked

```
Error: browserType.launch: Executable doesn't exist at
/opt/pw-browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell
```

The pinned `@playwright/test` expects browser build 1234. The execution environment ships
build 1194 at `/opt/pw-browsers/chromium`. No test assertion was reached, so the suite's
actual pass/fail state was unknown at baseline.

---

## 2. Reproduced product defects

Found by reading the shipped code paths and tracing the P0 journey end to end.

### B1 — Cloning the starter binder destroys the playground, silently

`LandingDesk.openPlayground(true)` calls `cloneTemplatePage(starterTemplate, pagePosition)`.
That helper defaults its `binderId` parameter to `PLAYGROUND_BINDER_ID`, so the clone is
written straight over the visitor's existing playground binder. There is no confirmation and
no undo.

The same bug makes the secondary action dead: after cloning, "Start from scratch" calls
`ensurePlaygroundBinder`, which returns the existing record — so it reopens the clone rather
than a blank page. Two buttons, one destination.

### B2 — The art export contains no art

`buildArtPdf` builds each page at the correct trim size, draws a paper-coloured rectangle and
crop marks, and saves. It never embeds the placement's image. The export is a dimensionally
accurate *template*, not the artwork. The print math is correct; the picture is missing.

### B3 — "3 mm bleed" is wired to nothing

`ExportDialog` keeps a `bleed` state and renders a checkbox for it. `buildArtPdf` accepts only
`{ useWholeStrips }`. The value is never passed. `extractPieceRaster` in `domain/print.ts`
implements bleed correctly, but nothing in the export path calls it.

### B4 — "Download PNG" downloads a blank rectangle

The handler creates a canvas at the correct 300 DPI pixel size, fills it with `#f5eee0`, and
downloads that. No artwork is drawn. A user gets a blank beige PNG named `…-300dpi.png`.

### B5 — The binder spread is the wrong shape

`binder.css` hardcodes `aspect-ratio: 2.05 / 1` for a double spread. Real geometry from
`domain/layouts.ts` is 7 × 9.5 cm per pocket, so a 3×3 page is 21 × 28.5 cm and a spread is
42 × 28.5 cm — **1.47 : 1**. At 2.05 : 1 the page is stretched ~39% too wide, which squashes
every pocket. This is the "binder pages compacted" failure recorded in `docs/rebuild-face.md`.
The hardcoded ratio is also wrong for 2×2, 4×3 and 4×4, which have different true shapes.

### B6 — Search shows nothing and explains nothing

`SearchPanel` only loads the catalog when the text input receives focus (`beginSearch`). Until
then `status` is `idle`, and every result branch is gated on `status === 'ready'` or
`hits.length > 0`. A visitor who opens the editor sees a filter form, no cards, and no
message. There is no empty state for "not loaded yet".

### B7 — No undo for placement or replacement

`useConfirmWithUndo` covers clear page, delete page, unmerge, remove media, and mode switch.
Placing a card into an occupied pocket goes straight through `placeIntoCell` with no
confirmation and no undo. Replacement is the most common destructive action in the editor and
it is the one action that cannot be taken back.

### B8 — A debug control shipped in the editor

"Swap last two pages" swaps the final two page positions. It is a development affordance with
no product meaning, sitting in the main editor column next to real actions.

### B9 — Print and export are unreachable from the editor

`ExportDialog` opens only from a `print` chip rendered inside a *merged* pocket that *already
contains art*. A user with no merged art pocket has no path to art export, and the calibration
sheet — the one thing that makes print accuracy verifiable — lives inside that same dialog.

### B10 — Slot controls have no accessible names and tiny targets

Remove (`×`), owned/wanted, unmerge and print are `<span role="button">` elements at
`text-[0.55rem]` with no `aria-label`. They are unreadable, well under any reasonable touch
target, and announce as unnamed buttons.

### B11 — Dialogs are not dialogs

`ExportDialog`, `CropEditor` and `ConfirmWithUndoToast` render fixed overlays with no
`role="dialog"`, no `aria-modal`, no focus trap, no Escape handling, and no focus restore.

### B12 — Card art is cropped by `object-cover`

`SlotGrid` renders card images with `object-cover` into cells whose aspect comes from the grid,
not from the card. Card art is 5:7; a pocket is 7:9.5. The mismatch crops art on every card.

### B13 — Development copy is visible in the product

`Binder2D`'s default hint reads "2D mode — a flat spread with a paper slide/crossfade. Same
dummy pages, same tokens." The starter binder is titled "First scrapbook (draft)" with the note
"Draft starter binder — Jacob will curate these spreads."

### B14 — Card images have no failure state

Images hotlink to `images.pokemontcg.io` with no `onError`, no skeleton and no fallback. Any
network failure, and every offline session, renders the binder as a grid of broken images.
`docs/PRD.md` names hotlink rot as a known risk; nothing in the UI handles it.

---

## 3. Disposition

### Preserve unchanged (the brain)

`src/domain/*` (slots, split, print, crop, layouts, pullList, serialize), `src/search/*`,
`src/export/calibration.ts`, `src/export/cardImageAllowlist.ts`, `src/export/shareImage.ts`,
`src/media/*`, `src/persistence/*`, `src/state/saveQueue.ts`, `src/templates/*` data,
`public/data/*`, `supabase/*`, and all 116 existing unit tests. Centimetre-canonical print
dimensions, the slot model, side-loading insertion rules and the split algorithm are not
touched.

### Fix inside preserved modules (bug fixes only, no redesign)

- `src/export/artPdf.ts` — embed the artwork and honour bleed (B2, B3).
- `src/templates/clone.ts` — stop defaulting the clone onto the playground id (B1).

### Rebuild (the face)

`src/styles/tokens.css`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`,
`src/components/dev/StyleGuide.tsx`, `src/components/landing/LandingDesk.tsx`,
`src/components/editor/Studio.tsx` (split into shell, canvas, navigation, tool panel,
inspector, status), `SlotGrid.tsx`, `SearchPanel.tsx`, `CardThumb.tsx`, `MediaLibrary.tsx`,
`CropEditor.tsx`, `ExportDialog.tsx`, `ConfirmWithUndoToast.tsx`, `SavedStamp.tsx`,
`src/components/binder/binder.css`, `Binder2D.tsx`.

### Remove

- "Swap last two pages" (B8).
- Fraunces and Nunito, and the `next/font/google` build-time dependency with them.
- Paper-grain, linen, pressed-leaf, stamp and vintage-ephemera decoration from the interface
  chrome. The art-pack *files* stay — they are user-selectable content, not chrome.

### Defer (documented, not done)

- Live Supabase provisioning and production auth providers.
- Ruler-verified print calibration. Cannot be done without a physical printer; export
  dimensions are verified in software only and are labelled as such.
- Safari-specific behaviour.
- `4x3` insertion map verification — still `null` in `layouts.ts`, still splits per pocket.
- Shelf polish beyond making it coherent with the new system.

---

## 4. Decisions taken

**D1 — Card GB replaces the scrapbook execution.** `docs/PRD.md` §Design Language specifies
"cozy scrapbook-meets-Game-Freak". `docs/rebuild-face.md` on `main` records that the scrapbook
skin and the navy/yellow skin both failed review, and that the direction was left open pending
references. The references supplied for this run are Pokémon Card GB album screens. The PRD's
binding intent — cozy, nostalgic, tactile, explicitly not corporate SaaS — is preserved; its
suggested *execution* is superseded. `CLAUDE.md` non-negotiable 2 is read the same way: a
design-token pass still precedes feature UI, and no stock component styling ships.

**D2 — No webfonts.** Both named faces are rejected by the brief, and `next/font/google` makes
the build depend on a network fetch. The type system is built from platform font stacks, so the
build is self-contained.

**D3 — Binder proportions derive from pocket geometry.** The spread aspect is computed from
`LAYOUTS` and `SLOT_CM` rather than hardcoded, so every layout renders at its true shape.

**D4 — Card images get a real fallback.** A skeleton → image → typed-placeholder chain, with
the placeholder carrying name, set and number. Fixes B14 and keeps the product usable offline.

**D5 — Playwright browser path is overridable.** `playwright.config.ts` reads an optional
`PLAYWRIGHT_CHROMIUM_PATH`. Unset, behaviour is unchanged for a normal checkout.
