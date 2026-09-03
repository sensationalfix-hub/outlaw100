import type { CatalogEntity, CatalogMediaAsset } from '../../lib/catalog/types.ts';
import { manifestMediaForEntity } from './manifests/compendium.ts';
import type { EntityMedia, EntityMediaFit, EntityMediaOrientation } from './types.ts';

const CONTAIN_CATEGORIES = new Set([
  'animal',
  'fish',
  'plant',
  'horse',
  'weapon',
  'equipment',
  'weapon_equipment',
  'reinforced_equipment',
  'horse_equipment',
  'talisman_trinket',
  'cigarette_card',
]);

function inferCatalogPresentation(entity: CatalogEntity): { orientation: EntityMediaOrientation; fit: EntityMediaFit } {
  if (entity.category === 'cigarette_card') return { orientation: 'portrait', fit: 'contain' };
  if (CONTAIN_CATEGORIES.has(entity.category)) return { orientation: 'landscape', fit: 'contain' };
  return { orientation: 'unknown', fit: 'cover' };
}

export function resolveEntityMedia(entity: CatalogEntity, mediaAssets: CatalogMediaAsset[]): EntityMedia {
  const catalogAsset = mediaAssets.find((asset) => asset.entityId === entity.id && asset.kind === 'image' && Boolean(asset.publicPath));
  if (catalogAsset) {
    const presentation = inferCatalogPresentation(entity);
    return {
      url: catalogAsset.publicPath,
      fallbackUrl: null,
      source: 'catalog',
      orientation: presentation.orientation,
      fit: presentation.fit,
    };
  }

  const manifest = manifestMediaForEntity(entity);
  if (manifest) {
    return {
      url: manifest.url,
      fallbackUrl: null,
      source: manifest.source,
      orientation: manifest.orientation ?? 'unknown',
      fit: manifest.fit ?? 'cover',
      objectPosition: manifest.objectPosition,
    };
  }

  return {
    url: null,
    fallbackUrl: null,
    source: 'fallback',
    orientation: 'landscape',
    fit: 'cover',
  };
}
