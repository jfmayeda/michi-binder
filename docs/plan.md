# Michi Binder Studio — Implementation Plan (M1–M5)

**Status:** Approved Aug 14, 2026 · **Executor:** unattended Cloud Agents (see
`docs/unattended-cloud-prompt.md`); tasks still run in order from `docs/agent-runbook.md`.
**Governing docs:** `PRD.md` v1.2 → `architecture.md` → `data-model.md` → `decisions.md`.

**Rules for the executor:**
- Tasks run in listed order; a task's acceptance criteria (AC) must pass before the next starts.
- No architectural improvisation. If a task seems to require a decision not covered by these docs,
  STOP and ask Jacob — do not invent.
- Scope guard: if a task tempts you toward pricing, valuation, collection tracking/inventory, or
  community-backend features, stop — those are PRD Non-goals.
- The cozy design language is a core requirement. Every UI task consumes the M1 tokens; default
  Tailwind/shadcn styling anywhere is a defect.
- **Gates** are Jacob checkpoints — hard stops requiring his explicit OK.

---

## M1 — Design tokens + page-flip prototype (no feature UI before this)

**T1.1 — Scaffold**
Create the Next.js (App Router, TS, Tailwind v4) app in `apps/michi-binder` with the repository
layout from `architecture.md` §9, Vitest wired (one passing sample test for `src/domain`),
ESLint + Prettier, and a `/dev` route group excluded from production builds.
**AC:** `npm run dev` serves; `npm test` passes; `npm run build` succeeds; directory layout matches
architecture §9.

**T1.2 — Design tokens + styleguide**
Define the cozy token set as Tailwind v4 `@theme` CSS variables in `src/styles/tokens.css`: warm
paper-tone palette + one accent; display + body font pairing via `next/font`; spacing/radius/shadow
scales (soft, never crisp-corporate); paper/linen texture assets; motion tokens (durations +
easing curves modeled on paper movement). Build `/dev/styleguide` showing every token, type
specimen, texture swatch, and motion curve demo. Follow PRD Design Language moodboard references.
**AC:** styleguide renders all tokens; no raw Tailwind default colors (`bg-blue-500` etc.) anywhere;
Jacob can review the page and request palette swaps by token name.

**T1.3 — Page-flip prototype (CSS 3D)**
A standalone `/dev/flip` prototype: a binder with 6 dummy pages, CSS-3D page flip with the M1
motion tokens (paper easing, soft dynamic shadow, 2.5D bend illusion via layered gradients),
driven by click, arrow keys, and pointer drag. Use compositor-friendly transforms (CSS
transitions/keyframes, not per-frame JS styles); verify backface behavior in Chrome AND Safari.
**AC:** flips feel paper-like at a steady 60 fps on Jacob's machine; no visible backface glitches
in Chrome/Safari; drag-to-flip tracks the pointer.

**T1.4 — Perf detection + 2D fallback**
Frame-time probe during the first flip; below threshold, auto-switch to the 2D mode (flat spread,
slide/crossfade transition, same tokens). Manual 3D/2D toggle, persisted per device
(localStorage). If a Playwright frame-timing test is added, isolate it in its own Playwright
project with `dependencies` on the others (parallel browser projects cause false jank).
**AC:** forcing a low-perf flag renders 2D; toggle switches live and persists across reload; 2D
mode is fully usable, not a degraded afterthought.

**GATE 1 (Jacob):** flip feel + tokens approved. If CSS 3D can't hit 60 fps, this is where the
WebGL escalation conversation happens — not a unilateral switch.

## M2 — Card data + search

**T2.1 — Data sync script**
`scripts/sync-card-data.ts` per architecture §3: download pokemon-tcg-data, generate
`public/data/` files (columnar index, sets, dex-species map, image-URL exceptions), committed.
Write `docs/data-sync.md` (the documented re-sync job: when a set releases → run → diff review →
eyeball → commit).
**AC:** script runs end-to-end and is deterministic (re-run produces no diff); index ≤ 6 MB raw;
all facet fields populated; `docs/data-sync.md` exists with the full procedure.

**T2.2 — Client search module**
`src/search/`: lazy index loader (fetch on first search interaction; idle prefetch allowed only
after first flip is interactive), MiniSearch for name/artist text, array-scan facet filters (set,
species, type, artist, rarity, era), combined queries.
**AC:** AT-9 (lazy loading) passes; unit tests cover each facet + combined text-and-facet queries;
post-load query latency < 50 ms for representative queries.

