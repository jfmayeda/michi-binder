
---

## Resumed — 19 Sep 2026

Direction chosen and built. References: Pokémon Card GB album screens, supplied by Jacob.
Branch `fable/michi-card-gb-rebuild`, based on PR #2 as the parts bin, as planned above.

The brain was preserved: `src/domain`, `src/search`, `public/data`, print maths, persistence and
all the acceptance tests are untouched apart from two bug fixes with tests attached. The face is
new: framed panels with title strips, a selection caret in a fixed gutter, a prompt strip that
says what happens next, hard ink outlines, and a binder whose proportions now derive from the
7 × 9.5 cm pocket instead of a hardcoded ratio — which is what had been squashing the pages.

Gate 1 is still Jacob's to call. See `docs/CARD_GB_REBUILD_PLAN.md` for the direction and the
decisions taken, `docs/CARD_GB_REBUILD_AUDIT.md` for what was wrong, and
`docs/CARD_GB_REBUILD_REVIEW.md` for verification results and the honest list of gaps.
