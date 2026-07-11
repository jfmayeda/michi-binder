# Michi Binder Studio — Data Model

**Status:** Approved-pending · **Inputs:** `docs/PRD.md` v1.2 Key Logic + planning Q&A
This is the source of truth for the slot model. The acceptance tests in §9 are **mandatory
deliverables** of task T3.1 (domain) and T4.3 (print) — implementation is not done until they pass.

---

## 1. Conventions

- Grid coordinates are **0-indexed** in code (`row`, `col`); user-facing labels are 1-indexed.
- Layout names read **rows × columns**: `4x3` = 4 rows × 3 columns (the common 12-pocket page).
- All physical math is in **centimeters** (canonical, per PRD formula); inches in the PRD table are
  approximations. Pixels and PDF points are derived (§7).
- Left/right ("L"/"R") in insertion maps = the side of the pocket where the opening is, i.e. the
  side the print slides in from.

## 2. Layout definitions (config/data, never hardcoded logic)

```ts
type Direction = 'L' | 'R';

interface LayoutDef {
  id: '2x2' | '3x3' | '4x3' | '4x4';
  rows: number;
  cols: number;
  /** Pocket-opening direction per column, same on left and right pages (NOT mirrored).
   *  null = unverified — triggers safe-split export behavior (§6.4). */
  insertionMap: Direction[] | null;
}

export const LAYOUTS: Record<string, LayoutDef> = {
  '2x2': { id: '2x2', rows: 2, cols: 2, insertionMap: ['R', 'L'] },   // openings face center seam
  '3x3': { id: '3x3', rows: 3, cols: 3, insertionMap: ['L', 'L', 'R'] },
  '4x3': { id: '4x3', rows: 4, cols: 3, insertionMap: null },          // Jacob measures before M3
  '4x4': { id: '4x4', rows: 4, cols: 4, insertionMap: ['L', 'L', 'R', 'R'] },
};

/** Uniform physical pocket size across ALL layouts (PRD v1.2). */
export const SLOT_CM = { width: 7, height: 9.5 };
```

**Seam classification** (derived, never hardcoded per layout — Jacob's explicit instruction; the
2x2 center seam MUST fall out of this rule, not a special case):

- Column seam between col `i` and `i+1` on one page:
  **open (chainable)** iff `insertionMap[i] === insertionMap[i+1]`; **sealed** iff they differ.
  (2x2: R|L → sealed center seam. 3x3: L|L open, L|R sealed. 4x4: open, sealed, open.)
- **Row seams: always sealed.** Vertical spans always split into one print per row.
- **Gutter (between facing pages): always sealed, split is mandatory** (no whole-print variant).
- Sealed **column** seams: split is the default, but a **whole-print (threaded) variant** is also
  offered — flexible prints can sometimes slide through — and the user chooses at export time.

## 3. Binder / page structure

- `Binder`: owns ordered `Page`s. **Layout and page mode (`single` | `double`) are fixed per binder
  at creation** (per-page layouts are a rejected-for-V1 alternative — see decisions.md D7).
- Page order = integer `position` (1-based, resequenced on reorder).
- **Facing pairs** (physical fidelity): opening the binder shows page 1 alone on the right (facing
  the inside cover). Facing pairs are **(2,3), (4,5), (6,7)…** — left page = even position.
  Cross-page merges may only span a facing pair; page 1 can never host one.
- Cross-page merges exist **only** when `binder.page_mode = 'double'`.

## 4. Slot model

A page's grid cells are **implicit** (defined by the layout). Only merges are stored.

- **Merge** = a rectangular group of contiguous cells: anchor `(row, col)` + `rowSpan × colSpan`.
  - Minimum area 2 cells (a 1×1 merge is meaningless and rejected).
  - Any rectangle is valid in the editor, on every layout — **physical constraints never block
    designing**; they only shape export splitting and assembly notes (§6).
  - A cross-page merge is anchored on the **left page** of a facing pair with `spansGutter = true`;
    its `colSpan` continues onto the facing right page (so `col + colSpan` may reach `2 × cols`).
    Both pages share the binder's layout, so rows always align.
  - Merges must not overlap any other merge (cross-page merges are checked against both pages).
