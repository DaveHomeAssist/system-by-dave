#!/usr/bin/env node
// Registry-derived source inventory. Signals are leads for manual acceptance, not parity claims.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const domainSites = require('./domain_sites_lib.js');
const registrySource = fs.readFileSync(path.join(root, 'js/sbd-registry.js'), 'utf8');
const context = {};
context.self = context;
vm.createContext(context);
vm.runInContext(registrySource, context);
const registry = context.SBD_REGISTRY;
const offline = new Set(registry.offlineAssets().map(asset => asset.replace(/^\.\//, '')));
const destination = path.join(root, 'docs/av-suite-consolidation-inventory.md');
const escape = value => String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const routeFile = href => path.join(root, href.endsWith('/') ? href + 'index.html' : href);
const signal = (source, regex) => regex.test(source) ? 'Source signal' : 'Not found';
const exceptionStores = {
  'av-workbook': 'IndexedDB system-by-dave-av-workbook / workbooks',
  'show-board': 'localStorage prefix sbd.showboard. (index, show.*, snapshots.*)'
};

const lines = [
  '# AV Suite consolidation source inventory',
  '',
  `Generated from \`js/sbd-registry.js\` version \`${registry.version}\`. Regenerate with \`node scripts/report_av_consolidation_inventory.mjs\`; check drift with \`--check\`.`,
  '',
  'The feature text and declared keys come from the registry. Export, print, and keyboard columns identify only source-code signals in the route file. “Not found” does not prove absence; “Source signal” does not prove working behavior. Offline means the route is named by the registry manifest, not that every dependency is cached. Each behavior still needs browser and field-parity verification before a legacy route can be retired.',
  '',
  '| Tool and feature | Route | Origin | Declared storage and known exceptions | Export | Print | Keyboard | Offline route |',
  '| --- | --- | --- | --- | --- | --- | --- | --- |'
];

for (const tool of registry.tools) {
  const file = routeFile(tool.href);
  if (!fs.existsSync(file)) throw new Error(`Missing registry route: ${tool.href}`);
  const source = fs.readFileSync(file, 'utf8');
  const declared = tool.storageKeys.map(item => item.key).join(', ') || 'None declared';
  const extra = exceptionStores[tool.id];
  const storage = extra ? `${declared}; ${extra}` : declared;
  const normalizedRoute = tool.href.replace(/^\.\//, '');
  lines.push(`| **${escape(tool.name)}** — ${escape(tool.desc)} | \`/${escape(normalizedRoute)}\` | ${escape(domainSites.originFor(normalizedRoute))} | ${escape(storage)} | ${signal(source, /download|export|\.csv|\.json|\.png|\.pdf/i)} | ${signal(source, /window\.print|printBtn|@media print/i)} | ${signal(source, /keydown|keyup|accesskey/i)} | ${offline.has(normalizedRoute) ? 'Named' : 'Not named'} |`);
}

lines.push('', `**Count:** ${registry.tools.length} registry tools; ${registry.tools.reduce((sum, tool) => sum + tool.storageKeys.length, 0)} declared local-storage keys.`, '',
  '## Unresolved mapping and proof', '',
  '- Inspect each source signal in its full script and perform keyboard, print, export, and offline browser checks. The table is a source inventory, not completion of those gates.',
  '- Audit undeclared storage keys and databases across every route. Show Board and Workbook are confirmed exceptions listed above; other exceptions remain to be determined.',
  '- Prove backup and restore for every saved store, including destination conflicts, before retiring any route.',
  '- Confirm the eventual workspace treatment of LED Wall Calculator and the operator-visible field mapping for each migration.', '');

const output = lines.join('\n');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(destination) || fs.readFileSync(destination, 'utf8') !== output) {
    console.error('AV consolidation inventory is missing or stale.');
    process.exitCode = 1;
  } else console.log(`AV consolidation inventory current: ${registry.tools.length} tools`);
} else {
  fs.writeFileSync(destination, output);
  console.log(`Wrote ${path.relative(root, destination)}: ${registry.tools.length} tools`);
}
