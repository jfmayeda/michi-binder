import { LAYOUTS, SLOT_CM } from './layouts';
import { assemblyAnnotation, computeSplit, type Piece, type SplitPlan } from './split';
import type { Binder, Merge } from './types';

export const DPI = 300;
export const BLEED_CM = 0.3;
export const CM_PER_INCH = 2.54;
export const PT_PER_INCH = 72;

export function cmToPx(cm: number): number {
  return Math.round((cm * DPI) / CM_PER_INCH);
}

export function cmToPt(cm: number): number {
  return (cm * PT_PER_INCH) / CM_PER_INCH;
}

export function slotWidthCm(colSpan: number): number {
  return colSpan * SLOT_CM.width;
}

export function slotHeightCm(rowSpan: number): number {
  return rowSpan * SLOT_CM.height;
}

export type PhysicalPiece = Piece & {
  widthCm: number;
  heightCm: number;
  widthPx: number;
  heightPx: number;
  widthPt: number;
  heightPt: number;
  originCol: number;
  originRow: number;
  label: string;
};

export type PrintPlan = SplitPlan & {
  compositionCm: { width: number; height: number };
  compositionPx: { width: number; height: number };
  physical: PhysicalPiece[];
  safeSplitNote: string | null;
};

export function pieceOffsetInMerge(binder: Binder, merge: Merge, piece: Piece): { col: number; row: number } {
  const layout = LAYOUTS[binder.layoutId];
  if (piece.page === 'right') {
    const leftSpan = layout.cols - merge.col;
    return { col: leftSpan + piece.col, row: piece.row - merge.row };
  }
  return { col: piece.col - merge.col, row: piece.row - merge.row };
}

export function physicalize(binder: Binder, merge: Merge, piece: Piece, index: number, total: number): PhysicalPiece {
  const origin = pieceOffsetInMerge(binder, merge, piece);
  const widthCm = slotWidthCm(piece.colSpan);
  const heightCm = slotHeightCm(piece.rowSpan);
  return {
    ...piece,
    ...origin,
    originCol: origin.col,
    originRow: origin.row,
    widthCm,
    heightCm,
    widthPx: cmToPx(widthCm),
    heightPx: cmToPx(heightCm),
    widthPt: cmToPt(widthCm),
    heightPt: cmToPt(heightCm),
    label: `Piece ${index + 1}/${total}`,
  };
}

export function printPlan(binder: Binder, merge: Merge): PrintPlan {
  const split = computeSplit(binder, merge);
  const compositionCm = {
    width: slotWidthCm(merge.colSpan),
    height: slotHeightCm(merge.rowSpan),
  };
  const physical = split.mandatory.map((piece, i) =>
    physicalize(binder, merge, piece, i, split.mandatory.length),
  );
  const safeSplitNote = LAYOUTS[binder.layoutId].insertionMap
    ? null
    : 'insertion directions for this page type are being verified — pieces are split per pocket to be safe.';
  return {
    ...split,
    compositionCm,
    compositionPx: {
      width: cmToPx(compositionCm.width),
      height: cmToPx(compositionCm.height),
    },
    physical,
    safeSplitNote,
  };
}

export function annotationFor(binder: Binder, merge: Merge): string {
  return assemblyAnnotation(binder, merge);
}

export type Raster = { width: number; height: number; data: Uint8ClampedArray };

export function makeTestComposition(width: number, height: number): Raster {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      data[i] = x % 256;
      data[i + 1] = y % 256;
      data[i + 2] = (x * 3 + y) % 256;
      data[i + 3] = 255;
    }
  }
  return { width, height, data };
}

function pixel(raster: Raster, x: number, y: number): [number, number, number] {
  const cx = Math.min(raster.width - 1, Math.max(0, x));
  const cy = Math.min(raster.height - 1, Math.max(0, y));
  const i = (cy * raster.width + cx) * 4;
  return [raster.data[i], raster.data[i + 1], raster.data[i + 2]];
}

/** Slice a piece from the composition, with optional 3 mm bleed (neighbor art or edge replicate). */
export function extractPieceRaster(
  composition: Raster,
  piece: PhysicalPiece,
  opts: { bleed: boolean },
): Raster {
  const x0 = cmToPx(piece.originCol * SLOT_CM.width);
  const y0 = cmToPx(piece.originRow * SLOT_CM.height);
  const bleedPx = opts.bleed ? cmToPx(BLEED_CM) : 0;
  const width = piece.widthPx + bleedPx * 2;
  const height = piece.heightPx + bleedPx * 2;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const srcX = x0 + x - bleedPx;
      const srcY = y0 + y - bleedPx;
      const [r, g, b] = pixel(composition, srcX, srcY);
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return { width, height, data };
}

export { type Piece, type SplitPlan };
