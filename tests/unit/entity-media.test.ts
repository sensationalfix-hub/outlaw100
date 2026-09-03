import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveEntityMedia } from '../../src/features/media/entity-media.ts';
import type { CatalogEntity, CatalogMediaAsset } from '../../src/lib/catalog/types.ts';

function entity(id: string, name: string, category: string, metadata: Record<string, unknown> = {}): CatalogEntity {
  return { id, type: category, name, category, metadata };
}

const canonical: CatalogMediaAsset = {
  id: 'media-1',
  kind: 'image',
  source: 'gtabase',
  publicPath: 'https://example.com/official.jpg',
  entityId: 'animal-1',
};

test('catalog entity media keeps source-backed image before curated fallback', () => {
  const media = resolveEntityMedia(entity('animal-1', 'American Alligator', 'animal'), [canonical]);
  assert.ok(media);
  assert.equal(media.source, 'catalog');
  assert.equal(media.url, 'https://example.com/official.jpg');
});

test('weapon media resolves a dedicated GTABase compendium icon', () => {
  const media = resolveEntityMedia(entity('weapon-1', 'Cattleman Revolver', 'weapon'), []);
  assert.ok(media);
  assert.equal(media.url, 'https://www.gtabase.com/images/red-dead-redemption-2/weapons/icon/cattleman-revolver.jpg');
  assert.equal(media.orientation, 'landscape');
  assert.equal(media.fit, 'contain');
});

test('cigarette card media resolves deterministic high-resolution GTABase artwork', () => {
  const card = entity('card-1', 'Black Belle', 'cigarette_card', { set: 'Famous Gunslingers', number: 8 });
  const media = resolveEntityMedia(card, []);
  assert.ok(media);
  assert.match(media.url ?? '', /\/igallery\/2601-2700\/RDR2_Artwork_Gunslinger_BlackBelle-2691-1920\.jpg$/);
  assert.equal(media.orientation, 'portrait');
  assert.equal(media.fit, 'contain');
});

test('missing compendium art gets a deliberate local fallback instead of a broken image', () => {
  const media = resolveEntityMedia(entity('animal-x', 'Unknown Animal', 'animal'), []);
  assert.ok(media);
  assert.match(media.url ?? '', /^\/media\//);
  assert.equal(media.source, 'fallback');
});
