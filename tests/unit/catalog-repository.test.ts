import test from 'node:test';
import assert from 'node:assert/strict';

async function loadModule() {
  return import('../../src/lib/catalog/repository.ts').catch(() => null);
}

type Rows = Record<string, unknown[]>;

function fakeClient(rows: Rows, pageSizeCap = 1000) {
  return {
    from(table: string) {
      const state = { orderColumn: '' };
      return {
        select() {
          return {
            order(column: string) {
              state.orderColumn = column;
              return this;
            },
            async range(from: number, to: number) {
              const sorted = [...(rows[table] ?? [])].sort((a: any, b: any) => String(a[state.orderColumn] ?? '').localeCompare(String(b[state.orderColumn] ?? '')));
              const cappedTo = Math.min(to, from + pageSizeCap - 1);
              return { data: sorted.slice(from, cappedTo + 1), error: null };
            },
          };
        },
      };
    },
  };
}

const meta = {
  version: 1,
  translations: { Binoculars: 'Prismáticos' },
  mapCanonicalAliases: { 'black bear': 'American Black Bear' },
  mapSources: { markers: ['markers.json'], tiles: 'tiles/{z}/{x}_{y}.jpg' },
  designTokens: { red: '#c3291d' },
  fontAsset: '/fonts/chinese-rocks.otf',
  audit: { source: 'static-meta' },
} as any;

test('supabase catalog repository rebuilds canonical camelCase shapes and recipe requirements', async () => {
  const mod = await loadModule();
  assert.ok(mod?.loadCatalogFromSupabase);
  const client = fakeClient({
    entities: [{ id: 'e1', type: 'animal', name: 'Badger', category: 'animal', metadata: {}, source: {} }],
    criteria: [{ id: 'c1', entity_id: 'e1', key: 'studied', label: 'Estudiado', criterion_type: 'boolean', metadata: {}, source: {} }],
    relations: [{ id: 'r1', from_id: 'e1', to_id: 'e1', type: 'related', metadata: {} }],
    milestones: [{ id: 'm1', kind: 'story', chapter: 'chapter-1', title: 'Outlaws from the West', sort_order: 10, source_page: 2, source_reference: 'PDF p.2', missable_risk: false, availability: {}, details: '', checklist: [], metadata: {} }],
    milestone_tasks: [{ id: 't1', milestone_id: 'm1', task_type: 'criterion', label: 'Badger · Estudiado', sort_order: 1, source_reference: 'PDF p.2', source_page: 2, entity_id: 'e1', criterion_id: 'c1', metadata: {} }],
    craft_recipes: [{ id: 'recipe:e1', entity_id: 'e1', source: {} }],
    craft_requirements: [{ recipe_id: 'recipe:e1', material_id: 'e1', material_name: 'Badger', material_tier: 'perfect', quantity: 2 }],
    archive_entries: [{ id: 'a1', entity_id: 'e1', section: 'Animals', group: '', subgroup: '', name: 'Badger', missable: false }],
    map_markers: [{ id: 'mk1', entity_id: 'e1', criterion_id: 'c1', name: 'Badger', category: 'Animal', latitude: -1, longitude: 2, legacy_x: null, legacy_y: null, coordinate_system: 'rdr2-map', metadata: {}, source: {} }],
    media_assets: [{ id: 'media1', entity_id: null, kind: 'image', public_path: '/media/a.jpg', source: 'html', metadata: {} }],
    source_references: [{ id: 'src1', target_type: 'entity', target_id: 'e1', source_kind: 'xlsx', locator: 'Animals!A2', metadata: {} }],
  });

  const catalog = await mod.loadCatalogFromSupabase(client as any, meta);
  assert.equal(catalog.entities[0].id, 'e1');
  assert.equal(catalog.criteria[0].entityId, 'e1');
  assert.equal(catalog.milestones[0].order, 10);
  assert.equal(catalog.milestoneTasks[0].criterionId, 'c1');
  assert.equal(catalog.recipes[0].requirements[0].quantity, 2);
  assert.equal(catalog.recipes[0].requirements[0].tier, 'perfect');
  assert.equal(catalog.archiveEntries[0].entityId, 'e1');
  assert.equal(catalog.mapMarkers[0].coordinateSystem, 'rdr2-map');
  assert.equal(catalog.mediaAssets[0].publicPath, '/media/a.jpg');
  assert.equal(catalog.sourceReferences?.[0].targetId, 'e1');
  assert.equal(catalog.translations?.Binoculars, 'Prismáticos');
});

test('supabase catalog repository rejects an empty database so static fallback can remain usable', async () => {
  const mod = await loadModule();
  assert.ok(mod?.loadCatalogFromSupabase);
  await assert.rejects(() => mod.loadCatalogFromSupabase(fakeClient({}) as any, meta), /catálogo canónico está vacío/i);
});


test('supabase catalog repository paginates tables beyond PostgREST row limits', async () => {
  const mod = await loadModule();
  assert.ok(mod?.loadCatalogFromSupabase);
  const entities = Array.from({ length: 1205 }, (_, index) => ({ id: `e${String(index).padStart(4, '0')}`, type: 'item', name: `Item ${index}`, category: 'item', metadata: {}, source: {} }));
  const client = fakeClient({
    entities,
    milestones: [{ id: 'm1', kind: 'story', chapter: 'chapter-1', title: 'Outlaws from the West', sort_order: 1, source_page: 2, source_reference: 'PDF p.2', missable_risk: false, availability: {}, details: '', checklist: [], metadata: {} }],
  }, 1000);
  const catalog = await mod.loadCatalogFromSupabase(client as any, meta);
  assert.equal(catalog.entities.length, 1205);
});