- **Slot** = the unit a placement occupies: either an unmerged cell or a merge.
- **Placement** = content in a slot: a card (by TCG id) or an art asset, plus a stored transform
  and an optional ownership badge. At most one placement per slot.
- **Unmerge** restores the underlying cells as empty individual slots. Unmerging a **filled** slot
  is a destructive op: confirm + undo toast; the placement is deleted (undo restores merge +
  placement together).

## 5. Persistence schema

The SQL below is the canonical shape. The anonymous playground serializes the **same shapes** to
JSON (localStorage + IndexedDB for blobs); the signup migration writes them to Postgres verbatim.
Domain invariants (bounds, overlap, gutter rules) are enforced in `src/domain` and covered by
tests — the DB enforces ownership, referential integrity, and slot uniqueness.

```sql
create table binders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null default 'My binder',
  layout_id   text not null check (layout_id in ('2x2','3x3','4x3','4x4')),
  page_mode   text not null default 'double' check (page_mode in ('single','double')),
  position    int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table pages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade, -- denormalized for RLS
  binder_id   uuid not null references binders(id) on delete cascade,
  position    int  not null,                     -- 1-based; resequenced on reorder
  created_at  timestamptz not null default now(),
  unique (binder_id, position) deferrable initially deferred
);

create table merges (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  page_id      uuid not null references pages(id) on delete cascade,  -- anchor; LEFT page if spans_gutter
  row          int  not null,
  col          int  not null,
  row_span     int  not null check (row_span >= 1),
  col_span     int  not null check (col_span >= 1),
  spans_gutter boolean not null default false,
  check (row_span * col_span >= 2)
);

create table media_assets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,          -- Supabase Storage key of the IMMUTABLE original
  file_name    text not null,
  mime         text not null,
  width_px     int  not null,
  height_px    int  not null,
  byte_size    int  not null,
  created_at   timestamptz not null default now()
);

create table placements (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  page_id         uuid not null references pages(id) on delete cascade,  -- anchor page for merges
  merge_id        uuid references merges(id) on delete cascade,
  row             int,
  col             int,
  kind            text not null check (kind in ('card','art')),
  card_id         text,                -- pokemon-tcg-data id, e.g. 'sv1-25' (no FK — data is static)
  asset_kind      text check (asset_kind in ('upload','pack')),
  upload_asset_id uuid references media_assets(id) on delete restrict,
  pack_item_id    text,                -- stable id into public/art-packs manifest
  transform       jsonb not null default '{}',
  ownership       text check (ownership in ('owned','wanted')),  -- cards only; null = unset
  -- a placement occupies EITHER a merge OR a single cell:
  check ( (merge_id is not null and row is null and col is null)
       or (merge_id is null and row is not null and col is not null) ),
  check ( (kind = 'card' and card_id is not null and asset_kind is null)
       or (kind = 'art'  and card_id is null and asset_kind is not null) ),
  check ( asset_kind is distinct from 'upload' or upload_asset_id is not null ),
  check ( asset_kind is distinct from 'pack'   or pack_item_id  is not null ),
  check ( kind = 'card' or ownership is null ),
  unique (merge_id)
);
create unique index placements_cell_unique
  on placements (page_id, row, col) where merge_id is null;
```

RLS on every table: `using (user_id = (select auth.uid()))` for select/insert/update/delete,
owner-only. `updated_at` maintained by trigger on `binders` (touched on any child change via the
adapter, not triggers on children — keep it simple).

**Templates and the starter binder are not tables** — they ship as versioned JSON files in the
same serialized shape (with `card_id`/`pack_item_id` references only, never user uploads), cloned
into a user's binder client-side.

## 6. Transforms & the export split model

### 6.1 Transform (non-destructive, stored, re-editable)

```ts
interface Transform {
  version: 1;
  /** Region of the SOURCE image (normalized 0–1) mapped onto the slot/merge rect. */
  crop: { x: number; y: number; w: number; h: number };
  rotation: 0 | 90 | 180 | 270;   // applied before crop
}
```

- The crop rect's aspect ratio must equal the slot's physical aspect
  (`colSpan × 7 : rowSpan × 9.5`) — the crop editor enforces this; the renderer fills exactly,
  never letterboxes. Card placements default to full-card fit (transform `{}`).
