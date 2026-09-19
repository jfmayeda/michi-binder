# Michi Binder Studio — rebuilding the face, keeping the brain

**Status: pre-release.** No public launch, no users, no adoption or conversion data. Every
number below is a measurement of the software, not of anyone's behaviour.

---

## The product

Michi Method collectors curate binder pages for how they look: cards chosen for colour and art,
pockets merged so a printed piece spans several of them, whole spreads composed across two
facing pages. The only way to find out whether a page works is to build it — sleeve the cards,
print the art, slide it in. Getting it wrong means re-sleeving and reprinting.

Michi Binder Studio is where that page gets designed first. It is a design tool, deliberately
not a tracker or a price checker.

Two constraints shape everything:

- **A pocket is 7 × 9.5 cm.** Art spanning a 2 × 2 block must print at exactly 14 × 19 cm, or it
  does not fit.
- **Pockets are side-loading, and the openings face different ways per column.** Row seams are
  always sealed, so a vertical span has to be cut into one print per row. Horizontal spans can
  sometimes be threaded whole, depending on which way the openings chain.

That second constraint is the interesting one. It is a physical fact about a plastic page, and a
design tool that ignores it produces art that cannot be inserted.

## The situation this run inherited

An earlier unattended run produced a complete V1: the slot model, the split algorithm, print
maths, a card search index over the public TCG dataset, browser persistence, exports, and 116
passing tests. It also produced an interface that was rejected twice — first a beige scrapbook,
then a navy-and-yellow revision. The project's own log concluded: keep the brain, rebuild the
face, and do not invent a third loud palette unattended.

This run was given the references the log was waiting for: the album screens from the Game Boy
Pokémon Card game.

## Reading the references as structure

The temptation with a reference like that is to make a pixel-art website. That would be a
costume. What is actually good about those screens is how they organise information under very
tight constraints:

- A framed panel with a **title strip** and a **counter** in the corner. You always know what
  you are looking at and how much of it there is.
- A **cursor** marking the active row. Selection is a mark in a fixed gutter, not a colour wash,
  so it reads at a glance and never shifts the layout.
- A **prompt box** at the bottom that states what the machine wants: *"VIEW WHICH CARD FILE?"*
  One fixed place, always answering "what do I do now".
- **Indexed entries** — `A01`, `56/56`, `ALBUM 51/226` — that make quantity legible.

Those four ideas became the system. The retro register is confined to micro-labels, counters,
markers and hard-edged geometry. Body text is a normal readable sans. There is no pixel font.

The palette is warm white, pale gray, near-black ink, and three accents with one job each: muted
red for the primary action and the selection cursor, teal for confirmed and owned, blue for
informational and merged. Nothing in the app signals state by colour alone — selection also adds
a cursor and an outline, an active filter also gains a tick, a status marker also carries a
glyph.

## Three decisions worth the space

**The binder's proportions come from the domain, not from taste.**
The previous build hardcoded the spread at 2.05 : 1. A 3 × 3 page is 21 × 28.5 cm, so a spread
is 42 × 28.5 — about 1.47 : 1. The page was roughly 39% too wide, which squashed every pocket,
and it was wrong in a different way for each of the four layouts. The rebuild computes the
aspect from `LAYOUTS` and `SLOT_CM`: `(cols × 7) / (rows × 9.5)`. One formula, every layout
correct, and the binder can no longer be stretched by its container.

**The physical constraint is drawn on the page.**
Each pocket has a pale lip along the side it actually loads from, taken from the layout's
insertion map. Select a pocket and the inspector says *"Opens from: the left"*. Merge a block
and it is annotated with its assembly consequence — single insert, slide-through, or split into
N pieces — straight from the split algorithm. The rule stops being a surprise at export time and
becomes something visible while you design.

**The prompt strip carries the interaction model.**
The editor has one line under the binder that always says what happens next. Pick a card and it
reads *"Click a pocket to put Blastoise in it. A pocket that already has something will be
replaced, and you can undo that."* Select two pockets that cannot merge and it explains why in
plain words rather than offering a button that would fail. It is where the Card GB prompt box
went, and it is doing real work.

## What the audit found

Running the P0 journey through the existing code first, before changing anything:

- The production build failed outright: `next/font/google` fetches its fonts at build time.
- "Clone this page" wrote the copy over the visitor's own saved page with no confirmation, and
  the secondary action then reopened the clone instead of a blank page. Two buttons, one
  destination, one of them destructive.
- **The art export contained no art.** It produced correctly sized blank pages with crop marks.
  The print maths was right; the picture was missing.
- The "3 mm bleed" checkbox was wired to nothing. A "Download PNG" button produced a blank beige
  rectangle at the right pixel dimensions.
- There was no undo for placing a card into an occupied pocket — the most common destructive
  action in the editor was the only one that could not be taken back.
- Print and export could only be reached from a small chip inside a merged pocket that already
  contained art.

Those are in `docs/CARD_GB_REBUILD_AUDIT.md` with fourteen others.

## What shipped

Landing opens on a real spread from the starter binder: a full page of Base Set Kanto facing a
page built around one empty 2 × 2 pocket labelled **14 × 19 cm**. That picture makes the argument
better than copy would. One dominant action edits a copy of the spread on screen.

The editor puts the binder in the middle, the card box and art box on the left, contextual
properties on the right, and the prompt and save state along the bottom. Pocket actions have
text labels and live in the inspector, so only what applies to the current selection is on
screen.

Every edit goes through one undo stack, Ctrl+Z included. Print and export is one dialog from the
header, covering art export, the calibration sheet, the pull list and the share image, and it
says plainly that no printer has been ruler-checked.

## Verification

| Check | Before | After |
| --- | --- | --- |
| Production build | fails | passes |
| Type check | 1 error | 0 errors |
| Lint | 7 errors | 0 errors |
| Unit tests | 116 passing | 120 passing |
| Playwright | could not run | 13 passing |

The end-to-end suite is the actual journey, not a smoke test: place, replace, merge, undo each
step, reach print, reload and confirm the work survived.

The export was measured by reading the PDF back. Art placed in a 2 × 2 pocket produces a
14.00 × 19.00 cm full artwork page plus two 14.00 × 9.50 cm pieces, split at the sealed row seam,
each with 3 mm of bleed, each carrying an embedded image. That matches the PRD's canonical
preset table exactly.

Across eleven captures at desktop, tablet and phone widths there are no console errors, no
controls without accessible names, and no interactive targets under 24 px.

## What is not true yet

- **No printer has been measured.** The files are dimensionally exact in software. Nobody has
  printed a sheet and put a ruler on it. The app says so where it matters.
- **Accounts are not enabled.** With no Supabase keys the sign-in panel says accounts are off
  rather than showing a form that silently fails. The adapter and its tests are unchanged and
  have never run against a live project.
- **The 4 × 3 insertion map is unverified.** It is still `null`, which makes the exporter split
  per pocket to be safe, and the dialog explains that.
- **The card image host was unreachable** on the machine this was built on, so every screenshot
  shows the typed stand-in the app falls back to. That fallback is a real feature — hotlink rot
  is a risk the PRD already names — but it means the images have not been seen end to end here.
- **No one has used this.** There is no adoption, retention or conversion data, because there
  are no users.

The full list is in `docs/CARD_GB_REBUILD_REVIEW.md`.
