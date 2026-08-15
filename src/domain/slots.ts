import { LAYOUTS, facingRightPosition, isLeftFacingPage, type LayoutId } from './layouts';
import type { Binder, Merge, MergeProposal, Page, Placement } from './types';

export type Cell = { pageId: string; row: number; col: number };

export function mergeArea(m: { rowSpan: number; colSpan: number }): number {
  return m.rowSpan * m.colSpan;
}

export function cellsForMerge(binder: Binder, merge: Merge): Cell[] | { error: string } {
  const layout = LAYOUTS[binder.layoutId];
  const page = binder.pages.find((p) => p.id === merge.pageId);
  if (!page) return { error: 'unknown page' };
  const cells: Cell[] = [];
  if (merge.spansGutter) {
    const rightPos = facingRightPosition(page.position);
    const right = rightPos != null ? binder.pages.find((p) => p.position === rightPos) : undefined;
    if (!right) return { error: 'no facing page' };
    for (let r = 0; r < merge.rowSpan; r += 1) {
      for (let c = 0; c < merge.colSpan; c += 1) {
        const abs = merge.col + c;
        if (abs < layout.cols) {
          cells.push({ pageId: merge.pageId, row: merge.row + r, col: abs });
        } else {
          cells.push({ pageId: right.id, row: merge.row + r, col: abs - layout.cols });
        }
      }
    }
  } else {
    for (let r = 0; r < merge.rowSpan; r += 1) {
      for (let c = 0; c < merge.colSpan; c += 1) {
        cells.push({ pageId: merge.pageId, row: merge.row + r, col: merge.col + c });
      }
    }
  }
  return cells;
}

export function validateMerge(
  binder: Binder,
  proposal: MergeProposal,
  ignoreMergeId?: string,
): { ok: true } | { ok: false; error: string } {
  const layout = LAYOUTS[binder.layoutId];
  const page = binder.pages.find((p) => p.id === proposal.pageId);
  if (!page) return { ok: false, error: 'unknown page' };
  if (proposal.rowSpan < 1 || proposal.colSpan < 1) return { ok: false, error: 'span' };
  if (mergeArea(proposal) < 2) return { ok: false, error: '1x1' };
  if (proposal.row < 0 || proposal.col < 0) return { ok: false, error: 'bounds' };
  if (proposal.row + proposal.rowSpan > layout.rows) return { ok: false, error: 'bounds' };

  const spansGutter = Boolean(proposal.spansGutter);
  if (spansGutter) {
    if (binder.pageMode !== 'double') return { ok: false, error: 'single-mode' };
    if (!isLeftFacingPage(page.position)) return { ok: false, error: 'not-left-page' };
    const rightPos = facingRightPosition(page.position);
    if (rightPos == null || !binder.pages.some((p) => p.position === rightPos)) {
      return { ok: false, error: 'no-facing-page' };
    }
    if (proposal.col + proposal.colSpan > layout.cols * 2) return { ok: false, error: 'bounds' };
    if (!(proposal.col < layout.cols && proposal.col + proposal.colSpan > layout.cols)) {
      return { ok: false, error: 'not-contiguous-gutter' };
    }
  } else if (proposal.col + proposal.colSpan > layout.cols) {
    return { ok: false, error: 'bounds' };
  }

  const draft: Merge = {
    id: 'draft',
    pageId: proposal.pageId,
    row: proposal.row,
    col: proposal.col,
    rowSpan: proposal.rowSpan,
    colSpan: proposal.colSpan,
    spansGutter,
  };
  const cells = cellsForMerge(binder, draft);
  if ('error' in cells) return { ok: false, error: cells.error };

  for (const existing of binder.merges) {
    if (existing.id === ignoreMergeId) continue;
    const other = cellsForMerge(binder, existing);
    if ('error' in other) continue;
    const keys = new Set(other.map((c) => `${c.pageId}:${c.row}:${c.col}`));
    if (cells.some((c) => keys.has(`${c.pageId}:${c.row}:${c.col}`))) {
      return { ok: false, error: 'overlap' };
    }
  }
  return { ok: true };
}

export function addMerge(binder: Binder, proposal: MergeProposal, id: string): Binder {
  const result = validateMerge(binder, proposal);
  if (!result.ok) throw new Error(result.error);
  const merge: Merge = {
    id,
    pageId: proposal.pageId,
    row: proposal.row,
    col: proposal.col,
    rowSpan: proposal.rowSpan,
    colSpan: proposal.colSpan,
    spansGutter: Boolean(proposal.spansGutter),
  };
  return { ...binder, merges: [...binder.merges, merge] };
}

