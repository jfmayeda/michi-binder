import { LAYOUTS, SLOT_CM, type LayoutId } from '@/domain/layouts';
import { CardImage } from '@/components/ui/CardImage';
import { Marker } from '@/components/ui/Marker';
import type { TemplateFile, TemplatePlacement } from '@/templates/types';

type Cell = {
  key: string;
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  placement: TemplatePlacement | undefined;
};

/**
 * Renders one template page into the binder grid.
 *
 * It reads only the display fields baked into the template file — name, set,
 * number, image URL — so the landing page never loads the card catalog
 * (AT-9). Art that cannot load falls back to a typed stand-in rather than a
 * broken image.
 */
export function TemplateSpread({
  template,
  pageId,
}: {
  template: TemplateFile;
  pageId: string;
}) {
  const layout = LAYOUTS[template.layoutId as LayoutId];
  const merges = template.merges.filter((m) => m.pageId === pageId && !m.spansGutter);
  const placements = template.placements.filter((p) => p.pageId === pageId);

  const covered = new Set<string>();
  const cells: Cell[] = [];

  for (const merge of merges) {
    for (let r = merge.row; r < merge.row + merge.rowSpan; r += 1) {
      for (let c = merge.col; c < merge.col + merge.colSpan; c += 1) {
        covered.add(`${r}:${c}`);
      }
    }
    cells.push({
      key: `m-${merge.id}`,
      row: merge.row,
      col: merge.col,
      rowSpan: merge.rowSpan,
      colSpan: merge.colSpan,
      placement: placements.find((p) => p.mergeId === merge.id),
    });
  }

  for (let r = 0; r < layout.rows; r += 1) {
    for (let c = 0; c < layout.cols; c += 1) {
      if (covered.has(`${r}:${c}`)) continue;
      cells.push({
        key: `${r}:${c}`,
        row: r,
        col: c,
        rowSpan: 1,
        colSpan: 1,
        placement: placements.find((p) => p.mergeId == null && p.row === r && p.col === c),
      });
    }
  }

  cells.sort((a, b) => a.row - b.row || a.col - b.col);

  return (
    <div
      className="binder-grid"
      style={{
        gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
      }}
    >
      {cells.map((cell) => {
        const card = cell.placement?.card;
        const merged = cell.rowSpan > 1 || cell.colSpan > 1;
        return (
          <div
            key={cell.key}
            className={`binder-pocket ${merged ? 'binder-pocket--merged' : ''}`}
            data-open-side={layout.insertionMap ? layout.insertionMap[cell.col] : undefined}
            style={{
              gridColumn: `${cell.col + 1} / span ${cell.colSpan}`,
              gridRow: `${cell.row + 1} / span ${cell.rowSpan}`,
            }}
          >
            {card ? (
              <span className="absolute inset-[4%]">
                <CardImage
                  src={card.imageUrl}
                  name={card.name}
                  setId={card.set}
                  number={card.number}
                  seed={card.card_id}
                  alt={`${card.name}, ${card.set} ${card.number}`}
                />
              </span>
            ) : null}
            {!card && merged ? (
              // An empty merged pocket is the clearest way to show what this
              // product is for, so it says what it would print at.
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 text-center">
                <span className="gb-label">Art pocket</span>
                <Marker tone="merge">
                  {cell.colSpan * SLOT_CM.width} × {cell.rowSpan * SLOT_CM.height} cm
                </Marker>
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
