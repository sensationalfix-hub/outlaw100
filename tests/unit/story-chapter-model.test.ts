import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStoryGroups } from '../../src/features/story/model.ts';
import type { CanonicalCatalog } from '../../src/lib/catalog/types.ts';

function catalog(): CanonicalCatalog {
  return {
    version: 1,
    entities: [
      { id: 'm3', type: 'story_mission', name: 'Third', category: 'story_mission_legacy', metadata: { chapterLabel: 'Capítulo 2 · Horseshoe Overlook', groupIndex: 2, missionIndex: 3 } },
      { id: 'm1', type: 'story_mission', name: 'First', category: 'story_mission_legacy', metadata: { chapterLabel: 'Capítulo 1 · Colter', groupIndex: 1, missionIndex: 1 } },
      { id: 'm2', type: 'story_mission', name: 'Second', category: 'story_mission_legacy', metadata: { chapterLabel: 'Capítulo 1 · Colter', groupIndex: 1, missionIndex: 2 } },
    ],
    criteria: [
      { id: 'complete-m1', entityId: 'm1', key: 'complete', label: 'Misión completada', criterionType: 'completion' },
      { id: 'gold-m2-1', entityId: 'm2', key: 'gold-1', label: 'No recibas daño', criterionType: 'gold' },
      { id: 'gold-m2-2', entityId: 'm2', key: 'gold-2', label: '80% precisión', criterionType: 'gold' },
    ],
    relations: [], recipes: [], milestones: [], milestoneTasks: [], archiveEntries: [], mapMarkers: [], mediaAssets: [],
  };
}

test('groups story missions by chapter and preserves source mission order', () => {
  const groups = buildStoryGroups(catalog(), {});
  assert.deepEqual(groups.map((group) => group.label), ['Capítulo 1 · Colter', 'Capítulo 2 · Horseshoe Overlook']);
  assert.deepEqual(groups[0].missions.map((mission) => mission.entity.id), ['m1', 'm2']);
  assert.deepEqual(groups[1].missions.map((mission) => mission.entity.id), ['m3']);
});

test('marks only gold-* criteria as medal objectives and reports their progress', () => {
  const groups = buildStoryGroups(catalog(), { 'gold-m2-1': 'completed' });
  const second = groups[0].missions[1];
  assert.equal(second.hasGold, true);
  assert.equal(second.goldCompleted, 1);
  assert.equal(second.goldTotal, 2);
  assert.equal(groups[0].missions[0].hasGold, false);
});
