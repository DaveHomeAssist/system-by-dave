#!/usr/bin/env node
// Fail before publishing old-origin redirects. Auth evidence is recorded by the
// operator; DNS, TLS and the exact destination release are checked over HTTPS.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

export function checkPrerequisites(env) {
  assert.ok(env.DEPLOY_KEY?.trim(), 'Missing destination deploy key; keep the existing walk live.');
  assert.equal(env.CUTOVER_AUTH_VERIFIED, 'true',
    'Verify Google OAuth origins and backend FMP_ALLOWED_ORIGINS, then record HOUSEVIDEO_WALK_AUTH_VERIFIED=true.');
}

// GitHub Pages sends cache-control: max-age=600 and its CDN ignores the query
// string, so a read of the previous release stays fresh for that whole lifetime.
export function cacheRemainingMs(headers) {
  const read = name => headers?.get?.(name) ?? headers?.[name] ?? headers?.[String(name).toLowerCase()] ?? '';
  const maxAge = Number(/max-age=(\d+)/.exec(String(read('cache-control')))?.[1]);
  if (!Number.isFinite(maxAge)) return 0;
  const age = Number(read('age') === '' || read('age') == null ? 0 : read('age'));
  if (!Number.isFinite(age)) return 0;
  return Math.max(0, (maxAge - age) * 1000);
}

export async function checkDestination(site, directory, fetchImpl = fetch) {
  const expected = JSON.parse(fs.readFileSync(path.join(directory, 'source.json'), 'utf8'));
  assert.equal(expected.site, site.id, 'Staged site identity differs');
  const origin = `https://${site.domain}`;
  let carried = null;
  const read = async route => {
    // cache: 'no-store' only bypasses this process. The Pages CDN still applies max-age.
    const response = await fetchImpl(`${origin}${route}?release=${expected.sourceCommit}`, {
      redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000)
    });
    carried = response;
    assert.equal(response.status, 200, `Destination ${route} is not ready`);
    return response;
  };
  const fail = error => {
    if (carried) error.cacheRemainingMs = cacheRemainingMs(carried.headers);
    throw error;
  };
  try {
    const actual = await (await read('/source.json')).json();
    for (const key of ['schema', 'site', 'domain', 'sourceRepository', 'sourceCommit', 'artifactSha256', 'cutover']) {
      const seen = typeof actual[key] === 'string' ? actual[key].slice(0, 12) : actual[key];
      const wanted = typeof expected[key] === 'string' ? expected[key].slice(0, 12) : expected[key];
      assert.equal(actual[key], expected[key], `Destination ${key} differs from staged release (${seen} vs ${wanted})`);
    }
    // A green push or provenance endpoint alone does not establish served pages.
    for (const route of [...new Set([site.home, ...site.pages.map(entry => '/' + entry), '/transfer.html'])]) {
      const relative = route.slice(1) + (route.endsWith('/') ? 'index.html' : '');
      const body = await (await read(route)).text();
      assert.ok(body === fs.readFileSync(path.join(directory, relative), 'utf8'), `Destination ${route} bytes differ`);
    }
  } catch (error) {
    fail(error);
  }
}

// One fresh cached object is served until Age reaches max-age. Polling during
// that window repeats the same HIT, so wait it out once, then poll for the origin.
export async function verifyLiveRelease(site, directory, {
  fetchImpl = fetch, sleep = delay, log = console.log, now = Date.now, budgetMs = 120000
} = {}) {
  let heldCache = false;
  let deadline = now() + budgetMs;
  for (;;) {
    try {
      await checkDestination(site, directory, fetchImpl);
      log(`Verified ${site.domain}: staged release and destination pages match over HTTPS.`);
      return;
    } catch (error) {
      const remain = Number(error.cacheRemainingMs) || 0;
      if (!heldCache && remain >= 1000) {
        heldCache = true;
        log(`Waiting ${Math.ceil((remain + 1000) / 1000)}s for cached ${site.domain} to expire: ${error.message.split('\n')[0]}`);
        await sleep(remain + 1000);
        // The poll budget starts when the cached object expires, not when the first read did.
        deadline = now() + budgetMs;
        continue;
      }
      if (now() >= deadline) throw error;
      log(`Waiting for ${site.domain}: ${error.message.split('\n')[0]}`);
      await sleep(10000);
    }
  }
}

async function main() {
  const [id, mode, directory] = process.argv.slice(2);
  const config = JSON.parse(fs.readFileSync(new URL('./domain-sites.json', import.meta.url), 'utf8'));
  const site = config.sites.find(entry => entry.id === id);
  assert.ok(site, 'Unknown destination site');
  if (mode === '--preflight') {
    checkPrerequisites(process.env);
    console.log(`Ready to stage ${id}; live destination verification is still required.`);
    return;
  }
  assert.ok(mode === '--live' && directory, 'Usage: <site> --preflight | <site> --live <staged directory>');
  await verifyLiveRelease(site, directory);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
