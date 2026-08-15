import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { cmToPt } from '@/domain/print';
import { SLOT_CM } from '@/domain/layouts';

export const CALIBRATION = {
  rulerCm: 10,
  pocketWidthCm: SLOT_CM.width,
  pocketHeightCm: SLOT_CM.height,
};

export async function buildCalibrationPdf(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const ink = rgb(0.23, 0.16, 0.11);
  const paper = rgb(0.98, 0.95, 0.9);

  const pocketW = cmToPt(CALIBRATION.pocketWidthCm);
  const pocketH = cmToPt(CALIBRATION.pocketHeightCm);
  const mark = cmToPt(1);
  const pocket = pdf.addPage([pocketW + mark * 2, pocketH + mark * 2]);
  pocket.setTrimBox(mark, mark, pocketW, pocketH);
  pocket.drawRectangle({ x: mark, y: mark, width: pocketW, height: pocketH, color: paper, borderColor: ink, borderWidth: 1 });
  pocket.drawText('Universal pocket 7 × 9.5 cm', {
    x: mark + 8,
    y: mark + pocketH / 2,
    size: 10,
    font,
    color: ink,
  });

  const sheetW = cmToPt(16);
  const sheetH = cmToPt(16);
  const sheet = pdf.addPage([sheetW, sheetH]);
  const origin = cmToPt(2);
  const ruler = cmToPt(CALIBRATION.rulerCm);
  sheet.drawText('Michi Binder calibration', { x: origin, y: sheetH - cmToPt(1.2), size: 14, font, color: ink });
  sheet.drawText('Print at 100% / actual size. Turn off fit-to-page or “scale to fit”.', {
    x: origin,
    y: sheetH - cmToPt(2),
    size: 9,
    font,
    color: ink,
  });
  sheet.drawLine({ start: { x: origin, y: origin }, end: { x: origin + ruler, y: origin }, thickness: 1.2, color: ink });
  sheet.drawLine({ start: { x: origin, y: origin }, end: { x: origin, y: origin + ruler }, thickness: 1.2, color: ink });
  for (let cm = 0; cm <= 10; cm += 1) {
    const t = origin + cmToPt(cm);
    sheet.drawLine({ start: { x: t, y: origin }, end: { x: t, y: origin - cmToPt(0.3) }, thickness: 0.6, color: ink });
    sheet.drawLine({ start: { x: origin, y: t }, end: { x: origin - cmToPt(0.3), y: t }, thickness: 0.6, color: ink });
    sheet.drawText(String(cm), { x: t - 4, y: origin - cmToPt(0.7), size: 7, font, color: ink });
  }
  sheet.drawText('10 cm', { x: origin + ruler + 6, y: origin - 4, size: 9, font, color: ink });
  const rectW = cmToPt(CALIBRATION.pocketWidthCm);
  const rectH = cmToPt(CALIBRATION.pocketHeightCm);
  const rx = origin + cmToPt(3);
  const ry = origin + cmToPt(3);
  sheet.drawRectangle({ x: rx, y: ry, width: rectW, height: rectH, borderColor: ink, borderWidth: 1 });
  sheet.drawText('7 × 9.5 cm pocket', { x: rx + 8, y: ry + rectH / 2, size: 10, font, color: ink });

  return pdf.save();
}
