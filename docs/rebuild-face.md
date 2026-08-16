# What we tried — 16 Aug 2026

Paused. Original planning docs (`PRD.md`, `plan.md`, `AGENTS.md`, etc.) are unchanged. This file is only the experiment log and the course correction.

---

## Tried

1. **Unattended full V1** — Grok 4.6 Cloud Agent ran M1–M5 overnight (~67M tokens). Draft: [PR #2](https://github.com/jfmayeda/michi-binder/pull/2), branch `cursor/v1-unattended-scaffold-9ebb`. Look: Fraunces + Nunito, clay/beige scrapbook.
2. **Second visual pass** — local branch `m1-1999-feel` on top of that PR. Look: navy vinyl `#16213A` + WOTC yellow `#E6C200`, Archivo + Source Serif, taller book, yellow pocket frames.
3. **Competitor check** — the real overlap is [pkmnbindr.com](https://pkmnbindr.com) (not `pkmnbinder.com` from the PRD). They already do collection + prices + merged slots + “Michi style” art + page-turn + share.

---

## Results

- **Gate 1 failed** on the unattended V1. Vibe-coded studio: weak texture/motion/taste; binder pages compacted (wide book + titles eating height); search-to-slot drag clunky (thumb stays in the left list); art import / print size buried; vibe-color mismatches; styleguide motion broken; flip hitch after the turn.
- **Navy/yellow pass also failed.** Too cheap, hard on the eyes. Do not continue that skin.
- **Do not merge PR #2 as the product.** The useful part is the *brain* (catalog, slot/print/crop math, tests, search), not the UI.
- Skipping Gate 1 / another unattended full V1 is the wrong way to get taste on this product.
- PkmnBindr already owns “organize my collection.” Copying their dark SaaS look, or racing them on inventory/prices, is a dead end.

---

## New direction (and why)

**Keep the brain, rebuild the face.** Salvage `src/domain`, `src/search`, `public/data`, print math, and tests from PR #2. Throw both visual skins. Don’t restyle `Studio.tsx` in place hoping it becomes nostalgic.

**The job is unchanged:** a Michi Method design studio — compose a spread, merge slots, print art that physically fits 7 × 9.5 cm pockets at 300 DPI. Taste-first. Still no pricing, inventory, or community backend (that’s PkmnBindr’s house).

**Feel is not chosen yet.** Jacob still wants 1999 Pokémon *object* energy (guidebook / WOTC / real album) — but scrapbook beige and yellow-on-navy both failed, so don’t invent a third loud palette unattended. Ask him for references before picking type and color again.

**When work resumes:** M1 only, Jacob in the loop (`/dev/styleguide` + `/dev/flip`) until Gate 1 actually passes. Then: real 7 × 9.5 pocket proportions, drag overlay that doesn’t live in the search list, art import + print size obvious. Leave search-sort, vibe-color ranking, live Supabase auth, Safari, and the ruler check until he asks.

**Git:** repo `jfmayeda/michi-binder`. `main` is still the original Fable docs. Parts bin is PR #2. `m1-1999-feel` is a discarded experiment — don’t ship it.
