import { readFileSync } from 'node:fs';
import { auditCatalog } from '../src/lib/catalog/audit.ts';

const path = process.argv[2] ?? 'data/generated/catalog.json';
const catalog = JSON.parse(readFileSync(path, 'utf8'));
const report = auditCatalog(catalog);
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
