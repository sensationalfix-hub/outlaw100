import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRuntimeMapItems, normalizeMapName } from '../../src/features/map/model.ts';
import type { CanonicalCatalog } from '../../src/lib/catalog/types.ts';

const catalog: CanonicalCatalog = {
  version: 1,
  entities: [
    { id: 'weapon:ancient-tomahawk', type: 'weapon', category: 'weapon', name: 'Ancient Tomahawk' },
    { id: 'animal:legendary-beaver', type: 'animal', category: 'animal', name: 'Legendary Beaver' },
  ],
  criteria: [
    { id: 'criterion:weapon-owned', entityId: 'weapon:ancient-tomahawk', key: 'owned', label: 'Conseguida', criterionType: 'boolean' },
  ],
  relations: [], recipes: [], milestones: [], milestoneTasks: [], archiveEntries: [], mapMarkers: [], mediaAssets: [],
};

test('normalization ignores accents and punctuation for canonical map matching', () => {
  assert.equal(normalizeMapName('  Cañón—Viejo '), 'canon viejo');
});

test('runtime map items link real marker names to canonical entities and their primary criterion', () => {
  const items = buildRuntimeMapItems([
    { data: { markerType: 'Weapon', markerSubType: 'Ancient Tomahawk', uid: '1' }, lat: -37.4, lng: 166.0 },
    { data: { markerType: 'Animal', markerSubType: 'Legendary Beaver', uid: '2' }, lat: -72.3, lng: 199.7 },
  ], catalog);
  assert.equal(items[0].entityId, 'weapon:ancient-tomahawk');
  assert.equal(items[0].criterionId, 'criterion:weapon-owned');
  assert.equal(items[1].entityId, 'animal:legendary-beaver');
});

test('runtime map excludes markers explicitly labelled as online content', () => {
  const items = buildRuntimeMapItems([
    { data: { markerType: 'Red Dead Online', markerSubType: 'Collector', uid: '3' }, lat: -1, lng: 1 },
  ], catalog);
  assert.equal(items.length, 0);
});

test('canonical rdr2-map markers are included as runtime points without mixing legacy image coordinates', async () => {
  const mod = await import('../../src/features/map/model.ts');
  assert.ok(mod.buildCanonicalMapItems, 'buildCanonicalMapItems should exist');
  const localCatalog = {
    ...catalog,
    mapMarkers: [
      { id: 'secret', name: 'Lucky Cabin', category: 'secret', latitude: -73.8, longitude: 137.7, coordinateSystem: 'rdr2-map', entityId: 'weapon:ancient-tomahawk', criterionId: 'criterion:weapon-owned', metadata: { description: 'Punto canónico' } },
      { id: 'legacy', name: 'Hotspot', category: 'animals', legacyX: 595, legacyY: 312, coordinateSystem: 'legacy-image' },
    ],
  };
  const items = mod.buildCanonicalMapItems(localCatalog as any);
  assert.equal(items.length, 1);
  assert.equal(items[0].id, 'canonical:secret');
  assert.equal(items[0].description, 'Punto canónico');
});
