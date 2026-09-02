import assert from 'node:assert/strict';
import test from 'node:test';
import { buildEntityDetail } from '../../src/features/entities/detail-model.ts';
import type { CanonicalCatalog } from '../../src/lib/catalog/types.ts';

const catalog: CanonicalCatalog = {
  version: 1,
  entities: [
    { id: 'fish:bluegill', type: 'fish', category: 'fish', name: 'Bluegill', metadata: { bait: 'Cheese', location: 'Flat Iron Lake', weather: 'Rainy', internalFoo: { x: 1 } } },
    { id: 'weapon:bow', type: 'weapon', category: 'weapon', name: 'Bow' },
  ],
  criteria: [],
  relations: [{ id: 'rel:1', fromId: 'fish:bluegill', toId: 'weapon:bow', type: 'recommended_tool' }],
  recipes: [], milestones: [], milestoneTasks: [], archiveEntries: [], mediaAssets: [{ id: 'media:1', entityId: 'fish:bluegill', kind: 'image', source: 'html-realCompendiumImages', publicPath: 'https://example.test/bluegill.jpg' }],
  mapMarkers: [{ id: 'map:1', entityId: 'fish:bluegill', name: 'Bluegill spot', category: 'fish', coordinateSystem: 'rdr2-map', latitude: 100, longitude: 200 }],
};

test('entity detail exposes source-backed operational metadata with readable labels', () => {
  const detail = buildEntityDetail(catalog, catalog.entities[0]);
  assert.deepEqual(detail.metadata, [
    { label: 'CEBO', value: 'Cheese' },
    { label: 'LOCALIZACIÓN', value: 'Flat Iron Lake' },
    { label: 'CLIMA', value: 'Rainy' },
  ]);
  assert.equal(detail.metadata.some((item) => item.label === 'INTERNAL FOO'), false);
});

test('entity detail exposes canonical relations and map availability', () => {
  const detail = buildEntityDetail(catalog, catalog.entities[0]);
  assert.deepEqual(detail.relations, [{ id: 'rel:1', type: 'recommended_tool', entityId: 'weapon:bow', name: 'Bow' }]);
  assert.equal(detail.mapMarkerCount, 1);
  assert.equal(detail.imageUrl, 'https://example.test/bluegill.jpg');
});
