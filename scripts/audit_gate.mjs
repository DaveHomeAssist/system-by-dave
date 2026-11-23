#!/usr/bin/env node
// Dependency audit gate: `npm audit --audit-level=high` with a narrow,
// expiring exception list for advisories that have no patched release.
//
// Rules:
// - Production dependencies: any high or critical advisory fails. No exceptions.
// - Dev dependencies: any high or critical advisory fails unless it is listed
//   in EXCEPTIONS and the exception has not expired.
// - An expired exception fails, so it gets reviewed instead of lingering.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const EXCEPTIONS = {
  // picomatch ReDoS via single-branch repeated extglobs. Every published
  // version (<= 4.0.7) is affected and no patch exists. Reached only through
  // dev tooling (vite, vitest, fdir, tinyglobby) on trusted build-time globs.
  'GHSA-fc5q-39xc-vjpf': { expires: '2027-01-31', package: 'picomatch' },
};

const BLOCKING = new Set(['high', 'critical']);

export function blockingAdvisories(report) {
  const found = new Map();
  for (const vuln of Object.values(report.vulnerabilities ?? {})) {
    for (const via of vuln.via ?? []) {
      if (typeof via !== 'object' || !BLOCKING.has(via.severity)) continue;
      const id = String(via.url ?? '').split('/').pop() || via.title;
      found.set(id, { id, package: via.name, severity: via.severity, title: via.title });
    }
  }
  return [...found.values()];
}

export function evaluate(devReport, prodReport, today = new Date().toISOString().slice(0, 10)) {
  const failures = [];
  for (const adv of blockingAdvisories(prodReport)) {
    failures.push(`production dependency: ${adv.id} ${adv.package} (${adv.severity}) ${adv.title}`);
  }
  for (const adv of blockingAdvisories(devReport)) {
    const exception = EXCEPTIONS[adv.id];
    if (!exception) {
      failures.push(`${adv.id} ${adv.package} (${adv.severity}) ${adv.title}`);
    } else if (exception.expires < today) {
      failures.push(`exception for ${adv.id} expired on ${exception.expires}; review it`);
    }
  }
  return failures;
}

function audit(args) {
  try {
    return JSON.parse(execFileSync('npm', ['audit', '--json', ...args], { encoding: 'utf8' }));
  } catch (error) {
    // npm audit exits non-zero when it finds anything; the JSON is still on stdout.
    if (error.stdout) return JSON.parse(error.stdout);
    throw error;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const failures = evaluate(audit([]), audit(['--omit=dev']));
  if (failures.length) {
    console.error('Dependency audit gate failed:');
    for (const line of failures) console.error(`  - ${line}`);
    process.exit(1);
  }
  const excepted = Object.entries(EXCEPTIONS)
    .map(([id, e]) => `${id} (${e.package}, until ${e.expires})`)
    .join(', ');
  console.log(`Dependency audit gate passed. Dev-only exceptions: ${excepted || 'none'}.`);
}
