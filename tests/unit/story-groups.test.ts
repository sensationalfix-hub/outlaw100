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
