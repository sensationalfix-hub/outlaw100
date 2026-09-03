import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dashboardView = readFileSync(new URL('../../src/components/views/dashboard-view.tsx', import.meta.url), 'utf8');
const entityGridView = readFileSync(new URL('../../src/components/views/entity-grid-view.tsx', import.meta.url), 'utf8');
const heroImages = readFileSync(new URL('../../src/features/dashboard/hero-images.ts', import.meta.url), 'utf8');
const globals = readFileSync(new URL('../../src/app/globals.css', import.meta.url), 'utf8');
const mediaCss = readFileSync(new URL('../../src/app/media.css', import.meta.url), 'utf8');

test('dashboard heroes use Rockstar-hosted RDR2 artwork instead of PSU hotlinks', () => {
  assert.doesNotMatch(heroImages, /psu\.com/i);
  assert.match(heroImages, /media-rockstargames-com\.akamaized\.net\/rockstargames-newsite\/uploads\//);
});

test('Safari-critical dashboard and compendium images avoid async decoding', () => {
  assert.doesNotMatch(dashboardView, /className="dashboard-bg"[\s\S]{0,260}decoding="async"/);
  assert.match(dashboardView, /className="dashboard-bg"[\s\S]{0,260}decoding="sync"/);
  assert.doesNotMatch(entityGridView, /decoding="async"/);
  assert.match(entityGridView, /decoding="sync"/);
});

test('Safari-critical raster images do not carry CSS filters directly', () => {
  const dashboardRule = globals.match(/\.dashboard-bg\s*\{[^}]*\}/s)?.[0] ?? '';
  const cardRule = mediaCss.match(/\.entity-card-media\.fit-contain\s*\{[^}]*\}/s)?.[0] ?? '';
  const detailRule = mediaCss.match(/\.detail-hero-image\.fit-contain\s*\{[^}]*\}/s)?.[0] ?? '';

  assert.ok(dashboardRule, 'dashboard image rule should exist');
  assert.ok(cardRule, 'entity card image rule should exist');
  assert.ok(detailRule, 'detail hero image rule should exist');
  assert.doesNotMatch(dashboardRule, /filter\s*:/);
  assert.doesNotMatch(cardRule, /filter\s*:/);
  assert.doesNotMatch(detailRule, /filter\s*:/);
});
