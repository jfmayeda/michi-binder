# Michi Binder Studio — Agent Runbook

**For:** Jacob, feeding tasks to the coding agent (GPT 5.6 Sol in Cursor), one at a time, in order.
**Derived from:** `docs/plan.md` (approved Jul 11, 2026) — if this file and plan.md ever disagree,
plan.md wins and this file needs regenerating.

## How to use this runbook

1. Feed **one prompt per task**, in order. Don't feed the next prompt until the current task's
   "Verify before moving on" checklist passes.
2. Every prompt assumes the agent has read `AGENTS.md` (Cursor picks it up automatically). If the
   agent seems unaware of the docs, prepend: *"Read AGENTS.md and every doc it lists, in order,
   before doing anything."*
3. **Gates are for you, not the agent.** When you hit one, do the checklist yourself before
   continuing.
4. If the agent asks a question the docs don't answer, or something goes sideways twice in a row
   on the same task — stop. That's a re-planning conversation (bring it back to Fable), not
   something to push through.
5. Each "Verify" section only uses things you can do: run a command, open a page, click, measure.
   If a verify step fails, tell the agent exactly which step failed and what you saw.

---

## Milestone 1 — Design tokens + page-flip prototype

### Prompt 1 (T1.1 — Scaffold)

> Execute task T1.1 from `docs/plan.md`. Scaffold the Next.js app (App Router, TypeScript,
> Tailwind v4) directly in this repo root (`apps/michi-binder`), matching the repository layout in
> `docs/architecture.md` §9 exactly — including empty `src/domain`, `src/search`,
> `src/persistence`, `src/state`, `src/components`, `src/styles`, `scripts`, `public/data`,
> `public/art-packs`, `supabase/migrations`, and `e2e` directories with placeholder README or
> index files. Wire Vitest with one passing sample test in `src/domain`, ESLint + Prettier, and a
> `/dev` route group that is excluded from production builds. Install only dependencies from the
> pre-approved list in architecture §2.
>
> Acceptance criteria: `npm run dev` serves; `npm test` passes; `npm run build` succeeds;
> directory layout matches architecture §9; a `/dev` page 404s in a production build but renders
> in dev. Show me the command output proving each.

**Verify before moving on:**
- [ ] Run `npm run dev` → app loads at localhost:3000 without errors.
- [ ] Run `npm test` → 1 test passes.
- [ ] Run `npm run build` → completes without errors.
- [ ] Folder structure matches `architecture.md` §9 at a glance.

### Prompt 2 (T1.2 — Design tokens + styleguide)

> Execute task T1.2 from `docs/plan.md`. Define the cozy design tokens as Tailwind v4 `@theme` CSS
> variables in `src/styles/tokens.css`: a warm paper-tone palette plus ONE accent color; a
> friendly display face paired with a readable body font (loaded via `next/font`); spacing,
> radius, and shadow scales (soft, layered — never crisp corporate); paper/linen texture assets;
> and motion tokens (durations + easing curves modeled on real paper movement). Follow the PRD's
> Design Language section and its moodboard references (Animal Crossing / Stardew menus,
> scrapbook/stationery textures, vintage Pokémon print materials). Build `/dev/styleguide`
> showing every color token with its name, type specimens, texture swatches, spacing/radius/shadow
> scales, and a live demo of each motion curve.
>
> Acceptance criteria: the styleguide renders every token; NO raw Tailwind default color classes
> (e.g. `bg-blue-500`) exist anywhere in the codebase (grep and show me); tokens are referenced by
> semantic name so palette swaps are one-line changes.

**Verify before moving on:**
- [ ] Open `/dev/styleguide` — does it feel cozy/scrapbook, not SaaS? Trust your gut; request
      swaps by token name until it does. (This page is your design contract for everything after.)
- [ ] Ask the agent to grep for default Tailwind colors and show zero hits.

### Prompt 3 (T1.3 — Page-flip prototype)

> Execute task T1.3 from `docs/plan.md`. Build `/dev/flip`: a binder with 6 dummy pages using
> CSS 3D transforms — perspective, rotating page halves, a 2.5D paper-bend illusion via layered
> gradients, and a soft dynamic shadow — using ONLY the M1 motion tokens for easing/duration.
> Flips driven three ways: click on a page edge, left/right arrow keys, and pointer drag (the page
> must track the pointer mid-flip). Use compositor-friendly CSS transitions/keyframes on
> `transform`, never per-frame JavaScript style writes. Verify `backface-visibility` renders
> correctly in both Chrome and Safari — JS-applied 3D transforms have known backface quirks.
> Do NOT reach for three.js/WebGL; if CSS 3D cannot hit a steady 60 fps, stop and report — that
> decision escalates to Jacob (decisions.md D3).
>
> Acceptance criteria: steady 60 fps flips (show me a DevTools performance recording summary);
> no backface glitches in Chrome and Safari; drag-to-flip tracks the pointer; all motion comes
> from tokens.

