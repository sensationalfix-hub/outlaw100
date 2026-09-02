import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('Next middleware refreshes Supabase SSR sessions and excludes static assets', () => {
  const path = resolve('src/middleware.ts');
  assert.equal(existsSync(path), true, 'src/middleware.ts must exist');
  const source = readFileSync(path, 'utf8');
  assert.match(source, /updateSupabaseSession/);
  assert.match(source, /export\s+async\s+function\s+middleware/);
  assert.match(source, /_next\/static/);
  assert.match(source, /_next\/image/);
});
