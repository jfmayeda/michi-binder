import type { ImageExceptions } from './types';

export function derivedCardImageUrl(setId: string, number: string): string {
  const encoded = number.replaceAll(' ', '');
  return `https://images.pokemontcg.io/${setId}/${encoded}.png`;
}

export function cardImageUrl(
  cardId: string,
  setId: string,
  number: string,
  exceptions: ImageExceptions,
): string {
  return exceptions[cardId]?.small ?? derivedCardImageUrl(setId, number);
}
