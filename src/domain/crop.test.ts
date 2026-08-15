import { describe, expect, it } from 'vitest';
import { LAYOUTS, type LayoutId } from './layouts';
import { coverCrop, cropPixelAspect, slotAspect } from './crop';
import { deserializeBinder, serializeBinder } from './serialize';
import { addMerge, createBinder, placeOnMerge, placementFromUpload } from './slots';

const LAYOUT_IDS = Object.keys(LAYOUTS) as LayoutId[];

describe('crop aspect lock', () => {
  it('cover crop matches physical slot aspect for every merge shape', () => {
    const widthPx = 1200;
    const heightPx = 800;
    for (const layoutId of LAYOUT_IDS) {
      const { rows, cols } = LAYOUTS[layoutId];
      for (let rowSpan = 1; rowSpan <= rows; rowSpan += 1) {
        for (let colSpan = 1; colSpan <= cols; colSpan += 1) {
          if (rowSpan * colSpan < 2 && !(rowSpan === 1 && colSpan === 1)) continue;
          const transform = coverCrop(widthPx, heightPx, colSpan, rowSpan, 0);
          expect(cropPixelAspect(widthPx, heightPx, transform)).toBeCloseTo(
            slotAspect(colSpan, rowSpan),
            8,
          );
          const rotated = coverCrop(widthPx, heightPx, colSpan, rowSpan, 90);
          expect(cropPixelAspect(widthPx, heightPx, rotated)).toBeCloseTo(
            slotAspect(colSpan, rowSpan),
            8,
          );
        }
      }
    }
  });

  it('round-trips a cropped art placement', () => {
    let binder = createBinder({ id: 'c', layoutId: '3x3', pageMode: 'single', pageCount: 1 });
    const pageId = binder.pages[0].id;
    binder = addMerge(binder, { pageId, row: 0, col: 0, rowSpan: 2, colSpan: 2 }, 'm');
    const transform = coverCrop(1000, 500, 2, 2, 90);
    binder = placeOnMerge(binder, {
      ...placementFromUpload('pl', 'asset-1'),
      pageId,
      mergeId: 'm',
      transform,
    });
    expect(deserializeBinder(serializeBinder(binder))).toEqual(binder);
    expect(binder.placements[0].transform).toEqual(transform);
  });
});
