import test from 'node:test';
import assert from 'node:assert/strict';
import { SOURCE_FILES, EXPECTED_WORKBOOK_SHEETS } from '../../src/lib/source-files.ts';

test('source manifest tracks every supplied source and all fifteen workbook sheets', () => {
  assert.deepEqual(Object.keys(SOURCE_FILES).sort(), ['font', 'html', 'pdf', 'xlsx']);
  assert.equal(EXPECTED_WORKBOOK_SHEETS.length, 15);
  assert.deepEqual(EXPECTED_WORKBOOK_SHEETS, [
    'Hunting', 'Outfits (Legendary)', 'Outfits (Normal)', 'Clothing', 'Saddles',
    'Satchels', 'Camp', 'PROGRESS', 'Animals', 'Fish', 'Plants', 'Horses',
    'Weapons', 'Equipment', 'Cigarette Cards'
  ]);
});