**Verify before moving on:**
- [ ] Open `/dev/flip`, flip with click, arrows, and drag. Does it feel like paper? This is the
      product's signature — be picky now, it's cheap to iterate here.
- [ ] Flip fast repeatedly — no stutter, no white flashes, no mirrored/ghost page faces.
- [ ] If you have access to Safari (or ask a friend), check there too.

### Prompt 4 (T1.4 — Perf detection + 2D fallback)

> Execute task T1.4 from `docs/plan.md`. Add a frame-time probe that samples frame durations
> during the first flip; if the device can't sustain smooth flipping, automatically switch to the
> 2D mode: a flat spread view with a slide/crossfade page transition using the same tokens. Add a
> manual 3D/2D toggle, persisted per device in localStorage. The 2D mode is a first-class
> experience, not a degraded afterthought. Provide a dev-only override (query param or dev menu)
> to force low-perf mode for testing. If you add any Playwright frame-timing test, it MUST live in
> its own Playwright project with `dependencies` on the other projects so it runs alone
> (decisions.md D21) — never loosen a perf threshold to fix a flake.
>
> Acceptance criteria: forcing the low-perf flag renders 2D automatically; the toggle switches
> modes live and persists across reload; 2D mode supports everything 3D does.

**Verify before moving on:**
- [ ] Force low-perf mode (agent will tell you how) → 2D appears, still looks cozy.
- [ ] Toggle 3D↔2D, reload — choice sticks.

### 🚧 GATE 1 — your sign-off (do not proceed to M2 without it)

- [ ] Tokens approved: `/dev/styleguide` feels like the hobby.
- [ ] Flip approved: `/dev/flip` feels like real paper at 60 fps, or the 2D fallback story
      satisfies you.
- [ ] If CSS 3D failed: bring the WebGL question back to Fable before any escalation.

---

## Milestone 2 — Card data + search

### Prompt 5 (T2.1 — Data sync script)

> Execute task T2.1 from `docs/plan.md`. Write `scripts/sync-card-data.ts` per
> `docs/architecture.md` §3: download the pokemon-tcg-data GitHub repo tarball, strip cards to
> search-relevant fields, and generate `public/data/cards-index.json` (columnar arrays: id, name,
> set id, number, rarity, artist, types, national dex numbers, era = the dataset's `series`
> field), `public/data/sets.json`, `public/data/dex-species.json`, and an image-URL exceptions
> map (URLs are derived from the documented `images.pokemontcg.io` pattern; the script verifies
> the pattern per card and records deviations). Output must be deterministic — stable ordering,
> no timestamps. Write `docs/data-sync.md` documenting the full re-sync procedure: when a set
> releases → run script → review diff → eyeball new cards in the app → commit.
>
> Acceptance criteria: script runs end-to-end; running it twice produces zero diff; index ≤ 6 MB
> raw; every facet field populated (spot-check counts per facet); `docs/data-sync.md` exists with
> the complete procedure. Show me the file sizes and a sample of the generated data.

**Verify before moving on:**
- [ ] Ask the agent to run the script twice and show `git status` — second run changes nothing.
- [ ] Open `docs/data-sync.md` — could YOU follow it in six months? If not, ask for plainer steps.

### Prompt 6 (T2.2 — Client search module)

> Execute task T2.2 from `docs/plan.md`. Build `src/search/`: a lazy index loader that fetches
> `cards-index.json` on FIRST search interaction, with an idle prefetch permitted only after the
> binder's first flip is interactive — never on landing render (this is acceptance test AT-9 in
> `docs/data-model.md` §9; write it now). MiniSearch handles fuzzy name/artist text; facet filters
> (set, species, type, artist, rarity, era) are plain array scans; text + facets compose.
>
> Acceptance criteria: AT-9 passes as an automated test; unit tests cover each facet alone and
> text+facet combinations; post-load query latency < 50 ms for representative queries (show
> measurements).

