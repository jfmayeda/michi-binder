export type Ownership = 'owned' | 'wanted';
export type AssetKind = 'upload' | 'pack';

export interface Transform {
  version: 1;
  crop: { x: number; y: number; w: number; h: number };
  rotation: 0 | 90 | 180 | 270;
}

export interface Merge {
  id: string;
  pageId: string;
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  spansGutter: boolean;
}

export interface Placement {
  id: string;
  pageId: string;
  mergeId: string | null;
  row: number | null;
  col: number | null;
  kind: 'card' | 'art';
  cardId: string | null;
  assetKind: AssetKind | null;
  uploadAssetId: string | null;
  packItemId: string | null;
  transform: Transform | Record<string, never>;
  ownership: Ownership | null;
}

export interface Page {
  id: string;
  binderId: string;
  position: number;
}

export interface Binder {
  id: string;
  title: string;
  layoutId: import('./layouts').LayoutId;
  pageMode: import('./layouts').PageMode;
  pages: Page[];
  merges: Merge[];
  placements: Placement[];
}

export type MergeProposal = {
  pageId: string;
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  spansGutter?: boolean;
};
