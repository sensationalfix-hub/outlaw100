import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStoryGroups } from '../../src/features/story/model.ts';
import type { CanonicalCatalog, CatalogEntity, CatalogCriterion } from '../../src/lib/catalog/types.ts';

const mission = (id: string, name: string, chapterLabel: string, groupIndex: number, missionIndex: number): CatalogEntity => ({
  id,
  name,
  type: 'story_mission',
  category: 'story_mission_legacy',
  metadata: { chapterLabel, groupIndex, missionIndex },
});

const criterion = (id: string, entityId: string, key: string): CatalogCriterion => ({
  id,
  entityId,
  key,
  label: key,
  criterionType: key.startsWith('gold-') ? 'gold' : 'completion',
});

function storyCatalog(): CanonicalCatalog {
  return {
    version: 'story-test',
    entities: [
      mission('c2-2', 'Later chapter mission', 'Capítulo 2 · Horseshoe Overlook', 2, 2),
      mission('c1-2', 'Second Colter mission', 'Capítulo 1 · Colter', 1, 2),
      mission('c1-1', 'First Colter mission', 'Capítulo 1 · Colter', 1, 1),
    ],
    criteria: [
      criterion('c1-complete', 'c1-1', 'complete'),
      criterion('c1-gold-a', 'c1-2', 'gold-1'),
      criterion('c1-gold-b', 'c1-2', 'gold-2'),
      criterion('c1-other', 'c1-2', 'complete'),
    ],
    relations: [],
    recipes: [],
    milestones: [],
    milestoneTasks: [],
    archiveEntries: [],
    mapMarkers: [],
    mediaAssets: [],
  };
}

test('Historia orders chapters and missions from source metadata instead of alphabetically', () => {
  const groups = buildStoryGroups(storyCatalog(), {});
  assert.equal(groups[0].label, 'Capítulo 1 · Colter');
  assert.deepEqual(groups[0].missions.map(({ entity }) => entity.id), ['c1-1', 'c1-2']);
  assert.equal(groups[1].label, 'Capítulo 2 · Horseshoe Overlook');
});

test('Historia uses canonical campaign order even when legacy groupIndex metadata is scrambled', () => {
  const catalog: CanonicalCatalog = {
    ...storyCatalog(),
    entities: [
      mission('e2', 'Epilogue II mission', "Epílogo II · Beecher's Hope", 0, 1),
      mission('c1', 'Chapter 1 mission', 'Capítulo 1 · Colter', 1, 1),
      mission('c4', 'Chapter 4 mission', 'Capítulo 4 · Shady Belle', 2, 1),
      mission('c3', 'Chapter 3 mission', 'Capítulo 3 · Clemens Point', 3, 1),
      mission('c5', 'Chapter 5 mission', 'Capítulo 5 · Guarma', 4, 1),
      mission('c2', 'Chapter 2 mission', 'Capítulo 2 · Mirador de la Herradura', 5, 1),
      mission('c6', 'Chapter 6 mission', 'Capítulo 6 · Beaver Hollow', 6, 1),
      mission('e1', 'Epilogue I mission', 'Epílogo I · Pronghorn Ranch', 7, 1),
    ],
    criteria: [],
  };
  const groups = buildStoryGroups(catalog, {});
  assert.deepEqual(groups.map(({ label }) => label), [
    'Capítulo 1 · Colter',
    'Capítulo 2 · Mirador de la Herradura',
    'Capítulo 3 · Clemens Point',
    'Capítulo 4 · Shady Belle',
    'Capítulo 5 · Guarma',
    'Capítulo 6 · Beaver Hollow',
    'Epílogo I · Pronghorn Ranch',
    "Epílogo II · Beecher's Hope",
  ]);
});

test('Historia gives every mission one stable global campaign number across chapter boundaries', () => {
  const catalog: CanonicalCatalog = {
    ...storyCatalog(),
    entities: [
      mission('c2-2', 'Chapter 2 second', 'Capítulo 2 · Mirador de la Herradura', 5, 20),
      mission('c1-2', 'Chapter 1 second', 'Capítulo 1 · Colter', 1, 90),
      mission('c2-1', 'Chapter 2 first', 'Capítulo 2 · Mirador de la Herradura', 5, 10),
      mission('c1-1', 'Chapter 1 first', 'Capítulo 1 · Colter', 1, 80),
    ],
    criteria: [],
  };
  const groups = buildStoryGroups(catalog, {});
  const missions = groups.flatMap((group) => group.missions);
  assert.deepEqual(missions.map((item) => item.entity.id), ['c1-1', 'c1-2', 'c2-1', 'c2-2']);
  assert.deepEqual(missions.map((item) => item.campaignOrder), [1, 2, 3, 4]);
});

test('Historia exposes gold state only when a mission has gold-* criteria', () => {
  const [colter] = buildStoryGroups(storyCatalog(), { 'c1-gold-a': 'completed' });
  const [plain, medal] = colter.missions;
  assert.equal(plain.hasGold, false);
  assert.deepEqual([medal.hasGold, medal.goldCompleted, medal.goldTotal], [true, 1, 2]);
});

test('gold medal progress does not discard the other mission checks', () => {
  const [colter] = buildStoryGroups(storyCatalog(), { 'c1-gold-a': 'completed', 'c1-other': 'completed' });
  const medal = colter.missions[1];
  assert.equal(medal.totalCriteria, 3);
  assert.equal(medal.completedCriteria, 2);
  assert.deepEqual(medal.goldCriteria.map(({ key }) => key), ['gold-1', 'gold-2']);
});

test('mission completion follows the complete criterion independently from medal objectives', () => {
  const [colter] = buildStoryGroups(storyCatalog(), { 'c1-other': 'completed' });
  const medal = colter.missions[1];
  assert.equal(medal.completed, true);
  assert.equal(medal.goldCompleted, 0);
  assert.equal(medal.goldTotal, 2);
});

test('a mission earns the gold visual state only after every gold objective is completed', () => {
  const [partialChapter] = buildStoryGroups(storyCatalog(), { 'c1-gold-a': 'completed' });
  const partial = partialChapter.missions[1];
  assert.equal(partial.goldEarned, false);

  const [completeChapter] = buildStoryGroups(storyCatalog(), {
    'c1-gold-a': 'completed',
    'c1-gold-b': 'completed',
  });
  const complete = completeChapter.missions[1];
  assert.equal(complete.goldEarned, true);
});
