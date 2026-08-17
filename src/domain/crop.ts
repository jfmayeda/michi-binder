import { SLOT_CM } from './layouts';
import type { Transform } from './types';

export function slotAspect(colSpan: number, rowSpan: number): number {
  return (colSpan * SLOT_CM.width) / (rowSpan * SLOT_CM.height);
}

export function rotatedSize(
  widthPx: number,
  heightPx: number,
  rotation: Transform['rotation'],
): { widthPx: number; heightPx: number } {
  return rotation === 90 || rotation === 270
    ? { widthPx: heightPx, heightPx: widthPx }
    : { widthPx, heightPx };
}

/** Crop window in rotated-source space whose pixel aspect equals the physical slot. */
export function coverCrop(
  widthPx: number,
  heightPx: number,
  colSpan: number,
  rowSpan: number,
  rotation: Transform['rotation'] = 0,
): Transform {
  const src = rotatedSize(widthPx, heightPx, rotation);
  const target = slotAspect(colSpan, rowSpan);
  const imageAspect = src.widthPx / src.heightPx;
  let w: number;
  let h: number;
  if (imageAspect > target) {
    h = 1;
    w = target / imageAspect;
  } else {
    w = 1;
    h = imageAspect / target;
  }
  return {
    version: 1,
    crop: { x: (1 - w) / 2, y: (1 - h) / 2, w, h },
    rotation,
  };
}

export function cropPixelAspect(
  widthPx: number,
  heightPx: number,
  transform: Transform,
): number {
  const src = rotatedSize(widthPx, heightPx, transform.rotation);
  return (transform.crop.w * src.widthPx) / (transform.crop.h * src.heightPx);
}

export function clampCrop(crop: Transform['crop']): Transform['crop'] {
  const w = Math.min(1, Math.max(0.02, crop.w));
  const h = Math.min(1, Math.max(0.02, crop.h));
  const x = Math.min(1 - w, Math.max(0, crop.x));
  const y = Math.min(1 - h, Math.max(0, crop.y));
  return { x, y, w, h };
}

export function panCrop(crop: Transform['crop'], dx: number, dy: number): Transform['crop'] {
  return clampCrop({ ...crop, x: crop.x + dx, y: crop.y + dy });
}

export function zoomCrop(crop: Transform['crop'], factor: number, aspect: number): Transform['crop'] {
  const cx = crop.x + crop.w / 2;
  const cy = crop.y + crop.h / 2;
  let w = crop.w * factor;
  let h = w / aspect;
  if (w > 1) {
    w = 1;
    h = w / aspect;
  }
  if (h > 1) {
    h = 1;
    w = h * aspect;
  }
  return clampCrop({ x: cx - w / 2, y: cy - h / 2, w, h });
}

/** Normalized crop width/height ratio in rotated-source space for a given slot. */
export function cropBoxAspect(
  widthPx: number,
  heightPx: number,
  colSpan: number,
  rowSpan: number,
  rotation: Transform['rotation'],
): number {
  const src = rotatedSize(widthPx, heightPx, rotation);
  return slotAspect(colSpan, rowSpan) * (src.heightPx / src.widthPx);
}
