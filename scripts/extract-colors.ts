/**
 * Extract dominant colors for ONE set (default base1). Full catalog is T5.6 / Gate 2.
 *
 *   node --experimental-strip-types scripts/extract-colors.ts [setId]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = join(import.meta.dirname, '..');
const SET_ID = process.argv[2] ?? 'base1';
const SIZE = 64;
const K = 4;

type CardIndex = {
  id: string[];
  setId: string[];
  number: string[];
};

type Swatch = { hex: string; weight: number };

function srgbToLinear(c: number) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function rgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
}

function oklabToRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const toS = (c: number) => {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
    return Math.min(255, Math.max(0, Math.round(v * 255)));
  };
  return [toS(lr), toS(lg), toS(lb)];
}

function dist2(a: [number, number, number], b: [number, number, number]) {
  const d0 = a[0] - b[0];
  const d1 = a[1] - b[1];
  const d2 = a[2] - b[2];
  return d0 * d0 + d1 * d1 + d2 * d2;
}

function kmeans(points: [number, number, number][], k: number): { centroid: [number, number, number]; count: number }[] {
  if (points.length === 0) return [];
  const kk = Math.min(k, points.length);
  const centroids: [number, number, number][] = [];
  const step = Math.max(1, Math.floor(points.length / kk));
  for (let i = 0; i < kk; i += 1) centroids.push(points[Math.min(points.length - 1, i * step)]);

  const assign = new Int16Array(points.length);
  for (let iter = 0; iter < 10; iter += 1) {
    for (let i = 0; i < points.length; i += 1) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < kk; c += 1) {
        const d = dist2(points[i], centroids[c]);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      assign[i] = best;
    }
    const sums = Array.from({ length: kk }, () => [0, 0, 0, 0] as [number, number, number, number]);
    for (let i = 0; i < points.length; i += 1) {
      const c = assign[i];
      sums[c][0] += points[i][0];
      sums[c][1] += points[i][1];
      sums[c][2] += points[i][2];
      sums[c][3] += 1;
    }
    for (let c = 0; c < kk; c += 1) {
      if (sums[c][3] === 0) continue;
      centroids[c] = [sums[c][0] / sums[c][3], sums[c][1] / sums[c][3], sums[c][2] / sums[c][3]];
    }
  }
  const counts = Array(kk).fill(0);
  for (const c of assign) counts[c] += 1;
  return centroids
    .map((centroid, i) => ({ centroid, count: counts[i] }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count || a.centroid[0] - b.centroid[0]);
}

function toHex(rgb: [number, number, number]) {
  return `#${rgb.map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

function derivedSmall(setId: string, number: string) {
  return `https://images.pokemontcg.io/${setId}/${number.replaceAll(' ', '')}.png`;
}

async function colorsForImage(buf: Buffer): Promise<Swatch[]> {
  const { data } = await sharp(buf)
    .resize(SIZE, SIZE, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const labs: [number, number, number][] = [];
  for (let i = 0; i < data.length; i += 3) {
    const lab = rgbToOklab(data[i], data[i + 1], data[i + 2]);
    if (lab[0] > 0.92 || lab[0] < 0.08) continue;
    labs.push(lab);
  }
  const source = labs.length > 32 ? labs : (() => {
    const all: [number, number, number][] = [];
    for (let i = 0; i < data.length; i += 3) all.push(rgbToOklab(data[i], data[i + 1], data[i + 2]));
    return all;
  })();
  const clusters = kmeans(source, K);
  const total = clusters.reduce((s, c) => s + c.count, 0) || 1;
  return clusters.slice(0, 4).map((c) => ({
    hex: toHex(oklabToRgb(...c.centroid)),
    weight: Math.round((c.count / total) * 1000) / 1000,
  }));
}

async function main() {
  const index = JSON.parse(
    readFileSync(join(ROOT, 'public/data/cards-index.json'), 'utf8'),
  ) as CardIndex;
  const exceptions = JSON.parse(
    readFileSync(join(ROOT, 'public/data/image-exceptions.json'), 'utf8'),
  ) as Record<string, { small: string }>;

  const cards: { id: string; url: string }[] = [];
  for (let i = 0; i < index.id.length; i += 1) {
    if (index.setId[i] !== SET_ID) continue;
    cards.push({
      id: index.id[i],
      url: exceptions[index.id[i]]?.small ?? derivedSmall(index.setId[i], index.number[i]),
    });
  }
  if (cards.length === 0) throw new Error(`No cards for set ${SET_ID}`);

  const out: Record<string, Swatch[]> = {};
  let i = 0;
  for (const card of cards) {
    i += 1;
    const res = await fetch(card.url);
    if (!res.ok) {
      console.warn(`skip ${card.id} ${res.status}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    out[card.id] = await colorsForImage(buf);
    if (i % 10 === 0) console.log(`${i}/${cards.length}`);
  }

  const path = join(ROOT, 'public/data/colors.json');
  writeFileSync(path, `${JSON.stringify({ setId: SET_ID, cards: out })}\n`);
  console.log(`wrote ${Object.keys(out).length} cards to public/data/colors.json`);
}

await main();
