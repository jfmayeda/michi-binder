# Unattended execution log

Jacob approved `docs/plan.md` on 2026-08-14 and is unavailable. This run overrides
AGENTS.md only to skip asking Jacob and skip Gates 1–4. Every other rule still binds.

Assumptions, skipped gates, BLOCKED tasks, and unverified items are appended here as
work proceeds.

## Assumptions

- **T1.1 scaffold location:** repo root *is* `apps/michi-binder` (prompt instruction).
  `app/` lives at the repository root; `src/` holds domain/search/persistence/state/components/styles.
- **Import alias:** `@/*` maps to `./src/*` so domain code imports as `@/domain/...`.
- **Script runner:** Node 22 `--experimental-strip-types` instead of adding unapproved `tsx`.
- **Next.js version:** latest stable at scaffold time (16.3.1) with React 19 and Tailwind v4.
- **T2.3 virtualization:** no virtualizer on the approved dependency list — shipped a small in-house `VirtualGrid` (windowed rows, no extra package).
- **T2.3 facets:** type is chips; set / species / artist / rarity / era are token-styled `<select>`s because those lists are hundreds of values.

## Skipped gates

### Gate 1 — tokens + flip feel (2026-08-15, unattended)

Did not stop. Judgment: `/dev/styleguide` is warm paper + one clay accent, Fraunces display / Nunito body, linen + grain textures, paper easings. `/dev/flip` CSS 3D turns leaves around the spine; `/dev/flip?lowperf=1` is a first-class 2D slide/crossfade. Kept CSS 3D AND 2D fallback (D3). No WebGL.

### Safari backface

Cloud is Linux/Chrome. **Safari unverified.**

### Gate 2 — color clusters (2026-08-15, unattended)

Did not stop. `/dev/color-check` on base1: Squirtle/Blastoise land in Blue; Charmander/Charizard in Orange/Red; Pikachu in Yellow. A few frame-color misses (Chansey/Clefairy in Blue, Staryu in Yellow) — overall sane enough to authorize the T5.6 full-catalog run. 4x3 insertion map still unverified; safe-split default stands.

## BLOCKED

_(none yet)_

## Unverified

- Gate 1 physical “does it feel like paper on Jacob’s machine / 60 fps” — Chrome in Cloud looked smooth; no DevTools performance profile attached.
- Safari backface-visibility.

## Assumptions (continued)

- **T3.5 single-page chrome:** binders in `pageMode: 'single'` show one leaf (no spine), using existing binder tokens. Double mode keeps the facing-spread book from T3.4. Drop targets are per-cell droppables (grid-snapped); no extra snap-to-grid library.
