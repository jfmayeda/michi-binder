import { LAYOUTS } from '@/domain/layouts';
import type { DummyPage } from '@/components/binder/dummyPages';
import type { TemplateFile } from './types';

const WASH: DummyPage['wash'][] = ['sun', 'paper', 'shade', 'sun', 'deep', 'paper'];

export function templateToPages(template: TemplateFile): DummyPage[] {
  const layout = LAYOUTS[template.layoutId];
  return template.pages
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((page, index) => {
      const merges = template.merges.filter((m) => m.pageId === page.id && !m.spansGutter);
      const placements = template.placements.filter((p) => p.pageId === page.id);
      const slots: NonNullable<DummyPage['slots']> = [];
      for (const merge of merges) {
        const placed = placements.find((p) => p.mergeId === merge.id);
        slots.push({
          row: merge.row,
          col: merge.col,
          rowSpan: merge.rowSpan,
          colSpan: merge.colSpan,
          imageUrl: placed?.card?.imageUrl,
        });
      }
      for (const placed of placements) {
        if (placed.mergeId || placed.row == null || placed.col == null) continue;
        slots.push({
          row: placed.row,
          col: placed.col,
          rowSpan: 1,
          colSpan: 1,
          imageUrl: placed.card?.imageUrl,
        });
      }
      return {
        id: page.position,
        label: page.position === 1 ? 'Page 1' : `Page ${page.position}`,
        note: template.notes,
        wash: WASH[index % WASH.length],
        rows: layout.rows,
        cols: layout.cols,
        slots,
      };
    });
}