**T2.3 — Search panel UI**
Token-styled search panel for the studio: text box, facet filter chips, virtualized results grid
with hotlinked lazy-loaded card thumbnails, empty/loading states with cozy copy. Results are
draggable sources (wired to slots in M3 — here they just render and drag).
**AC:** searching "Pikachu" + a set filter returns correct cards; images lazy-load; panel is
keyboard-navigable; visuals use only M1 tokens.

**T2.4 — Color pipeline on ONE set**
`scripts/extract-colors.ts` per architecture §3 (sharp, downscale, OKLab k-means, top-4 colors
with weights, border suppression). Run on a single set Jacob names (default: base1). Build
`/dev/color-check` rendering that set's cards grouped by dominant hue.
**AC:** script is re-runnable per set; `/dev/color-check` renders; obvious sanity (a Squirtle card
clusters blue).

**GATE 2 (Jacob):** eyeball the color clusters. Full-catalog run (in T5.6) only after this OK.

## M3 — Binder/page CRUD + spread editor + slot model

**Pre-M3 input (Jacob):** 4x3 insertion map measurement. If unavailable, T3.1 ships the safe-split
default (data-model §6.4) and the map is a later one-line config fix.

**T3.1 — Domain slot module + acceptance tests**
Implement `src/domain/` pure-TS: `layouts.ts` (LAYOUTS config + seam rule), `slots.ts` (merge
validation, placements, facing pairs, unmerge), `split.ts` (piece computation + assembly
annotations), serialization. Write acceptance tests **AT-1 through AT-5** (data-model §9) — the
exhaustive layout × merge-shape matrices, not samples.
**AC:** AT-1…AT-5 pass; zero React/DOM/Supabase imports in `src/domain` (enforced by lint rule).

**T3.2 — Playground persistence adapter**
Adapter interface (`src/persistence/`) + `PlaygroundAdapter`: structure in localStorage, media
blobs in IndexedDB, debounced writes. AT-3 round-trip suite runs through this adapter.
**AC:** AT-3 passes via adapter; hard reload restores exact editor state.

**T3.3 — Binder shelf (home)**
Token-styled shelf listing binders (create / rename / delete-with-safeguard). Creation flow picks
layout (2x2/3x3/4x3/4x4) + page mode (single/double) — fixed thereafter (per decisions D7).
**The shelf is an authed-only surface in production.** Anonymous users only ever see landing +
playground. The playground adapter's multi-binder capability exists purely as M3/M4 dev
convenience — gate the shelf route now (production builds redirect unauthenticated visitors to
landing) so it cannot ship wrong; T5.3 replaces the gate with the real session check.
**AC:** full CRUD persists via adapter; delete uses the confirm+undo pattern (T3.7's component —
stub acceptable until T3.7 lands, then wired); a production build redirects shelf visits to
landing while `npm run dev` allows them.

**T3.4 — Page management inside the binder view**
Add/reorder/delete pages integrated with the M1 binder rendering (3D flip + 2D fallback both):
page thumbnails strip, drag-reorder, flip navigates to a page. Facing pairs per data-model §3
(page 1 right-alone; pairs (2,3),(4,5)…).
**AC:** reorder persists and resequences positions; flip and thumbnail navigation agree; both
render modes work.

**T3.5 — Placement interactions**
Drag cards from the search panel into slots (dnd-kit, grid-snapped), move/swap between slots,
remove; click-to-place fallback for accessibility. Works in single and double page views.
**AC:** all four ops work in both views; occupied-slot drop swaps; state persists; no drift
between visual grid and domain state (spot-checked by AT-3-style round-trip after interactions).

**T3.6 — Merged slots UI**
Cell multi-select → merge (any rectangle, any layout); cross-page merges in double mode; merges
render as one slot; every merge shows its assembly annotation badge ("single insert" /
"slide-through" / "split into N pieces") from `split.ts`. Unmerge per AT-4.
**AC:** AT-6's table rows are reproducible by hand in the UI with matching badges; cross-page
merge on (2,3) works, rejected in single mode; unmerge behavior matches AT-4.

**T3.7 — Destructive-action safeguards**
Shared `ConfirmWithUndoToast` (token-styled): wraps clear page, delete page, delete binder,
unmerge-filled, mode-switch. Snapshot-based undo per architecture §5.
**AC:** each op prompts, applies, and toast-undo restores exactly; toast expiry finalizes.

