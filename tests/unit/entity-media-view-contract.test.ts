import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const view = readFileSync(new URL('../../src/components/views/entity-grid-view.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../src/app/globals.css', import.meta.url), 'utf8');

test('entity grid renders resolved media with orientation, fit and remote-image safeguards', () => {
  assert.match(view, /resolveEntityMedia/);
  assert.match(view, /media-\$\{media\.orientation\}/);
  assert.match(view, /fit-\$\{media\.fit\}/);
  assert.match(view, /referrerPolicy="no-referrer"/);
  assert.match(view, /onError=/);
});

test('entity cards preserve full compendium and cigarette-card artwork instead of cropping it', () => {
  assert.match(css, /\.entity-card-media\.fit-contain\s*\{[^}]*object-fit:\s*contain/s);
  assert.match(css, /\.detail-hero-image\.fit-contain\s*\{[^}]*object-fit:\s*contain/s);
  assert.match(css, /\.entity-card\.media-portrait/);
  assert.match(css, /\.entity-card\.media-landscape/);
});
