export function allowedCardImageSrc(src: string): boolean {
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && url.hostname === 'images.pokemontcg.io';
  } catch {
    return false;
  }
}

export function proxiedCardImagePath(src: string): string {
  return `/api/card-image?src=${encodeURIComponent(src)}`;
}
