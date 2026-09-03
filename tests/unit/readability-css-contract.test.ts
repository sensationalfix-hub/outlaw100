import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const globals = readFileSync(new URL('../../src/app/globals.css', import.meta.url), 'utf8');
const story = readFileSync(new URL('../../src/app/story-view.css', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../../src/app/dashboard-golden.css', import.meta.url), 'utf8');

test('shared data views use a readable functional type scale', () => {
  assert.match(globals, /--ui-micro:\s*10px/);
  assert.match(globals, /--ui-small:\s*11px/);
  assert.match(globals, /--ui-body:\s*12px/);
  assert.match(globals, /\.entity-card h3\s*\{[^}]*font-size:\s*13px/s);
  assert.match(globals, /\.criteria-list button b\s*\{[^}]*font-size:\s*11px/s);
  assert.match(globals, /\.browser-toolbar input[^}]*font-size:\s*11px/s);
  assert.match(globals, /\.detail-panel>p\s*\{[^}]*font-size:\s*12px/s);
  assert.match(globals, /\.route-row h3\s*\{[^}]*font-size:\s*12px/s);
});

test('Historia and dashboard microcopy are raised above the old 6-8px scale', () => {
  assert.match(story, /\.story-toolbar input\s*\{[^}]*font-size:\s*11px/s);
  assert.match(story, /\.story-mission-card h3\s*\{[^}]*font-size:\s*13px/s);
  assert.match(story, /\.story-mission-card footer\s*\{[^}]*font-size:\s*9px/s);
  assert.match(dashboard, /\.golden-dashboard \.guide-row b\s*\{[^}]*font-size:\s*11px/s);
  assert.match(dashboard, /\.golden-dashboard \.guide-row p\s*\{[^}]*font-size:\s*9px/s);
  assert.match(dashboard, /\.nearby-copy b\s*\{[^}]*font-size:\s*11px/s);
});
