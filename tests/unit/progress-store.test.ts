import test from 'node:test';
import assert from 'node:assert/strict';

async function loadProgressModule() {
  return import('../../src/features/progress/store.ts').catch(() => null);
}

async function loadBackupModule() {
  return import('../../src/features/progress/local-backup.ts').catch(() => null);
}

test('criterion update is optimistic and persists a local backup before remote completion', async () => {
  const mod = await loadProgressModule();
  assert.ok(mod?.CanonicalProgressStore, 'CanonicalProgressStore should exist');

  let release!: () => void;
  const remote = new Promise<void>((resolve) => { release = resolve; });
  const repository = {
    loadSnapshot: async () => ({ version: 1, criteria: {}, tasks: {}, inventory: {} }),
    saveCriterionStatus: async () => remote,
    saveMilestoneTaskStatus: async () => {},
    saveInventoryQuantity: async () => {},
  };
  const saves: unknown[] = [];
  const backup = { load: () => null, save: (value: unknown) => saves.push(structuredClone(value)), clear: () => {} };
  const store = new mod.CanonicalProgressStore(repository, backup);

  const pending = store.setCriterionStatus('criterion:deer:studied', 'completed');
  assert.equal(store.getSnapshot().criteria['criterion:deer:studied'], 'completed');
  assert.equal((saves.at(-1) as any).criteria['criterion:deer:studied'], 'completed');

  release();
  await pending;
  assert.equal(store.getSnapshot().criteria['criterion:deer:studied'], 'completed');
});

test('failed remote criterion update rolls optimistic state back and rewrites backup', async () => {
  const mod = await loadProgressModule();
  assert.ok(mod?.CanonicalProgressStore, 'CanonicalProgressStore should exist');

  const repository = {
    loadSnapshot: async () => ({ version: 1, criteria: {}, tasks: {}, inventory: {} }),
    saveCriterionStatus: async () => { throw new Error('network down'); },
    saveMilestoneTaskStatus: async () => {},
    saveInventoryQuantity: async () => {},
  };
  const saves: unknown[] = [];
  const backup = { load: () => null, save: (value: unknown) => saves.push(structuredClone(value)), clear: () => {} };
  const store = new mod.CanonicalProgressStore(repository, backup);

  await assert.rejects(store.setCriterionStatus('criterion:rabbit:skinned', 'completed'), /network down/);
  assert.equal(store.getSnapshot().criteria['criterion:rabbit:skinned'], undefined);
  assert.equal((saves.at(-1) as any).criteria['criterion:rabbit:skinned'], undefined);
});

test('inventory quantity is independent from crafted criteria', async () => {
  const mod = await loadProgressModule();
  assert.ok(mod?.CanonicalProgressStore, 'CanonicalProgressStore should exist');

  const repository = {
    loadSnapshot: async () => ({ version: 1, criteria: { 'criterion:satchel:crafted': 'not_started' }, tasks: {}, inventory: {} }),
    saveCriterionStatus: async () => {},
    saveMilestoneTaskStatus: async () => {},
    saveInventoryQuantity: async () => {},
  };
  const backup = { load: () => null, save: () => {}, clear: () => {} };
  const store = new mod.CanonicalProgressStore(repository, backup, await repository.loadSnapshot());

  await store.setInventoryQuantity('entity:perfect-deer-pelt', 2);
  assert.equal(store.getSnapshot().inventory['entity:perfect-deer-pelt'], 2);
  assert.equal(store.getSnapshot().criteria['criterion:satchel:crafted'], 'not_started');
});

test('local JSON backup round-trips a versioned progress payload', async () => {
  const mod = await loadBackupModule();
  assert.ok(mod?.createLocalProgressBackup, 'createLocalProgressBackup should exist');

  const memory = new Map<string, string>();
  const storage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => { memory.set(key, value); },
    removeItem: (key: string) => { memory.delete(key); },
  };
  const backup = mod.createLocalProgressBackup(storage, 'outlaw-test');
  const snapshot = {
    version: 1 as const,
    criteria: { c1: 'completed' as const },
    tasks: { t1: 'in_progress' as const },
    inventory: { e1: 3 },
  };

  backup.save(snapshot);
  assert.deepEqual(backup.load(), snapshot);
  assert.deepEqual(mod.parseProgressExport(mod.serializeProgressExport(snapshot)), snapshot);
});

test('imported snapshot is optimistic but persisted atomically and rolls back on failure', async () => {
  const mod = await loadProgressModule();
  assert.ok(mod?.CanonicalProgressStore);
  const initial = { version: 1 as const, criteria: { old: 'completed' as const }, tasks: {}, inventory: {} };
  const imported = { version: 1 as const, criteria: { fresh: 'prepared' as const }, tasks: { t1: 'in_progress' as const }, inventory: { e1: 2 } };
  let shouldFail = false;
  const calls: unknown[] = [];
  const repository = {
    loadSnapshot: async () => initial,
    saveCriterionStatus: async () => {},
    saveMilestoneTaskStatus: async () => {},
    saveInventoryQuantity: async () => {},
    replaceSnapshot: async (snapshot: unknown) => { calls.push(snapshot); if (shouldFail) throw new Error('remote import failed'); },
  };
  let saved = structuredClone(initial);
  const backup = { load: () => saved, save: (value: typeof initial) => { saved = structuredClone(value); }, clear: () => {} };
  const store = new mod.CanonicalProgressStore(repository as any, backup as any, initial);

  await store.importSnapshot(imported);
  assert.deepEqual(store.getSnapshot(), imported);
  assert.deepEqual(calls, [imported]);

  shouldFail = true;
  await assert.rejects(() => store.importSnapshot(initial), /remote import failed/);
  assert.deepEqual(store.getSnapshot(), imported, 'failed import restores the pre-import snapshot');
});

test('whole milestone update is optimistic for criteria and editorial tasks and rolls back together', async () => {
  const mod = await loadProgressModule();
  assert.ok(mod?.CanonicalProgressStore);
  const initial = { version: 1 as const, criteria: { c1: 'not_started' as const }, tasks: { t1: 'prepared' as const }, inventory: {} };
  let fail = false;
  const calls: unknown[] = [];
  const repository = {
    loadSnapshot: async () => initial,
    saveCriterionStatus: async () => {},
    saveMilestoneTaskStatus: async () => {},
    saveInventoryQuantity: async () => {},
    replaceSnapshot: async () => {},
    saveMilestoneStatus: async (milestoneId: string, status: string) => { calls.push([milestoneId, status]); if (fail) throw new Error('bulk failed'); },
  };
  let saved = structuredClone(initial);
  const backup = { load: () => saved, save: (value: typeof initial) => { saved = structuredClone(value); }, clear: () => {} };
  const store = new mod.CanonicalProgressStore(repository as any, backup as any, initial);

  await store.setMilestoneStatus('m1', ['c1', 'c2'], ['t1', 't2'], 'completed');
  assert.equal(store.getSnapshot().criteria.c1, 'completed');
  assert.equal(store.getSnapshot().criteria.c2, 'completed');
  assert.equal(store.getSnapshot().tasks.t1, 'completed');
  assert.equal(store.getSnapshot().tasks.t2, 'completed');
  assert.deepEqual(calls, [['m1', 'completed']]);

  fail = true;
  await assert.rejects(() => store.setMilestoneStatus('m1', ['c1'], ['t1'], 'not_started'), /bulk failed/);
  assert.equal(store.getSnapshot().criteria.c1, 'completed');
  assert.equal(store.getSnapshot().tasks.t1, 'completed');
});
