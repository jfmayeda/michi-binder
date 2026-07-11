# Michi Binder Studio — Architecture

**Status:** Approved-pending · **Inputs:** `docs/PRD.md` v1.2 + planning Q&A (Jul 11, 2026)
**Audience:** the coding agent executing `docs/plan.md`. No architectural decisions are left open
except those explicitly gated (see Gates in `plan.md`). Tradeoffs and rejected alternatives live in
`docs/decisions.md`.

---

## 1. System overview

A desktop web app with three loosely coupled halves:

1. **The studio (client):** a Next.js React app where all design work happens — binder rendering,
   page flip, spread editing, media editing, exports. The editor is fully functional without a
   server round-trip in the hot path.
2. **User persistence (Supabase):** managed auth + Postgres for binders/pages/merges/placements +
   Storage for uploaded art originals. Anonymous users persist locally instead (see §8).
3. **Card data (static, versioned):** the Pokémon TCG catalog is NOT in the database. It is a set
   of generated static files committed to the repo, produced by a documented sync script, and
   lazily loaded into a client-side search index. Card images are hotlinked from the dataset's
   CDN, with a small proxy route used only by export/share rendering.

```
Browser ──────────────────────────────────────────────┐
  Studio UI (Next.js / React / Tailwind tokens)       │
  ├─ src/domain  (pure TS: slots, merges, split, print math — zero DOM deps)
  ├─ src/search  (lazy client index over /public/data)│
  ├─ src/persistence (adapter: Playground | Supabase) │
  └─ export pipeline (canvas → pdf-lib / PNG)         │
        │ hotlink (browse)         │ proxy (export)   │
        ▼                          ▼                  ▼
  images.pokemontcg.io    /api/card-image      Supabase (Auth, Postgres+RLS, Storage)

Offline scripts (run by developer, not deployed):
  scripts/sync-card-data.ts   → regenerates /public/data (per set release)
  scripts/extract-colors.ts   → dominant colors per card art (one set first, then full)
```

## 2. Stack

| Layer | Choice | Rationale (short — full tradeoffs in decisions.md) |
| --- | --- | --- |
| Framework | Next.js (App Router, latest stable), React, TypeScript | Vercel-native; route handlers give us the image proxy for free; static + dynamic mix fits landing-showcase + editor. |
| Styling | Tailwind CSS v4, **custom design tokens as the theme** | PRD mandate: cozy language, not default Tailwind. Tokens defined in M1 become the single source (`@theme` CSS variables). No stock shadcn styling; unstyled Radix primitives allowed for a11y-hard widgets (dialog, popover, toast), always restyled with our tokens. |
| Editor state | Zustand | One store per editor session; simple, no boilerplate; undo-toast snapshots are trivial. |
| Drag & drop | dnd-kit | Pointer-based (HTML5 DnD is unreliable for this), accessible, grid-snapping friendly. |
| Auth + DB + file storage | Supabase (Auth, Postgres, Storage) | PRD mandates managed auth + hosted DB, never custom. Matches workspace default; RLS gives per-user isolation. |
| Search | MiniSearch (text) + hand-rolled facet filters over a columnar index | Index is small enough to filter with plain array scans; MiniSearch only for fuzzy name/artist text. No server search — PRD guardrail: no API round-trips in the hot path. |
| PDF generation | pdf-lib (client-side) | Pages sized in exact physical units (cm → PostScript points), which is how we guarantee print-true output. |
| Image processing (scripts) | sharp | Fast, battle-tested Node image library for the color pipeline. |
| Unit tests | Vitest (+ Testing Library for components) | The domain module ships with the full acceptance-test suite from `data-model.md`. |
| E2E | Playwright | Key flows only (activation, editor, export). Any frame-timing perf assertion must run in an isolated Playwright project with `dependencies` on the others (parallel browser projects contend for GPU and cause false jank failures). |
| Hosting | Vercel | Workspace default; static data files ride the CDN with brotli compression. |

**Dependency list (pre-approved when plan.md is approved):** `next`, `react`, `react-dom`,
`typescript`, `tailwindcss`, `zustand`, `@dnd-kit/core` (+ sortable/modifiers), `@supabase/supabase-js`,
`@supabase/ssr`, `minisearch`, `pdf-lib`, `sharp` (dev/scripts only), `vitest`,
`@testing-library/react`, `playwright`, `idb` (IndexedDB wrapper), Radix primitives as needed
(`@radix-ui/react-dialog`, `-popover`, `-toast`, `-slider`). Anything beyond this list requires
asking Jacob first.

