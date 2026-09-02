import test from 'node:test';
import assert from 'node:assert/strict';

async function loadRouteModule() {
  return import('../../src/features/route/engine.ts').catch(() => null);
}

const catalog = {
  milestones: [
    { id: 'm1', order: 10, chapter: 'chapter-2', title: 'First', kind: 'story', missableRisk: false },
    { id: 'm2', order: 20, chapter: 'chapter-2', title: 'Missable', kind: 'item_request', missableRisk: true },
    { id: 'm3', order: 30, chapter: 'chapter-2', title: 'Third', kind: 'story', missableRisk: false },
  ],
  milestoneTasks: [
    { id: 't1', milestoneId: 'm1' },
    { id: 't2', milestoneId: 'm2' },
    { id: 't3', milestoneId: 'm3' },
  ],
};

test('recommended milestone skips fully completed work', async () => {
  const mod = await loadRouteModule();
  assert.ok(mod?.getRecommendedMilestone, 'getRecommendedMilestone should exist');

  const progress = { version: 1, criteria: {}, tasks: { t1: 'completed' }, inventory: {} };
  assert.equal(mod.getRecommendedMilestone(catalog as any, progress as any)?.id, 'm2');
});

test('editorial order remains authoritative even when later milestone is missable', async () => {
  const mod = await loadRouteModule();
  assert.ok(mod?.getRecommendedMilestone, 'getRecommendedMilestone should exist');

  const reordered = {
    ...catalog,
    milestones: [
      { id: 'a', order: 10, chapter: 'chapter-2', title: 'Normal first', kind: 'story', missableRisk: false },
      { id: 'b', order: 20, chapter: 'chapter-2', title: 'Missable later', kind: 'item_request', missableRisk: true },
    ],
    milestoneTasks: [{ id: 'ta', milestoneId: 'a' }, { id: 'tb', milestoneId: 'b' }],
  };
  const progress = { version: 1, criteria: {}, tasks: {}, inventory: {} };
  assert.equal(mod.getRecommendedMilestone(reordered as any, progress as any)?.id, 'a');
});

test('missable milestone wins a tie in editorial order', async () => {
  const mod = await loadRouteModule();
  assert.ok(mod?.getRecommendedMilestone, 'getRecommendedMilestone should exist');

  const tied = {
    milestones: [
      { id: 'a', order: 10, chapter: 'chapter-2', title: 'Normal', kind: 'story', missableRisk: false },
      { id: 'b', order: 10, chapter: 'chapter-2', title: 'Missable', kind: 'item_request', missableRisk: true },
    ],
    milestoneTasks: [{ id: 'ta', milestoneId: 'a' }, { id: 'tb', milestoneId: 'b' }],
  };
  const progress = { version: 1, criteria: {}, tasks: {}, inventory: {} };
  assert.equal(mod.getRecommendedMilestone(tied as any, progress as any)?.id, 'b');
});

test('milestone completion requires all canonical milestone tasks to be completed', async () => {
  const mod = await loadRouteModule();
  assert.ok(mod?.isMilestoneCompleted, 'isMilestoneCompleted should exist');

  const multi = { id: 'm', order: 1, chapter: 'chapter-1', title: 'Multi', kind: 'story', missableRisk: false };
  const tasks = [{ id: 'a', milestoneId: 'm' }, { id: 'b', milestoneId: 'm' }];
  assert.equal(mod.isMilestoneCompleted(multi as any, tasks as any, { a: 'completed', b: 'in_progress' }), false);
  assert.equal(mod.isMilestoneCompleted(multi as any, tasks as any, { a: 'completed', b: 'completed' }), true);
});

test('criterion-linked milestone tasks resolve completion from canonical criterion progress', async () => {
  const mod = await loadRouteModule();
  assert.ok(mod?.getMilestoneProgress, 'getMilestoneProgress should exist');

  const milestone = { id: 'hunt', order: 10, chapter: 'chapter-2', title: 'Hunt', kind: 'hunting', missableRisk: false };
  const tasks = [
    { id: 'task-study', milestoneId: 'hunt', criterionId: 'animal:study' },
    { id: 'task-skin', milestoneId: 'hunt', criterionId: 'animal:skin' },
  ];
  const snapshot = { version: 1, criteria: { 'animal:study': 'completed', 'animal:skin': 'in_progress' }, tasks: {}, inventory: {} };
  const result = mod.getMilestoneProgress(milestone as any, tasks as any, snapshot as any);
  assert.deepEqual(result, { completed: 1, total: 2, ratio: 0.5 });
});

test('recommended milestone treats criterion-linked tasks as completed without a duplicate task state', async () => {
  const mod = await loadRouteModule();
  assert.ok(mod?.getRecommendedMilestone, 'getRecommendedMilestone should exist');

  const linkedCatalog = {
    milestones: [
      { id: 'hunt', order: 10, chapter: 'chapter-2', title: 'Hunt', kind: 'hunting', missableRisk: false },
      { id: 'story', order: 20, chapter: 'chapter-2', title: 'Story', kind: 'story', missableRisk: false },
    ],
    milestoneTasks: [
      { id: 'task-study', milestoneId: 'hunt', criterionId: 'animal:study' },
      { id: 'story-complete', milestoneId: 'story' },
    ],
  };
  const snapshot = { version: 1, criteria: { 'animal:study': 'completed' }, tasks: {}, inventory: {} };
  assert.equal(mod.getRecommendedMilestone(linkedCatalog as any, snapshot as any)?.id, 'story');
});

test('recommended milestone skips a fully blocked node but keeps it in editorial data', async () => {
  const mod = await loadRouteModule();
  assert.ok(mod?.getRecommendedMilestone);
  const catalog = {
    milestones: [
      { id: 'm1', order: 1, title: 'Perdible perdido', missableRisk: true },
      { id: 'm2', order: 2, title: 'Siguiente acción', missableRisk: false },
    ],
    milestoneTasks: [
      { id: 't1', milestoneId: 'm1', criterionId: null },
      { id: 't2', milestoneId: 'm2', criterionId: null },
    ],
  } as any;
  const progress = { version: 1 as const, criteria: {}, tasks: { t1: 'blocked' as const }, inventory: {} };
  assert.equal(mod.getRecommendedMilestone(catalog, progress)?.id, 'm2');
  assert.equal(catalog.milestones[0].id, 'm1', 'editorial route is not mutated when a node is blocked');
});

test('recommended milestone stays on a partially blocked node while actionable checks remain', async () => {
  const mod = await loadRouteModule();
  assert.ok(mod?.getRecommendedMilestone);
  const catalog = {
    milestones: [{ id: 'm1', order: 1, title: 'Mixto', missableRisk: true }, { id: 'm2', order: 2, title: 'Después', missableRisk: false }],
    milestoneTasks: [
      { id: 't1', milestoneId: 'm1', criterionId: null },
      { id: 't2', milestoneId: 'm1', criterionId: null },
      { id: 't3', milestoneId: 'm2', criterionId: null },
    ],
  } as any;
  const progress = { version: 1 as const, criteria: {}, tasks: { t1: 'blocked' as const, t2: 'not_started' as const }, inventory: {} };
  assert.equal(mod.getRecommendedMilestone(catalog, progress)?.id, 'm1');
});