export function unmerge(
  binder: Binder,
  mergeId: string,
  opts: { confirmed?: boolean } = {},
): { binder: Binder; needsConfirm: boolean } {
  const merge = binder.merges.find((m) => m.id === mergeId);
  if (!merge) return { binder, needsConfirm: false };
  const filled = binder.placements.some((p) => p.mergeId === mergeId);
  if (filled && !opts.confirmed) return { binder, needsConfirm: true };
  return {
    needsConfirm: false,
    binder: {
      ...binder,
      merges: binder.merges.filter((m) => m.id !== mergeId),
      placements: binder.placements.filter((p) => p.mergeId !== mergeId),
    },
  };
}

export function switchPageMode(
  binder: Binder,
  pageMode: Binder['pageMode'],
  opts: { confirmed?: boolean } = {},
): { binder: Binder; needsConfirm: boolean; crossPageCount: number } {
  if (pageMode === binder.pageMode) {
    return { binder, needsConfirm: false, crossPageCount: 0 };
  }
  if (pageMode === 'double') {
    return { binder: { ...binder, pageMode }, needsConfirm: false, crossPageCount: 0 };
  }
  const cross = binder.merges.filter((m) => m.spansGutter);
  if (cross.length > 0 && !opts.confirmed) {
    return { binder, needsConfirm: true, crossPageCount: cross.length };
  }
  const drop = new Set(cross.map((m) => m.id));
  return {
    needsConfirm: false,
    crossPageCount: cross.length,
    binder: {
      ...binder,
      pageMode,
      merges: binder.merges.filter((m) => !m.spansGutter),
      placements: binder.placements.filter((p) => !p.mergeId || !drop.has(p.mergeId)),
    },
  };
}

export function createBinder(opts: {
  id: string;
  layoutId: LayoutId;
  pageMode: Binder['pageMode'];
  pageCount: number;
}): Binder {
  const pages: Page[] = Array.from({ length: opts.pageCount }, (_, i) => ({
    id: `${opts.id}-p${i + 1}`,
    binderId: opts.id,
    position: i + 1,
  }));
  return {
    id: opts.id,
    title: 'My binder',
    layoutId: opts.layoutId,
    pageMode: opts.pageMode,
    pages,
    merges: [],
    placements: [],
  };
}

export function placeOnMerge(binder: Binder, placement: Placement): Binder {
  return { ...binder, placements: [...binder.placements, placement] };
}

function cellMerge(binder: Binder, pageId: string, row: number, col: number): Merge | undefined {
  for (const merge of binder.merges) {
    const cells = cellsForMerge(binder, merge);
    if ('error' in cells) continue;
    if (cells.some((c) => c.pageId === pageId && c.row === row && c.col === col)) return merge;
  }
  return undefined;
}

export function placementAt(binder: Binder, pageId: string, row: number, col: number): Placement | undefined {
  const merge = cellMerge(binder, pageId, row, col);
  if (merge) return binder.placements.find((p) => p.mergeId === merge.id);
  return binder.placements.find((p) => p.pageId === pageId && p.row === row && p.col === col);
}

export function upsertPlacement(binder: Binder, placement: Placement): Binder {
  const without = binder.placements.filter((p) => p.id !== placement.id);
  return { ...binder, placements: [...without, placement] };
}

export function removePlacement(binder: Binder, placementId: string): Binder {
  return { ...binder, placements: binder.placements.filter((p) => p.id !== placementId) };
}

export function placementFromCard(id: string, cardId: string): Placement {
  return {
    id,
    pageId: '',
    mergeId: null,
    row: null,
    col: null,
    kind: 'card',
    cardId,
    assetKind: null,
    uploadAssetId: null,
    packItemId: null,
    transform: {},
    ownership: 'owned',
  };
}

function hasOrigin(p: { mergeId: string | null; row: number | null; col: number | null }): boolean {
  return Boolean(p.mergeId) || (p.row != null && p.col != null);
}

/** Place or swap a card/art into a cell (or its merge). Occupied dest swaps when incoming has an origin. */
export function placeIntoCell(
  binder: Binder,
  pageId: string,
  row: number,
  col: number,
  incoming: Placement,
): Binder {
  const merge = cellMerge(binder, pageId, row, col);
  const existing = placementAt(binder, pageId, row, col);
  const origin = {
    pageId: incoming.pageId,
    mergeId: incoming.mergeId,
    row: incoming.row,
    col: incoming.col,
  };
  const target: Placement = merge
    ? { ...incoming, pageId: merge.pageId, mergeId: merge.id, row: null, col: null }
    : { ...incoming, pageId, mergeId: null, row, col };
  let next = removePlacement(binder, incoming.id);
  if (existing && existing.id !== incoming.id) {
    next = removePlacement(next, existing.id);
    if (hasOrigin(origin)) {
      const moved: Placement = origin.mergeId
        ? { ...existing, mergeId: origin.mergeId, pageId: origin.pageId, row: null, col: null }
        : {
            ...existing,
            mergeId: null,
            pageId: origin.pageId,
            row: origin.row,
            col: origin.col,
          };
      next = upsertPlacement(next, moved);
    }
  }
  return upsertPlacement(next, target);
}
