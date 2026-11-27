import { readFile, stat } from 'node:fs/promises';
import { buildCheckPlan } from '../server/check-plan.js';

try {
  const file = process.argv[2];
  if (!file || process.argv.length !== 3) throw new Error('Usage: node scripts/check-plan.js <local snapshot.json>');
  if ((await stat(file)).size > 1024 * 1024) throw new Error('Snapshot exceeds 1 MiB');
  console.log(JSON.stringify(buildCheckPlan(JSON.parse(await readFile(file, 'utf8'))), null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
