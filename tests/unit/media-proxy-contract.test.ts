import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { proxiedMediaUrl } from '../../src/features/media/proxy.ts';

const dashboardView = readFileSync(new URL('../../src/components/views/dashboard-view.tsx', import.meta.url), 'utf8');
const entityGridView = readFileSync(new URL('../../src/components/views/entity-grid-view.tsx', import.meta.url), 'utf8');
const heroImages = readFileSync(new URL('../../src/features/dashboard/hero-images.ts', import.meta.url), 'utf8');

test('remote media is routed through the same-origin media proxy', () => {
  assert.equal(
    proxiedMediaUrl('https://www.gtabase.com/example.jpg'),
    '/api/media-proxy?url=https%3A%2F%2Fwww.gtabase.com%2Fexample.jpg',
  );
  assert.equal(proxiedMediaUrl('/media/local.jpg'), '/media/local.jpg');
});

test('dashboard and compendium render proxied media rather than raw remote URLs', () => {
  assert.match(dashboardView, /proxiedMediaUrl\(image\)/);
  assert.match(entityGridView, /proxiedMediaUrl\(media\.url\)/);
});

test('dashboard no longer falls back to the tiny outlaw-sunset placeholder', () => {
  assert.doesNotMatch(dashboardView, /outlaw-sunset\.jpg/);
  assert.doesNotMatch(dashboardView, /outlaw-arthur\.jpg/);
});

test('Rockstar hero pool uses the canonical media.rockstargames.com host', () => {
  assert.match(heroImages, /https:\/\/media\.rockstargames\.com\/rockstargames-newsite\/uploads/);
  assert.doesNotMatch(heroImages, /akamaized\.net/);
});
