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

export async function checkDestination(site, directory, fetchImpl = fetch) {
  const expected = JSON.parse(fs.readFileSync(path.join(directory, 'source.json'), 'utf8'));
  assert.equal(expected.site, site.id, 'Staged site identity differs');
  const origin = `https://${site.domain}`;
  const read = async route => {
    const response = await fetchImpl(`${origin}${route}?release=${expected.sourceCommit}`, {
      redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000)
    });
    assert.equal(response.status, 200, `Destination ${route} is not ready`);
    return response;
  };
  const actual = await (await read('/source.json')).json();
  for (const key of ['schema', 'site', 'domain', 'sourceRepository', 'sourceCommit', 'artifactSha256', 'cutover']) {
    assert.equal(actual[key], expected[key], `Destination ${key} differs from staged release`);
  }
  // A green push or provenance endpoint alone does not establish served pages.
  for (const route of [...new Set([site.home, ...site.pages.map(entry => '/' + entry), '/transfer.html'])]) {
    const relative = route.slice(1) + (route.endsWith('/') ? 'index.html' : '');
    const body = await (await read(route)).text();
    assert.ok(body === fs.readFileSync(path.join(directory, relative), 'utf8'), `Destination ${route} bytes differ`);
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
  const deadline = Date.now() + 600000;
  for (;;) {
    try {
      await checkDestination(site, directory);
      console.log(`Verified ${site.domain}: staged release and destination pages match over HTTPS.`);
      return;
    } catch (error) {
      if (Date.now() >= deadline) throw error;
      console.log(`Waiting for ${site.domain}: ${error.message.split('\n')[0]}`);
      await delay(10000);
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
