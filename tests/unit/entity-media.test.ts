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

test('regular fauna resolves an individual GTABase animal thumbnail', () => {
  const media = resolveEntityMedia(entity('animal-robin', 'American Robin', 'animal'), []);
  assert.equal(media.url, 'https://www.gtabase.com/images/red-dead-redemption-2/animals/resized/american-robin_320x177.jpg');
  assert.equal(media.fit, 'contain');
});

test('legendary fish uses the GTABase species-legendary filename convention', () => {
  const media = resolveEntityMedia(entity('fish-bluegill', 'Legendary Bluegill', 'fish'), []);
  assert.equal(media.url, 'https://www.gtabase.com/images/red-dead-redemption-2/animals/resized/bluegill-legendary_320x177.jpg');
});

test('known source typos are normalized to the actual GTABase media slug', () => {
  const smallGator = resolveEntityMedia(entity('animal-small-gator', 'American Allitgator (Small)', 'animal'), []);
  const ram = resolveEntityMedia(entity('animal-ram', 'Legendary Big Horn Ram', 'animal'), []);
  assert.equal(smallGator.url, 'https://www.gtabase.com/images/red-dead-redemption-2/animals/resized/american-alligator-small_320x177.jpg');
  assert.equal(ram.url, 'https://www.gtabase.com/images/red-dead-redemption-2/animals/resized/legendary-bighorn-ram_320x177.jpg');
});

test('horse breeds get individual official-game imagery instead of the generic fallback', () => {
  const arabian = resolveEntityMedia(entity('horse-arabian', 'Arabian', 'horse'), []);
  const paint = resolveEntityMedia(entity('horse-paint', 'American Paint', 'horse'), []);
  assert.match(arabian.url ?? '', /RDR2_Horses_ArabianHorse_WhiteArabianHorse_1-3139-360\.jpg$/);
  assert.match(paint.url ?? '', /RDR2_CigaretteCards_Horses_AmericanPaintHorse-3421-1920\.jpg$/);
  assert.notEqual(arabian.url, paint.url);
});

test('missing compendium art gets a deliberate local fallback instead of a broken image', () => {
  const media = resolveEntityMedia(entity('unknown-x', 'Unknown Thing', 'unknown_category'), []);
  assert.ok(media);
  assert.match(media.url ?? '', /^\/media\//);
  assert.equal(media.source, 'fallback');
});
