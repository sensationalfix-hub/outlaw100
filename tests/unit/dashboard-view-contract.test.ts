import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/components/views/dashboard-view.tsx', import.meta.url), 'utf8');

test('dashboard exposes mission completion separately from route milestone completion', () => {
  assert.match(source, /Marcar misión completada/);
  assert.match(source, /Marcar hito completado/);
  assert.match(source, /model\.missionCompletion/);
});
