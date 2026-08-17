import { derivedCardImageUrl } from '@/search/images';
import type { CardIndex } from '@/search/types';
import type { TemplateFile } from './types';

export function refreshTemplateDisplay(template: TemplateFile, index: CardIndex): TemplateFile {
  const placements = template.placements.map((placement) => {
    if (placement.kind !== 'card' || !placement.cardId) return placement;
    const i = index.id.indexOf(placement.cardId);
    if (i < 0) return placement;
    return {
      ...placement,
      card: {
        card_id: placement.cardId,
        name: index.name[i],
        set: index.setId[i],
        number: index.number[i],
        imageUrl: derivedCardImageUrl(index.setId[i], index.number[i]),
      },
    };
  });
  return { ...template, placements };
}
