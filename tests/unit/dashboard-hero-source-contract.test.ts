import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/features/dashboard/hero-images.ts', import.meta.url), 'utf8');

test('dashboard hero pool stays on the curated 1920x1080 RDR2 collection', () => {
  assert.match(source, /psu\.com\/wp\/wp-content\/uploads\/2020\/09/);
  assert.match(source, /chapter-1/);
  assert.match(source, /epilogue-2/);
});
