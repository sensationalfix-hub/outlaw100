import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveEntityMedia } from '../../src/features/media/entity-media.ts';
import type { CatalogEntity, MediaAsset } from '../../src/lib/catalog/types.ts';

function entity(id: string, name: string, category: string, subcategory?: string): CatalogEntity {
  return {
    id,
    name,
    category,
    subcategory,
    groupKey: 'test',
    groupIndex: 0,
    criteriaIds: [],
    tags: [],
    meta: {},
  };
}

const canonical: MediaAsset = {
  id: 'media-1',
  kind: 'image',
  title: 'Official',
  localUrl: null,
  sourceUrl: 'https://example.com/official.jpg',
  entityId: 'animal-1',
  meta: { provider: 'gtabase' },
};

test('canonical entity media keeps source-backed image before curated fallback', () => {
  const media = resolveEntityMedia(entity('animal-1', 'American Alligator', 'animal'), { 'animal-1': [canonical] });
  assert.ok(media);
  assert.equal(media?.source, 'canonical');
  assert.equal(media?.url, 'https://example.com/official.jpg');
});

test('weapon media resolves GTABase gallery art using the gallery id bucket', () => {
  const media = resolveEntityMedia(entity('weapon-1', 'Cattleman Revolver', 'weapon', 'REVOLVERS'), {});
  assert.ok(media);
  assert.match(media?.url ?? '', /\/igallery\/2801-2900\/2828_/);
  assert.equal(media?.orientation, 'landscape');
  assert.equal(media?.fit, 'contain');
});

test('cigarette card media resolves deterministic high-resolution GTABase artwork', () => {
  const card = entity('card-1', 'Famous Gunslingers & Outlaws #2', 'cigarette_card');
  card.meta = { set: 'Famous Gunslingers & Outlaws', card: 2, cardName: 'Black Belle' };
  const media = resolveEntityMedia(card, {});
  assert.ok(media);
  assert.ok(media?.url.includes('cigarette-cards/'));
  assert.ok(media?.url.includes('/1920/'));
  assert.equal(media?.orientation, 'portrait');
  assert.equal(media?.fit, 'contain');
});

test('missing compendium art gets a deliberate local fallback instead of a broken image', () => {
  const media = resolveEntityMedia(entity('animal-x', 'Unknown Animal', 'animal'), {});
  assert.ok(media);
  assert.match(media?.url ?? '', /^\/media\//);
  assert.equal(media?.source, 'fallback');
});
