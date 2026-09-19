# Card GB Rebuild — Review and Handoff

**Branch:** `fable/michi-card-gb-rebuild` · **Base:** `cursor/v1-unattended-scaffold-9ebb` (PR #2)
**Date:** 19 Sep 2026 · **Commits:** 5 · **Diff:** 76 files, +6,269 / −3,169

Read `docs/CARD_GB_REBUILD_AUDIT.md` for what was wrong and `docs/CARD_GB_REBUILD_PLAN.md`
for the direction. This file is the evidence and the list of what is still not done.

---

## 1. Verification

Every command is one already defined in `package.json`, except the Chromium path, which this
machine needs because it ships a different browser build from the one Playwright pins.

| Check | Command | Before | After |
| --- | --- | --- | --- |
| Unit tests | `npm test` | 25 files / 116 tests, **pass** | 25 files / **120 tests, pass** |
| Type check | `npx tsc --noEmit` | **1 error** | **0 errors** |
| Lint | `npm run lint` | **7 errors, 2 warnings** | **0 errors, 0 warnings** |
| Production build | `npm run build` | **2 errors, fails** | **passes** |
| Playwright | `npm run test:e2e` | **6 failed** (browser missing) | **13 passed** |
| Format check | `npm run format:check` | 92 files unformatted | 89 files unformatted |

The file count is 25 on both sides; the test count rose from 116 to 120 because
four tests were added, none removed and none weakened.

`npm run format:check` fails on both sides. It is a pre-existing condition across the whole
repository, including files this run never opened, and running Prettier over it would bury the
diff under 89 unrelated files. Left alone deliberately.

### Running Playwright here

```
PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test
```

`playwright.config.ts` reads that variable and falls back to Playwright's own default when it
is unset, so a normal checkout is unaffected.

### End-to-end coverage

`e2e/studio-flow.spec.ts` is the P0 journey as an automated test, not a smoke test:

- place a card by clicking, merge a block, undo the merge, undo the placement
- replace an occupied pocket and undo that
- confirm an invalid selection is explained instead of offered
- open print and export, confirm the calibration honesty note, close on Escape
- download the pull list
- merge, reload, and confirm the merge is still there
- confirm 2D reports itself as a mode rather than hiding as a fallback

### Print export, measured in software

`node scripts/verify-export.mjs` drives the browser through placing art in a 2 × 2 pocket and
exporting, then reads the PDF back:

```
pages: 3
  page 0: trim 14.00 x 19.00 cm   (the whole artwork)
  page 1: trim 14.00 x  9.50 cm   bleed 14.60 x 10.10 cm
  page 2: trim 14.00 x  9.50 cm   bleed 14.60 x 10.10 cm
embedded images (XObject /Image): 3
```

That is the PRD's canonical preset table exactly: 2 × 2 pockets is 14 × 19 cm, split into one
print per row because row seams are always sealed, with 3 mm of bleed on each piece. Three
embedded images means the artwork is in the file — which was the whole point, since it was not
before.

### Console

Eleven captures across landing, editor, search, placement, merge, art, print, the 2D fallback,
tablet and phone widths: **no console errors and no page errors**, excluding
`ERR_TUNNEL_CONNECTION_FAILED` from `images.pokemontcg.io`, which this machine's egress policy
blocks. Those are network refusals for hotlinked card art, not application faults, and the
`CardImage` fallback handles them — which is why every screenshot shows typed stand-ins rather
than broken images.

### Accessibility sweep

`node scripts/a11y.mjs` over the landing page, style guide and editor:

- 0 controls without an accessible name
- 0 interactive targets under 24 px (one inline text link at 14 px, which is exempt)
- 0 images missing an `alt` attribute
- exactly one `h1` per page

Focus is a single 2 px ink outline on every control, on every ground. `prefers-reduced-motion`
disables animation globally. No state is signalled by colour alone: selection adds a caret and
an outline, active chips add a tick, markers carry a glyph, tabs add an underline.

---

## 2. Bugs fixed

Numbering follows the audit.

| # | Bug | Fix |
| --- | --- | --- |
| Build | `next/font/google` fetched Fraunces and Nunito at build time; the build failed | Both faces removed; type is platform stacks, no network dependency |
| Types | `LayoutProps<'/'>` did not exist because it is emitted by a successful build | Root layout types its own props |
| Lint | 4 × setState-in-effect, 2 × loop mutation in JSX, 1 × `this` alias | Render mode moved to `useSyncExternalStore`; catalog state set from a settled promise; `CardImage` keyed on its source; cells built before JSX; alias removed |
| B1 | "Clone this page" overwrote the visitor's playground silently; "Start from scratch" then reopened the clone | `cloneTemplatePage` requires a target id; the landing asks before replacing and offers to open the existing page instead |
| B2 | The art PDF contained no art | The placement is rasterised through its stored transform at exact 300 DPI and embedded; verified above |
| B3 | The "3 mm bleed" checkbox was wired to nothing | Real bleed box, trim unchanged; covered by a test |
| B4 | "Download PNG" produced a blank beige rectangle | Removed; the working share-image path replaces it |
| B5 | Spread hardcoded at 2.05 : 1, about 39% too wide for a 3 × 3 page | Proportions derive from `LAYOUTS` and `SLOT_CM` |
| B6 | Search loaded only on input focus, so the panel sat blank with no explanation | Loads when the panel opens; loading, empty and error states all exist |
| B7 | No undo for placement or replacement | One undo stack over every edit, plus Ctrl+Z |
| B8 | "Swap last two pages" debug control in the editor | Removed |
| B9 | Print reachable only from a chip inside a merged, filled art pocket | One dialog from the header |
| B10 | Slot controls were unnamed `<span role="button">` at 0.55 rem | Actions moved to the inspector with text labels; every pocket has a descriptive name |
| B11 | Dialogs had no role, focus trap, or Escape | One `Dialog` that is labelled, trapped, Escape-dismissable and restores focus |
| B12 | `object-cover` cropped card art | `object-contain`, 5 : 7 preserved in results, 7 : 9.5 pockets |
| B13 | Development copy visible in the product | Rewritten |
| B14 | Card images had no failure state | Skeleton, then image, then a typed stand-in carrying name, set and number |

Found while driving the rebuilt UI, and fixed:

- **Pockets showed raw ids.** `base1-58` where a person expects "Pikachu", in the binder, the
  inspector and the still-needed list. Names now resolve through the cached catalog.
- **`binder.css` was never loaded on routes that draw a binder without the flip components**,
  and being unlayered it also outranked every Tailwind utility. Now imported globally and
  wrapped in a layer.
- **The binder collapsed to a few pixels** inside a centred column, because a plain wrapper
  shrinks to its content and the pages had no width basis.
- **Block selection was impossible from a full pocket.** dnd-kit captures the pointer on
  pointerdown, so no other pocket saw the drag. Shift now opts out of dragging.
- **An empty merged pocket rendered as an unexplained blank box.** It now says what it is and
  what it prints at, which is also what carries the idea on the landing page.

---

## 3. Screenshots

In `docs/screenshots/`, all captured at 2× from the running app.

| File | What it shows |
| --- | --- |
| `01-landing.png` | Landing with a real facing spread and the 2 × 2 art pocket |
| `02-editor-default.png` | Editor at rest: tools, binder, inspector, prompt, status |
| `03-search-and-selected-card.png` | Search results with a card selected and armed |
| `04-valid-placement-target.png` | Valid targets marked while a card waits for a pocket |
| `05-merged-slot.png` | A merged pocket with its assembly note and the inspector |
| `06-art-and-crop.png` | Art box and the non-destructive crop dialog |
| `07-print-and-export.png` | Print and export, with exact sizes and the honesty note |
| `08-2d-fallback.png` | 2D mode, forced with `?lowperf=1` |
| `09-tablet-editor.png` | Editor at 1024 × 768 |
| `10-styleguide.png` | `/dev/styleguide`, the full system |
| `11-mobile-landing.png` | Landing at 390 px |

Every card in these images is a stand-in, not real card art, because this machine cannot reach
`images.pokemontcg.io`. On a machine that can, the same components show the real images.

---

## 4. Known gaps

Stated plainly. None of these is claimed as done.

1. **Print accuracy is unverified against a physical printer.** The PDF's trim boxes measure
   exactly right in software. No sheet has been printed and measured with a ruler. The dialog
   says so, in those words.
2. **Card art could not be loaded during this run.** Every screenshot shows the fallback. The
   image path itself is unchanged and untested end to end here.
3. **Supabase is not provisioned and auth is not enabled.** With no keys the sign-in panel says
   accounts are off, and `/shelf` redirects to the landing page. The adapter and its tests are
   unchanged and still pass; none of it has run against a live project.
4. **The `4x3` insertion map is still unverified.** `layouts.ts` keeps it `null`, so every
   column seam is treated as sealed and exports split per pocket. A note says so in the dialog.
   Someone has to measure a real 4 × 3 page.
5. **The anonymous playground is one page.** The gate is the PRD's; it was not changed. That
   means a visitor never sees facing pages inside the editor, only on the landing page.
6. **`npm run format:check` fails**, as it did before this run, across 89 files.
7. **One lint rule is disabled in one block.** `react-hooks/refs` is switched off around the
   three pocket handlers in `Studio.tsx`. They read marquee refs from pointer and click events
   only, never during render, but the compiler cannot see that through the closure. The disable
   is scoped to that block with a comment.
8. **The 3D page turn is only on the landing page and `/dev/flip`.** The editor uses 2D by
   choice. The turn is a single-leaf rotation, not a full paper simulation.
9. **Safari is untested.** Chromium only.
10. **Templates beyond the starter binder are still drafts**, carried over unchanged.
11. **Undo is session-only.** Reload clears the stack; the binder itself persists.
12. **No mobile editor.** Phone widths are read-only-friendly, not editable. This is by brief.

---

## 5. What a reviewer should do

```
npm install
npm run build
npm test
PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:e2e   # path only if needed
npm run dev
```

Then: open `/`, page through the starter binder, take a copy, search a card, click a pocket,
shift-drag two pockets and merge them, press Ctrl+Z twice, add a picture under "My art", click
a merged pocket to fit it, and open "Print & export". `/dev/styleguide` is the system itself.