**Verify before moving on:**
- [ ] `npm test` green, including AT-9.
- [ ] Open the app with DevTools Network tab: on landing, no `cards-index.json` request; it
      appears only when you search.

### Prompt 7 (T2.3 — Search panel UI)

> Execute task T2.3 from `docs/plan.md`. Build the studio's search panel using ONLY the M1
> tokens: search box, facet filter chips (set, species, type, artist, rarity, era), a virtualized
> results grid of hotlinked, lazy-loaded card thumbnails, and cozy empty/loading states (warm
> copy, not "No results found."). Result cards must be draggable sources (dnd-kit) — slot drop
> targets arrive in M3, so for now they only need to render and begin a drag. Keyboard navigation
> throughout.
>
> Acceptance criteria: "Pikachu" + a set filter returns correct cards; thumbnails lazy-load
> (verify off-screen images don't fetch); panel fully keyboard-navigable; zero non-token styling.

**Verify before moving on:**
- [ ] Search a few favorites — right cards, right sets, fast after first load.
- [ ] Does the panel look like it belongs beside the styleguide? No corporate seams.

### Prompt 8 (T2.4 — Color pipeline on ONE set)

> Execute task T2.4 from `docs/plan.md`. Write `scripts/extract-colors.ts` per architecture §3:
> for each card in a single named set (default `base1`), fetch the small art image, downscale to
> ~64 px with sharp, k-means cluster in OKLab, keep the top 4 colors with coverage weights,
> suppressing near-white/near-black borders. Output `public/data/colors.json` for that set only.
> Build `/dev/color-check` rendering the set's cards grouped by dominant hue. Do NOT run the full
> catalog — that is gated on Jacob's eyeball review (Gate 2) and happens in T5.6.
>
> Acceptance criteria: script is re-runnable per set with stable output; `/dev/color-check`
> renders the set grouped by hue; sanity holds (water Pokémon cluster blue, fire cluster
> red/orange).

**Verify before moving on:**
- [ ] Open `/dev/color-check` and eyeball: do the groupings match your intuition of each card?

### 🚧 GATE 2 — your sign-off

- [ ] Color clusters look right on the test set. (This OK is what later authorizes the
      full-catalog run inside T5.6.) If they look off, describe which cards landed wrong — tuning
      happens now, on one set, not on 20,000 cards.
- [ ] **Also start now:** measure the 4x3 page's per-column insertion directions on a real page
      (which side each column's pocket opens toward). Needed before M3 ends; the safe-split
      default covers you if late.

---

## Milestone 3 — Binder/page CRUD + spread editor + slot model

### Prompt 9 (T3.1 — Domain slot module + acceptance tests)

> Execute task T3.1 from `docs/plan.md`. Implement `src/domain/` as PURE TypeScript (zero
> React/DOM/Supabase imports — add a lint rule enforcing this): `layouts.ts` with the LAYOUTS
> config and derived seam rule exactly as `docs/data-model.md` §2 (insertion maps as data; seam
> open iff adjacent columns share direction; 4x3 map is null); `slots.ts` with merge validation,
> placements, facing pairs ((2,3),(4,5)… — page 1 alone on the right), and unmerge; `split.ts`
> with piece computation and assembly annotations per data-model §6.2–6.4 (gutter and row splits
> mandatory; sealed column seams split by default with whole-strip variants; null map = every
> column seam sealed, no variants); and serialization matching the §5 schema shapes. Write
> acceptance tests AT-1 through AT-5 from data-model §9 — the EXHAUSTIVE matrices (every layout ×
> every merge shape), not samples. The 2x2-vs-3x3 divergence in AT-6's table must fall out of the
> seam rule, not special cases — you'll prove that in T4.3, but the rule lands here.
>
> Acceptance criteria: AT-1…AT-5 pass; lint rule proves domain purity; test count reflects
> exhaustive enumeration (report how many cases ran).

**Verify before moving on:**
- [ ] `npm test` green; ask the agent how many merge-shape cases AT-1/AT-3 enumerated (should be
      hundreds, not a dozen).

### Prompt 10 (T3.2 — Playground persistence adapter)

> Execute task T3.2 from `docs/plan.md`. Define the persistence adapter interface in
> `src/persistence/` (it will later have a Supabase twin — see architecture §8) and implement
> `PlaygroundAdapter`: binder/page/merge/placement structure in localStorage, media blobs in
> IndexedDB (`idb`), debounced writes. Run the AT-3 round-trip suite through this adapter as the
> adapter contract test.
>
> Acceptance criteria: AT-3 passes via the adapter; hard-reloading the browser restores exact
> editor state.

**Verify before moving on:**
- [ ] Agent demonstrates: edit → hard reload → identical state.

### Prompt 11 (T3.3 — Binder shelf)

> Execute task T3.3 from `docs/plan.md`. Build the token-styled binder shelf (home): binders
> displayed as cozy spines/covers; create (picking layout 2x2/3x3/4x3/4x4 + page mode
> single/double — both FIXED after creation, per decisions.md D7), rename, delete (confirm+undo
> pattern; a stub is acceptable until T3.7 lands, then wire it).
> IMPORTANT scope rule: **the shelf is an authed-only surface in production.** Anonymous users
> only ever see landing + playground. Multi-binder support in the playground adapter exists purely
> for M3/M4 development convenience. Gate the shelf route NOW: production builds redirect
> unauthenticated visitors to landing; `npm run dev` allows access. T5.3 replaces this gate with
> the real session check — leave a clearly marked TODO pointing at T5.3.
>
> Acceptance criteria: full CRUD persists via the adapter; creation flow enforces fixed
> layout/mode; production build redirects shelf visits to landing while dev allows them (prove
> both).

**Verify before moving on:**
- [ ] Create/rename/delete binders in dev — all persist across reload.
- [ ] Agent proves the production redirect (build + visit).

### Prompt 12 (T3.4 — Page management in the binder view)

> Execute task T3.4 from `docs/plan.md`. Inside a binder, integrate page management with the M1
> binder rendering — BOTH 3D flip and 2D fallback: add page, delete page (safeguard pattern),
> drag-reorder via a page-thumbnail strip, and navigation where flipping and thumbnail clicks
> agree. Facing pairs per data-model §3: page 1 renders alone on the right; pairs are (2,3),
> (4,5)…; reordering resequences positions.
>
> Acceptance criteria: reorder persists and resequences; flip position and thumbnail selection
> never disagree; add/delete/reorder all work in both render modes.

**Verify before moving on:**
- [ ] Add ~6 pages, reorder, delete one, flip through — everything consistent, in 3D and 2D.
- [ ] Page 1 sits alone on the right when you open the binder.

### Prompt 13 (T3.5 — Placement interactions)

> Execute task T3.5 from `docs/plan.md`. Wire the search panel to the binder: drag a card from
> results into any slot (dnd-kit, grid-snapped), move a placement between slots, swap when
> dropping onto an occupied slot, remove a placement. Provide a click-to-place fallback
> (select card → click slot) for accessibility. Must work in single-page and double-page views.
> After interactions, domain state and visual grid must agree — add a round-trip spot-check test
> (serialize after a scripted interaction sequence, compare against expected model).
>
> Acceptance criteria: all four operations work in both views; occupied-slot drop swaps; state
> persists across reload; the interaction round-trip test passes.

**Verify before moving on:**
- [ ] Fill a 3x3 page by drag and by click-to-place; move, swap, remove; reload — all intact.
- [ ] Do it once in double-page view too.

### Prompt 14 (T3.6 — Merged slots UI)

> Execute task T3.6 from `docs/plan.md`. Cell multi-select (drag or shift-click) → merge, valid
> for ANY rectangle ≥ 2 cells on every layout — the editor never blocks a shape (PRD Key Logic).
> Cross-page merges in double-page mode only, anchored on the left page of a facing pair
> (data-model §4). Merged slots render as one large slot. EVERY merge displays its assembly
> annotation badge — "single insert" / "slide-through" / "split into N pieces" — computed by
> `split.ts`, never duplicated in UI code. Unmerge per AT-4: empty merges unmerge instantly;
> filled merges confirm + undo-toast, restoring merge AND placement on undo.
>
> Acceptance criteria: every row of AT-6's table in data-model §9 is reproducible by hand in the
> UI with the matching badge (walk me through 2x2 cols 0–1 showing "split into 2" vs 3x3 cols 0–1
> showing "slide-through"); cross-page merge works on pages (2,3) and is impossible in single
> mode; AT-4 behavior verified in the UI.

**Verify before moving on:**
- [ ] Make a 2-wide merge on columns 1–2 of a 2x2 page → badge says "split into 2 pieces".
- [ ] Same shape on columns 1–2 of a 3x3 page → badge says "slide-through". (This pair is the
      whole insertion-map model working.)
- [ ] Make a cross-page merge in double mode; confirm you can't in single mode.
- [ ] Unmerge a filled slot → confirm dialog → undo from toast brings everything back.

### Prompt 15 (T3.7 — Destructive-action safeguards)

> Execute task T3.7 from `docs/plan.md`. Build the shared token-styled `ConfirmWithUndoToast`
> pattern per architecture §5 (snapshot affected slice → confirm → apply → toast with Undo →
> restore on undo, finalize on expiry). Wire it to exactly: clear page, delete page, delete
> binder, unmerge-filled (replace T3.6's interim), and reserve the API the T3.8 mode switch will
> use. No general undo stack (decisions.md D14).
>
> Acceptance criteria: each wired operation prompts, applies, and toast-undo restores exactly;
> letting the toast expire finalizes; T3.3's delete stub is now the real pattern.

**Verify before moving on:**
- [ ] Clear a full page → undo → everything back, including merges and badges.
- [ ] Delete a binder → undo → back on the shelf.

### Prompt 16 (T3.8 — Double↔single mode switch)

> Execute task T3.8 from `docs/plan.md`. Implement the binder mode switch per AT-5: switching
> double→single on a binder with K cross-page merges prompts "this will unmerge K cross-page
> slots" through the T3.7 pattern; confirm removes exactly those merges and their placements;
> undo restores all; in-page merges untouched; single→double is silent.
>
> Acceptance criteria: AT-5 passes as an automated test AND end-to-end in the UI.

**Verify before moving on:**
- [ ] Binder with 2 cross-page merges + several in-page merges → switch to single → prompt says
      "2" → confirm → only those gone → undo → back.
- [ ] **Before M4:** if you've measured the 4x3 map, have the agent fill
      `LAYOUTS['4x3'].insertionMap` now (one line + re-run tests). If not, safe-split stands.

---

## Milestone 4 — Media editor + print export + calibration + pull list

### Prompt 17 (T4.1 — Media import + library)

> Execute task T4.1 from `docs/plan.md`. Media library in the studio: upload png/jpg/webp;
> originals stored IMMUTABLE via the adapter (IndexedDB for now; Supabase Storage arrives in
> M5 behind the same interface). Token-styled grid with previews and delete (safeguard pattern).
> Add a checksum test proving stored bytes are identical to the uploaded file.
>
> Acceptance criteria: checksum test passes; library lists/previews/deletes; originals survive
> any subsequent editing untouched.

**Verify before moving on:**
- [ ] Upload a few images, reload, delete one with undo — behaves like the rest of the app.

### Prompt 18 (T4.2 — Crop/fit editor)

> Execute task T4.2 from `docs/plan.md`. Modal crop editor for placing art into any slot or
> merge: crop window LOCKED to the slot's physical aspect ratio (colSpan×7 : rowSpan×9.5 —
> data-model §6.1), pan/zoom, rotate in 90° steps, saving a `Transform` (normalized crop rect +
> rotation) on the placement. Re-opening the editor restores the stored transform for
> re-editing. Art placement uses the same placement flow as cards. The renderer fills the slot
> exactly — never letterboxes.
>
> Acceptance criteria: transform round-trips through save/load; original file untouched
> (checksum still passes); re-edit shows the prior crop; aspect lock holds for every merge shape
> including cross-page.

**Verify before moving on:**
- [ ] Place art in a 2×2 merge, crop it, save, reopen — your crop is still there.
- [ ] Crop window resists being dragged to a wrong aspect.

### Prompt 19 (T4.3 — Print domain module)

> Execute task T4.3 from `docs/plan.md`. Implement `src/domain/print.ts` per data-model
> §6.2–§7: piece computation (gutter/row mandatory splits, sealed-seam column splits, whole-strip
> variants, null-map safe-split), physical dimensions from the cm formula (cm canonical —
> decisions.md D4), 3 mm bleed geometry (real neighboring art at seams, edge-replication at
> composition borders), and piece labels/registration metadata. Write acceptance tests AT-6
> (the FULL table from data-model §9, every row), AT-7 (px = round(cm×300/2.54), PDF points
> within 0.01 pt), and AT-8 (seam continuity pixel check). Pure TS, same lint rule as T3.1.
>
> Acceptance criteria: AT-6, AT-7, AT-8 pass; 4x3 null-map behavior matches data-model §6.4;
> the 2x2/3x3 divergence is asserted through one shared code path.

**Verify before moving on:**
- [ ] `npm test` green; ask the agent to paste the AT-6 test table output.

### Prompt 20 (T4.4 — Export dialog + renderers)

> Execute task T4.4 from `docs/plan.md`. Export dialog for any art merge or single art slot:
> shows the piece breakdown and assembly plan from `print.ts`; per-strip whole-vs-split choice
> where variants exist; 3 mm bleed toggle; effective-DPI warning when source art delivers < 300
> DPI at physical size (warn, never block). Renders: PDF primary via pdf-lib — page = trim +
> mark margin, trim box exact in points, corner crop marks, seam registration ticks, piece
> labels ("Piece 2/3 — right edge joins piece 3"), embedded "print at 100% scale" note — and
> PNG at 300 DPI with pHYs metadata, secondary. Card images must NEVER render into print exports
> (PRD legal line) — assert this in a test.
>
> Acceptance criteria: a 2×2-merge export measures exactly 14 × 19 cm trim in a PDF reader;
> variant choice changes the output files; DPI warning fires on a deliberately small source;
> the no-card-images test passes.

**Verify before moving on:**
- [ ] Export a 2×2 merge; open the PDF; use the reader's measure tool (or print later at Gate 3)
      to check 14 × 19 cm trim.
- [ ] Export a full-page 3x3 merge: 6 pieces by default; choosing "whole strips" yields 3.

### Prompt 21 (T4.5 — Calibration sheet)

> Execute task T4.5 from `docs/plan.md`. Generate the static calibration PDF: a 10 cm ruler on
> both axes, one 7 × 9.5 cm reference rectangle (the universal pocket size), and plain-English
> print instructions ("print at 100% / actual size; disable fit-to-page"). Downloadable from the
> export dialog.
>
> Acceptance criteria: the rectangle measures exactly 7 × 9.5 cm with the PDF reader's measure
> tool; instructions are readable by a non-technical user.

**Verify before moving on — this is 🚧 GATE 3 (your printer, your ruler):**
- [ ] Print the calibration sheet at 100%. Measure the ruler and rectangle with a real ruler.
- [ ] Print one real merged-art export and check it against a physical page/pocket.
- [ ] If measurements are off: first suspect printer settings (scaling), then bring numbers back
      to the agent. Do not continue M4 until a print measures true.

### Prompt 22 (T4.6 — Ownership badge)

> Execute task T4.6 from `docs/plan.md`. Owned/wanted toggle on CARD placements only — a cozy
> badge on the placement, absent on art. Per-spread "what I still need" view listing wanted
> cards. This is a badge, not inventory (PRD Non-goal guard): no counts, no values, no
> collection screens.
>
> Acceptance criteria: badge persists via adapter; the need view lists exactly the wanted cards
> of that spread; art placements can't be badged.

**Verify before moving on:**
- [ ] Badge a few cards, reload, check the need view.

### Prompt 23 (T4.7 — Pull list export)

> Execute task T4.7 from `docs/plan.md`. Per spread (and whole binder): the assembly checklist —
> every slot in reading order with card name/set/number and ownership status; custom-art slots
> show piece count + assembly note from `split.ts` annotations (e.g. "split into 6 pieces — rows
> can be threaded whole") and reference their export. Output: token-styled printable view + PDF.
> Write acceptance test AT-11 from data-model §9.
>
> Acceptance criteria: AT-11 passes; the full-page-3x3 case reads "split into 6 pieces (rows can
> be threaded whole)"; ownership statuses match the badges.

**Verify before moving on:**
- [ ] Generate a pull list for a spread you built — is it the checklist you'd actually take to
      your card boxes? If something's missing for real assembly, say so now.

### Prompt 24 (T4.8 — Art starter packs)

> Execute task T4.8 from `docs/plan.md`. Create `public/art-packs/` with a versioned manifest
> (stable item ids) and 2–3 packs of genuinely CC0/public-domain art (textures, botanicals,
> vintage illustrations) — placeholder quality is acceptable, Jacob curates later. Packs browse
> inside the media section and insert/crop exactly like uploads (placements use `pack_item_id`).
> Document EVERY item's source and license in `docs/art-sources.md` — no exceptions, this is a
> legal requirement (PRD Licensing).
>
> Acceptance criteria: pack art places and crops like uploads; every item has a documented CC0
> source in `docs/art-sources.md`.

**Verify before moving on:**
- [ ] Spot-check 3 random items in `docs/art-sources.md` — do the source links actually show
      CC0/public-domain?

---

## Milestone 5 — Accounts + gating + templates + share + vibe search

### Prompt 25 (T5.1 — Supabase setup)

> Execute task T5.1 from `docs/plan.md`. Create `supabase/migrations/` implementing the schema
> in `docs/data-model.md` §5 verbatim (tables, checks, partial unique index), owner-only RLS on
> every table using `user_id = (select auth.uid())` (never a policy that queries its own table),
> and the `binders.updated_at` trigger. Configure Supabase Auth: email magic link + Google
> OAuth, nothing else. Create a PRIVATE Storage bucket for media originals with owner-only
> access policies. Seed nothing — card data is static. Add the env vars to `.env.local.example`
> and tell Jacob exactly what to create in the Supabase dashboard (he'll do the dashboard steps).
>
> Acceptance criteria: migrations apply cleanly to a fresh project; an automated RLS test proves
> user A cannot read or write user B's rows in any table (and cannot access B's storage
> objects); local auth round-trip works.

**Verify before moving on:**
- [ ] Follow the agent's dashboard steps; log in with a magic link yourself.
- [ ] RLS test output shows cross-user access denied for every table.

### Prompt 26 (T5.2 — Supabase adapter + autosave)

> Execute task T5.2 from `docs/plan.md`. Implement `SupabaseAdapter` behind the exact interface
> from T3.2; media originals go to the Storage bucket. Debounced (~1 s) autosave with optimistic
> UI and a cozy "saved" indicator (a warm stamp, not a spinner). Graceful failure: on network
> loss, keep edits locally, surface a gentle retry state, and never lose data — recover cleanly
> on reconnect. Run the full AT-3 contract suite against this adapter (local Supabase or a test
> project).
>
> Acceptance criteria: AT-3 passes on the Supabase adapter; killing the network mid-edit then
> reconnecting loses nothing (demonstrate); the saved indicator reflects reality.

**Verify before moving on:**
- [ ] Edit while logged in, watch the saved stamp, reload — persisted.
- [ ] DevTools → Network → Offline mid-edit → back online → nothing lost.

### Prompt 27 (T5.3 — Gating + playground migration)

> Execute task T5.3 from `docs/plan.md`. Implement the access gate exactly per PRD Key Logic:
> anonymous users get ONE playground page (local only, playground adapter); warm, cozy save
> prompts at the right moments (trying to add a second page; leaving with unsaved work) — invite,
> don't nag. On signup, migrate the playground into the user's first binder per AT-10: serialize
> structure, upload media blobs to Storage, write rows, and clear local data ONLY after the
> server write is confirmed. This is the product's activation moment — losing any work here is a
> critical bug. Replace T3.3's dev gate with the real check (remove the TODO): the shelf requires
> a session in ALL builds; anonymous users are always routed to landing/playground, never the
> shelf.
>
> Acceptance criteria: AT-10 passes (structure, merges, transforms, ownership, and a
> Storage-hosted original all survive); anonymous users cannot create a second page but are
> invited to sign up; the migrated page renders pixel-identical; anonymous shelf visits redirect
> to landing in dev AND production.

**Verify before moving on:**
- [ ] In a private browser window: build a playground page with a merge + cropped upload + badges
      → sign up → it's all there in your first binder, identical.
- [ ] Still anonymous, try to visit the shelf URL directly → landing.

### Prompt 28 (T5.4 — Templates + starter binder)

> Execute task T5.4 from `docs/plan.md`. Define the versioned JSON template format: serialized
> binder/page/merge/placement shapes, cards and pack art only (never user uploads). CRITICAL
> (plan.md T5.4): templates must be FULLY SELF-CONTAINED for rendering — embed each card's
> display data (name, set, number, image URL) alongside its `card_id` — because the landing page
> renders the starter binder and must NEVER trigger a `cards-index.json` load. Extend the sync
> script to refresh embedded display data so templates can't rot. Draft ~5 starter-binder
> spreads + ~5 standalone templates (mark all as drafts — Jacob curates). Landing shows the
> starter binder as the flip showcase with "start from scratch or clone this page"; cloning
> creates an editable copy (into the playground when anonymous). After this task, RE-RUN AT-9
> and confirm it still passes with the starter binder on the landing page.
>
> Acceptance criteria: cloning yields an editable copy including merges and transforms; landing
> renders the starter binder with ZERO requests to `cards-index.json` (AT-9 re-verified — show
> the test run and a Network-tab screenshot); templates browsable from binder creation.

**Verify before moving on:**
- [ ] Open landing with DevTools Network: starter binder renders and flips; no
      `cards-index.json` request anywhere.
- [ ] Clone a starter page anonymously → it lands in your playground, editable.

### Prompt 29 (T5.5 — Image proxy + share-as-image)

> Execute task T5.5 from `docs/plan.md`. Build `/api/card-image?src=…`: fetches server-side and
> returns the image same-origin with long cache headers. STRICT allowlist: `images.pokemontcg.io`
> only — any other host gets 400 (this must not be an open proxy; write a test for the
> rejection). Then share-as-image: compose the spread beauty shot on canvas — binder frame,
> tokens, paper textures — loading card images through the proxy (canvas tainting is the reason
> the proxy exists), and download as 1080 × 1350 PNG. Browsing continues to hotlink directly;
> the proxy is for export/share only.
>
> Acceptance criteria: share PNG downloads with card art rendered (no SecurityError); proxy
> rejects non-allowlisted hosts with 400 (test passes); browsing paths still hotlink (verify in
> Network tab).

**Verify before moving on:**
- [ ] Share a spread with real cards → PNG downloads, looks like something you'd post.

### Prompt 30 (T5.6 — Vibe search)

> Execute task T5.6 from `docs/plan.md`. Gate 2 was approved on the single-set clusters, which
> authorizes this: run `extract-colors.ts` over the FULL catalog and merge `colors.json` into
> the index pipeline (respect the size budget; report final sizes). Build the vibe tab:
> color search (pick a swatch → rank by hue proximity over dominant colors), species and artist
> entry points linking into normal search, and curated theme collections from a JSON manifest —
> ship the format plus 2 example collections (Jacob authors the remaining 6–10, so make the
> manifest human-editable and document it: name, description, card ids, example page reference).
>
> Acceptance criteria: a pink swatch returns predominantly pink cards across sets; collections
> render with example cards and an example page; the manifest is documented well enough for
> Jacob to add a collection without help.

**Verify before moving on:**
- [ ] Try 3–4 color swatches — do results match the vibe?
- [ ] Add one theme collection yourself by editing the manifest. If you can't, the docs failed —
      send it back.

### Prompt 31 (T5.7 — Activation flow + E2E)

> Execute task T5.7 from `docs/plan.md`. Polish PRD Key Flow 1 end-to-end: landing → flip the
> starter binder → "start from scratch or clone this page" → edit the playground → save prompt →
> signup → full binder unlocked, with the cozy language everywhere (copy, transitions, empty
> states). Write Playwright E2E specs for: the activation flow, the design happy path
> (search → place → merge → art crop → print export), and share export. Remember decisions.md
> D21 if any perf assertions sneak in.
>
> Acceptance criteria: E2E suite green; every screen in the flow uses tokens (no default-styled
> stragglers); the flow has no dead ends (every state offers a next step).

**Verify before moving on:**
- [ ] Fresh private window, phone timer running: land → design a spread you like → signed up →
      saved. Under 10 minutes? That's the PRD's measurable goal — note your actual time.

### Prompt 32 (T5.8 — Low-end verification + perf pass)

> Execute task T5.8 from `docs/plan.md`. Verify the 2D fallback on genuinely weak hardware:
> Chrome DevTools CPU throttling (6×) AND, if available, a real low-end laptop. Confirm the
> auto-degrade probe triggers appropriately (not too eager on capable machines, not too late on
> weak ones), fix any jank in 2D mode, and run a Lighthouse pass on landing (confirm no card
> index download and image lazy-loading — AT-9 one final time). Record the numbers and settings
> in the PR description — the operational checklist item must be demonstrably done, not assumed.
>
> Acceptance criteria: throttled profile auto-switches to 2D and stays smooth; Lighthouse
> results recorded; AT-9 passes; PR contains the evidence.

**Verify before moving on:**
- [ ] If you have an older laptop, open the app on it: does it degrade gracefully to 2D and
      still feel cozy?

### 🚧 GATE 4 — V1 review (you + Fable)

- [ ] Walk the PRD Goals table: time-to-first-spread, activation gate, a printed export in your
      hands, and — the immeasurable one — does it feel like the hobby?
- [ ] Content pass: replace draft templates/starter spreads, author theme collections, curate
      art packs.
- [ ] Bring the punch list back to Fable for weekly-iteration planning.
