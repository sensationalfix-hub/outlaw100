import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const dashboardView = readFileSync(new URL('../../src/components/views/dashboard-view.tsx', import.meta.url), 'utf8');
const entityGridView = readFileSync(new URL('../../src/components/views/entity-grid-view.tsx', import.meta.url), 'utf8');
const heroImages = readFileSync(new URL('../../src/features/dashboard/hero-images.ts', import.meta.url), 'utf8');
const mediaCss = readFileSync(new URL('../../src/app/media.css', import.meta.url), 'utf8');
const proxyRouteUrl = new URL('../../src/app/api/media/route.ts', import.meta.url);

test('dashboard heroes use the canonical Rockstar media host', () => {
  assert.doesNotMatch(heroImages, /psu\.com|media-rockstargames-com\.akamaized\.net/i);
  assert.match(heroImages, /https:\/\/media\.rockstargames\.com\/rockstargames-newsite\/uploads/);
});

test('dashboard and compendium load remote media through OUTLAW100 instead of browser hotlinks', () => {
  assert.match(dashboardView, /mediaUrlForBrowser/);
  assert.match(entityGridView, /mediaUrlForBrowser/);
  assert.ok(existsSync(proxyRouteUrl), 'expected a same-origin /api/media proxy route');
});

test('dashboard never falls back to the 14 KB outlaw-sunset placeholder', () => {
  assert.doesNotMatch(dashboardView, /outlaw-sunset\.jpg|outlaw-arthur\.jpg/);
  assert.doesNotMatch(dashboardView, /decoding="async"/);
  assert.match(dashboardView, /decoding="sync"/);
});

test('Safari-critical compendium images avoid async decoding', () => {
  assert.doesNotMatch(entityGridView, /decoding="async"/);
  assert.match(entityGridView, /decoding="sync"/);
});

test('Safari-critical raster images explicitly disable GPU filters in the final media stylesheet', () => {
  assert.match(mediaCss, /\.dashboard-bg\s*\{[^}]*filter:\s*none/s);
  assert.match(mediaCss, /\.entity-card-media\.fit-contain\s*\{[^}]*filter:\s*none/s);
  assert.match(mediaCss, /\.detail-hero-image\.fit-contain\s*\{[^}]*filter:\s*none/s);
});
