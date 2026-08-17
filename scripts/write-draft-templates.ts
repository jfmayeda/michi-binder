/**
 * Writes draft template JSON (Jacob curates later).
 * node --experimental-strip-types scripts/write-draft-templates.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(import.meta.dirname, '..');
const index = JSON.parse(readFileSync(join(ROOT, 'public/data/cards-index.json'), 'utf8')) as {
  id: string[];
  name: string[];
  setId: string[];
  number: string[];
};

function card(id: string) {
  const i = index.id.indexOf(id);
  if (i < 0) throw new Error(id);
  const encoded = index.number[i].replaceAll(' ', '');
  return {
    card_id: id,
    name: index.name[i],
    set: index.setId[i],
    number: index.number[i],
    imageUrl: `https://images.pokemontcg.io/${index.setId[i]}/${encoded}.png`,
  };
}

function placement(pageId: string, id: string, row: number, col: number, cardId: string) {
  const display = card(cardId);
  return {
    id,
    pageId,
    mergeId: null,
    row,
    col,
    kind: 'card',
    cardId,
    assetKind: null,
    uploadAssetId: null,
    packItemId: null,
    transform: {},
    ownership: null,
    card: display,
  };
}

function mergePlacement(pageId: string, mergeId: string, id: string, cardId: string) {
  const display = card(cardId);
  return {
    id,
    pageId,
    mergeId,
    row: null,
    col: null,
    kind: 'card',
    cardId,
    assetKind: null,
    uploadAssetId: null,
    packItemId: null,
    transform: {},
    ownership: 'wanted',
    card: display,
  };
}

const outDir = join(ROOT, 'src/templates/catalog');
mkdirSync(outDir, { recursive: true });

const pages = Array.from({ length: 9 }, (_, i) => ({
  id: `starter-p${i + 1}`,
  position: i + 1,
}));

const starter = {
  version: 1 as const,
  kind: 'starter-binder' as const,
  id: 'starter-binder',
  title: 'First scrapbook (draft)',
  draft: true as const,
  notes: 'Draft starter binder — Jacob will curate these spreads.',
  layoutId: '3x3',
  pageMode: 'double',
  pages,
  merges: [
    {
      id: 'starter-m1',
      pageId: 'starter-p3',
      row: 0,
      col: 0,
      rowSpan: 2,
      colSpan: 2,
      spansGutter: false,
    },
  ],
  placements: [
    placement('starter-p1', 'pl-1', 0, 0, 'base1-58'),
    placement('starter-p1', 'pl-2', 0, 1, 'base1-46'),
    placement('starter-p1', 'pl-3', 1, 0, 'base1-63'),
    placement('starter-p2', 'pl-4', 0, 0, 'base1-44'),
    placement('starter-p2', 'pl-5', 0, 1, 'base1-30'),
    placement('starter-p2', 'pl-6', 0, 2, 'base1-15'),
    mergePlacement('starter-p3', 'starter-m1', 'pl-7', 'base1-4'),
    placement('starter-p3', 'pl-8', 0, 2, 'base1-24'),
    placement('starter-p4', 'pl-9', 1, 1, 'base1-2'),
    placement('starter-p4', 'pl-10', 1, 0, 'base1-42'),
    placement('starter-p5', 'pl-11', 0, 0, 'base1-10'),
    placement('starter-p5', 'pl-12', 0, 1, 'basep-47'),
    placement('starter-p6', 'pl-13', 1, 1, 'base2-51'),
    placement('starter-p6', 'pl-14', 0, 0, 'base2-19'),
    placement('starter-p6', 'pl-15', 0, 2, 'base2-12'),
    placement('starter-p7', 'pl-16', 0, 1, 'base2-54'),
    placement('starter-p7', 'pl-17', 1, 1, 'base2-16'),
    placement('starter-p8', 'pl-18', 0, 0, 'base3-20'),
    placement('starter-p8', 'pl-19', 2, 2, 'base3-19'),
    placement('starter-p9', 'pl-20', 1, 1, 'pgo-35'),
    placement('starter-p9', 'pl-21', 0, 2, 'bw5-60'),
  ],
};

function pageTemplate(
  id: string,
  title: string,
  notes: string,
  fills: { row: number; col: number; cardId: string }[],
  merge?: { row: number; col: number; rowSpan: number; colSpan: number; cardId: string },
) {
  const pageId = `${id}-p1`;
  const merges = merge
    ? [
        {
          id: `${id}-m`,
          pageId,
          row: merge.row,
          col: merge.col,
          rowSpan: merge.rowSpan,
          colSpan: merge.colSpan,
          spansGutter: false,
        },
      ]
    : [];
  const placements = [
    ...(merge ? [mergePlacement(pageId, `${id}-m`, `${id}-mp`, merge.cardId)] : []),
    ...fills.map((f, i) => placement(pageId, `${id}-pl${i}`, f.row, f.col, f.cardId)),
  ];
  return {
    version: 1 as const,
    kind: 'page-template' as const,
    id,
    title,
    draft: true as const,
    notes,
    layoutId: '3x3',
    pageMode: 'single',
    pages: [{ id: pageId, position: 1 }],
    merges,
    placements,
  };
}

const templates = [
  starter,
  pageTemplate(
    'kanto-starters',
    'Kanto desk (draft)',
    'Draft page template — Jacob will replace.',
    [
      { row: 0, col: 0, cardId: 'base1-46' },
      { row: 0, col: 1, cardId: 'base1-63' },
      { row: 0, col: 2, cardId: 'base1-44' },
    ],
  ),
  pageTemplate(
    'eevee-desk',
    'Eevee corner (draft)',
    'Draft page template — Jacob will replace.',
    [
      { row: 1, col: 0, cardId: 'base2-19' },
      { row: 1, col: 2, cardId: 'base2-12' },
      { row: 2, col: 1, cardId: 'base2-20' },
    ],
    { row: 0, col: 0, rowSpan: 1, colSpan: 3, cardId: 'base2-51' },
  ),
  pageTemplate(
    'pink-friends',
    'Pink friends (draft)',
    'Draft page template — Jacob will replace.',
    [
      { row: 0, col: 0, cardId: 'base2-54' },
      { row: 0, col: 1, cardId: 'base2-16' },
      { row: 1, col: 1, cardId: 'pgo-35' },
    ],
  ),
  pageTemplate(
    'legend-box',
    'Legend box (draft)',
    'Draft page template — Jacob will replace.',
    [
      { row: 0, col: 2, cardId: 'basep-47' },
      { row: 2, col: 0, cardId: 'basep-50' },
    ],
    { row: 0, col: 0, rowSpan: 2, colSpan: 2, cardId: 'base1-10' },
  ),
  pageTemplate(
    'gengar-night',
    'Gengar night (draft)',
    'Draft page template — Jacob will replace.',
    [
      { row: 0, col: 0, cardId: 'base3-20' },
      { row: 2, col: 2, cardId: 'base3-19' },
      { row: 1, col: 1, cardId: 'bw11-80' },
    ],
  ),
];

const manifest = {
  starterId: 'starter-binder',
  templates: templates.map((t) => ({ id: t.id, title: t.title, kind: t.kind, draft: true })),
};

function write(name: string, value: unknown) {
  writeFileSync(join(outDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

write('manifest.json', manifest);
for (const tpl of templates) write(`${tpl.id}.json`, tpl);
console.log(`wrote ${templates.length} templates`);
