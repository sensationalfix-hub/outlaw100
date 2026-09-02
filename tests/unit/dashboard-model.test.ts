import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDashboardModel } from '../../src/features/dashboard/model.ts';
import type { CanonicalCatalog } from '../../src/lib/catalog/types.ts';
import type { ProgressSnapshot } from '../../src/features/progress/types.ts';

const catalog: CanonicalCatalog = {
  version: 1,
  entities: [
    { id: 'story-legacy:forajidos-del-oeste', type: 'story_mission', name: 'Forajidos del Oeste', category: 'story_mission_legacy', metadata: { chapterLabel: 'Capítulo 1 · Colter', groupIndex: 0, missionIndex: 0 } },
  ],
  criteria: [
    { id: 'gold:1', entityId: 'story-legacy:forajidos-del-oeste', key: 'gold-1', label: 'No recibas daño durante el tiroteo', criterionType: 'boolean' },
    { id: 'gold:2', entityId: 'story-legacy:forajidos-del-oeste', key: 'gold-2', label: 'Saquea 6 objetos o más del rancho Adler', criterionType: 'boolean' },
    { id: 'gold:3', entityId: 'story-legacy:forajidos-del-oeste', key: 'gold-3', label: 'Termina con al menos un 80% de precisión', criterionType: 'boolean' },
  ],
  relations: [], recipes: [], archiveEntries: [], mapMarkers: [], mediaAssets: [],
  milestones: [
    { id: 'm1', kind: 'story', chapter: 'chapter-1', title: 'Outlaws from the West', order: 10, sourcePage: 2, sourceReference: 'PDF p.2', missableRisk: false },
    { id: 'm2', kind: 'story', chapter: 'chapter-1', title: 'Enter, Pursued by a Memory', order: 20, sourcePage: 2, sourceReference: 'PDF p.2', missableRisk: false },
  ],
  milestoneTasks: [
    { id: 't1', milestoneId: 'm1', label: 'Completar: Outlaws from the West', order: 0 },
  ],
};

const progress: ProgressSnapshot = { version: 1, criteria: { 'gold:1': 'completed' }, tasks: {}, inventory: {} };

test('dashboard uses source-backed legacy gold objectives when story chapter positions are unambiguous', () => {
  const model = buildDashboardModel(catalog, catalog.milestones[0], progress);
  assert.equal(model.displayTitle, 'Forajidos del Oeste');
  assert.equal(model.goldObjectives.length, 3);
  assert.equal(model.goldObjectives[0].done, true);
  assert.equal(model.goldObjectives[2].label, 'Termina con al menos un 80% de precisión');
});

test('dashboard links chapter 2 story milestones to the legacy mission, completion check and gold objectives', () => {
  const mixed = structuredClone(catalog) as CanonicalCatalog;
  mixed.entities.push({
    id: 'story-legacy:sociedad-educada-estilo-valentine',
    type: 'story_mission',
    name: 'Sociedad educada, estilo Valentine',
    category: 'story_mission_legacy',
    metadata: { chapterLabel: 'Capítulo 2 · Mirador de la Herradura', groupIndex: 0, missionIndex: 0 },
  });
  mixed.criteria.push(
    { id: 'chapter2:complete', entityId: 'story-legacy:sociedad-educada-estilo-valentine', key: 'complete', label: 'Misión completada', criterionType: 'boolean' },
    { id: 'chapter2:gold:1', entityId: 'story-legacy:sociedad-educada-estilo-valentine', key: 'gold-1', label: 'Devuelve el caballo perdido del carro a su dueño', criterionType: 'boolean' },
    { id: 'chapter2:gold:2', entityId: 'story-legacy:sociedad-educada-estilo-valentine', key: 'gold-2', label: 'Encuentra a Karen en menos de 45 s', criterionType: 'boolean' },
  );
  mixed.milestones = [{ id: 'm3', kind: 'story', chapter: 'chapter-2', title: 'Polite Society, Valentine Style', order: 10, sourcePage: 2, sourceReference: 'PDF p.2', missableRisk: false }];
  mixed.milestoneTasks = [{ id: 'chapter2:hito', milestoneId: 'm3', label: 'Completar: Polite Society, Valentine Style', order: 0 }];
  const state: ProgressSnapshot = {
    version: 1,
    criteria: { 'chapter2:complete': 'completed', 'chapter2:gold:1': 'completed' },
    tasks: {},
    inventory: {},
  };

  const model = buildDashboardModel(mixed, mixed.milestones[0], state);
  assert.equal(model.displayTitle, 'Sociedad educada, estilo Valentine');
  assert.equal(model.legacyMission?.id, 'story-legacy:sociedad-educada-estilo-valentine');
  assert.deepEqual(model.goldObjectives.map(({ label, done }) => [label, done]), [
    ['Devuelve el caballo perdido del carro a su dueño', true],
    ['Encuentra a Karen en menos de 45 s', false],
  ]);
  assert.equal(model.missionCompletion?.criterion.id, 'chapter2:complete');
  assert.equal(model.missionCompletion?.done, true);
});

