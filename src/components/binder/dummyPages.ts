export type DummyPage = {
  id: number;
  label: string;
  note: string;
  wash: 'sun' | 'shade' | 'deep' | 'paper';
  rows?: number;
  cols?: number;
  slots?: {
    row: number;
    col: number;
    rowSpan: number;
    colSpan: number;
    imageUrl?: string;
  }[];
};

/** Six dummy leaves so the M1 prototype can flip a whole short binder. */
export const DUMMY_PAGES: DummyPage[] = [
  { id: 1, label: 'Page 1', note: 'Opens alone on the right, facing the inside cover.', wash: 'sun' },
  { id: 2, label: 'Page 2', note: 'Left of the first facing pair.', wash: 'paper' },
  { id: 3, label: 'Page 3', note: 'Right of the first facing pair.', wash: 'shade' },
  { id: 4, label: 'Page 4', note: 'Left of the second facing pair.', wash: 'sun' },
  { id: 5, label: 'Page 5', note: 'Right of the second facing pair.', wash: 'deep' },
  { id: 6, label: 'Page 6', note: 'Last leaf — back cover waits on the right.', wash: 'paper' },
];

export function spreadCountFor(pages: DummyPage[]) {
  return 1 + Math.ceil(Math.max(0, pages.length - 1) / 2);
}

export const SPREAD_COUNT = spreadCountFor(DUMMY_PAGES);

/** Facing pairs: spread 0 = cover|1, then (2,3), (4,5)… last odd page may face the back cover. */
export function spreadPages(
  spreadIndex: number,
  pages: DummyPage[] = DUMMY_PAGES,
): {
  left: DummyPage | 'cover' | 'back';
  right: DummyPage | 'cover' | 'back';
} {
  if (spreadIndex <= 0) return { left: 'cover', right: pages[0] ?? 'back' };
  const left = pages[spreadIndex * 2 - 1];
  const right = pages[spreadIndex * 2];
  return { left: left ?? 'back', right: right ?? 'back' };
}
