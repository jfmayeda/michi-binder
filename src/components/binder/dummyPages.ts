export type DummyPage = {
  id: number;
  label: string;
  note: string;
  wash: 'sun' | 'shade' | 'deep' | 'paper';
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

export const SPREAD_COUNT = 4;

/** Facing pairs: spread 0 = cover|1, then (2,3), (4,5), (6|back). */
export function spreadPages(spreadIndex: number): {
  left: DummyPage | 'cover' | 'back';
  right: DummyPage | 'cover' | 'back';
} {
  if (spreadIndex <= 0) return { left: 'cover', right: DUMMY_PAGES[0] };
  if (spreadIndex === 1) return { left: DUMMY_PAGES[1], right: DUMMY_PAGES[2] };
  if (spreadIndex === 2) return { left: DUMMY_PAGES[3], right: DUMMY_PAGES[4] };
  return { left: DUMMY_PAGES[5], right: 'back' };
}
