import type { CanonicalCatalog } from '../../lib/catalog/types.ts';
import { COMPENDIUM_ES } from './compendium-es.ts';

export function applyCompendiumTranslations(catalog: CanonicalCatalog): CanonicalCatalog {
  return {
    ...catalog,
    translations: {
      ...(catalog.translations ?? {}),
      ...COMPENDIUM_ES,
    },
  };
}
