import { LAYOUTS, columnSeamOpen } from './layouts';
import type { Binder, Merge } from './types';

export type Piece = {
  page: 'left' | 'right' | 'single';
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
};

export type SplitPlan = {
  mandatory: Piece[];
  wholeStripVariants: Piece[];
  annotation: string;
};

function splitStrip(layout: ReturnType<typeof layoutOf>, strip: Piece): { pieces: Piece[]; variant: Piece | null } {
  const sealedCuts: number[] = [];
  for (let i = 0; i < strip.colSpan - 1; i += 1) {
    const absCol = strip.col + i;
    if (!columnSeamOpen(layout, absCol)) sealedCuts.push(i + 1);
  }
  if (sealedCuts.length === 0) {
    return { pieces: [strip], variant: null };
  }
  const bounds = [0, ...sealedCuts, strip.colSpan];
  const pieces: Piece[] = [];
  for (let b = 0; b < bounds.length - 1; b += 1) {
    pieces.push({
      ...strip,
      col: strip.col + bounds[b],
      colSpan: bounds[b + 1] - bounds[b],
    });
  }
  return { pieces, variant: layout.insertionMap ? strip : null };
}

function layoutOf(binder: Binder) {
  return LAYOUTS[binder.layoutId];
}

export function computeSplit(binder: Binder, merge: Merge): SplitPlan {
  const layout = layoutOf(binder);
  const pageRects: Piece[] = [];
  if (merge.spansGutter) {
    const leftSpan = layout.cols - merge.col;
    const rightSpan = merge.colSpan - leftSpan;
    pageRects.push({
      page: 'left',
      row: merge.row,
      col: merge.col,
      rowSpan: merge.rowSpan,
      colSpan: leftSpan,
    });
    pageRects.push({
      page: 'right',
      row: merge.row,
      col: 0,
      rowSpan: merge.rowSpan,
      colSpan: rightSpan,
    });
  } else {
    pageRects.push({
      page: 'single',
      row: merge.row,
      col: merge.col,
      rowSpan: merge.rowSpan,
      colSpan: merge.colSpan,
    });
  }

  const strips: Piece[] = [];
  for (const rect of pageRects) {
    for (let r = 0; r < rect.rowSpan; r += 1) {
      strips.push({ ...rect, row: rect.row + r, rowSpan: 1 });
    }
  }

  const mandatory: Piece[] = [];
  const wholeStripVariants: Piece[] = [];
  for (const strip of strips) {
    const { pieces, variant } = splitStrip(layout, strip);
    mandatory.push(...pieces);
    if (variant) wholeStripVariants.push(variant);
  }

  const annotation = annotate(mandatory, wholeStripVariants);
  return { mandatory, wholeStripVariants, annotation };
}

function annotate(mandatory: Piece[], variants: Piece[]): string {
  if (mandatory.length === 1) {
    const p = mandatory[0];
    return p.rowSpan * p.colSpan === 1 ? 'single insert' : 'slide-through';
  }
  const n = mandatory.length;
  if (variants.length === 0) return `split into ${n} pieces`;
  const rowNote =
    variants.length > 1
      ? ' (rows can be threaded whole)'
      : ' (row can optionally be threaded whole — flexible prints)';
  return `split into ${n} pieces${rowNote}`;
}

export function assemblyAnnotation(binder: Binder, merge: Merge): string {
  return computeSplit(binder, merge).annotation;
}
