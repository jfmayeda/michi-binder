import { BLEED_CM, cmToPx, type PhysicalPiece, type PrintPlan } from '@/domain/print';
import { SLOT_CM } from '@/domain/layouts';
import type { Transform } from '@/domain/types';

/**
 * Turn a stored (non-destructive) transform plus the original image into the
 * exact pixels each printed piece needs.
 *
 * All geometry comes from domain/print.ts — this module only rasterises. The
 * composition is drawn once at the plan's exact 300 DPI size, then each piece
 * is cut from it at the offset the plan already computed, so a split never
 * shifts the artwork relative to the seam.
 */

function canvasOf(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas-unavailable');
  ctx.imageSmoothingQuality = 'high';
  return { canvas, ctx };
}

function toPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('png-encode-failed'));
        return;
      }
      blob
        .arrayBuffer()
        .then((buf) => resolve(new Uint8Array(buf)))
        .catch(reject);
    }, 'image/png');
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('art-image-unreadable'));
    img.src = url;
  });
}

/** Draw the whole merged artwork at its exact print pixel size. */
export async function drawComposition(
  imageUrl: string,
  transform: Transform | Record<string, never>,
  plan: PrintPlan,
): Promise<HTMLCanvasElement> {
  const img = await loadImage(imageUrl);
  const { canvas, ctx } = canvasOf(plan.compositionPx.width, plan.compositionPx.height);

  const crop =
    'crop' in transform && transform.crop
      ? transform.crop
      : { x: 0, y: 0, w: 1, h: 1 };
  const rotation = 'rotation' in transform ? transform.rotation : 0;

  const sx = crop.x * img.naturalWidth;
  const sy = crop.y * img.naturalHeight;
  const sw = crop.w * img.naturalWidth;
  const sh = crop.h * img.naturalHeight;

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  const quarter = rotation === 90 || rotation === 270;
  const dw = quarter ? canvas.height : canvas.width;
  const dh = quarter ? canvas.width : canvas.height;
  ctx.drawImage(img, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();

  return canvas;
}

/**
 * Cut one piece, optionally with 3 mm of bleed. Bleed outside the composition
 * is filled by replicating the edge, so a print never shows white slivers.
 */
export async function cutPiece(
  composition: HTMLCanvasElement,
  piece: PhysicalPiece,
  opts: { bleed: boolean },
): Promise<Uint8Array> {
  const bleedPx = opts.bleed ? cmToPx(BLEED_CM) : 0;
  const x0 = cmToPx(piece.originCol * SLOT_CM.width) - bleedPx;
  const y0 = cmToPx(piece.originRow * SLOT_CM.height) - bleedPx;
  const width = piece.widthPx + bleedPx * 2;
  const height = piece.heightPx + bleedPx * 2;

  const { canvas, ctx } = canvasOf(width, height);

  // Edge replication: clamp the source rect, then stretch the clamped strip
  // back over the full destination so out-of-bounds bleed repeats the edge.
  const sx = Math.max(0, Math.min(x0, composition.width - 1));
  const sy = Math.max(0, Math.min(y0, composition.height - 1));
  const sw = Math.max(1, Math.min(x0 + width, composition.width) - sx);
  const sh = Math.max(1, Math.min(y0 + height, composition.height) - sy);
  const dx = sx - x0;
  const dy = sy - y0;

  if (bleedPx > 0) {
    // Fill first with a stretched copy so the margins are never transparent.
    ctx.drawImage(composition, sx, sy, sw, sh, 0, 0, width, height);
  }
  ctx.drawImage(composition, sx, sy, sw, sh, dx, dy, sw, sh);

  return toPngBytes(canvas);
}

export type ArtRaster = { full: Uint8Array; pieces: Uint8Array[] };

/** Everything buildArtPdf needs to put real artwork inside its trim boxes. */
export async function rasteriseArt(
  imageUrl: string,
  transform: Transform | Record<string, never>,
  plan: PrintPlan,
  pieces: PhysicalPiece[],
  opts: { bleed: boolean },
): Promise<ArtRaster> {
  const composition = await drawComposition(imageUrl, transform, plan);
  const full = await toPngBytes(composition);
  const cut: Uint8Array[] = [];
  for (const piece of pieces) {
    cut.push(await cutPiece(composition, piece, opts));
  }
  return { full, pieces: cut };
}