- Originals are never modified. Re-opening the editor restores the stored crop for adjustment.

### 6.2 Piece computation (the split algorithm)

For a merge, export pieces are computed as:

1. **Gutter split (mandatory):** if `spansGutter`, cut at the gutter into a left-page rect and a
   right-page rect.
2. **Row split (mandatory):** cut each page rect into one horizontal strip per row.
3. **Column split (default):** cut each strip at every **sealed** column seam it crosses
   (per §2 seam rule). If `insertionMap` is null (4x3 until measured), see §6.4.
4. **Whole-strip variants:** any strip that step 3 cut (i.e., it crossed ≥ 1 sealed column seam)
   also offers a single whole-strip print as an alternative; the export dialog lets the user choose
   per strip. Gutter and row cuts never offer a whole variant.

Each piece renders its sub-rect of the full composed artwork (the merge's transform applied to the
whole merge rect first, then cut), so art reads continuously across every seam.

### 6.3 Assembly annotation (shown on the merge in the editor; flows into the pull list)

- 1 piece covering 1 cell → **"single insert"**
- 1 piece covering > 1 cell (open chained run) → **"slide-through"**
- N > 1 pieces → **"split into N pieces"**, plus, when whole-strip variants exist:
  "(row X can optionally be threaded whole — flexible prints)"

Unmerged single cells are implicitly "single insert" (annotated only in the pull list, not badged).

### 6.4 Unverified insertion map (4x3 until Jacob measures)

Designing and exporting stay fully available. Piece computation treats **every column seam as
sealed** (split at every column — per-pocket pieces always fit physically) and offers **no
whole-strip variants**. The export dialog notes: "insertion directions for this page type are
being verified — pieces are split per pocket to be safe." When Jacob supplies the map, updating
`LAYOUTS['4x3'].insertionMap` is the entire fix.

## 7. Print math (canonical)

- Composition size of any merge: **width = colSpan × 7 cm, height = rowSpan × 9.5 cm** (the PRD
  preset table is this formula; it defines the designed artwork's size — physical pieces derive
  via §6.2).
- **PDF (primary):** page = piece trim size + margin for marks; trim box exact in points:
  `pt = cm × 72 / 2.54` (7 cm = 198.4252 pt, 9.5 cm = 269.2913 pt). Corner crop marks outside the
  trim, a piece label ("Piece 2/3 — right edge joins piece 3"), and seam-edge registration ticks.
  Instructions embedded: print at 100% scale.
- **PNG (secondary):** `px = round(cm × 300 / 2.54)` with 300 DPI metadata (pHYs chunk).

| cm | px @300DPI | pt |
| --- | --- | --- |
| 7 | 827 | 198.43 |
| 9.5 | 1122 | 269.29 |
| 14 | 1654 | 396.85 |
| 19 | 2244 | 538.58 |
| 21 | 2480 | 595.28 |
| 28.5 | 3366 | 807.87 |

- **Bleed (optional, 3 mm):** each piece's source region grows 3 mm on **all** edges. At seam
  edges the bleed pulls real neighboring artwork (source is the full composition); at composition
  edges where source pixels run out, replicate edge pixels. Trim marks always indicate the true
  cut line.
- Exports are for custom art only — **never render card images into print exports** (proxy or
  otherwise). This is the PRD's legal line.

## 8. Card index & color data (static, read-only)

Not user data; shapes owned by `scripts/sync-card-data.ts` (see architecture §3). Placements
reference cards by string id only. Color data: per card id, up to 4 `{ hex, weight }` dominant
colors in OKLab-clustered order; color search ranks by hue proximity of the top colors.

## 9. Acceptance tests (mandatory; table-driven where marked)

The PRD's slot-model acceptance criteria, expanded. AT-1…AT-5 belong to T3.1 (pure domain),
AT-6…AT-8 to T4.3 (print), AT-9…AT-11 to their feature tasks.

- **AT-1 Merge validation (exhaustive, all layouts):** for each layout, enumerate every rectangle
  `rowSpan 1..rows × colSpan 1..cols` at every anchor: accepted iff area ≥ 2 and in bounds.
  Overlapping a second merge → rejected. Out of bounds → rejected. 1×1 → rejected.
