import { derivedCardImageUrl } from '@/search/images';
import type { Binder, Page, Placement } from '@/domain/types';
import { LAYOUTS } from '@/domain/layouts';
import { cellsForMerge } from '@/domain/slots';
import { proxiedCardImagePath } from './cardImageAllowlist';

export const SHARE_WIDTH = 1080;
export const SHARE_HEIGHT = 1350;

function cardUrl(placement: Placement): string | null {
  if (placement.kind !== 'card' || !placement.cardId) return null;
  const dash = placement.cardId.indexOf('-');
  if (dash < 0) return derivedCardImageUrl(placement.cardId, '1');
  return derivedCardImageUrl(placement.cardId.slice(0, dash), placement.cardId.slice(dash + 1));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image'));
    img.src = src;
  });
}

export async function composeSharePng(binder: Binder, page: Page): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_WIDTH;
  canvas.height = SHARE_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.fillStyle = '#f6ebd9';
  ctx.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT);
  ctx.fillStyle = '#e8d4b8';
  ctx.fillRect(48, 72, SHARE_WIDTH - 96, SHARE_HEIGHT - 144);
  ctx.strokeStyle = '#d4c0a1';
  ctx.lineWidth = 4;
  ctx.strokeRect(48, 72, SHARE_WIDTH - 96, SHARE_HEIGHT - 144);

  const layout = LAYOUTS[binder.layoutId];
  const inset = 80;
  const gridW = SHARE_WIDTH - inset * 2;
  const gridH = SHARE_HEIGHT - inset * 2 - 40;
  const cellW = gridW / layout.cols;
  const cellH = gridH / layout.rows;
  const drawn = new Set<string>();

  const drawPlacement = async (placement: Placement, row: number, col: number, rowSpan: number, colSpan: number) => {
    const url = cardUrl(placement);
    const x = inset + col * cellW + 6;
    const y = inset + 48 + row * cellH + 6;
    const w = cellW * colSpan - 12;
    const h = cellH * rowSpan - 12;
    ctx.fillStyle = '#fbf4e8';
    ctx.fillRect(x, y, w, h);
    if (!url) return;
    try {
      const img = await loadImage(proxiedCardImagePath(url));
      ctx.drawImage(img, x, y, w, h);
    } catch {
      ctx.fillStyle = '#f0d2c8';
      ctx.fillRect(x, y, w, h);
    }
  };

  for (const merge of binder.merges) {
    if (merge.pageId !== page.id || merge.spansGutter) continue;
    const placed = binder.placements.find((p) => p.mergeId === merge.id);
    if (!placed) continue;
    const cells = cellsForMerge(binder, merge);
    if ('error' in cells) continue;
    for (const cell of cells) drawn.add(`${cell.row}:${cell.col}`);
    await drawPlacement(placed, merge.row, merge.col, merge.rowSpan, merge.colSpan);
  }

  for (const placement of binder.placements) {
    if (placement.pageId !== page.id || placement.mergeId || placement.row == null || placement.col == null) {
      continue;
    }
    const key = `${placement.row}:${placement.col}`;
    if (drawn.has(key)) continue;
    await drawPlacement(placement, placement.row, placement.col, 1, 1);
  }

  ctx.fillStyle = '#3a2a1c';
  ctx.font = '600 36px Fraunces, serif';
  ctx.fillText(binder.title, inset, 56);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('png');
  return blob;
}