**T3.8 — Double↔single mode switch**
Per AT-5: switching double→single with K cross-page merges prompts "this will unmerge K
cross-page slots" via T3.7's pattern.
**AC:** AT-5 passes end-to-end in the UI.

## M4 — Media editor + print export + calibration + pull list

**T4.1 — Media import + library**
Upload images (png/jpg/webp) into the media library; originals stored immutable (IndexedDB via
adapter; Storage comes in M5); token-styled library grid in the studio's media section.
**AC:** imported file's bytes are never modified (checksum test); library lists, previews,
deletes (with safeguard).

**T4.2 — Crop/fit editor**
Modal editor: place art into any slot/merge → crop window locked to the slot's physical aspect
(colSpan×7 : rowSpan×9.5), pan/zoom/rotate (90° steps), saves a `Transform` (data-model §6.1);
re-opening restores it. Placing art into slots uses the same placement flow as cards.
**AC:** transform round-trips; original untouched; re-edit shows prior crop; aspect lock holds
for every merge shape.

**T4.3 — Print domain module**
`src/domain/print.ts`: piece computation per data-model §6.2–6.4 (gutter/row mandatory splits,
sealed-seam column splits, whole-strip variants, safe-split for null maps), physical dimensions
(§7), bleed geometry, piece labels/registration metadata. Tests **AT-6, AT-7, AT-8** — full
tables, not samples.
**AC:** AT-6…AT-8 pass; 4x3 null-map behavior matches §6.4.

**T4.4 — Export dialog + renderers**
Per-merge (and per single art slot) export: shows pieces + assembly plan, per-strip whole-vs-split
choice where variants exist, 3 mm bleed toggle, effective-DPI warning below 300, then renders
PDF (primary, exact-cm trim + crop marks + piece labels + "print at 100%" note) and PNG 300 DPI
(secondary). Card images never render into print exports.
**AC:** exported PDF for a 2×2 merge measures exactly 14 × 19 cm trim in a PDF reader; piece
files carry correct labels; variant choice changes output; DPI warning fires on a small source.

**T4.5 — Calibration sheet**
Static PDF: 10 cm ruler both axes, a 7 × 9.5 cm reference rectangle, print-settings instructions.
Downloadable from the export dialog.
**AC:** PDF's rectangle measures exactly 7 × 9.5 cm in-reader.
**GATE 3 (Jacob):** print the calibration sheet + one real merged-art export; verify with a ruler.

**T4.6 — Ownership badge**
Owned/wanted toggle on card placements (cozy badge, not inventory UI); per-spread "what I still
need" view listing wanted cards.
**AC:** badge persists; need view filters correctly; badge absent on art placements.

**T4.7 — Pull list export**
Per spread/binder: slot-by-slot checklist — card name/set/number, ownership status, custom-art
slots with their export piece counts + assembly notes (from `split.ts` annotations). Output:
printable token-styled view + PDF.
**AC:** AT-11 passes; pull list for AT-6's full-page-3x3 case reads "split into 6 pieces (rows
can be threaded whole)".

**T4.8 — Art starter packs**
`public/art-packs/` manifest + 2–3 packs of CC0 art (textures, botanicals, vintage illustrations;
placeholder-quality acceptable — Jacob curates later), browsable in the media section, insertable
like uploads. `docs/art-sources.md` documents every source + license.
**AC:** pack art places + crops like uploads; every item has a documented CC0 source.

## M5 — Accounts + gating + templates + share + vibe search

**T5.1 — Supabase setup**
Create migrations (data-model §5 schema + RLS + triggers), configure Auth (email magic link +
Google), private Storage bucket for media originals. Seed nothing (card data is static).
**AC:** migrations apply cleanly; RLS test proves user A cannot read/write user B's rows; auth
round-trip works locally.

**T5.2 — Supabase adapter + autosave**
`SupabaseAdapter` implementing the same interface as playground; debounced (~1 s) autosave,
optimistic UI, cozy "saved" indicator, graceful offline/error states (retry, never silent loss).
AT-3 contract suite runs against it (test project or local Supabase).
**AC:** AT-3 passes on this adapter; kill-network mid-edit surfaces a recoverable state, no data
loss after reconnect.

