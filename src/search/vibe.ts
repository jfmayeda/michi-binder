export type ColorSwatch = { hex: string; weight: number };

export function hexToHue(hex: string): number {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return h;
}

export function hueDistance(a: number, b: number) {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

export function cardHueScore(swatches: ColorSwatch[] | undefined, targetHue: number): number | null {
  if (!swatches?.length) return null;
  let best = Infinity;
  for (const swatch of swatches.slice(0, 2)) {
    const d = hueDistance(hexToHue(swatch.hex), targetHue);
    const weighted = d / Math.max(0.15, swatch.weight);
    if (weighted < best) best = weighted;
  }
  return best;
}
