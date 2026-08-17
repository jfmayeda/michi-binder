import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { cmToPt, printPlan, type PrintPlan } from '@/domain/print';
import type { Binder, Merge, Placement } from '@/domain/types';

const MARK = cmToPt(1);
const INK = rgb(0.23, 0.16, 0.11);
const PAPER = rgb(0.96, 0.93, 0.86);

export function assertArtExport(placement: Placement) {
  if (placement.kind === 'card') {
    throw new Error('card-images-forbidden');
  }
}

export function effectiveDpi(sourcePx: number, widthCm: number): number {
  return sourcePx / (widthCm / 2.54);
}

export function dpiWarning(sourcePx: number, widthCm: number): string | null {
  const dpi = effectiveDpi(sourcePx, widthCm);
  if (dpi >= 300) return null;
  return `Art may print soft — effective ~${Math.round(dpi)} DPI`;
}

function cropMarks(
  page: ReturnType<PDFDocument['addPage']>,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const tick = cmToPt(0.4);
  const draw = (x1: number, y1: number, x2: number, y2: number) => {
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.4, color: INK });
  };
  draw(x - tick, y, x, y);
  draw(x, y - tick, x, y);
  draw(x + w, y, x + w + tick, y);
  draw(x + w, y - tick, x + w, y);
  draw(x - tick, y + h, x, y + h);
  draw(x, y + h, x, y + h + tick);
  draw(x + w, y + h, x + w + tick, y + h);
  draw(x + w, y + h, x + w, y + h + tick);
}

async function addTrimPage(
  pdf: PDFDocument,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  trimW: number,
  trimH: number,
  label: string,
  note: string,
) {
  const page = pdf.addPage([trimW + MARK * 2, trimH + MARK * 2]);
  page.setTrimBox(MARK, MARK, trimW, trimH);
  page.drawRectangle({ x: MARK, y: MARK, width: trimW, height: trimH, color: PAPER });
  cropMarks(page, MARK, MARK, trimW, trimH);
  page.drawText(label, { x: MARK, y: MARK + trimH + 6, size: 8, font, color: INK });
  page.drawText(note, { x: MARK, y: 8, size: 7, font, color: INK });
  return page;
}

export async function buildArtPdf(
  binder: Binder,
  merge: Merge,
  placement: Placement,
  opts: { useWholeStrips?: boolean } = {},
): Promise<{ bytes: Uint8Array; plan: PrintPlan; pageCount: number }> {
  assertArtExport(placement);
  const plan = printPlan(binder, merge);
  const pieces = opts.useWholeStrips && plan.wholeStripVariants.length > 0
    ? plan.wholeStripVariants.map((piece, i) => ({
        ...plan.physical[0],
        ...piece,
        widthCm: piece.colSpan * 7,
        heightCm: piece.rowSpan * 9.5,
        widthPt: cmToPt(piece.colSpan * 7),
        heightPt: cmToPt(piece.rowSpan * 9.5),
        label: `Piece ${i + 1}/${plan.wholeStripVariants.length}`,
      }))
    : plan.physical;

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const note = 'Print at 100% / actual size. Disable fit-to-page.';

  await addTrimPage(
    pdf,
    font,
    cmToPt(plan.compositionCm.width),
    cmToPt(plan.compositionCm.height),
    `Full artwork — ${plan.annotation}`,
    note,
  );

  for (let i = 0; i < pieces.length; i += 1) {
    const piece = pieces[i];
    const next = pieces[i + 1];
    const join = next ? ` — right edge joins piece ${i + 2}` : '';
    await addTrimPage(
      pdf,
      font,
      cmToPt(piece.widthCm ?? piece.colSpan * 7),
      cmToPt(piece.heightCm ?? piece.rowSpan * 9.5),
      `${piece.label ?? `Piece ${i + 1}/${pieces.length}`}${join}`,
      note,
    );
  }

  const bytes = await pdf.save();
  return { bytes, plan, pageCount: 1 + pieces.length };
}
