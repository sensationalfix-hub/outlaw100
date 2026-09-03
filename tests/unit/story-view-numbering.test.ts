import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/components/views/story-view.tsx', import.meta.url), 'utf8');

test('Historia renders the stable campaign number instead of the legacy mission index', () => {
  assert.match(source, /String\(mission\.campaignOrder\)\.padStart\(3, '0'\)/);
  assert.match(source, /<small>ORDEN<\/small><b>\{String\(active\.campaignOrder\)\.padStart\(3, '0'\)\}<\/b>/);
  assert.doesNotMatch(source, /String\(mission\.order\)\.padStart/);
});