test('dashboard exposes pending earlier work, active requests, next route nodes and craftables ready by inventory', () => {
  const extended = structuredClone(catalog) as CanonicalCatalog;
  extended.entities.push(
    { id: 'craft:bag', type: 'satchel', name: 'Zurrón de prueba', category: 'satchel', metadata: {} },
    { id: 'material:hide', type: 'material', name: 'Piel perfecta', category: 'material', metadata: {} },
  );
  extended.criteria.push({ id: 'craft:bag:crafted', entityId: 'craft:bag', key: 'crafted', label: 'Fabricado', criterionType: 'boolean' });
  extended.recipes.push({ id: 'recipe:bag', entityId: 'craft:bag', requirements: [{ materialId: 'material:hide', materialName: 'Piel perfecta', quantity: 1 }] });
  extended.milestones = [
    { id: 'prior', kind: 'stranger', chapter: 'chapter-1', title: 'Trabajo anterior', order: 5, sourcePage: 4, sourceReference: 'PDF p.4', missableRisk: false },
    { id: 'request', kind: 'item_request', chapter: 'chapter-1', title: 'Encargo activo', order: 8, sourcePage: 7, sourceReference: 'PDF p.7', missableRisk: true },
    { id: 'm1', kind: 'story', chapter: 'chapter-1', title: 'Outlaws from the West', order: 10, sourcePage: 2, sourceReference: 'PDF p.2', missableRisk: false },
    { id: 'next', kind: 'hunting', chapter: 'chapter-1', title: 'Caza siguiente', order: 15, sourcePage: 29, sourceReference: 'XLSX Animals', missableRisk: false },
  ];
  extended.milestoneTasks = [
    { id: 'prior-task', milestoneId: 'prior', label: 'Pendiente', order: 0 },
    { id: 'request-task', milestoneId: 'request', label: 'Entrega', order: 0 },
    { id: 'current-task', milestoneId: 'm1', label: 'Historia', order: 0 },
    { id: 'next-task', milestoneId: 'next', label: 'Cazar', order: 0 },
  ];
  const state: ProgressSnapshot = { version: 1, criteria: {}, tasks: {}, inventory: { 'material:hide': 1 } };
  const model = buildDashboardModel(extended, extended.milestones[2], state);
  assert.deepEqual(model.pendingEarlierMilestones.map((item) => item.id), ['prior', 'request']);
  assert.deepEqual(model.availableRequests.map((item) => item.id), ['request']);
  assert.deepEqual(model.nextMilestones.map((item) => item.id), ['next']);
  assert.deepEqual(model.readyCraftables.map((item) => item.entity.id), ['craft:bag']);
});

test('dashboard hero prefers media linked to the current milestone entity over generic legacy art', () => {
  const visual = structuredClone(catalog) as CanonicalCatalog;
  visual.entities.push({ id: 'animal:american-alligator', type: 'animal', name: 'American Alligator', category: 'animal', metadata: {} });
  visual.mediaAssets = [
    { id: 'generic', kind: 'image', source: 'html-embedded', publicPath: '/media/generic.jpg' },
    { id: 'alligator', kind: 'image', source: 'html-realCompendiumImages', publicPath: 'https://example.invalid/alligator.jpg', entityId: 'animal:american-alligator' },
  ];
  visual.milestoneTasks = [
    { id: 't1', milestoneId: 'm1', label: 'Estudia el caimán', order: 0, entityId: 'animal:american-alligator' },
  ];
  const model = buildDashboardModel(visual, visual.milestones[0], progress);
  assert.equal(model.heroImageUrl, 'https://example.invalid/alligator.jpg');
});

test('dashboard hero falls back to generic art without reusing embedded compendium media', () => {
  const visual = structuredClone(catalog) as CanonicalCatalog;
  visual.mediaAssets = [
    { id: 'plant-embedded', kind: 'image', source: 'html-embedded', publicPath: '/media/tobacco.jpg' },
    { id: 'plant-link', kind: 'image', source: 'html-realCompendiumImages', publicPath: '/media/tobacco.jpg', entityId: 'plant:tobacco' },
    { id: 'generic', kind: 'image', source: 'html-embedded', publicPath: '/media/west.jpg' },
  ];
  const model = buildDashboardModel(visual, visual.milestones[0], progress);
  assert.equal(model.heroImageUrl, '/media/west.jpg');
});
