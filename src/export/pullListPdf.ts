import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { pullList } from '@/domain/pullList';
import type { Binder } from '@/domain/types';

export async function buildPullListPdf(binder: Binder, pageIds: string[]): Promise<Uint8Array> {
  const rows = pullList(binder, new Set(pageIds));
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const ink = rgb(0.23, 0.16, 0.11);
  page.drawText(`Pull list — ${binder.title}`, { x: 48, y: 740, size: 16, font, color: ink });
  let y = 710;
  for (const row of rows) {
    const line =
      row.kind === 'card'
        ? `${row.cardId} · ${row.ownership ?? 'unset'} · ${row.annotation}`
        : `Art · ${row.annotation} · ${row.pieceCount} pieces`;
    page.drawText(line.slice(0, 90), { x: 48, y, size: 10, font, color: ink });
    y -= 16;
    if (y < 48) break;
  }
  return pdf.save();
}
