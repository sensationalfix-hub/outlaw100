export type EntityMediaSource = 'catalog' | 'official-compendium' | 'official-game' | 'curated-external' | 'fallback';
export type EntityMediaOrientation = 'landscape' | 'portrait' | 'square' | 'unknown';
export type EntityMediaFit = 'cover' | 'contain';

export type ManifestMediaEntry = {
  url: string;
  source: Exclude<EntityMediaSource, 'catalog' | 'fallback'>;
  orientation?: EntityMediaOrientation;
  fit?: EntityMediaFit;
  objectPosition?: string;
};

export type EntityMedia = {
  url: string | null;
  fallbackUrl: string | null;
  source: EntityMediaSource;
  orientation: EntityMediaOrientation;
  fit: EntityMediaFit;
  objectPosition?: string;
};
