import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const readabilityUrl = new URL('../../src/app/readability.css', import.meta.url);
const readability = existsSync(readabilityUrl) ? readFileSync(readabilityUrl, 'utf8') : '';

test('shared data views use a readable functional type scale', () => {
  assert.match(readability, /--ui-micro:\s*10px/);
  assert.match(readability, /--ui-small:\s*11px/);
  assert.match(readability, /--ui-body:\s*12px/);
  assert.match(readability, /\.entity-card h3\s*\{[^}]*font-size:\s*13px/s);
  assert.match(readability, /\.criteria-list button b\s*\{[^}]*font-size:\s*11px/s);
  assert.match(readability, /\.browser-toolbar input[^}]*font-size:\s*11px/s);
  assert.match(readability, /\.detail-panel>p\s*\{[^}]*font-size:\s*12px/s);
  assert.match(readability, /\.route-row h3\s*\{[^}]*font-size:\s*12px/s);
});

test('Historia and dashboard microcopy are raised above the old 6-8px scale', () => {
  assert.match(readability, /\.story-toolbar input\s*\{[^}]*font-size:\s*11px/s);
  assert.match(readability, /\.story-mission-card h3\s*\{[^}]*font-size:\s*13px/s);
  assert.match(readability, /\.story-mission-card footer\s*\{[^}]*font-size:\s*9px/s);
  assert.match(readability, /\.golden-dashboard \.guide-row b\s*\{[^}]*font-size:\s*11px/s);
  assert.match(readability, /\.golden-dashboard \.guide-row p\s*\{[^}]*font-size:\s*9px/s);
  assert.match(readability, /\.nearby-copy b\s*\{[^}]*font-size:\s*11px/s);
});
