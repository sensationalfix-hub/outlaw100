import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalogWithFallback } from '../../src/lib/catalog/load.ts';

test('uses Supabase first and never loads the heavy static fallback when Supabase succeeds', async () => {
  const calls: string[] = [];
  const result = await loadCatalogWithFallback({
    loadSupabase: async () => { calls.push('supabase'); return { version: 1, entities: [{ id: 'ok' }] } as any; },
    loadStatic: async () => { calls.push('static'); throw new Error('static should not be needed'); },
  });
  assert.equal(result.source, 'supabase');
  assert.deepEqual(calls, ['supabase']);
});

test('falls back to the vendored catalog only when Supabase cannot provide the catalog', async () => {
  const calls: string[] = [];
  const result = await loadCatalogWithFallback({
    loadSupabase: async () => { calls.push('supabase'); throw new Error('empty'); },
    loadStatic: async () => { calls.push('static'); return { version: 1, entities: [{ id: 'fallback' }] } as any; },
  });
  assert.equal(result.source, 'static');
  assert.deepEqual(calls, ['supabase', 'static']);
});
