import test from 'node:test';
import assert from 'node:assert/strict';

async function loadCraftingModule() {
  return import('../../src/features/crafting/model.ts').catch(() => null);
}

const recipe = {
  id: 'recipe:satchel',
  entityId: 'satchel:kit',
  requirements: [
    { materialId: 'mat:deer', materialName: 'Deer', quantity: 2 },
    { materialId: 'mat:boar', materialName: 'Boar', quantity: 1 },
  ],
};

const criteria = [
  { id: 'crit:obtained', entityId: 'satchel:kit', key: 'obtained', label: 'Conseguido', criterionType: 'boolean' },
  { id: 'crit:crafted', entityId: 'satchel:kit', key: 'crafted', label: 'Fabricado', criterionType: 'boolean' },
];

test('recipe readiness can be complete while crafted state remains incomplete', async () => {
  const mod = await loadCraftingModule();
  assert.ok(mod?.buildRecipeState, 'buildRecipeState should exist');
  const state = mod.buildRecipeState(recipe as any, criteria as any, {
    criteria: { 'crit:crafted': 'not_started' },
    inventory: { 'mat:deer': 2, 'mat:boar': 1 },
  } as any);
  assert.equal(state.materialsReady, true);
  assert.equal(state.craftedCriterion?.id, 'crit:crafted');
  assert.equal(state.crafted, false);
});

test('recipe readiness reports exact missing quantities without marking crafted', async () => {
  const mod = await loadCraftingModule();
  assert.ok(mod?.buildRecipeState, 'buildRecipeState should exist');
  const state = mod.buildRecipeState(recipe as any, criteria as any, {
    criteria: {},
    inventory: { 'mat:deer': 1, 'mat:boar': 0 },
  } as any);
  assert.equal(state.materialsReady, false);
  assert.deepEqual(state.requirements.map((r: any) => r.missing), [1, 1]);
  assert.equal(state.crafted, false);
});
