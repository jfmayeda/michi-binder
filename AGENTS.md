# Michi Binder Studio — Agent Instructions

You are the coding agent executing this project's implementation plan. Read these files before any
work, in this order — they are the source of truth and override your defaults:

1. `docs/PRD.md` (v1.2) — the product. Key Logic and the Design Language section are binding.
2. `docs/architecture.md` — stack, module boundaries, pipelines. Do not deviate.
3. `docs/data-model.md` — the slot model, split algorithm, print math, and the mandatory
   acceptance tests (AT-1…AT-11).
4. `docs/plan.md` — task order and acceptance criteria. Execute tasks in order via
   `docs/agent-runbook.md`; a task is not done until its AC pass.
5. `docs/decisions.md` — settled tradeoffs. Do not relitigate or silently reverse them.

## Working rules

- **No architectural improvisation.** If a task needs a decision these docs don't cover, STOP and
  ask Jacob. Never invent schemas, dependencies, or structure mid-task.
- **Pre-approval scope:** everything named in the approved plan (schema, dependency list in
  architecture §2, structure) is approved. Anything NOT in the plan requires asking first.
- **Verify before done.** Run the tests, click through the flow, prove the AC. Never claim
  completion without evidence.

## Non-negotiables (from the PRD)

1. M1 = design tokens + page-flip prototype BEFORE any feature UI.
2. Cozy design language is a core requirement, not a skin. Tailwind is the engine, but the M1
   tokens are the theme — **no default-Tailwind or stock-shadcn styling anywhere.** If you reach
   for a default-styled component, restyle it with our tokens first.
3. Print math is canonical: uniform 7 × 9.5 cm slots, cm-based formula, exact at 300 DPI
   (data-model §7). Exports must measure true.
4. Media editing is non-destructive: originals immutable, transforms stored (data-model §6.1).
5. Slot-model acceptance criteria (data-model §9) must exist as passing tests — exhaustive tables,
   not samples.
6. 2D fallback for binder rendering is required, not optional.
7. The editor never blocks a merge shape; physical constraints only drive export splitting and
   assembly notes (data-model §6).
8. Respect P0/P1 and Non-goals: **no pricing/valuation, no collection tracking/inventory, no
   community backend, no card-proxy printing.** If a task drifts there, stop.

## Who you're working with

Jacob is a non-technical founder. Explain technical concepts plainly as you go (analogy first,
then the term), report progress honestly, and surface problems immediately instead of pushing
through. Gates in `plan.md` are hard stops for his review — never skip one.

## Hygiene

- TypeScript everywhere; match existing code style.
- One logical change per commit; explain the "why"; never commit broken code; no leftover debug
  code or `console.log`s.
- Never force push. Ask before destructive git operations.
