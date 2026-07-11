# Michi Binder Studio — Decision Log

Every tradeoff behind `architecture.md` / `data-model.md` / `plan.md`, with what was rejected and
why. If implementation reveals one of these was wrong, stop and re-plan with Jacob — don't
silently deviate.

---

**D1 — Card catalog as static generated files, not database rows.**
The catalog is read-only, versioned upstream, and needed by anonymous users before any account
exists. Static files ride the CDN, deploy deterministically, and keep Postgres purely for user
data. *Rejected:* Postgres-hosted catalog (server round-trips violate the "search feels instant"
guardrail; RLS/seed complexity for zero benefit); live API (PRD already rejected: rate limits,
latency, Scrydex migration churn).

**D2 — Client-side search index, lazily loaded.**
~2 MB compressed download once, then every query is local and instant — the guardrail demands it,
and anonymous playground users get full search with no backend. Loaded on first search interaction
or post-flip idle, never on landing (Jacob's #8: the first impression is the binder, not a
download). *Rejected:* server search (round-trips); loading eagerly on landing (competes with the
flip's first impression).

**D3 — CSS 3D flip as primary; WebGL only via Gate-1 escalation.**
Pages contain live interactive DOM (drag targets, badges, focus). CSS 3D keeps that DOM real;
WebGL would require rendering DOM to textures — a huge complexity tax on the riskiest feature.
The M1 prototype exists precisely to validate this; if it fails, switching is a Jacob
conversation, not an agent improvisation. *Rejected:* three.js-first (texture pipeline);
page-flip libraries (canvas/image-based, wrong fit for live DOM, and the flip IS the product's
signature — worth owning).

**D4 — Centimeters are the canonical physical unit.**
Jacob's formula is cm-based (7 × 9.5 per slot); the PRD's inch values are approximations
(2.75″ = 6.985 cm ≠ 7 cm). Every derived value (px, pt) computes from cm. *Rejected:* inches
canonical (would silently shrink prints ~0.2 mm per slot — exactly the class of error a
print-true product can't have).

**D5 — PDF is the primary print format; PNG secondary.**
A PNG's physical size depends on the print dialog honoring DPI metadata; a PDF page IS a physical
size — "print at 100%" is the only instruction needed. PNG remains for users who prefer image
workflows. *Rejected:* PNG-only (the most common home-printing failure mode is silent rescaling).

**D6 — Seam openness = "adjacent columns share insertion direction", as data.**
Jacob's measured map shows the rule can't be hardcoded (2x2's center seam is sealed; 3x3's
col-0/1 seam is open). One derivation over per-layout config; the 4x3 unknown becomes a one-line
config fill. *Rejected:* per-layout hardcoded seam tables (exactly the bug Jacob warned about).

**D7 — Layout and page mode fixed per binder (V1).**
PRD Key Flow 2 picks layout at binder creation; fixing it avoids per-page layout UI, mixed-layout
cross-page alignment questions, and mode-switch edge cases multiplying. Physical binders can mix
page types, so per-page layout is a legitimate V2 upgrade (additive column on `pages`).
*Rejected for V1:* per-page layouts (real, but scope).

**D8 — Facing pairs are (2,3), (4,5)…; page 1 sits alone on the right.**
Matches a real opened binder (page 1 faces the inside cover) — physical fidelity is a core value,
and cross-page merges must anchor to a real physical pairing. *Rejected:* (1,2),(3,4) pairing
(simpler arithmetic, physically wrong).

**D9 — Only merges are stored; unmerged cells are implicit.**
The layout already defines every cell; storing them would be denormalized noise and make "unmerge
restores slots" a data migration instead of a delete. *Rejected:* materialized slots table.

**D10 — Cross-page merges anchor to the left page with `spans_gutter`, in one `merges` table.**
One table, one validation path, and the split algorithm's first step (gutter cut) falls out
naturally. *Rejected:* separate cross-page table (two code paths for one concept); spread-level
coordinate system (invents an entity the domain doesn't need).

**D11 — Safe-split default for unverified insertion maps (4x3).**
Per-pocket pieces always fit physically, so exporting stays available before Jacob measures;
threading variants are an optimization unlocked by data. *Rejected:* blocking 4x3 export
(violates "never block"); guessing the map (print-true product, measured ground truth only).

**D12 — Denormalized `user_id` on every user table for RLS.**
Owner-only policies become one indexable predicate — no joins in policies, no self-referencing
policy recursion risk, better query plans. Cost: 16 bytes/row and adapter discipline.
*Rejected:* deriving ownership through `binder → page → …` joins in policies.

**D13 — Anonymous playground in localStorage/IndexedDB behind a persistence adapter.**
The PRD specifies anonymous = local only; the adapter makes signup migration a serialize→upload of
identical shapes, and lets M3/M4 build the full editor without waiting for M5's backend.
*Rejected:* Supabase anonymous sign-ins (server rows for drive-by visitors, contradicts PRD
"local only"); building against Supabase from M3 (couples editor progress to backend setup).

**D14 — No general undo stack; snapshot-based undo toasts on destructive ops only.**
Straight from PRD P1-6: placement is grid-snapped (trivially reversible), media edits are
non-destructive. A full undo system is real complexity V1 doesn't need. *Rejected:* global
command/undo stack.

**D15 — Card ids are plain strings, no foreign key.**
The catalog isn't in Postgres (D1). A dangling id (card removed upstream) degrades to a
placeholder card — acceptable and rare. *Rejected:* FK to a mirrored cards table.

**D16 — Templates, starter binder, and art packs are static JSON/assets, not tables.**
They're app content, shipped and versioned with the code; cloning is a client-side copy. Keeps V1
free of any community-backend surface (PRD Non-goal). *Rejected:* DB-hosted template/pack tables.

**D17 — Image proxy restricted to export/share paths with a strict allowlist.**
Browsing hotlinks directly (fast, zero server cost, per PRD). Canvas export needs same-origin
image data (tainted-canvas rule), so exports route through `/api/card-image`, allowlisted to
`images.pokemontcg.io` so it can't become an open proxy. Print exports never include card images
at all (legal line). *Rejected:* proxying all browsing traffic (bandwidth bill, latency, ToS
surface); self-hosting images now (deferred per PRD, flagged for longevity risk).

**D18 — Bleed = grow each piece's source region 3 mm/edge; real art at seams, edge-replication at
composition borders.** Seam bleed must be *actual neighboring artwork* or cut tolerance breaks
visual continuity between pockets. *Rejected:* mirroring (visible artifacts), plain white
(defeats bleed).

**D19 — Zustand + dnd-kit + MiniSearch + pdf-lib + sharp as the dependency spine.**
Each is the smallest well-maintained tool for its job; no meta-frameworks. *Rejected:* Redux
(boilerplate), HTML5 native DnD (unreliable cross-browser for grid editors), FlexSearch (API
awkward for facet composition), jsPDF (weaker unit control than pdf-lib), Canvas-API-only color
extraction in scripts (sharp is faster and handles formats robustly).

**D20 — Species facet via national dex numbers, era via dataset `series`.**
Both are already in the data; name-parsing ("Dark Charizard" → Charizard) is fragile.
Trainer/energy cards simply have no species facet. *Rejected:* deriving species from card names.

**D21 — Playwright perf assertions run in an isolated project.**
Playwright runs browser projects in parallel; GPU contention injects false long-frames into
flip-performance tests. Any frame-timing test gets its own project with `dependencies` on the
others so it runs alone. *Rejected:* loosening perf thresholds to stop flakes.
