import { createBinder } from '@/domain/slots';
import type { Binder, Placement } from '@/domain/types';
import { PLAYGROUND_BINDER_ID } from '@/persistence/playgroundBinder';
import type { TemplateFile } from './types';

export function cloneTemplatePage(
  template: TemplateFile,
  pagePosition: number,
  binderId = PLAYGROUND_BINDER_ID,
): Binder {
  const sourcePage = template.pages.find((p) => p.position === pagePosition);
  if (!sourcePage) throw new Error('unknown-template-page');
  const binder = createBinder({
    id: binderId,
    layoutId: template.layoutId,
    pageMode: 'single',
    pageCount: 1,
  });
  binder.title = `${template.title} (copy)`;
  const pageId = binder.pages[0].id;
  const merges = template.merges
    .filter((m) => m.pageId === sourcePage.id && !m.spansGutter)
    .map((m) => ({ ...m, pageId }));
  const placements: Placement[] = template.placements
    .filter((p) => p.pageId === sourcePage.id)
    .map((p) => ({
      id: p.id,
      pageId,
      mergeId: p.mergeId,
      row: p.row,
      col: p.col,
      kind: p.kind,
      cardId: p.cardId,
      assetKind: p.assetKind,
      uploadAssetId: p.uploadAssetId,
      packItemId: p.packItemId,
      transform: p.transform,
      ownership: p.ownership,
    }));
  return { ...binder, merges, placements };
}

export function everyCardHasDisplay(template: TemplateFile) {
  return template.placements
    .filter((p) => p.kind === 'card')
    .every(
      (p) =>
        p.card != null &&
        p.card.card_id === p.cardId &&
        Boolean(p.card.name) &&
        Boolean(p.card.imageUrl) &&
        !p.card.imageUrl.includes('cards-index'),
    );
}
