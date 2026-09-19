'use client';

import { useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Marker } from '@/components/ui/Marker';
import { PromptStrip } from '@/components/ui/PromptStrip';
import { Dialog } from '@/components/ui/Dialog';
import { CardImage } from '@/components/ui/CardImage';

const SURFACES = [
  ['paper', 'Page ground'],
  ['paper-raised', 'Panel ground'],
  ['paper-sunk', 'Recess, strips'],
  ['paper-deep', 'Desk behind the binder'],
] as const;

const INKS = [
  ['ink', 'Outlines, body text'],
  ['ink-soft', 'Secondary text'],
  ['ink-faint', 'Disabled, metadata'],
  ['rule', 'Hairlines'],
] as const;

const ACCENTS = [
  ['red', 'Primary action, caret'],
  ['teal', 'Confirmed, owned'],
  ['blue', 'Informational, merged'],
] as const;

function Swatch({ token, note }: { token: string; note: string }) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className="h-9 w-9 flex-none rounded-sm border border-ink"
        style={{ background: `var(--color-${token})` }}
      />
      <span className="min-w-0">
        <span className="gb-num block text-mini text-ink">--color-{token}</span>
        <span className="block text-micro text-ink-faint">{note}</span>
      </span>
    </li>
  );
}

function Section({
  title,
  count,
  children,
  className = '',
}: {
  title: string;
  count?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Panel title={title} count={count} stepped className={className}>
      {children}
    </Panel>
  );
}

