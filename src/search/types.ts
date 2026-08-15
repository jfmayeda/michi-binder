export type CardIndex = {
  id: string[];
  name: string[];
  setId: string[];
  number: string[];
  rarity: (string | null)[];
  artist: (string | null)[];
  types: string[][];
  dex: (number | null)[];
  era: string[];
};

export type SetInfo = {
  id: string;
  name: string;
  series: string;
  releaseDate: string;
  symbol: string | null;
  logo: string | null;
};

export type SearchQuery = {
  text?: string;
  setId?: string;
  speciesDex?: number;
  type?: string;
  artist?: string;
  rarity?: string;
  era?: string;
};

export type CardHit = {
  id: string;
  name: string;
  setId: string;
  number: string;
  rarity: string | null;
  artist: string | null;
  types: string[];
  dex: number | null;
  era: string;
  imageSmall: string;
};

export type ImageExceptions = Record<string, { small: string; large: string }>;
