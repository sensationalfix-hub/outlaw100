import { access } from 'node:fs/promises';
import path from 'node:path';

export const EXPECTED_WORKBOOK_SHEETS = [
  'Hunting', 'Outfits (Legendary)', 'Outfits (Normal)', 'Clothing', 'Saddles',
  'Satchels', 'Camp', 'PROGRESS', 'Animals', 'Fish', 'Plants', 'Horses',
  'Weapons', 'Equipment', 'Cigarette Cards'
] as const;

export const SOURCE_FILES = {
  xlsx: 'data/source/rdr2-completion.xlsx',
  pdf: 'data/source/rdr2-complete-checklist.pdf',
  html: 'data/source/outlaw100-legacy.html',
  font: 'data/source/chinese-rocks.otf'
} as const;

export async function assertSourceFiles(rootDir = process.cwd()): Promise<void> {
  await Promise.all(Object.values(SOURCE_FILES).map(file => access(path.join(rootDir, file))));
}
