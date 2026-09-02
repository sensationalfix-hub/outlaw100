import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { auditCatalog } from '../../src/lib/catalog/audit.ts';

const catalog = JSON.parse(readFileSync(new URL('../../data/generated/catalog.json', import.meta.url), 'utf8'));

test('catalog audit enforces all supplied sources, route endpoints and referential integrity', () => {
  const report = auditCatalog(catalog);
  assert.equal(report.ok, true, report.errors.join('\n'));
  assert.equal(report.stats.xlsxSheets, 15);
  assert.equal(report.stats.pdfPages, 51);
  assert.equal(report.stats.pdfReferencedContentPages, 49);
  assert.equal(report.stats.orphanCriteria, 0);
  assert.equal(report.stats.orphanRelations, 0);
  assert.equal(report.stats.orphanTasks, 0);
  assert.equal(report.stats.invalidSourceReferences, 0);
});

test('catalog audit fails closed when a canonical relation is orphaned', () => {
  const broken = structuredClone(catalog);
  broken.relations.push({ id: 'broken', fromId: 'missing', toId: broken.entities[0].id, type: 'related' });
  const report = auditCatalog(broken);
  assert.equal(report.ok, false);
  assert.match(report.errors.join('\n'), /relaciones huérfanas/i);
});
