# Card GB Rebuild — Plan

**Branch:** `fable/michi-card-gb-rebuild`, based on `cursor/v1-unattended-scaffold-9ebb`
**Goal:** keep the tested product logic, rebuild the interface around a visual system
descended from the Pokémon Card GB album screens, and leave one finished vertical slice.

This is the plan the run actually followed. It was written alongside the work, not before it,
so the ordering reflects what the audit found rather than a guess made up front.

---

## 1. What the rebuild is for

`docs/rebuild-face.md` on `main` records the course correction: the unattended V1 produced a
working brain and a failed face, and two visual directions were rejected. This run answers the
open question in that file — the direction — and rebuilds only the face against it.

The functional brief does not change. It is still the Michi Method design studio from
`docs/PRD.md`: compose a spread across facing pages, merge pockets, and print art that fits
7 × 9.5 cm side-loading pockets at 300 DPI. Still no pricing, inventory, or community backend.

## 2. The visual direction, and why these rules

The references are Card GB album screens. What was taken from them is structure, not pixels:

| From the reference | How it is built here |
| --- | --- |
| Framed list panel with a title strip and a right-aligned counter | `.gb-panel` + `.gb-strip`, used for every grouping in the app |
| The `▶` cursor marking the active row | `.gb-row::before`, a caret in a fixed gutter so rows never shift |
| The bottom prompt box: "VIEW WHICH CARD FILE?" | `.gb-prompt`, one fixed place that says what the app wants next |
| Indexed entries, "A01 … 56/56", "ALBUM 51/226" | `.gb-index`, `.gb-num`, `.gb-stat` with dotted leaders |
| Hard black outlines and stepped geometry | 1px ink borders, `--shadow-step` offset blocks, 1–4px radii |

Explicitly not taken: no pixel font for body text, no emulator chrome, no screenshot assets, no
character or logo artwork. The retro register is confined to micro-labels, counters, markers and
geometry. Body text is a platform sans at a normal reading size.

The palette is warm white, pale gray, near-black ink, and three accents with one job each:
muted red for the primary action and the selection caret, teal for confirmed and owned, blue for
informational and merged. Colour never carries state alone — every state also changes shape,
glyph or weight.

The binder is the one place with real material depth, because it is the one thing that is
supposed to read as a physical object rather than as interface.

## 3. Phases

**Phase 1 — Audit.** Install, run every defined check, record the failures, trace the P0
journey through the shipped code, and write `docs/CARD_GB_REBUILD_AUDIT.md`. Decide what is
preserved, fixed, rebuilt, removed and deferred before touching anything.

**Phase 2 — Foundation.** Replace `src/styles/tokens.css` with the Card GB system. Build the
four primitives everything else sits on: `Panel`, `Marker`, `PromptStrip`, and a `Dialog` that
is actually modal. Add `CardImage` with a real failure path. Rewrite `binder.css` so binder
proportions derive from `LAYOUTS` and `SLOT_CM` instead of a hardcoded ratio. Rebuild
`/dev/styleguide` as the source of truth and screenshot it before going further.

**Phase 3 — The slice.** Landing through print, in one pass:

1. Landing opens on a real facing spread from the starter binder, with one dominant action.
2. Application shell: binder centred, tools left, contextual properties right, status below.
3. Binder navigation: position always visible, 2D fallback a visible persisted choice.
4. Search: name first, filters behind a disclosure, click-to-place as the reliable path.
5. Selection and merging: caret plus outline plus ground, merge offered only when valid,
   invalid selections explained in plain words.
6. Art: discoverable without dominating, non-destructive crop preserved.
7. Print: one dialog from the header covering art, calibration, pull list and share.
8. Undo across every edit, plus real empty, loading, error, offline and saved states.

**Phase 4 — Drive it and fix what breaks.** Run the journey repeatedly in a real browser, fix
what that turns up, and convert the journey into automated Playwright coverage.

**Phase 5 — Evidence.** Re-run everything, record exact counts, capture the screenshot set,
write the review and case study, commit, push, open the pull request.

## 4. What is preserved

Untouched: `src/domain/*` (slot model, split algorithm, print math, crop, layouts, pull list,
serialisation), `src/search/*`, `src/media/*`, `src/persistence/*`, `src/state/saveQueue.ts`,
`src/export/calibration.ts`, `cardImageAllowlist.ts`, `shareImage.ts`, `public/data/*`,
`supabase/*`, and the acceptance tests AT-1 to AT-11.

Two files inside preserved modules are changed, as bug fixes only, both covered by new tests:

- `src/export/artPdf.ts` — embeds the artwork and honours bleed. All geometry still comes from
  `domain/print.ts`; the module only draws into trim boxes it is given.
- `src/templates/clone.ts` — the target binder id is now a required argument.

## 5. What is removed, and why

- Fraunces and Nunito, with the `next/font/google` build-time network fetch. Both faces are
  rejected by the brief and the dependency broke the build outright.
- `FlipBinder`, `Binder2D`, `BinderPrototype`, `dummyPages`, `templates/showcase` — replaced by
  one `BinderViewer` that serves both render modes and both the product and the prototype
  route, so they cannot drift apart.
- `ExportDialog` — replaced by `PrintDialog`, reachable from the header.
- "Swap last two pages", a development control that shipped in the editor.
- Paper-grain, linen and pressed-leaf decoration from the interface chrome. The art-pack files
  stay: they are user-selectable content, and they are now labelled as placeholders.

## 6. Decisions taken during the run

Recorded here rather than left implicit. Each one was the simplest choice that supports P0.

1. **Card GB supersedes the PRD's scrapbook execution, not its intent.** The PRD's binding
   requirement — cozy, nostalgic, tactile, explicitly not corporate SaaS — is met. Its
   suggested execution is superseded by `rebuild-face.md` and the references for this run.
2. **No webfonts.** The build must not depend on a font server.
3. **Binder proportions derive from pocket geometry.** One formula, every layout correct.
4. **The editor defaults to 2D; the landing offers the 3D turn.** Precision editing should
   never wait on an animation. The fallback is a visible, persisted choice.
5. **Shift opts out of card dragging.** Dragging a card moves it, which means dnd-kit captures
   the pointer and block selection could not start on a full pocket. Shift-drag always selects.
6. **The playground is one page in single-page mode.** The anonymous gate allows one page, so a
   facing pair would leave half the binder permanently blank. Facing spreads are shown on the
   landing, where there are pages to face.
7. **Sign-in says it is off rather than failing silently** when Supabase keys are absent.
8. **Print accuracy is labelled as unverified.** The files are exact; no printer was measured.
9. **Card art falls back to a typed stand-in.** Images are hotlinked, which the PRD already
   flags as a risk, and they are unreachable offline.
10. **The starter binder's showcase pair was filled in** from the existing catalog, and its
    2 × 2 pocket left empty and labelled with its print size. No new art packs or templates.

## 7. Out of scope

Live Supabase provisioning, production auth providers, rebuilding the card catalog, new
templates or art packs, WebGL, a full mobile editor, broad performance work, and any
architecture change unrelated to the selected workflow.
