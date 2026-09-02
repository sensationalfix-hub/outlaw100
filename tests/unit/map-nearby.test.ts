import test from 'node:test';
import assert from 'node:assert/strict';

async function loadNearbyModule() {
  return import('../../src/features/map/nearby.ts').catch(() => null);
}

const items = [
  { id: 'a', name: 'Bison', category: 'Animal', description: '', lat: -70, lng: 100, entityId: 'e-bison', criterionId: 'c-bison' },
  { id: 'b', name: 'Deer', category: 'Animal', description: '', lat: -72, lng: 103, entityId: 'e-deer', criterionId: 'c-deer' },
  { id: 'c', name: 'Card', category: 'Collectible', description: '', lat: -71, lng: 102, entityId: 'e-card', criterionId: 'c-card' },
  { id: 'd', name: 'Far', category: 'Collectible', description: '', lat: -120, lng: 220, entityId: 'e-far', criterionId: 'c-far' },
];

const catalog = {
  milestoneTasks: [
    { id: 't1', milestoneId: 'm-hunt', entityId: 'e-bison', criterionId: 'c-bison' },
    { id: 't2', milestoneId: 'm-hunt', entityId: 'e-deer', criterionId: 'c-deer' },
  ],
};

test('milestone map context links task entities and ranks nearby points by simple-map distance', async () => {
  const mod = await loadNearbyModule();
  assert.ok(mod?.getMilestoneMapContext, 'getMilestoneMapContext should exist');
  const context = mod.getMilestoneMapContext(items as any, catalog as any, 'm-hunt', 2);
  assert.deepEqual(context.linked.map((item: any) => item.id), ['a', 'b']);
  assert.equal(context.anchor?.id, 'a');
  assert.deepEqual(context.nearby.map((item: any) => item.id), ['c', 'd']);
  assert.ok(context.nearby[0].distance < context.nearby[1].distance);
});

test('milestone map context stays empty when the milestone has no geolocated linked entity', async () => {
  const mod = await loadNearbyModule();
  assert.ok(mod?.getMilestoneMapContext, 'getMilestoneMapContext should exist');
  const context = mod.getMilestoneMapContext(items as any, catalog as any, 'm-unknown', 5);
  assert.equal(context.anchor, null);
  assert.deepEqual(context.linked, []);
  assert.deepEqual(context.nearby, []);
});
