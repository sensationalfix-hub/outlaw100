import test from 'node:test';
import assert from 'node:assert/strict';

async function loadSearchModule() {
  return import('../../src/features/search/model.ts').catch(() => null);
}

const catalog = {
  entities: [
    { id: 'e-binoculars', name: 'Binoculars', category: 'equipment', type: 'equipment', metadata: { location: 'Chapter 1' } },
    { id: 'e-fish', name: 'Fishing Rod', category: 'equipment', type: 'equipment', metadata: {} },
    { id: 'e-bear', name: 'Legendary Bharati Grizzly Bear', category: 'animal', type: 'animal', metadata: { legendary: true } },
    { id: 'e-weapons-heading', name: 'WEAPONS', category: 'weapon', type: 'weapon', metadata: {} },
    { id: 'e-total', name: 'TOTAL', category: 'horse', type: 'horse', metadata: {} },
    { id: 'e-reinforced-heading', name: 'REINFORCED EQUIPMENT', category: 'reinforced_equipment', type: 'reinforced_equipment', metadata: {} },
  ],
  milestones: [
    { id: 'm-american-venom', title: 'American Venom', kind: 'story', chapter: 'epilogue-2', order: 1 },
  ],
  archiveEntries: [],
  translations: { Binoculars: 'Prismáticos', 'Fishing Rod': 'Caña de pescar' },
};

test('global search is accent-insensitive and searches Spanish translations', async () => {
  const mod = await loadSearchModule();
  assert.ok(mod?.searchCatalog, 'searchCatalog should exist');
  assert.equal(mod.searchCatalog(catalog as any, 'prismaticos')[0]?.id, 'e-binoculars');
  assert.equal(mod.searchCatalog(catalog as any, 'cana de pescar')[0]?.id, 'e-fish');
});

test('global search includes route milestones and canonical entity metadata', async () => {
  const mod = await loadSearchModule();
  assert.ok(mod?.searchCatalog, 'searchCatalog should exist');
  assert.equal(mod.searchCatalog(catalog as any, 'american venom')[0]?.kind, 'milestone');
  assert.equal(mod.searchCatalog(catalog as any, 'chapter 1')[0]?.id, 'e-binoculars');
});

test('entity predicates separate legendary animals from regular animals', async () => {
  const mod = await loadSearchModule();
  assert.ok(mod?.matchesEntityScope, 'matchesEntityScope should exist');
  assert.equal(mod.matchesEntityScope(catalog.entities[2] as any, { categories: ['animal'], legendary: true }), true);
  assert.equal(mod.matchesEntityScope(catalog.entities[0] as any, { categories: ['animal'], legendary: true }), false);
  assert.equal(mod.matchesEntityScope(catalog.entities[2] as any, { categories: ['animal'], legendary: false }), false);
});

test('source summary pseudo entities never enter compendium scopes or global search', async () => {
  const mod = await loadSearchModule();
  assert.ok(mod?.matchesEntityScope, 'matchesEntityScope should exist');
  assert.equal(mod.matchesEntityScope(catalog.entities[3] as any, { categories: ['weapon'] }), false);
  assert.equal(mod.matchesEntityScope(catalog.entities[4] as any, { categories: ['horse'] }), false);
  assert.equal(mod.matchesEntityScope(catalog.entities[5] as any, { categories: ['reinforced_equipment'] }), false);
  assert.equal(mod.searchCatalog(catalog as any, 'weapons').some((hit: any) => hit.id === 'e-weapons-heading'), false);
  assert.equal(mod.searchCatalog(catalog as any, 'total').some((hit: any) => hit.id === 'e-total'), false);
});
