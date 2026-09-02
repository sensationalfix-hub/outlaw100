import assert from 'node:assert/strict';
import test from 'node:test';
import { appViewForEntity, ENTITY_VIEW_CONFIGS } from '../../src/features/navigation/model.ts';

test('minimum completionist categories have explicit navigable views', () => {
  const titles = Object.values(ENTITY_VIEW_CONFIGS).map((item) => item.title);
  for (const expected of ['Peces', 'Plantas', 'Cromos', 'Atuendos', 'Zurrones', 'Sillas', 'Mejoras del campamento', 'Puntos de interés', 'Encuentros', 'Secretos', 'Documentos y objetos únicos']) {
    assert.ok(titles.includes(expected), `missing explicit view: ${expected}`);
  }
});

test('world entities route to their dedicated views instead of generic archive', () => {
  assert.equal(appViewForEntity({ id: 'fish:1', type: 'fish', name: 'Fish', category: 'fish' }), 'fish');
  assert.equal(appViewForEntity({ id: 'poi:1', type: 'poi', name: 'POI', category: 'point_of_interest' }), 'points');
  assert.equal(appViewForEntity({ id: 'enc:1', type: 'encounter', name: 'Encounter', category: 'encounter' }), 'encounters');
  assert.equal(appViewForEntity({ id: 'doc:1', type: 'document', name: 'Doc', category: 'document' }), 'documents');
  assert.equal(appViewForEntity({ id: 'secret:1', type: 'secret', name: 'Secret', category: 'secret' }), 'secrets');
});