export function StyleGuide() {
  const [tab, setTab] = useState<'album' | 'index' | 'print'>('album');
  const [chips, setChips] = useState<string[]>(['Fire']);
  const [row, setRow] = useState('A02');
  const [dialog, setDialog] = useState(false);

  const toggleChip = (name: string) =>
    setChips((c) => (c.includes(name) ? c.filter((x) => x !== name) : [...c, name]));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <p className="gb-label">Michi Binder Studio · design system</p>
        <h1 className="mt-1 text-3xl">Card GB system</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Framed panels with title strips, a caret that marks what is selected, index
          metaphors, and a prompt strip that always says what happens next. The retro
          register lives in micro-labels, counters and markers. Body text is an ordinary
          readable face, because this is an application and not an emulator.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Colour" count="11 shown">
          <p className="gb-label mb-2">Surfaces</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {SURFACES.map(([t, n]) => (
              <Swatch key={t} token={t} note={n} />
            ))}
          </ul>
          <p className="gb-label mt-4 mb-2">Ink</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {INKS.map(([t, n]) => (
              <Swatch key={t} token={t} note={n} />
            ))}
          </ul>
          <p className="gb-label mt-4 mb-2">Accents</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {ACCENTS.map(([t, n]) => (
              <Swatch key={t} token={t} note={n} />
            ))}
          </ul>
          <p className="mt-4 text-mini text-ink-soft">
            Three accents, each with one job. Colour never carries state on its own — every
            state below also changes shape, glyph or weight.
          </p>
        </Section>

        <Section title="Typography">
          <div className="grid gap-3">
            <div>
              <p className="gb-label">Display · 1.875rem / 650</p>
              <p className="text-3xl">Second spread, Eeveelutions</p>
            </div>
            <div>
              <p className="gb-label">Heading · 1.125rem / 650</p>
              <p className="text-lg font-semibold">Merge two pockets</p>
            </div>
            <div>
              <p className="gb-label">Body · 0.9375rem</p>
              <p>
                A pocket is 7 by 9.5 centimetres. Art that spans two pockets prints at 14 by
                9.5, and the seam between them decides whether it goes in as one piece.
              </p>
            </div>
            <div>
              <p className="gb-label">Micro-label · mono, 0.6875rem, tracked</p>
              <p className="gb-label">CARD BOX · ALBUM 51/226 · PLAY TIME 0:14</p>
            </div>
            <div className="gb-stats mt-1 border-t border-rule pt-3">
              <p className="gb-stat">
                <span className="gb-stat__key">Album</span>
                <span className="gb-stat__dots" aria-hidden="true" />
                <span className="gb-stat__val">51/226</span>
              </p>
              <p className="gb-stat">
                <span className="gb-stat__key">Spreads</span>
                <span className="gb-stat__dots" aria-hidden="true" />
                <span className="gb-stat__val">5</span>
              </p>
              <p className="gb-stat">
                <span className="gb-stat__key">Art pockets</span>
                <span className="gb-stat__dots" aria-hidden="true" />
                <span className="gb-stat__val">2</span>
              </p>
            </div>
            <p className="text-mini text-ink-soft">
              Two platform stacks: a UI sans for everything readable, a mono for anything
              counted or indexed. No webfont is downloaded, so the build never depends on a
              font server.
            </p>
          </div>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="gb-btn gb-btn--primary gb-btn--lg">
              Open the starter binder
            </button>
            <button type="button" className="gb-btn">
              Secondary
            </button>
            <button type="button" className="gb-btn gb-btn--confirm">
              Confirm
            </button>
            <button type="button" className="gb-btn gb-btn--quiet">
              Quiet
            </button>
            <button type="button" className="gb-btn" disabled>
              Disabled
            </button>
            <button type="button" className="gb-icon-btn" aria-label="Previous spread">
              <span aria-hidden="true">◀</span>
            </button>
            <button type="button" className="gb-icon-btn" aria-label="Next spread">
              <span aria-hidden="true">▶</span>
            </button>
          </div>
          <p className="mt-3 text-mini text-ink-soft">
            A hard 1px offset step instead of a blurred shadow. Pressing moves the button
            onto its own step. Every control is at least 36px tall; icon buttons are 32px
            square and always carry a name.
          </p>
          <p className="mt-2 text-mini text-ink-soft">
            Tab through this page: focus is a 2px ink outline offset from the control, the
            same on every ground.
          </p>
        </Section>

        <Section title="Inputs and filters">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="gb-label">Name or artist</span>
              <input className="gb-input" placeholder="Pikachu, Ken Sugimori…" />
            </label>
            <label className="grid gap-1">
              <span className="gb-label">Set</span>
              <select className="gb-select" defaultValue="">
                <option value="">Any set</option>
                <option>Base Set</option>
                <option>Jungle</option>
              </select>
            </label>
          </div>
          <p className="gb-label mt-4 mb-2">Type filter</p>
          <div className="flex flex-wrap gap-1.5">
            {['Grass', 'Fire', 'Water', 'Psychic'].map((t) => (
              <button
                key={t}
                type="button"
                className="gb-chip"
                aria-pressed={chips.includes(t)}
                onClick={() => toggleChip(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <p className="mt-3 text-mini text-ink-soft">
            An active chip inverts and gains a tick, so it is legible without colour.
          </p>
        </Section>

        <Section title="Tabs and menus" className="lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="gb-panel">
              <div className="gb-tabs" role="tablist" aria-label="Style guide example">
                {(['album', 'index', 'print'] as const).map((t) => (
                  <button
                    key={t}
                    role="tab"
                    type="button"
                    className="gb-tab"
                    aria-selected={tab === t}
                    onClick={() => setTab(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="gb-panel__body text-sm text-ink-soft">
                Restrained tabs: a ruled row, an inverted active tab, an underline. Panel
                showing: <span className="gb-num text-ink">{tab}</span>.
              </div>
            </div>

            <Panel title="1. Colosseum" count="6/56" flush>
              <ul role="listbox" aria-label="Card index example" className="p-1">
                {[
                  ['A01', 'Bulbasaur', 'LV20'],
                  ['A02', 'Ivysaur', 'LV25'],
                  ['A03', 'Venusaur', 'LV64'],
                  ['A04', 'Charmander', 'LV10'],
                ].map(([id, name, lv]) => (
                  <li key={id}>
                    <button
                      type="button"
                      role="option"
                      className="gb-row"
                      aria-selected={row === id}
                      onClick={() => setRow(id)}
                    >
                      <span className="flex min-w-0 items-baseline gap-2">
                        <span className="gb-index">{id}</span>
                        <span className="truncate">{name}</span>
                        <span className="gb-index ml-auto">{lv}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
          <p className="mt-3 text-mini text-ink-soft">
            The caret sits in a fixed gutter, so rows never shift when selection moves. It is
            the single selection idiom in the app: lists, pages and pockets all use it.
          </p>
        </Section>

        <Section title="Pocket states" className="lg:col-span-2">
          <div
            className="binder mx-auto"
            style={{ ['--binder-max' as string]: '20rem' } as React.CSSProperties}
          >
            <div className="binder-page binder-page--right">
              <div
                className="binder-grid"
                style={{ gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: 'repeat(3,1fr)' }}
              >
                <div className="binder-pocket" data-open-side="L" />
                <div className="binder-pocket" data-open-side="L">
                  <span className="absolute inset-[5%]">
                    <CardImage src={null} name="Charizard" setId="base1" number="4" seed="base1-4" />
                  </span>
                </div>
                <div
                  className="binder-pocket outline-2 -outline-offset-2 outline-red"
                  data-open-side="R"
                >
                  <span className="absolute top-0 left-0.5 z-2 text-[0.7rem] text-red" aria-hidden="true">
                    &#9656;
                  </span>
                </div>
                <div className="binder-pocket binder-pocket--merged col-span-2 row-span-2 flex items-end bg-blue-wash p-[3%]">
                  <span className="gb-marker gb-marker--merge scale-90 origin-bottom-left">
                    Split into 2
                  </span>
                </div>
                <div className="binder-pocket" data-open-side="R">
                  <span className="absolute inset-[5%]">
                    <CardImage src={null} name="Mew" setId="base4" number="8" seed="base4-8" />
                  </span>
                </div>
                <div className="binder-pocket" data-open-side="R" />
              </div>
            </div>
          </div>
          <ul className="mt-3 grid gap-1.5 text-mini text-ink-soft sm:grid-cols-2">
            <li>
              <b className="text-ink">Empty</b> — a recessed well with a sleeve sheen.
            </li>
            <li>
              <b className="text-ink">Filled</b> — the card sits inside the sleeve.
            </li>
            <li>
              <b className="text-ink">Selected</b> — ink-red outline plus a caret in the
              corner, never colour alone.
            </li>
            <li>
              <b className="text-ink">Merged</b> — one pocket spanning cells, washed blue.
            </li>
          </ul>
          <p className="mt-2 text-mini text-ink-soft">
            The pale lip on one side of each pocket is the side-loading opening, taken from
            the layout&rsquo;s insertion map. Columns 1 and 2 open left; column 3 opens right.
            That is why a horizontal span across the third seam has to be split.
          </p>
        </Section>

        <Section title="Status markers">
          <div className="flex flex-wrap gap-2">
            <Marker tone="owned">Owned</Marker>
            <Marker tone="wanted">Wanted</Marker>
            <Marker tone="merge">Split into 2</Marker>
            <Marker tone="note">Unverified</Marker>
          </div>
          <p className="mt-3 text-mini text-ink-soft">
            Each marker carries a glyph and a word as well as a tint.
          </p>
        </Section>

        <Section title="Prompt strip">
          <div className="grid gap-2">
            <PromptStrip>Pick a pocket, or search for a card to place.</PromptStrip>
            <PromptStrip tone="asking">
              Where should <b>Charizard</b> go? Click a pocket.
            </PromptStrip>
            <PromptStrip tone="problem">
              Those pockets aren&rsquo;t next to each other, so they can&rsquo;t become one.
            </PromptStrip>
          </div>
          <p className="mt-3 text-mini text-ink-soft">
            One fixed place that says what the app wants next, and the only place an invalid
            action is explained — in plain words, never an error code.
          </p>
        </Section>

        <Section title="Empty, loading and saved states" className="lg:col-span-2">
          <div className="grid gap-3 md:grid-cols-3">
            <Panel title="Card box" count="0" sunk>
              <p className="text-sm text-ink-soft">
                Nothing matches that yet. Try a shorter name, or clear a filter.
              </p>
              <button type="button" className="gb-btn mt-3">
                Clear filters
              </button>
            </Panel>
            <Panel title="Card box" sunk>
              <div className="grid grid-cols-2 gap-2" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="aspect-[5/7] animate-pulse rounded-sm bg-paper-deep" />
                ))}
              </div>
              <p className="mt-2 text-mini text-ink-faint">Opening the card box…</p>
            </Panel>
            <Panel title="Save" sunk>
              <div className="grid gap-2">
                <span className="gb-marker gb-marker--owned">Saved on this device</span>
                <span className="gb-marker gb-marker--note">Offline — kept locally</span>
                <span className="gb-marker gb-marker--wanted">Could not save</span>
              </div>
            </Panel>
          </div>
        </Section>

        <Section title="Dialog and undo" className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="gb-btn gb-btn--primary" onClick={() => setDialog(true)}>
              Open a dialog
            </button>
            <span className="gb-prompt">
              Pocket cleared.
              <button type="button" className="gb-btn gb-btn--quiet ml-2">
                Undo
              </button>
            </span>
          </div>
          <p className="mt-3 text-mini text-ink-soft">
            Dialogs trap focus, close on Escape, and return focus to whatever opened them.
            Every destructive action leaves an undo behind it.
          </p>
          {dialog ? (
            <Dialog
              title="Replace this card?"
              description="Charizard is already in this pocket. Placing Blastoise will take its place."
              onClose={() => setDialog(false)}
              footer={
                <>
                  <button type="button" className="gb-btn" onClick={() => setDialog(false)}>
                    Keep Charizard
                  </button>
                  <button
                    type="button"
                    className="gb-btn gb-btn--primary"
                    onClick={() => setDialog(false)}
                  >
                    Replace
                  </button>
                </>
              }
            >
              <p className="text-sm text-ink-soft">
                You can undo this for a few seconds afterwards.
              </p>
            </Dialog>
          ) : null}
        </Section>

        <Section title="Responsive" className="lg:col-span-2">
          <p className="text-sm text-ink-soft">
            The editor targets desktop and tablet. Below the tablet breakpoint the tool panel
            moves under the binder rather than beside it, and the binder keeps its true
            proportions by scaling down — it is never stretched to fill.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {[
              ['Desktop ≥1280px', 'Tools left, binder centre, inspector right'],
              ['Tablet 768–1279px', 'Tools left, binder centre, inspector below'],
              ['Narrow <768px', 'Read-only friendly: binder first, tools stacked under'],
            ].map(([w, d]) => (
              <div key={w} className="gb-panel gb-panel--sunk">
                <p className="gb-strip">{w}</p>
                <p className="gb-panel__body text-mini text-ink-soft">{d}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </main>
  );
}
