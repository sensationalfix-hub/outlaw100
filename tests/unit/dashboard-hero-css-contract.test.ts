import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../../src/app/dashboard-golden.css', import.meta.url), 'utf8');

test('dashboard hero background fades in when the milestone image changes', () => {
  assert.match(css, /@keyframes\s+dashboardHeroIn/);
  assert.match(css, /\.golden-dashboard\s+\.dashboard-bg[^}]*animation:\s*dashboardHeroIn/s);
});