- **AT-2 Cross-page validation:** cross-page merge accepted only when: binder mode is `double`,
  anchor is a left-facing page (even position) with an existing facing page, rect is contiguous
  across the gutter, and no overlap on either page. Rejected in `single` mode; rejected anchored
  on page 1 or any right page.
- **AT-3 Round-trip (PRD criterion, exhaustive):** for every layout × every distinct merge shape
  (all rowSpan×colSpan combos, area ≥ 2) plus representative cross-page shapes per layout:
  create page → merge → place a card (with ownership) and an art asset (with a non-default
  transform) → serialize → deserialize → render model deep-equals the original. Runs against the
  playground adapter in M3; the same suite runs against the Supabase adapter in M5 (adapter
  contract test).
- **AT-4 Unmerge (PRD criterion):** unmerging an empty merge instantly restores N empty cells.
  Unmerging a filled merge requires confirm; after confirm, cells are empty and the placement is
  gone; toast-undo restores merge + placement exactly.
- **AT-5 Mode switch:** double→single on a binder with K cross-page merges prompts with count K;
  confirm removes exactly those merges (+ their placements); undo restores all; in-page merges
  untouched. Single→double is silent.
- **AT-6 Piece computation (table-driven — the heart of the model):**
  | Layout | Merge (row,col,rS,cS) | Mandatory pieces | Whole-strip variants | Annotation |
  | --- | --- | --- | --- | --- |
  | 3x3 | 1 row, cols 0–1 | 1 | — | slide-through |
  | 3x3 | 1 row, cols 1–2 | 2 (seam 1\|2 sealed) | yes (1 strip) | split into 2 |
  | 3x3 | 1 row, cols 0–2 | 2: [0–1],[2] | yes | split into 2 |
  | 3x3 | 2×2 at (0,0) | 2 (row split; each strip open) | — | split into 2 |
  | 3x3 | full page 3×3 | 6: per row [0–1],[2] | yes (3 strips) | split into 6 |
  | 2x2 | 1 row, cols 0–1 | 2 (center seam R\|L sealed) | yes | split into 2 |
  | 2x2 | 2×2 full page | 4 | yes (2 strips) | split into 4 |
  | 4x4 | 1 row, cols 0–3 | 2: [0–1],[2–3] (only seam 1\|2 sealed) | yes | split into 2 |
  | 4x4 | 1 row, cols 1–2 | 2 | yes | split into 2 |
  | 4x4 | 1 row, cols 2–3 | 1 | — | slide-through |
  | 4x3 (map null) | 1 row, cols 0–2 | 3 (every seam sealed) | none | split into 3 |
  | 3x3 x-page | 1 row, left col 2 + right col 0 | 2 (gutter) | none | split into 2 |
  | 3x3 x-page | 1 row, left cols 1–2 + right cols 0–1 | 3: [L1],[L2],[R0–1] | yes (left strip only) | split into 3 |
  The 2x2-vs-3x3 divergence for "cols 0–1" (sealed vs open) MUST come from the map rule, verified
  by asserting both rows of this table with the same code path.
- **AT-7 Print dimensions:** for every preset in §7's table (and one cross-page piece): PNG pixel
  dims match `round(cm × 300 / 2.54)` exactly; PDF trim box matches `cm × 72 / 2.54` within
  0.01 pt. Bleed adds exactly 3 mm per edge to the rendered region, marks stay at true trim.
- **AT-8 Seam continuity:** for a split merge with real art, adjacent pieces' edge pixel strips
  (inside trim, and through bleed regions) match the uncut composition — art reads continuously.
- **AT-9 Lazy index:** landing render triggers no request for `cards-index.json`; first search
  interaction (or post-flip idle) does; subsequent searches hit the cached index.
- **AT-10 Playground migration:** anonymous playground with a merged slot, a placed card
  (ownership set), and cropped uploaded art → signup → first binder contains identical structure,
  transform, and a Storage-hosted original; local copy cleared only after server confirm.
- **AT-11 Ownership/pull list:** a spread with owned card, wanted card, custom-art merge (split
  into N) yields a pull list with correct statuses, the art slots' export links, and assembly
  notes matching AT-6 annotations.
