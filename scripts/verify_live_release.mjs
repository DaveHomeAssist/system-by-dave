#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function releasePlan(config, id, directory, commit) {
  assert.match(commit, /^[a-f0-9]{40}$/, 'Expected a full source commit');
  const root = fs.realpathSync(directory);
  const site = config.sites.find(entry => entry.id === id);
  assert.ok(site || id === 'systembydave', 'Unknown site');
  const origin = site ? `https://${site.domain}` : config.origin;
  assert.equal(new URL(origin).protocol, 'https:', 'Release origin must use HTTPS');
  const routes = new Set(site
    ? ['/', site.home, '/transfer.html', '/source.json', '/robots.txt', '/sitemap.xml']
    : ['/', '/tools.html', '/robots.txt', '/sitemap.xml']);
  if (site) {
    const addPages = directory => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) addPages(file);
        else if (entry.isFile() && /\.html?$/i.test(entry.name)) {
          const relative = path.relative(root, file).split(path.sep).join('/');
          routes.add('/' + relative.replace(/index\.html$/, ''));
        } else assert.ok(!entry.isSymbolicLink(), 'Staged page directory must not contain symlinks');
      }
    };
    for (const entry of site.pages) {
      if (entry.endsWith('/')) {
        const directory = fs.realpathSync(path.join(root, entry));
        assert.ok(directory.startsWith(root + path.sep), 'Page prefix escapes staged directory');
        addPages(directory);
      } else routes.add('/' + entry);
    }
  }
  const read = route => {
    const relative = decodeURIComponent(new URL(route, origin).pathname).slice(1);
    const file = fs.realpathSync(path.join(root, relative + (route.endsWith('/') ? 'index.html' : '')));
    assert.ok(file.startsWith(root + path.sep), 'Release path escapes staged directory');
    return fs.readFileSync(file);
  };
  if (site) {
    const receipt = JSON.parse(read('/source.json'));
    assert.equal(receipt.site, id, 'Staged site identity differs');
    assert.equal(receipt.domain, site.domain, 'Staged domain differs');
    assert.equal(receipt.sourceRepository, config.sourceRepository, 'Staged repository differs');
    assert.equal(receipt.sourceCommit, commit, 'Staged commit differs');
  }
  // Include direct script/style dependencies, without crawling third-party links.
  for (const route of [...routes]) {
    if (!route.endsWith('/') && !route.endsWith('.html')) continue;
    const html = read(route).toString('utf8');
    const baseRef = html.match(/<base\b[^>]*\bhref=["']([^"']+)["']/i)?.[1];
    const base = new URL(baseRef || route, new URL(route, origin));
    for (const tag of html.matchAll(/<(?:script|link)\b[^>]*>/gi)) {
      const ref = tag[0].match(/\b(?:src|href)\s*=\s*["']([^"']+)["']/i)?.[1];
      if (!ref) continue;
      const url = new URL(ref.replaceAll('&amp;', '&'), base);
      if (url.origin === origin && /\.(?:m?js|css)$/i.test(url.pathname)) routes.add(url.pathname);
    }
  }
  return { site: id, origin, sourceCommit: commit, provenance: site ? 'domain receipt and selected bytes' : 'selected staged bytes only', files: [...routes].sort().map(route => ({ route, sha256: hash(read(route)) })) };
}

export async function verifyRelease(plan, { fetchImpl = fetch, budgetMs = 600000, intervalMs = 10000,
  now = Date.now, delay = sleep } = {}) {
  assert.ok(Number.isFinite(budgetMs) && budgetMs > 0, 'Positive readback budget required');
  assert.ok(plan.files.length > 0, 'Readback requires at least one file');
  const started = now();
  const deadline = started + budgetMs;
  const report = { schema: 'system-by-dave.release-readback.v1', site: plan.site, origin: plan.origin,
    sourceCommit: plan.sourceCommit, provenance: plan.provenance, status: 'failed', attempts: 0, files: plan.files, checked: 0 };
  do {
    report.attempts++;
    report.checked = 0;
    try {
      for (const file of plan.files) {
        const remaining = deadline - now();
        assert.ok(remaining > 0, 'Readback deadline exceeded');
        const url = new URL(file.route, plan.origin);
        url.searchParams.set('release', plan.sourceCommit);
        let response;
        try {
          response = await fetchImpl(url, { redirect: 'error', cache: 'no-store', credentials: 'omit',
            signal: AbortSignal.timeout(Math.max(1, Math.min(15000, remaining))) });
          assert.equal(response.status, 200, `HTTP ${response.status}`);
          assert.equal(hash(Buffer.from(await response.arrayBuffer())), file.sha256, 'Bytes differ');
        } catch {
          // Retain route and failure category, never response bodies or credentials.
          throw new Error(`Readback failed for ${file.route}: request, status or bytes differ`);
        }
        report.checked++;
      }
      report.status = 'passed';
      delete report.error;
      break;
    } catch (error) {
      report.error = error.message;
      const remaining = deadline - now();
      if (remaining <= 0) break;
      await delay(Math.min(intervalMs, remaining));
    }
  } while (now() < deadline);
  report.durationMs = now() - started;
  report.completedAt = new Date().toISOString();
  return report;
}

async function main() {
  const [id, directory, commit, output] = process.argv.slice(2);
  assert.ok(id && directory && commit && output, 'Usage: <site id|systembydave> <staged directory> <source commit> <report.json>');
  let report;
  try {
    const config = JSON.parse(fs.readFileSync(new URL('./domain-sites.json', import.meta.url), 'utf8'));
    report = await verifyRelease(releasePlan(config, id, directory, commit));
  } catch (error) {
    report = { schema: 'system-by-dave.release-readback.v1', site: id, sourceCommit: commit,
      status: 'failed', error: error.message, completedAt: new Date().toISOString() };
  }
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(`${id}: ${report.status}; ${report.checked || 0} files matched; report ${output}`);
  if (report.status !== 'passed') process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
