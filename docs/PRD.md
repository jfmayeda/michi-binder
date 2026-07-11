# PRD: Michi Binder Studio — Cozy Virtual Binder Designer (Fable Build)

Problem statement: Michi Method collectors need a way to design and preview binder spreads digitally before committing physical cards and printed art, because a spread's aesthetic only reveals itself once assembled — and physical rework (re-sleeving, reprinting, re-cropping) is slow, costly, and kills creative momentum.
Target users: Michi Method / aesthetic binder collectors who curate spreads for beauty (not completeness); secondary: collectors who want to plan pages with cards they don't own yet and share spreads on TikTok/IG.
Pain points: No tool for composing spreads across facing pages with merged slots; custom art never prints at the right size for side-loading pockets; discovery tools answer 'what am I missing?' not 'what fits my page's vibe?'; existing apps feel corporate, not cozy; current workaround is Canva mockups.
Proposed solution: A cozy, nostalgic desktop web app: 2.5/3D binder with page-flip, multi-layout spreads with merged-slot presets, full TCG + vibe search on a cached card dataset, print-true art export, templates, ownership badges, and share-as-image.
Priority: High
Source: Internal

<aside>
📋

**Status:** Draft v1 — ready for Fable planning · **Owner:** Jacob Hohn · **Date:** Jul 11, 2026

**Handoff:** Fable (Claude Code) → implementation plan · GPT 5.6 Sol (Cursor) → execution · ~few hrs/week iteration after one-shot

**Template:** Carl's PRD structure · Discovery artifacts in Appendix

</aside>

# 🅐 Problem Alignment

## Problem & Opportunity

The **Michi Method** is a growing style of Pokémon TCG collecting where binders are curated for *aesthetics*: side-loading pockets, art spanning merged slots and facing pages, and custom printed art mixed with cards. The binder is self-expression and nostalgia — collectors aren't managing inventory, they're making something beautiful with cards they love.

**POV 1 — The Designer (anchor):** Michi Method collectors need a way to *design and preview binder spreads digitally before committing physical cards and printed art*, because a spread's aesthetic only reveals itself once assembled — and physical rework (re-sleeving, reprinting, re-cropping) is slow, costly, and kills creative momentum.

**POV 2 — The Curator:** Collectors curating themed spreads need a way to *discover cards that belong together* (color, artist, species, vibe), because existing tools answer "what am I missing?" — a completeness question — never "what fits?" — a taste question.

**Evidence & whitespace**

