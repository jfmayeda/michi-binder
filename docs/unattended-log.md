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

## Skipped gates

### Gate 1 — tokens + flip feel (2026-08-15, unattended)

Did not stop. Judgment: `/dev/styleguide` is warm paper + one clay accent, Fraunces display / Nunito body, linen + grain textures, paper easings. `/dev/flip` CSS 3D turns leaves around the spine; `/dev/flip?lowperf=1` is a first-class 2D slide/crossfade. Kept CSS 3D AND 2D fallback (D3). No WebGL.

### Safari backface

Cloud is Linux/Chrome. **Safari unverified.**

## BLOCKED

_(none yet)_

## Unverified

- Gate 1 physical “does it feel like paper on Jacob’s machine / 60 fps” — Chrome in Cloud looked smooth; no DevTools performance profile attached.
- Safari backface-visibility.