**T5.3 — Gating + playground migration**
Anonymous = exactly one playground page (local), with a warm save prompt at the right moments
(attempting a second page, leaving with unsaved work). Signup migrates the playground into the
user's first binder per AT-10; local cleared only after server confirm. Replace T3.3's dev gate
with the real check: the shelf requires a session; anonymous users are always routed to
landing/playground, never the shelf.
**AC:** AT-10 passes; anonymous user can never create a second page but is invited to sign up;
post-signup the playground page appears in their binder pixel-identical; anonymous shelf visit
redirects to landing in all builds.

**T5.4 — Templates + starter binder**
Versioned JSON template format (serialized shapes, cards + pack art only). **Template JSON must be
fully self-contained for rendering** — embed each card's display data (name, set, number, image
URL) alongside its `card_id` — because the landing page renders the starter binder and must never
trigger a `cards-index.json` load (AT-9). Draft ~5 starter-binder spreads + ~5 standalone
templates (Jacob curates/replaces content later — flag them as drafts). Landing shows the starter
binder as the flip showcase; "start from scratch or clone this page" creates an editable copy
(into playground when anonymous).
**AC:** cloning yields an editable copy incl. merges/transforms; landing flip shows the starter
binder with zero requests to `cards-index.json` — AT-9 re-verified after this task; templates
browsable from binder creation.

**T5.5 — Image proxy + share-as-image**
`/api/card-image` (allowlist `images.pokemontcg.io` only, long cache headers). Share export:
compose the spread beauty shot (binder frame, tokens, textures) on canvas via the proxy →
1080 × 1350 PNG download (portrait, IG/TikTok-friendly).
**AC:** share PNG downloads with hotlinked card art rendered (no tainted-canvas error); proxy
rejects non-allowlisted hosts with 400.

**T5.6 — Vibe search**
Full-catalog color run (requires GATE 2 OK) merged into the index. Vibe tab: color search
(hue-proximity ranking on dominant colors), species/artist entry points, and 6–10 curated theme
collections (JSON manifest — Jacob authors content; agent ships format + 2 examples), each with
example cards and an example page.
**AC:** picking a pink swatch returns predominantly pink cards across sets; theme collections
render; species/artist vibes link into normal search.

**T5.7 — Activation flow + E2E**
Polish Key Flow 1 end-to-end: landing → flip starter binder → clone/scratch → playground edit →
save prompt → signup → full binder. Playwright E2E for: activation flow, place+merge+export
happy path, share export.
**AC:** E2E suite green; a cold-start walkthrough (Jacob) reaches a designed spread in < 10 min.

**T5.8 — Low-end verification + perf pass**
Test 2D fallback on a genuinely weak device/profile (CPU-throttled + low-end laptop), fix jank,
confirm auto-degrade triggers appropriately. Lighthouse pass on landing (no index download,
image lazy-loading).
**AC:** operational-checklist item "2D fallback tested on a low-end device" is demonstrably done
(notes + numbers in the PR); landing makes no card-index request (AT-9 re-verified).

**GATE 4 (Jacob):** V1 review against PRD Goals. Then the weekly-iteration punch list begins.

---

## P0/P1 traceability

| PRD feature | Tasks |
| --- | --- |
| P0-1 Binder & page management | T3.3, T3.4, T3.8 |
| P0-2 Spread editor + merged slots | T3.1, T3.5, T3.6 |
| P0-3 Card search & filtering | T2.1, T2.2, T2.3 |
| P0-4 2.5/3D binder + flip + 2D fallback | T1.3, T1.4, T3.4, T5.8 |
| P0-5 Media editor + print-true export | T4.1–T4.5 |
| P0-6 Accounts + save + gate | T5.1, T5.2, T5.3 |
| P0-7 Templates & starter binder | T5.4 |
| P1-1 Vibe/theme search | T2.4, T5.6 |
| P1-2 Ownership badge | T4.6 |
| P1-3 Share as image | T5.5 |
| P1-4 Pull list export | T4.7 |
| P1-5 Art starter packs | T4.8 |
| P1-6 Destructive-action safeguards | T3.7, T3.8 |

## Jacob's inputs along the way (so nothing stalls)

1. **Gate 1:** approve tokens + flip feel (end of M1).
2. **Gate 2:** eyeball color clusters (end of M2).
3. **Before M3:** measure the 4x3 insertion map (safe default exists if late).
4. **Gate 3:** print + ruler-verify calibration sheet and one export (mid-M4).
5. **M5 content pass:** curate templates/starter spreads, theme collections, art packs.
6. **Gate 4:** V1 review.
