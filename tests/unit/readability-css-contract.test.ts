import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const readabilityUrl = new URL('../../src/app/readability.css', import.meta.url);
const readability = existsSync(readabilityUrl) ? readFileSync(readabilityUrl, 'utf8') : '';

test('compendium keeps larger titles while secondary copy stays restrained', () => {
  assert.match(readability, /--ui-micro:\s*8px/);
  assert.match(readability, /--ui-small:\s*9px/);
  assert.match(readability, /--ui-body:\s*11px/);
  assert.match(readability, /\.entity-card h3\s*\{[^}]*font-size:\s*13px/s);
  assert.match(readability, /\.entity-card small\s*\{[^}]*font-size:\s*8px/s);
  assert.match(readability, /\.entity-card>span\s*\{[^}]*font-size:\s*8px/s);
  assert.match(readability, /\.criteria-list button b\s*\{[^}]*font-size:\s*10px/s);
  assert.match(readability, /\.browser-toolbar input[^}]*font-size:\s*10px/s);
  assert.match(readability, /\.detail-panel>p\s*\{[^}]*font-size:\s*11px/s);
  assert.match(readability, /\.route-row h3\s*\{[^}]*font-size:\s*12px/s);
});

test('Historia keeps readable titles without inflating its supporting labels', () => {
  assert.match(readability, /\.story-toolbar input\s*\{[^}]*font-size:\s*10px/s);
  assert.match(readability, /\.story-mission-card h3\s*\{[^}]*font-size:\s*13px/s);
  assert.match(readability, /\.story-mission-card footer\s*\{[^}]*font-size:\s*8px/s);
});

test('dashboard compact hierarchy is left to dashboard-golden instead of being globally inflated', () => {
  assert.doesNotMatch(readability, /\.golden-dashboard \.guide-row b/);
  assert.doesNotMatch(readability, /\.golden-dashboard \.guide-row p/);
  assert.doesNotMatch(readability, /\.nearby-copy b/);
  assert.doesNotMatch(readability, /\.nearby-copy p/);
  assert.doesNotMatch(readability, /\.nearby-tabs button/);
  assert.doesNotMatch(readability, /\.milestone-copy small/);
  assert.doesNotMatch(readability, /\.milestone-copy b/);
  assert.doesNotMatch(readability, /\.dashboard-hero>small/);
  assert.doesNotMatch(readability, /\.dashboard-card header small/);
});