- Collectors currently mock up spreads in **Canva** — a corporate design tool with zero hobby connection (Elite Fourum tutorials document this workflow).
- Competitors (**Dex, Collectr, TCG Collector, TCG BinderDex**) are strong on tracking/valuation and weak-to-absent on visual binder *design*. [pkmnbinder.com](http://pkmnbinder.com) has color search but a flat, disconnected binder experience.
- Spreads are already shared organically on TikTok/Instagram — no product owns that loop.
- Nobody bridges digital design → physical assembly (print-sized art exports, pull lists).

## High Level Approach

A **cozy, nostalgic desktop web app** where you design binder spreads in a 2.5/3D binder with page-flip — full TCG search on a locally cached card dataset, merged-slot layout presets, a media editor that exports custom art at print-true dimensions, and templates that make the first page effortless. Positioning: **the design studio for binder collectors** — deliberately *not* a tracker, price checker, or inventory manager.

Alternatives considered: live API-backed search (rejected: rate limits + latency vs. facet-heavy UX; see Key Logic), mobile-first (rejected: precision drag-and-drop editing suits desktop), local-first no-accounts (rejected: accounts enable save/freemium gate and pre-wire community features).

### Narrative

> Kelly opens the app and flips through a starter binder that feels like the real thing — paper weight, page-flip, soft shelf light. She clones a reference page she loves, searches "Eeveelutions + pink," and drags cards into a 3x3 double-page spread with a merged 2x2 slot for a printed art piece. She crops the art in the media editor, exports it print-ready, and prints it knowing it will fit the side-loading pocket exactly. The pull list tells her which cards to grab from her boxes and which two she still needs — she badges those "wanted." She exports the spread as an image and posts it. Total time: one cozy evening, zero re-sleeving.
> 

## Goals

| Type | Goal |
| --- | --- |
| Measurable | Time-to-first-spread < 10 minutes from first visit |
| Measurable | Anonymous → account conversion after first page (activation gate works) |
| Measurable | ≥ 1 art export printed per active designer (digital→physical bridge is used) |
| Immeasurable | Feels like the hobby — cozy, nostalgic, personal — not a corporate SaaS tool |
| Guardrail | Card search feels instant (cached local index; no API round-trips in the hot path) |
| Guardrail | Page-flip runs smoothly or auto-degrades to 2D — never janky |
| Guardrail | Print exports dimensionally accurate (calibration-verified) |
| Portfolio | PRD + build demonstrate complete, traceable discovery (POV → tree → DFV → scope) |

## Non-goals

- **Pricing, valuation, grading, trading** — competitor turf; dilutes cozy positioning. (APIs make pricing easy to add later if demand appears.)
- **Collection inventory management** — ownership is a manual badge in V1, not a tracked inventory.
- **Community backend** (cloning other users' spreads, profiles, feeds) — V2; template cloning delivers the experience without accounts-social scope.
- **Mobile app** — desktop web first; responsive viewing at most.
- **Printing card proxies** — media exports are for custom/owned art only (legal line).

# 🅑 Solution Alignment

## Key Features — Plan of Record

**P0 (must-have)**

1. **Binder & page management** — multiple binders; add/reorder/delete pages; layouts 2x2, 3x3, 4x3, 4x4; single-page and double-page (table view) modes.
2. **Spread editor** — add, move, swap, position, delete cards; merged-slot presets in all valid sizes, including cross-page spans in double-page view.
3. **Card search & filtering** — full TCG dataset: set, Pokémon/species, type, artist, rarity, era; powered by the cached dataset (see Key Logic).
4. **2.5/3D binder rendering + page flip** — the signature cozy interaction; automatic 2D fallback on low-perf devices.
5. **Media editor + print-true export** — import art, crop/resize to slot presets (incl. vertical/horizontal merged sizes that fight side-loading), export at exact print dimensions.
6. **Accounts + save** — managed auth, minimal surface. Gate: anonymous visitors get one playground page instantly; creating an account unlocks saving + full binders/pages. (Future premium tier hooks here.)
7. **Templates & starter binder** — "start from scratch or clone a reference page"; curated template spreads shipped with the app; pre-loaded starter binder on first open (doubles as landing showcase).

**P1 (should-have)**

1. **Vibe/theme search** — by color, species, artist, theme, with example pages + example cards. Requires the color-extraction pipeline (Key Logic).
2. **Ownership badge** — per-placed-card owned/wanted toggle; "what I still need" view per spread. Explicitly bounded: a badge, not an inventory.
3. **Share as image** — export a beautiful spread/binder image for TikTok/IG; free growth loop.
4. **Pull list export** — slot-by-slot assembly checklist: card name/set/number, owned/wanted status, which slots are custom art (with links to exports). Distinct from printing the page: it's the build checklist, not the picture.
5. **Art starter packs** — curated CC0/public-domain art (textures, botanicals, vintage illustrations) inside the media section, so users never leave the app to source art.
6. **Destructive-action safeguards** — no general undo stack needed: card placement is grid-snapped (trivially reversible) and media edits are non-destructive (stored transforms; see Key Logic). Instead, the few destructive ops — clear page, delete page/binder, unmerge a filled slot — get a confirm + brief "Undo" toast.

**Future considerations**

- Community cloning of user spreads (accounts-social, hosting, moderation) — the true community loop.
- Wishlist export / acquisition tracking integration.
- Auto-fill a page by vibe ("complete this spread") — AI layer on top of vibe search.
- Collection inventory import (CSV/Collectr) for automatic ownership.
- Premium tier: extra binders, premium art packs, early features.
- Art marketplace / community art (licensing model required).
- Pricing display via available APIs, if user demand appears.

## Key Flows

1. **First visit (activation):** Landing shows the starter binder → flip through it → "start from scratch or clone this page" → edit one playground page anonymously → save prompt → account → full binder unlocked.
2. **Design a spread:** New/open binder → pick layout + single/double mode → search or vibe-search cards → drag into slots → apply merged-slot preset → import + crop art for merged slot → flip pages to review the whole binder.
3. **Bridge to physical:** Spread done → export art at print size → print → pull list export → gather cards (owned) / note gaps (wanted) → assemble the real page.
4. **Share:** Export spread image → post to TikTok/IG.

## Key Logic

**Data strategy (decision: cache-once, not live API)**

- Seed a local database from the free [pokemon-tcg-data](https://github.com/PokemonTCG/pokemon-tcg-data) JSON dump; build our own search index (facets: set, species, type, artist, rarity, era).
- Rationale: search/filter and vibe search need fast faceted queries → a local index is required regardless, so live API calls (rate limits, latency, Scrydex migration churn) buy nothing. No pricing data needed (non-goal). Tradeoff accepted: we own freshness → documented **re-sync job per set release**.
- Card images hotlinked from the dataset's image URLs with a caching layer; self-hosting decision deferred but flagged (ToS + longevity risk).
- **Color extraction pipeline:** no API provides art colors. One-time batch job extracts dominant colors per card art → powers color/vibe search. Validate on a single set first and eyeball the clusters before running the full catalog.

**Slot model (the hardest logic — do not hand-wave)**

- A page is a grid (layout-defined rows × cols). A merged slot is a rectangular group of contiguous cells. Cross-page spans exist only in double-page mode and respect side-loading orientation constraints.
- A placement = card (or art asset) + slot assignment + fit/crop transform. Acceptance criteria: every layout × merge-size combination renders and round-trips through save/load; removing a merge restores underlying slots.

**Side-loading insertion map (physical ground truth, measured on real pages)**

- Pocket openings are per-column and layout-specific; left and right pages use the same pattern (not mirrored):
    - 2x2: column 1 opens right, column 2 opens left (openings face the center seam)
    - 3x3: columns 1–2 open left, column 3 opens right (both pages)
    - 4x4: columns 1–2 open left, columns 3–4 open right
    - 4x3: opening map not yet verified — measure before M3 (see Operational Checklist)
- Row seams are always sealed: any vertical span must be **split into one print per row**, aligned so the art reads continuously through the seam.
- Horizontal spans: a single print can slide through a run of pockets whose openings chain in the same direction; where the direction flips, that seam is sealed. Flexible prints can sometimes be threaded whole anyway — so the exporter offers **whole-print and split-at-seam variants** for spans crossing sealed boundaries, and the user chooses. Cross-page (gutter) spans always split.
- The editor **never blocks** a shape. Every merge is annotated with its assembly implication — "single insert," "slide-through," or "split into N pieces" — and those notes flow into the pull list.

**Media editing (non-destructive)**

- Imported art always keeps its original file; *fit-to-size* and *crop-to-size* are stored transforms, re-editable at any time. Placing, swapping, or resizing never destroys work — any composition state is recoverable. (This is why no general undo stack is needed.)

**Print fidelity**

- Canonical print-size presets (3x3 side-loading baseline), exported at 300 DPI with bleed option:

| Preset | Dimensions |
| --- | --- |
| 1 slot | 7 × 9.5 cm (2.75″ × 3.75″) |
| 2 slots horizontal | 14 × 9.5 cm (5.50″ × 3.75″) |
| 2 slots vertical | 7 × 19 cm (2.75″ × 7.50″) |
| 3 slots horizontal | 21 × 9.5 cm (8.25″ × 3.75″) |
| 4 slots (2×2) | 14 × 19 cm (5.50″ × 7.50″) |
| 9 slots (full page) | 21 × 28.5 cm (8.25″ × 11.25″) |
- Pocket dimensions are uniform across all layouts: **every slot is 7 × 9.5 cm**. Any merged export = (columns × 7 cm) × (rows × 9.5 cm) — the preset table above is derived from this formula, and **all layouts (2x2, 3x3, 4x3, 4x4) support print export in V1**. Keep presets as config/data, not code. **Centimeters are the canonical physical unit**; the inch values in the preset table are approximations (2.75″ = 6.985 cm ≠ 7 cm) — every pixel and PDF dimension derives from cm. Ship a **calibration test sheet** to verify printer accuracy. Exports are for custom art only — never card proxies.

**Rendering**

- 2.5/3D binder + page flip (CSS 3D/WebGL). Perf detection auto-switches to 2D mode; user can toggle manually.

**Access gating**

- Anonymous: 1 playground page, local only. Account (managed auth — no custom auth system): save, multiple binders/pages. Premium: future.

**Licensing**

- Art packs: CC0/public-domain only, sources documented. User uploads: user's responsibility. Card imagery: display within app, no redistribution.

## Design Language *(de-risks the polish/no-design-system gap)*

- **Direction:** cozy scrapbook-meets-Game-Freak — warm, tactile, nostalgic. Explicitly *not* default-Tailwind SaaS.
- **Moodboard references:** pkmnbinder (what to beat), Animal Crossing / Stardew Valley menu UI, physical scrapbook & stationery textures, vintage Pokémon print materials. Reference libraries: dribbble, mobbin, supahero, [webinteractions.gallery](http://webinteractions.gallery).
- **Starter tokens (to be finalized in milestone 1):** warm paper-tone palette + one accent; a friendly display face paired with a readable body font; paper/linen textures; motion principles — page-flip easing modeled on real paper, soft shadows, no snappy corporate transitions.
- Fable's plan must include a design-token pass **before** feature UI, so every component inherits the cozy language.

# 🅒 Development & Launch Planning

## Key Milestones

| # | Milestone | Target | Notes |
| --- | --- | --- | --- |
| M0 | Fable planning session — PRD → implementation plan | **Today (Jul 11)** | One-shot plan for 5.6 Sol |
| M1 | Design tokens + **page-flip prototype** | First build | De-risks the signature interaction earliest |
| M2 | Data seed + search/filter index (+ color pipeline on one set) |  | Cached dataset live |
| M3 | Binder/page CRUD + spread editor incl. merged-slot model |  | Slot model acceptance criteria |
| M4 | Media editor + print export + calibration sheet + pull list |  | Print a real test page |
| M5 | Accounts + gating + templates/starter binder + share-as-image |  | V1 complete |
| — | Weekly iteration (few hrs/week) until satisfactory | Ongoing | Expect post-one-shot punch list |

## Operational Checklist

- [ ]  Managed auth + hosted DB chosen (no custom auth)
- [ ]  pokemon-tcg-data re-sync job documented (new set releases)
- [ ]  Color pipeline validated on one set before full run
- [ ]  Calibration print verified on home printer
- [ ]  CC0 sources for art packs documented
- [ ]  2D fallback tested on a low-end device
- [ ]  4x3 insertion-direction map verified on a real page (before M3)

# 🅓 Other

## Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| Feature list not robust vs. competitors | Features derived via Opportunity Tree from evidenced user problems, not brainstormed; positioning avoids head-on tracker competition (see Appendix) |
| Polish gap — no design system | Design Language section + token-first milestone; moodboard before UI |
| 3D flip feels janky | M1 prototype first; 2D fallback specced |
| Merged-slot complexity blows up one-shot | Slot model + acceptance criteria specced in Key Logic |
| Image hotlink rot / ToS | Caching layer now; self-hosting decision flagged |
| Accounts scope creep | Managed services only, minimal surface |
| Art licensing exposure | CC0-only packs; user uploads are user's responsibility; no proxy printing |

## Appendix — Discovery Trace

### How Might We clusters

- **Compose:** HMW let collectors arrange cards across facing pages — merged slots, cross-page spans — as naturally as laying a binder on a table? HMW make experimenting cheaper than re-sleeving?
- **Discover:** HMW help collectors find cards matching a vibe instead of filtering a checklist?
- **Bridge:** HMW guarantee custom art prints exactly right for merged slots and side-loading pockets?
- **Feel:** HMW make the tool feel like the hobby — not a database with a Pokémon skin?
- **Acquire (deferred):** HMW turn a finished design into an actionable wishlist?

### Opportunity Tree (Outcome → Opportunities → Solutions)

**Outcome:** a collector designs a spread digitally and faithfully brings it into their physical binder (spreads completed, exports printed, time-to-first-spread).

- **O1 — "Can't see a spread until it's physically built"** → layout engine; merged-slot presets; free-form editing *(evidence: Canva workaround tutorials)*
- **O2 — "Tool should feel like the hobby"** → 2.5/3D binder + flip; cozy design language *(evidence: corporate feel of all competitors)*
- **O3 — "Don't know which cards complete the vibe"** → vibe search; full search on cached data *(evidence: pkmnbinder color search, disconnected from building)*
- **O4 — "Art never prints right for my pockets"** → media editor + print-true export *(evidence: side-loading orientation conflicts)*
- **O5 — "Want to plan with cards I don't own"** → ownership badge; future: inventory import *(evidence: competitor table stakes)*
- **O6 — "Want to share / recreate spreads"** → share-as-image; template cloning; future: community cloning *(evidence: organic TikTok/IG sharing)*

### DFV scorecard (Desirability · Feasibility · Viability)

| Feature | D | F | V | Key risk → de-risk |
| --- | --- | --- | --- | --- |
| Layout engine + merged slots + editing | High | Med | High | Slot model specced with acceptance criteria |
| 2.5/3D binder + flip | High | Low-Med | High | M1 prototype; 2D fallback |
| Cozy design language | High | Med | High | Token-first milestone + moodboard |
| Search + filters (cached) | High | High | Med | Re-sync job documented |
| Vibe search | Med-High | Med | Med | Color pipeline validated on one set |
| Media editor + print export | High | Med | Med | Calibration sheet |
| Art packs (CC0) | Med | High | Med | CC0-only sourcing |
| Templates + starter binder | High | High | High | — |
| Ownership badge | Med | High | Med | Bounded to a badge |
| Share-as-image | Med-High | High | High | — |
| Accounts + gate | Low-Med | Med | High | Managed services only |
| Pull list export | Med | High | Low-Med | — |

## Changelog

| Date | Change |
| --- | --- |
| Jul 11, 2026 | v1 drafted from discovery sprint (POV/HMW → Opportunity Tree → DFV) |
| Jul 11, 2026 | v1.1 — added canonical print-size presets; non-destructive media editing principle; replaced session undo with destructive-action safeguards |
| Jul 11, 2026 | v1.2 — side-loading insertion map added to slot model; uniform pocket dimensions confirmed (formula-based exports, all layouts in V1) |
| Jul 11, 2026 | v1.3 — centimeters declared canonical physical unit (inch values approximate), per plan review ([decisions.md](http://decisions.md) D4) |