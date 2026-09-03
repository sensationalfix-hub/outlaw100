import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveEntityMedia } from '../../src/features/media/entity-media.ts';
import type { CatalogEntity } from '../../src/lib/catalog/types.ts';

function entity(id: string, name: string, category: string): CatalogEntity {
  return { id, type: category, name, category, metadata: {} };
}

test('unknown catalog items stay image-free instead of showing the degraded sunset placeholder', () => {
  const media = resolveEntityMedia(entity('unknown-x', 'Unknown Thing', 'unknown_category'), []);
  assert.equal(media.url, null);
  assert.equal(media.fallbackUrl, null);
  assert.equal(media.source, 'fallback');
});

test('resolved remote media hides cleanly on failure instead of swapping to the degraded sunset', () => {
  const media = resolveEntityMedia(entity('animal-robin', 'American Robin', 'animal'), []);
  assert.ok(media.url);
  assert.equal(media.fallbackUrl, null);
});
