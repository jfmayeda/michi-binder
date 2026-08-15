import { assemblyAnnotation, computeSplit } from './split';
import type { Binder, Ownership } from './types';

export type PullEntry = {
  kind: 'card' | 'art';
  pageId: string;
  cardId: string | null;
  ownership: Ownership | null;
  annotation: string;
  pieceCount: number;
  exportKey: string | null;
};

export function pullList(binder: Binder, pageIds: Set<string>): PullEntry[] {
  const entries: PullEntry[] = [];
  for (const placement of binder.placements) {
    const merge = placement.mergeId
      ? binder.merges.find((m) => m.id === placement.mergeId)
      : undefined;
    const onPage = pageIds.has(placement.pageId) || (merge && pageIds.has(merge.pageId));
    if (!onPage) continue;
    if (placement.kind === 'card') {
      entries.push({
        kind: 'card',
        pageId: placement.pageId,
        cardId: placement.cardId,
        ownership: placement.ownership,
        annotation: merge ? assemblyAnnotation(binder, merge) : 'single insert',
        pieceCount: merge ? computeSplit(binder, merge).mandatory.length : 1,
        exportKey: null,
      });
    } else if (merge) {
      const plan = computeSplit(binder, merge);
      entries.push({
        kind: 'art',
        pageId: placement.pageId,
        cardId: null,
        ownership: null,
        annotation: plan.annotation,
        pieceCount: plan.mandatory.length,
        exportKey: `export:${merge.id}`,
      });
    } else {
      entries.push({
        kind: 'art',
        pageId: placement.pageId,
        cardId: null,
        ownership: null,
        annotation: 'single insert',
        pieceCount: 1,
        exportKey: `export-cell:${placement.id}`,
      });
    }
  }
  return entries;
}
