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

### Gate 3 — print + ruler (2026-08-15, unattended)

Generated calibration PDF (10 cm rulers + 7 × 9.5 cm pocket trim page) and art export PDFs with exact-cm TrimBox. Cannot physically print. **Needs Jacob ruler check.**

## BLOCKED

### T5.1 live apply + auth round-trip (2026-08-15)

Migrations and Auth UI are in the repo. Live AC did not pass after two honest attempts.

**Attempt 1:** `GET /auth/v1/health` without apikey → 401. `POST /auth/v1/otp` → 422 `otp_disabled` / “Signups not allowed for otp”. `GET /rest/v1/binders` with anon key → 404 `PGRST205` (table `public.binders` missing). No `DATABASE_URL` / management token, so the SQL file cannot be applied from this environment.

**Attempt 2:** `GET /auth/v1/health` with apikey → 200 (GoTrue up). `POST /auth/v1/otp` → 400 `email_address_invalid` for a probe address (OTP still not a working signup path). `GET /auth/v1/authorize?provider=google` → 400 (Google provider not configured).

Left in place: `supabase/migrations/20260815000000_init.sql`, SignInPanel, `/auth/callback`, `.env.local.example`, `docs/supabase-dashboard.md`. Policy-shape tests cover RLS text. **Live RLS (user A vs user B) unverified.** Continue with playground persistence.

### T5.3 live signup migration (2026-08-15)

AT-10 unit tests pass against memory Storage. Live signup cannot run (T5.1 auth BLOCKED). Shelf now requires a real session in every build, so Cloud testers use `/playground` instead of `/shelf`. Anonymous second-page attempts open the save prompt instead of adding a page.

## Unverified

- Gate 1 physical “does it feel like paper on Jacob’s machine / 60 fps” — Chrome in Cloud looked smooth; no DevTools performance profile attached.
- Safari backface-visibility.

## Assumptions (continued)

- **T3.5 single-page chrome:** binders in `pageMode: 'single'` show one leaf (no spine), using existing binder tokens. Double mode keeps the facing-spread book from T3.4. Drop targets are per-cell droppables (grid-snapped); no extra snap-to-grid library.
- **T3.6 merge selection:** drag/shift-click fills the bounding rectangle (never blocks a shape). Overlap still rejected by domain validation. Filled unmerge uses an interim confirm + 8s undo toast until T3.7. Merging over existing cell cards adopts the first placement onto the merge.
- **T3.7 toast expiry:** `UNDO_TOAST_MS = 8000`. `useConfirmWithUndo` is the reserved API for the T3.8 mode switch.
- **T3.8 / 4x3 insertion map:** not measured in Cloud. `LAYOUTS['4x3'].insertionMap` stays `null` (safe-split).
- **T4.1 listMedia:** PersistenceAdapter gained `listMedia()` / BlobStore `list()` so the art box can show uploads. Bytes are copied on `putMedia` so later file mutations cannot touch the stored original.
- **T4.4 PDF:** first page is the full artwork trim (so a 2×2 merge is 14 × 19 cm). Piece pages follow. Browser PNG is canvas-encoded without a pHYs chunk. Bleed toggle is shown; piece rasters already support bleed in `print.ts`, PDF pages currently mark trim.
- **T5.1 storage policies:** folder-first `(storage.foldername(name))[1] = auth.uid()` instead of `owner = auth.uid()`, because Storage has not stamped `owner` yet on INSERT. Objects are stored at `{user_id}/{asset_id}`.
- **T5.2 live AT-3:** no `public.binders` table and no working auth, so AT-3 runs against an in-memory stand-in of the same row/storage shape. Live Supabase autosave + network-kill unverified. Playground remains the running adapter.
