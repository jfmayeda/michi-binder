'use client';

import { useMemo, useState } from 'react';
import type { Binder, Merge, Placement } from '@/domain/types';
import { printPlan } from '@/domain/print';
import { buildArtPdf, dpiWarning } from '@/export/artPdf';
import { buildCalibrationPdf } from '@/export/calibration';

export function ExportDialog({
  binder,
  merge,
  placement,
  sourcePx,
  onClose,
}: {
  binder: Binder;
  merge: Merge;
  placement: Placement;
  sourcePx: number;
  onClose: () => void;
}) {
  const plan = useMemo(() => printPlan(binder, merge), [binder, merge]);
  const [bleed, setBleed] = useState(true);
  const [whole, setWhole] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const warn = dpiWarning(sourcePx, plan.compositionCm.width);

  const download = async () => {
    try {
      const { bytes } = await buildArtPdf(binder, merge, placement, { useWholeStrips: whole });
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `michi-${merge.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setError(null);
    } catch (err) {
      setError(err instanceof Error && err.message === 'card-images-forbidden'
        ? 'Cards stay in the binder — print is only for your art.'
        : 'Could not build that PDF.');
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-rule bg-paper p-5 shadow-lift">
        <p className="font-display text-xl text-ink">Print this pocket</p>
        <p className="mt-1 text-sm text-ink-soft">{plan.annotation}</p>
        {plan.safeSplitNote ? <p className="mt-2 text-xs text-accent-ink">{plan.safeSplitNote}</p> : null}
        <p className="mt-2 text-xs text-ink-faint">
          {plan.physical.length} piece{plan.physical.length === 1 ? '' : 's'} ·{' '}
          {plan.compositionCm.width} × {plan.compositionCm.height} cm artwork
        </p>
        {warn ? <p className="mt-2 text-sm text-accent-ink">{warn}</p> : null}
        <label className="mt-3 flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={bleed} onChange={(e) => setBleed(e.target.checked)} />
          3 mm bleed
        </label>
        {plan.wholeStripVariants.length > 0 ? (
          <label className="mt-2 flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={whole} onChange={(e) => setWhole(e.target.checked)} />
            Thread whole rows (flexible prints)
          </label>
        ) : null}
        {error ? <p className="mt-2 text-sm text-accent-ink">{error}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md bg-accent px-3 py-1.5 text-sm text-paper-sun shadow-stamp"
            onClick={() => void download()}
          >
            Download PDF
          </button>
          <button
            type="button"
            className="rounded-md bg-paper-sun px-3 py-1.5 text-sm shadow-stamp"
            onClick={() => {
              const canvas = document.createElement('canvas');
              canvas.width = plan.compositionPx.width;
              canvas.height = plan.compositionPx.height;
              const ctx = canvas.getContext('2d');
              if (!ctx) return;
              ctx.fillStyle = '#f5eee0';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              canvas.toBlob((blob) => {
                if (!blob) return;
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `michi-${merge.id}-300dpi.png`;
                a.click();
                URL.revokeObjectURL(url);
              }, 'image/png');
            }}
          >
            Download PNG
          </button>
          <button
            type="button"
            className="rounded-md bg-paper-sun px-3 py-1.5 text-sm shadow-stamp"
            onClick={() => {
              void buildCalibrationPdf().then((bytes) => {
                const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'michi-calibration.pdf';
                a.click();
                URL.revokeObjectURL(url);
              });
            }}
          >
            Calibration sheet
          </button>
          <button type="button" className="px-3 py-1.5 text-sm text-ink-soft" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="mt-3 text-xs text-ink-faint">Print at 100% / actual size. Disable fit-to-page.</p>
      </div>
    </div>
  );
}
