import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/components/views/dashboard-view.tsx', import.meta.url), 'utf8');

test('dashboard renders the curated hero through the same-origin media proxy', () => {
  assert.match(source, /model\.curatedHeroImageUrl/);
  assert.match(source, /mediaUrlForBrowser\(model\.curatedHeroImageUrl\)/);
  assert.doesNotMatch(source, /referrerPolicy="no-referrer"/);
});

test('dashboard preloads the next curated hero and animates image changes', () => {
  assert.match(source, /getNextCuratedDashboardHero/);
  assert.match(source, /new Image\(\)/);
  assert.match(source, /key=\{image\}/);
});
