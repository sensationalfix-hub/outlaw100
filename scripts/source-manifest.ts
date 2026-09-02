import { assertSourceFiles, EXPECTED_WORKBOOK_SHEETS, SOURCE_FILES } from '../src/lib/source-files.ts';
await assertSourceFiles();
console.log(JSON.stringify({ sourceFiles: SOURCE_FILES, workbookSheets: EXPECTED_WORKBOOK_SHEETS }, null, 2));
