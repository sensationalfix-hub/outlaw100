import test from 'node:test';
import assert from 'node:assert/strict';

async function loadRepositoryModule() {
  return import('../../src/features/progress/repository.ts').catch(() => null);
}

function pagedClient(rows: Record<string, any[]>, cap = 1000) {
  return {
    from(table: string) {
      const state = { order: '' };
      return {
        select() {
          return {
            eq() { return this; },
            order(column: string) { state.order = column; return this; },
            async range(from: number, to: number) {
              const sorted = [...(rows[table] ?? [])].sort((a, b) => String(a[state.order] ?? '').localeCompare(String(b[state.order] ?? '')));
              const capped = Math.min(to, from + cap - 1);
              return { data: sorted.slice(from, capped + 1), error: null };
            },
          };
        },
        upsert() { return Promise.resolve({ data: null, error: null }); },
      };
    },
    rpc: async () => ({ data: null, error: null }),
  };
}

test('repository loads canonical criterion, milestone task and inventory state', async () => {
  const mod = await loadRepositoryModule();
  assert.ok(mod?.createSupabaseProgressRepository, 'createSupabaseProgressRepository should exist');

  const rows: Record<string, any[]> = {
    progress: [
      { id: 'p1', criterion_id: 'c1', milestone_task_id: null, status: 'completed' },
      { id: 'p2', criterion_id: null, milestone_task_id: 't1', status: 'prepared' },
    ],
    inventory: [{ entity_id: 'e1', quantity: 4 }],
  };
  const client = pagedClient(rows);

  const repository = mod.createSupabaseProgressRepository(client as any, 'user-1');
  assert.deepEqual(await repository.loadSnapshot(), {
    version: 1,
    criteria: { c1: 'completed' },
    tasks: { t1: 'prepared' },
    inventory: { e1: 4 },
  });
});

test('repository writes criterion and task status through authenticated RPCs', async () => {
  const mod = await loadRepositoryModule();
  assert.ok(mod?.createSupabaseProgressRepository, 'createSupabaseProgressRepository should exist');

  const calls: Array<[string, unknown]> = [];
  const client = {
    from() { throw new Error('not used'); },
    rpc: async (name: string, args: unknown) => { calls.push([name, args]); return { data: null, error: null }; },
  };
  const repository = mod.createSupabaseProgressRepository(client as any, 'user-1');

  await repository.saveCriterionStatus('c1', 'completed');
  await repository.saveMilestoneTaskStatus('t1', 'in_progress');

  assert.deepEqual(calls, [
    ['set_criterion_progress', { p_criterion_id: 'c1', p_status: 'completed' }],
    ['set_milestone_task_progress', { p_task_id: 't1', p_status: 'in_progress' }],
  ]);
});

test('repository upserts inventory by user and entity without touching crafted progress', async () => {
  const mod = await loadRepositoryModule();
  assert.ok(mod?.createSupabaseProgressRepository, 'createSupabaseProgressRepository should exist');

  const writes: unknown[] = [];
  const client = {
    from(table: string) {
      assert.equal(table, 'inventory');
      return {
        upsert(payload: unknown, options: unknown) {
          writes.push({ payload, options });
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
    rpc: async () => ({ data: null, error: null }),
  };
  const repository = mod.createSupabaseProgressRepository(client as any, 'user-1');
  await repository.saveInventoryQuantity('material:deer-pelt', 2);

  assert.deepEqual(writes, [{
    payload: { user_id: 'user-1', entity_id: 'material:deer-pelt', quantity: 2 },
    options: { onConflict: 'user_id,entity_id' },
  }]);
});


test('repository paginates a long-lived completionist save beyond PostgREST row limits', async () => {
  const mod = await loadRepositoryModule();
  assert.ok(mod?.createSupabaseProgressRepository);
  const progress = Array.from({ length: 1305 }, (_, index) => ({
    id: `p${String(index).padStart(4, '0')}`,
    criterion_id: `c${index}`,
    milestone_task_id: null,
    status: 'completed',
  }));
  const inventory = Array.from({ length: 1105 }, (_, index) => ({ entity_id: `e${String(index).padStart(4, '0')}`, quantity: 1 }));
  const repository = mod.createSupabaseProgressRepository(pagedClient({ progress, inventory }, 1000) as any, 'user-1');
  const snapshot = await repository.loadSnapshot();
  assert.equal(Object.keys(snapshot.criteria).length, 1305);
  assert.equal(Object.keys(snapshot.inventory).length, 1105);
});

test('repository replaces an imported save atomically through one authenticated RPC', async () => {
  const mod = await loadRepositoryModule();
  assert.ok(mod?.createSupabaseProgressRepository);

  const calls: Array<[string, unknown]> = [];
  const client = {
    from() { throw new Error('not used'); },
    rpc: async (name: string, args: unknown) => { calls.push([name, args]); return { data: null, error: null }; },
  };
  const repository = mod.createSupabaseProgressRepository(client as any, 'user-1');
  await repository.replaceSnapshot({
    version: 1,
    criteria: { c1: 'completed', c2: 'prepared' },
    tasks: { t1: 'in_progress' },
    inventory: { e1: 3 },
  });

  assert.deepEqual(calls, [[
    'replace_user_progress',
    { p_snapshot: { version: 1, criteria: { c1: 'completed', c2: 'prepared' }, tasks: { t1: 'in_progress' }, inventory: { e1: 3 } } },
  ]]);
});

test('repository writes a whole milestone through one authenticated RPC', async () => {
  const mod = await loadRepositoryModule();
  assert.ok(mod?.createSupabaseProgressRepository);
  const calls: Array<[string, unknown]> = [];
  const client = {
    from() { throw new Error('not used'); },
    rpc: async (name: string, args: unknown) => { calls.push([name, args]); return { data: null, error: null }; },
  };
  const repository = mod.createSupabaseProgressRepository(client as any, 'user-1');
  await repository.saveMilestoneStatus('milestone:chapter-2:hunt', 'completed');
  assert.deepEqual(calls, [[
    'set_milestone_progress',
    { p_milestone_id: 'milestone:chapter-2:hunt', p_status: 'completed' },
  ]]);
});
