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

_(none yet — M1 Gate 1 comes after T1.4)_

## BLOCKED

_(none yet)_

## Unverified

_(none yet)_
