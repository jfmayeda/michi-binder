import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { cmToPt } from '@/domain/print';
import { buildCalibrationPdf, CALIBRATION } from './calibration';

describe('T4.5 calibration sheet', () => {
  it('pocket page trim is exactly 7 × 9.5 cm', async () => {
    const bytes = await buildCalibrationPdf();
    const pdf = await PDFDocument.load(bytes);
    const trim = pdf.getPage(0).getTrimBox();
    expect(Math.abs(trim.width - cmToPt(CALIBRATION.pocketWidthCm))).toBeLessThan(0.01);
    expect(Math.abs(trim.height - cmToPt(CALIBRATION.pocketHeightCm))).toBeLessThan(0.01);
    try {
      mkdirSync('/opt/cursor/artifacts', { recursive: true });
      writeFileSync('/opt/cursor/artifacts/michi_calibration.pdf', bytes);
    } catch {
      /* artifact dump is optional outside Cloud */
    }
  });
});
