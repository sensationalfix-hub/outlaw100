import type { CatalogEntity } from '../../../lib/catalog/types.ts';
import type { ManifestMediaEntry } from '../types.ts';

const BASE = 'https://www.gtabase.com/images/red-dead-redemption-2/animals/resized';

const SLUG_OVERRIDES: Record<string, string> = {
  'American Allitgator (Small)': 'american-alligator-small',
  'Legendary Big Horn Ram': 'legendary-bighorn-ram',
};

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function faunaSlug(entity: CatalogEntity): string {
  const override = SLUG_OVERRIDES[entity.name];
  if (override) return override;
  if (entity.category === 'fish' && entity.name.startsWith('Legendary ')) {
    return `${slugify(entity.name.slice('Legendary '.length))}-legendary`;
  }
  return slugify(entity.name);
}

export function faunaMedia(entity: CatalogEntity): ManifestMediaEntry | null {
  if (!['animal', 'fish'].includes(entity.category) || !entity.name) return null;
  return {
    url: `${BASE}/${faunaSlug(entity)}_320x177.jpg`,
    source: 'curated-external',
    orientation: 'landscape',
    fit: 'contain',
  };
}
