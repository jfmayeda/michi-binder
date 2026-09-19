'use client';

import { useMemo, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Marker } from '@/components/ui/Marker';
import { printPlan } from '@/domain/print';
import { buildArtPdf, dpiWarning } from '@/export/artPdf';
import { piecesFor } from '@/export/artPdf';
import { rasteriseArt } from '@/export/composeArt';
import { buildCalibrationPdf } from '@/export/calibration';
import { composeSharePng } from '@/export/shareImage';
import type { Binder, Merge, Page, Placement } from '@/domain/types';

function download(bytes: BlobPart, name: string, mime: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export type ArtPocket = {
  merge: Merge;
  placement: Placement;
  imageUrl: string;
  sourceWidthPx: number;
};

type Job = 'art' | 'calibration' | 'pull' | 'share' | null;

/**
 * Everything that turns a design into a physical thing, in one place reachable
 * from the editor header. The previous build hid art export behind a chip that
 * only appeared inside an already-merged, already-filled art pocket, and buried
 * the calibration sheet inside that same dialog.
 */
export function PrintDialog({
  binder,
  pages,
  artPockets,
  onClose,
}: {
  binder: Binder;
  /** The pages currently on screen — what the pull list and share image cover. */
  pages: Page[];
  artPockets: ArtPocket[];
  onClose: () => void;
}) {
  const [artIndex, setArtIndex] = useState(0);
  const [bleed, setBleed] = useState(true);
  const [whole, setWhole] = useState(false);
  const [job, setJob] = useState<Job>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const art = artPockets[artIndex];
  const plan = useMemo(
    () => (art ? printPlan(binder, art.merge) : null),
    [binder, art],
  );
  const warn = art && plan ? dpiWarning(art.sourceWidthPx, plan.compositionCm.width) : null;

  const run = async (which: Exclude<Job, null>, fn: () => Promise<void>) => {
    setJob(which);
    setError(null);
    setDone(null);
    try {
      await fn();
      setDone(which);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setError(
        message === 'card-images-forbidden'
          ? 'Cards stay in the binder. Printing is only for art you added.'
          : message === 'art-image-unreadable'
            ? 'That picture could not be read back for printing. Try re-adding it.'
            : 'Could not build that file.',
      );
    } finally {
      setJob(null);
    }
  };

  const exportArt = () =>
    run('art', async () => {
      if (!art || !plan) return;
      const pieces = piecesFor(plan, whole);
      const images = await rasteriseArt(art.imageUrl, art.placement.transform, plan, pieces, {
        bleed,
      });
      const { bytes } = await buildArtPdf(binder, art.merge, art.placement, {
        useWholeStrips: whole,
        bleed,
        images,
      });
      download(bytes as BlobPart, `michi-art-${art.merge.id}.pdf`, 'application/pdf');
    });

  return (
    <Dialog
      title="Print and export"
      width="lg"
      onClose={onClose}
      footer={
        <button type="button" className="gb-btn" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="grid gap-4">
        <section>
          <div className="flex items-baseline gap-2">
            <h3 className="text-base font-semibold">Art for your pockets</h3>
            <span className="gb-label">{artPockets.length} ready</span>
          </div>
          {!art ? (
            <p className="mt-1.5 text-sm text-ink-soft">
              Nothing to print yet. Merge some pockets, put one of your own pictures in the
              merged pocket, and it will show up here at the exact size it needs to be.
            </p>
          ) : (
            <>
              {artPockets.length > 1 ? (
                <label className="mt-2 grid gap-1">
                  <span className="gb-label">Which pocket</span>
                  <select
                    className="gb-select"
                    value={artIndex}
                    onChange={(e) => setArtIndex(Number(e.target.value))}
                  >
                    {artPockets.map((p, i) => (
                      <option key={p.merge.id} value={i}>
                        {p.merge.colSpan} × {p.merge.rowSpan} pocket, row {p.merge.row + 1} column{' '}
                        {p.merge.col + 1}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {plan ? (
                <div className="gb-stats mt-2 rounded-sm border border-rule bg-paper-sunk p-2.5">
                  <p className="gb-stat">
                    <span className="gb-stat__key">Artwork size</span>
                    <span className="gb-stat__dots" aria-hidden="true" />
                    <span className="gb-stat__val">
                      {plan.compositionCm.width} × {plan.compositionCm.height} cm
                    </span>
                  </p>
                  <p className="gb-stat">
                    <span className="gb-stat__key">At 300 DPI</span>
                    <span className="gb-stat__dots" aria-hidden="true" />
                    <span className="gb-stat__val">
                      {plan.compositionPx.width} × {plan.compositionPx.height} px
                    </span>
                  </p>
                  <p className="gb-stat">
                    <span className="gb-stat__key">Pieces to print</span>
                    <span className="gb-stat__dots" aria-hidden="true" />
                    <span className="gb-stat__val">{piecesFor(plan, whole).length}</span>
                  </p>
                </div>
              ) : null}

              <p className="mt-2 text-sm text-ink-soft">{plan?.annotation}</p>
              {plan?.safeSplitNote ? (
                <p className="mt-1.5">
                  <Marker tone="note">{plan.safeSplitNote}</Marker>
                </p>
              ) : null}
              {warn ? (
                <p className="mt-1.5">
                  <Marker tone="wanted">{warn}</Marker>
                </p>
              ) : null}

              <div className="mt-2.5 grid gap-1.5">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={bleed}
                    onChange={(e) => setBleed(e.target.checked)}
                  />
                  Add 3 mm bleed around each piece
                </label>
                {plan && plan.wholeStripVariants.length > 0 ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={whole}
                      onChange={(e) => setWhole(e.target.checked)}
                    />
                    Thread whole rows instead of splitting at the sealed seam
                  </label>
                ) : null}
              </div>

              <button
                type="button"
                className="gb-btn gb-btn--primary mt-3"
                disabled={job !== null}
                onClick={() => void exportArt()}
              >
                {job === 'art' ? 'Building the PDF…' : 'Download art PDF'}
              </button>
              {done === 'art' ? (
                <p className="mt-2 text-mini text-teal-ink">
                  Downloaded. Print at 100% / actual size, with fit-to-page off.
                </p>
              ) : null}
            </>
          )}
        </section>

        <section className="border-t border-rule pt-3">
          <h3 className="text-base font-semibold">Check your printer first</h3>
          <p className="mt-1 text-sm text-ink-soft">
            One sheet with a 7 × 9.5 cm box on it. Print at 100%, measure the box with a ruler,
            and you will know whether your printer scales.
          </p>
          <button
            type="button"
            className="gb-btn mt-2.5"
            disabled={job !== null}
            onClick={() =>
              void run('calibration', async () => {
                const bytes = await buildCalibrationPdf();
                download(bytes as BlobPart, 'michi-calibration.pdf', 'application/pdf');
              })
            }
          >
            {job === 'calibration' ? 'Building…' : 'Download calibration sheet'}
          </button>
          <p className="mt-2">
            <Marker tone="note" title="Not verified against a physical printer in this build">
              Sizes are exact in the file; no printer has been ruler-checked
            </Marker>
          </p>
        </section>

        <section className="border-t border-rule pt-3">
          <h3 className="text-base font-semibold">Build the page for real</h3>
          <p className="mt-1 text-sm text-ink-soft">
            A slot-by-slot checklist for the {pages.length === 1 ? 'page' : 'spread'} you are
            looking at: which card goes where, what you still need, and which pockets hold art.
          </p>
          <button
            type="button"
            className="gb-btn mt-2.5"
            disabled={job !== null || pages.length === 0}
            onClick={() =>
              void run('pull', async () => {
                const { buildPullListPdf } = await import('@/export/pullListPdf');
                const bytes = await buildPullListPdf(
                  binder,
                  pages.map((p) => p.id),
                );
                download(bytes as BlobPart, 'michi-pull-list.pdf', 'application/pdf');
              })
            }
          >
            {job === 'pull' ? 'Building…' : 'Download pull list'}
          </button>
        </section>

        <section className="border-t border-rule pt-3">
          <h3 className="text-base font-semibold">Share the spread</h3>
          <p className="mt-1 text-sm text-ink-soft">
            A 1080 × 1350 picture of this page, sized for a post. This is a picture of your
            design, not something to print and cut.
          </p>
          <button
            type="button"
            className="gb-btn mt-2.5"
            disabled={job !== null || pages.length === 0}
            onClick={() =>
              void run('share', async () => {
                const blob = await composeSharePng(binder, pages[pages.length - 1]);
                download(blob, `michi-share-${pages[pages.length - 1].position}.png`, 'image/png');
              })
            }
          >
            {job === 'share' ? 'Building…' : 'Download share image'}
          </button>
        </section>

        {error ? (
          <p className="text-sm text-red-ink" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
