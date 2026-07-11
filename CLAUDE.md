# Michi Binder — Project Instructions

Read `docs/PRD.md` before any work in this app. It is the source of truth.
Once written, `docs/plan.md`, `docs/architecture.md`, `docs/data-model.md`,
and `docs/agent-runbook.md` govern implementation order.

## Overrides to workspace defaults
- **Styling**: Tailwind is the engine, but the PRD's Design Language section
  overrides all defaults. Custom design tokens (defined in M1) become the
  Tailwind theme. Do NOT use stock shadcn/ui styling — the cozy, nostalgic,
  scrapbook aesthetic is a core requirement, not a skin. If you reach for a
  default-styled component, restyle it with our tokens first.
- **Pre-approval**: Once I approve docs/plan.md, the schemas, dependencies,
  and architecture listed in it are approved — no need to re-ask for each
  one during implementation. Anything NOT in the plan still requires asking.

## Non-negotiables (from the PRD)
1. M1 = design tokens + page-flip prototype BEFORE any feature UI.
2. The print-size preset table in PRD Key Logic is canonical — exports must
   hit those physical dimensions exactly at 300 DPI.
3. Media editing is non-destructive: originals kept, transforms stored.
4. Slot model acceptance criteria in docs/data-model.md must have tests.
5. 2D fallback for binder rendering is required.
6. Respect P0/P1 and Non-goals. No pricing, tracking/inventory, or
   community-backend scope creep — those are explicitly out of V1.