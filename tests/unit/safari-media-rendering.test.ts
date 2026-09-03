import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const entityGridView = readFileSync(new URL('../../src/components/views/entity-grid-view.tsx', import.meta.url), 'utf8');
const heroImages = readFileSync(new URL('../../src/features/dashboard/hero-images.ts', import.meta.url), 'utf8');
const mediaCss = readFileSync(new URL('../../src/app/media.css', import.meta.url), 'utf8');

test('dashboard heroes use Rockstar-hosted RDR2 artwork instead of PSU hotlinks', () => {
  assert.doesNotMatch(heroImages, /psu\.com/i);
  assert.match(heroImages, /media-rockstargames-com\.akamaized\.net\/rockstargames-newsite\/uploads/);
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
