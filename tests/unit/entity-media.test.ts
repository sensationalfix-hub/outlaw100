import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveEntityMedia } from '../../src/features/media/entity-media.ts';
import type { CanonicalCatalog, CatalogEntity } from '../../src/lib/catalog/types.ts';

function catalog(mediaAssets: CanonicalCatalog['mediaAssets'] = []): CanonicalCatalog {
  return { version: 1, entities: [], criteria: [], relations: [], recipes: [], milestones: [], milestoneTasks: [], archiveEntries: [], mapMarkers: [], mediaAssets };
}

const animal: CatalogEntity = { id: 'animal-1', name: 'American Alligator', type: 'animal', category: 'animal' };
const weapon: CatalogEntity = { id: 'weapon-1', name: 'Cattleman Revolver', type: 'weapon', category: 'weapon' };
const unknownAnimal: CatalogEntity = { id: 'animal-x', name: 'Imaginary Critter', type: 'animal', category: 'animal' };

test('canonical entity media wins and legacy GTABase thumbnails are upgraded', () => {
  const result = resolveEntityMedia(catalog([{ id: 'm1', kind: 'image', source: 'legacy', entityId: animal.id, publicPath: 'https://www.gtabase.com/igallery/2501-2600/RDR2_Wildlife_American_Alligator-2548-108.jpg' }]), animal);
  assert.equal(result.source, 'catalog');
  assert.match(result.url ?? '', /American_Alligator-2548-1600\.jpg$/);
  assert.equal(result.fit, 'contain');
  assert.ok(result.fallbackUrl);
});

test('manifest media supplies entity-specific weapon art when catalog media is absent', () => {
  const result = resolveEntityMedia(catalog(), weapon);
  assert.equal(result.source, 'official-compendium');
  assert.match(result.url ?? '', /weapons\/icon\/cattleman-revolver\.jpg$/);
  assert.equal(result.fit, 'contain');
});

test('unmapped target entities get a clean category fallback instead of a broken source', () => {
  const result = resolveEntityMedia(catalog(), unknownAnimal);
  assert.equal(result.source, 'fallback');
  assert.equal(result.url, result.fallbackUrl);
  assert.match(result.url ?? '', /^\/media\//);
});
