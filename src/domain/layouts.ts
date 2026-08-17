export type Direction = 'L' | 'R';
export type LayoutId = '2x2' | '3x3' | '4x3' | '4x4';
export type PageMode = 'single' | 'double';

export interface LayoutDef {
  id: LayoutId;
  rows: number;
  cols: number;
  /** null = unverified — every column seam is sealed (data-model §6.4). */
  insertionMap: Direction[] | null;
}

export const LAYOUTS: Record<LayoutId, LayoutDef> = {
  '2x2': { id: '2x2', rows: 2, cols: 2, insertionMap: ['R', 'L'] },
  '3x3': { id: '3x3', rows: 3, cols: 3, insertionMap: ['L', 'L', 'R'] },
  '4x3': { id: '4x3', rows: 4, cols: 3, insertionMap: null },
  '4x4': { id: '4x4', rows: 4, cols: 4, insertionMap: ['L', 'L', 'R', 'R'] },
};

export const SLOT_CM = { width: 7, height: 9.5 };

/** Seam between col i and i+1 is open iff adjacent openings match. Null map → all sealed. */
export function columnSeamOpen(layout: LayoutDef, col: number): boolean {
  if (!layout.insertionMap) return false;
  if (col < 0 || col >= layout.cols - 1) return false;
  return layout.insertionMap[col] === layout.insertionMap[col + 1];
}

export function isLeftFacingPage(position: number): boolean {
  return position >= 2 && position % 2 === 0;
}

export function facingRightPosition(position: number): number | null {
  return isLeftFacingPage(position) ? position + 1 : null;
}
