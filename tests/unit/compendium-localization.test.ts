import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCompendiumTranslations } from '../../src/features/localization/apply-translations.ts';
import type { CanonicalCatalog } from '../../src/lib/catalog/types.ts';

const catalog: CanonicalCatalog = {
  version: 'localization-test',
  entities: [], criteria: [], relations: [], recipes: [], milestones: [], milestoneTasks: [], archiveEntries: [], mapMarkers: [], mediaAssets: [],
  translations: { 'Legacy Mission': 'Misión heredada', 'Binoculars': 'Prismáticos' },
};

test('verified compendium Spanish names merge without replacing legacy translations', () => {
  const localized = applyCompendiumTranslations(catalog);
  assert.equal(localized.translations?.['American Alligator'], 'Caimán americano');
  assert.equal(localized.translations?.['Bluegill'], 'Pez sol');
  assert.equal(localized.translations?.['Yarrow'], 'Milenrama');
  assert.equal(localized.translations?.['Arabian'], 'Árabe');
  assert.equal(localized.translations?.['Cattleman Revolver'], 'Revólver Cattleman');
  assert.equal(localized.translations?.['Legacy Mission'], 'Misión heredada');
  assert.equal(localized.translations?.['Binoculars'], 'Prismáticos');
});

test('compendium localization never mutates canonical entity names', () => {
  const withEntity: CanonicalCatalog = { ...catalog, entities: [{ id: 'animal-1', name: 'American Alligator', type: 'animal', category: 'animal' }] };
  const localized = applyCompendiumTranslations(withEntity);
  assert.equal(localized.entities[0].name, 'American Alligator');
  assert.equal(localized.translations?.['American Alligator'], 'Caimán americano');
});