## 3. Card data pipeline (local database, never live API)

- **Source:** the [pokemon-tcg-data](https://github.com/PokemonTCG/pokemon-tcg-data) GitHub repo
  (free JSON dump of every card and set).
- **`scripts/sync-card-data.ts`:** downloads the repo tarball, strips each card to search-relevant
  fields, and writes generated files to `public/data/`:
  - `cards-index.json` — columnar arrays (id, name, set id, card number, rarity, artist, types,
    national dex numbers, era) to minimize bytes. **Budget: ≤ 6 MB raw / ≤ 2 MB compressed.**
  - `sets.json` — set id, name, series, release date, symbol/logo URLs.
  - `dex-species.json` — national dex number → species name (powers the species facet).
  - `colors.json` — dominant colors per card id (produced by the color pipeline; absent until M2).
- Generated files are **committed** — deploys are deterministic and need no build-time network.
- **Facet mapping:** `era` = the dataset's `series` field (Base … Scarlet & Violet). `species` =
  primary national dex number mapped through `dex-species.json`; trainer/energy cards have no
  species and remain findable by text.
- **Image URLs are derived** from the documented pattern (`images.pokemontcg.io/{setId}/{number}.png`,
  `_hires` variant for large); the sync script verifies the pattern per card and writes an
  exceptions map for any that deviate.
- **Re-sync procedure** (`docs/data-sync.md`, written by the sync-script task): run the script per
  set release, review the diff, eyeball a few new cards in the app, commit. We own freshness — this
  is the accepted tradeoff from the PRD.

### Lazy loading (Jacob's #8 nuance — hard requirement)
The index must NOT load on the landing page. The first screen is the cozy binder. The search module
fetches `cards-index.json` on **first search interaction**, with an **idle prefetch**
(`requestIdleCallback`) permitted only after the binder has rendered and the first flip is
interactive. An acceptance test asserts no request to `/data/cards-index.json` occurs during
landing render.

### Color extraction pipeline (vibe search foundation)
`scripts/extract-colors.ts`: for each card, download art at small size, downscale (~64 px),
k-means cluster in a perceptual color space (OKLab), keep the top 4 colors with coverage weights,
suppressing near-white/near-black borders. Output `colors.json`. **Run on ONE set first**; a dev
route (`/dev/color-check`, excluded from production) renders cards grouped by dominant hue so Jacob
can eyeball the clusters. Full-catalog run only after that gate passes.

## 4. Rendering: 2.5/3D binder + page flip

- **Primary approach: CSS 3D transforms** (not WebGL). Reason: page contents are live DOM — card
  images, drag targets, badges, focus rings. WebGL would force rendering DOM to textures, an
  enormous complexity tax. CSS `perspective` + rotated page halves + layered gradient shading gives
  the 2.5D paper-bend illusion; soft shadows and paper-easing curves come from the M1 motion tokens.
- Implementation notes for the M1 prototype: drive the flip with CSS transitions/keyframes on
  transform (compositor-friendly), not per-frame JS style writes; test `backface-visibility`
  behavior in Chrome and Safari early — JS-applied 3D transforms have known backface quirks.
- **WebGL is the fallback plan, not the default:** if the M1 prototype can't hit smooth 60 fps
  flips with CSS on desktop, escalate to Jacob before reaching for three.js (that's a Gate-1
  discussion, not an agent decision).
- **2D fallback (required, not optional):** flat spread view with a slide/crossfade page
  transition. An fps probe during the first flip (frame-time sampling) auto-switches to 2D below
  threshold; a manual 3D/2D toggle is always available and persisted per device.

## 5. Editor architecture

- **`src/domain/` is pure TypeScript** — layouts, insertion maps, merge validation, seam/split
  computation, assembly annotations, print math. Zero React/DOM/Supabase imports. This is where
  `data-model.md`'s acceptance tests run. Everything else consumes it.
- The editor holds one Zustand store per open binder: normalized entities (pages, merges,
  placements) mirroring the persistence schema 1:1, plus transient UI state (selection, drag,
  pending-undo snapshots).
- **Destructive-action safeguards** (PRD P1-6): no general undo stack. The shared
  `ConfirmWithUndoToast` pattern wraps exactly: clear page, delete page, delete binder, unmerge a
  filled slot, and the double→single mode switch. Implementation: snapshot the affected slice
  before applying; the toast's Undo restores the snapshot; snapshot discarded when the toast
  expires.

## 6. Media pipeline (non-destructive, print-true)

- **Originals are immutable.** Uploads go to Supabase Storage (authed) or IndexedDB (anonymous
  playground) exactly as received. Nothing ever mutates the original file.
- **Edits are stored transforms** (crop rect + rotation, spec in `data-model.md`) attached to the
  placement, re-editable forever.
- **Print export** runs client-side: compose the merge's full artwork on an offscreen canvas at
  300 DPI scale, cut it into physical pieces per the split rules (domain module), add bleed /
  registration marks / assembly labels, output **PDF (primary — page sized in exact cm)** and
  **PNG at 300 DPI (secondary)**. Full spec in `data-model.md` §7.
- **Calibration sheet:** a static PDF with a 10 cm ruler, known squares, and "print at 100% /
  disable fit-to-page" instructions, so Jacob can verify the printer before trusting exports.
- Effective-DPI warning: if the source art delivers < 300 DPI at the piece's physical size, the
  export dialog warns ("art may print soft — effective ~180 DPI") but never blocks.
- **Art starter packs** are static content in `public/art-packs/` with stable item ids and a
  documented CC0 source list (`docs/art-sources.md`) — not database rows.

## 7. Image proxy (export/share only)

`/api/card-image?src=…` — a route handler that fetches a card image server-side and returns it
same-origin with long cache headers. **Allowlist: `images.pokemontcg.io` only** (reject anything
else — this must not be an open proxy). Needed because canvases containing cross-origin images
without CORS headers cannot export ("canvas tainting"). Browsing always hotlinks directly; only
share-as-image and any export that composites card images go through the proxy.

## 8. Persistence & gating

- **Adapter interface** with two implementations sharing one serialization format (the schema
  shapes in `data-model.md`):
  - `PlaygroundAdapter` — anonymous users: one playground page, structure in `localStorage`, media
    blobs in IndexedDB. Local only, per the PRD.
  - `SupabaseAdapter` — authed users: full binders, debounced autosave (~1 s), optimistic UI with
    a cozy "saved" indicator.
- **Signup migration (the activation moment — must not lose work):** on account creation, the
  playground page is serialized, media blobs upload to Storage, rows are written as the user's
  first binder, and local data is cleared only after the server write is confirmed.
- **Auth surface (minimal):** Supabase Auth with email magic link + Google OAuth. Nothing custom,
  no passwords to manage.
- **RLS:** every user table carries a denormalized `user_id` and a single owner-only policy
  (`user_id = (select auth.uid())`). No policy ever queries its own table (avoids the recursive
  policy failure class). Free accounts are unlimited in V1; premium limits are future scope.

## 9. Repository layout

```
apps/michi-binder/
  app/                    # Next.js routes: landing, studio, /dev/* (dev-only), /api/card-image
  src/
    domain/               # PURE TS: layouts.ts, slots.ts, split.ts, print.ts (+ tests)
    search/               # lazy index loader, MiniSearch wrapper, facets
    persistence/          # adapter interface, playground + supabase impls, migration
    state/                # Zustand stores
    components/           # token-styled UI (binder/, editor/, search/, media/, shared/)
    styles/               # tokens.css (@theme), textures
  scripts/                # sync-card-data.ts, extract-colors.ts
  public/data/            # generated card data (committed)
  public/art-packs/       # CC0 art + manifest
  supabase/migrations/    # SQL migrations (applied in M5)
  docs/                   # PRD, this file, data-model, plan, decisions, data-sync, art-sources
  e2e/                    # Playwright
```

## 10. Environments

- **Local:** `npm run dev`; playground adapter works with no env vars; Supabase env vars
  (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) needed only from M5 on.
- **Vercel:** production on `main` auto-deploy; preview deploys for branches. Note for worktree
  users: `.env.local` does not follow into git worktrees — copy it manually.
