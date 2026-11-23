// Local self-test for smoke_live_domain.mjs (fixtures + a fake GitHub compare API; no network).
//   node --test scripts/launch/smoke_live_domain.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { behindMain, destinationState, parseArgs, readDeployMarker, run } from './smoke_live_domain.mjs';

const SHA = 'a'.repeat(40);
const NEW = 'b'.repeat(40);
const quiet = () => {};

function site({ commit = SHA, frame = '<title>Why your screen is late</title><script src="demo-shell.js"></script>', kit = '<h1>Field Kit</h1><script src="/js/sbd-launch-config.js"></script>' } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-'));
  const put = (p, body) => { fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true }); fs.writeFileSync(path.join(dir, p), body); };
  put('index.html', '<title>AV by Dave</title>');
  put('404.html', '<title>Page not found | AV by Dave</title>');
  put('source.json', JSON.stringify({ site: 'avbydave', sourceRepository: 'o/r', sourceCommit: commit, files: 3 }));
  if (frame !== null) put('demos/frame-sync.html', frame);
  if (kit !== null) put('field-kit/index.html', kit);
  return dir;
}
const base = (o = {}) => ({ ...parseArgs([]), retries: 1, delay: 0, ...o });

test('staged folder with all three pages passes', async () => {
  const r = await run(base({ dir: site() }), quiet);
  assert.equal(r.ok, true, JSON.stringify(r.pages));
  assert.deepEqual(r.pages.map((p) => [p.path, p.status, !!p.skipped]), [['/', 200, false], ['/demos/frame-sync.html', null, true], ['/field-kit/', 200, false]], 'the systembydave.com demo is skipped in --dir mode');
  assert.equal(r.source.commit, SHA);
});

test('a missing page or marker fails and names the page', async () => {
  let r = await run(base({ dir: site({ kit: null }) }), quiet);
  assert.equal(r.ok, false);
  assert.deepEqual(r.pages.filter((p) => !p.ok).map((p) => [p.path, p.status]), [['/field-kit/', 404]]);
  r = await run(base({ dir: site({ kit: '<h1>Field Kit</h1>' }) }), quiet);
  assert.match(r.pages[2].problems.join(), /missing "sbd-launch-config.js"/);
});

test('a 200 that is really the not-found page fails', async () => {
  const r = await run(base({ dir: site({ kit: '<title>Page not found | AV by Dave</title>Field Kit sbd-launch-config.js' }) }), quiet);
  assert.equal(r.pages[2].ok, false);
  assert.match(r.pages[2].problems.join(), /not-found page/);
});

test('a check with its own base is fetched from that origin', async () => {
  const other = site();
  const srv = http.createServer((req, res) => { let f = path.join(other, new URL(req.url, 'http://x').pathname); if (f.endsWith('/')) f = path.join(f, 'index.html'); if (fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200); res.end(fs.readFileSync(f)); } else { res.writeHead(404); res.end(); } });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const cfgFile = path.join(other, 'cfg.json');
  const cfg = JSON.parse(fs.readFileSync(parseArgs([]).config, 'utf8'));
  cfg.base = `http://127.0.0.1:${srv.address().port}`;
  cfg.checks = cfg.checks.map((c) => (c.base ? { ...c, base: cfg.base } : c));
  fs.writeFileSync(cfgFile, JSON.stringify(cfg));
  const r = await run(base({ config: cfgFile }), quiet); srv.close();
  assert.equal(r.ok, true, JSON.stringify(r.pages));
  assert.equal(r.pages[1].skipped, undefined);
});

test('--expect-commit passes on a match and fails on a stale source.json', async () => {
  assert.equal((await run(base({ dir: site(), expectCommit: SHA.slice(0, 12) }), quiet)).ok, true);
  const r = await run(base({ dir: site(), expectCommit: NEW, wait: 0 }), quiet);
  assert.equal(r.ok, false);
  assert.match(r.deploy.problem, /expected bbbbbbbbbbbb/);
});

test('--only limits the pages', async () => {
  const r = await run(base({ dir: site({ kit: null, frame: null }), only: ['/'] }), quiet);
  assert.equal(r.ok, true);
  assert.equal(r.pages.length, 1);
});

async function fakeApi(payload, status = 200) {
  const s = http.createServer((req, res) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(typeof payload === 'string' ? payload : JSON.stringify({ url: req.url, ...payload })); });
  await new Promise((r) => s.listen(0, '127.0.0.1', r));
  return { api: `http://127.0.0.1:${s.address().port}`, close: () => s.close() };
}
const at = (min) => new Date(Date.parse('2026-10-21T12:00:00Z') - min * 60000).toISOString();
const now = Date.parse('2026-10-21T12:00:00Z');

test('live-behind-main: current, recently behind, stale, diverged, API down', async () => {
  let f = await fakeApi({ status: 'identical', ahead_by: 0, behind_by: 0, commits: [] });
  let r = await behindMain({ deployed: SHA, repository: 'o/r', branch: 'main', maxBehindMinutes: 60, api: f.api, now }); f.close();
  assert.deepEqual([r.ok, r.state], [true, 'current']);

  f = await fakeApi({ status: 'ahead', ahead_by: 2, behind_by: 0, commits: [{ sha: NEW, commit: { committer: { date: at(10) } } }, { sha: 'c'.repeat(40), commit: { committer: { date: at(5) } } }] });
  r = await behindMain({ deployed: SHA, repository: 'o/r', branch: 'main', maxBehindMinutes: 60, api: f.api, now }); f.close();
  assert.deepEqual([r.ok, r.state, r.aheadBy, r.minutesBehind], [true, 'behind', 2, 10], 'a deploy in progress is not an alert');

  f = await fakeApi({ status: 'ahead', ahead_by: 5, behind_by: 0, commits: [{ sha: NEW, commit: { committer: { date: at(1662) } } }] });
  r = await behindMain({ deployed: SHA, repository: 'o/r', branch: 'main', maxBehindMinutes: 60, api: f.api, now }); f.close();
  assert.equal(r.ok, false);
  assert.match(r.problem, /5 commit\(s\) behind main.*1662 min/);

  f = await fakeApi({ status: 'diverged', ahead_by: 1, behind_by: 2, commits: [] });
  r = await behindMain({ deployed: SHA, repository: 'o/r', branch: 'main', maxBehindMinutes: 60, api: f.api, now }); f.close();
  assert.deepEqual([r.ok, r.state], [false, 'diverged']);

  f = await fakeApi('rate limited', 403);
  r = await behindMain({ deployed: SHA, repository: 'o/r', branch: 'main', maxBehindMinutes: 60, api: f.api, now }); f.close();
  assert.deepEqual([r.ok, r.state], [false, 'unknown']);
});

test('--main-sha compares against that SHA instead of the branch name', async () => {
  let seen = '';
  const s = http.createServer((req, res) => { seen = req.url; res.end(JSON.stringify({ status: 'identical', ahead_by: 0, commits: [] })); });
  await new Promise((r) => s.listen(0, '127.0.0.1', r));
  const r = await run(base({ dir: site(), mainSha: SHA, behindMain: true, api: `http://127.0.0.1:${s.address().port}` }), quiet); s.close();
  assert.equal(r.main.state, 'current');
  assert.equal(seen, `/repos/o/r/compare/${SHA}...${SHA}`);
});

test('bad options are rejected', () => {
  assert.throws(() => parseArgs(['--retries', '-1']));
  assert.throws(() => parseArgs(['--expect-commit', 'main']));
  assert.throws(() => parseArgs(['--nope']));
});

// --- deploy.json: the main site's marker of what each destination should be serving ---------------------

const DIGEST = 'd'.repeat(64);
const STALE = '9'.repeat(64);
const marker = (commit = SHA, digest = DIGEST) => ({ schema: 'system-by-dave.deploy.v1', sourceRepository: 'o/r', sourceCommit: commit, sites: { avbydave: { domain: 'avbydave.com', artifactSha256: digest, files: 3 } } });

// A throwaway origin: routes maps a pathname to a function (or a value) returning { status, body }.
async function origin(routes) {
  const hits = [];
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://x').pathname;
    hits.push(pathname);
    const route = routes[pathname];
    const { status = 200, body = '' } = (typeof route === 'function' ? route(hits.filter((h) => h === pathname).length) : route) || { status: 404, body: 'not found' };
    res.writeHead(status, { 'content-type': pathname.endsWith('.json') ? 'application/json' : 'text/html' });
    res.end(typeof body === 'string' ? body : JSON.stringify(body));
  });
  await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
  return { url: `http://127.0.0.1:${server.address().port}`, hits, close: () => server.close() };
}
// The destination: a home page plus the source.json its last Pages deploy produced (an older commit is normal).
const destination = (artifact, commit = SHA) => origin({
  '/': { body: '<title>AV by Dave</title>' },
  '/source.json': { body: { site: 'avbydave', sourceRepository: 'o/r', sourceCommit: commit, artifactSha256: artifact, files: 3 } }
});
const mainSite = (body, status = 200) => origin({ '/deploy.json': { status, body } });

test('readDeployMarker reads the commit and per-site digests, and tells a missing marker from a broken one', async () => {
  let m = await mainSite(marker());
  let r = await readDeployMarker(m.url); m.close();
  assert.deepEqual([r.ok, r.commit, r.sites.avbydave.artifactSha256], [true, SHA, DIGEST]);
  assert.ok(m.hits.includes('/deploy.json'));

  m = await mainSite('not found', 404);
  r = await readDeployMarker(m.url); m.close();
  assert.deepEqual([r.ok, r.missing], [false, true], 'a 404 means no deploy has published the marker yet');

  m = await mainSite({ sourceCommit: 'nope', sites: {} });
  r = await readDeployMarker(m.url); m.close();
  assert.deepEqual([r.ok, !!r.missing], [false, false]);
  assert.match(r.problem, /malformed/);

  m = await mainSite('<html>', 200);
  r = await readDeployMarker(m.url); m.close();
  assert.match(r.problem, /not JSON/);

  m = await mainSite('boom', 503);
  r = await readDeployMarker(m.url); m.close();
  assert.deepEqual([r.ok, !!r.missing, r.problem], [false, false, 'deploy.json HTTP 503'], 'an outage is not "not published yet"');
});

test('destinationState compares the served content digest, not the commit that produced it', () => {
  const m = { commit: NEW, sites: marker(NEW).sites };
  assert.deepEqual(destinationState(m, 'avbydave', { ok: true, commit: SHA, artifact: DIGEST }), { ok: true, expected: DIGEST, live: DIGEST, problem: undefined }, 'an older sourceCommit with the same content is current');
  const stale = destinationState(m, 'avbydave', { ok: true, commit: SHA, artifact: STALE });
  assert.equal(stale.ok, false);
  assert.match(stale.problem, /serves content 999999999999, deploy bbbbbbbbbbbb staged dddddddddddd/);
  assert.match(destinationState(m, 'avbydave', { ok: false, problem: 'source.json HTTP 503' }).problem, /serves content source\.json HTTP 503/);
  assert.match(destinationState(m, 'avbydave', { ok: true, commit: SHA, artifact: null }).problem, /serves content unknown/, 'a destination that publishes no digest cannot be confirmed');
  assert.match(destinationState(m, 'housevideo', { ok: true, artifact: DIGEST }).problem, /no entry for housevideo/);
});

test('--expect-release passes once deploy.json names the release and the destination serves its staged content', async () => {
  const main = await mainSite(marker(SHA));
  const dest = await destination(DIGEST, 'f'.repeat(40));
  const r = await run(base({ base: dest.url, sourceOrigin: main.url, only: ['/'], expectRelease: SHA.slice(0, 12) }), quiet);
  main.close(); dest.close();
  assert.equal(r.ok, true, JSON.stringify(r.deploy));
  assert.deepEqual([r.deploy.ok, r.deploy.liveRelease, r.deploy.artifact], [true, SHA, DIGEST]);
  assert.equal(r.source.commit, 'f'.repeat(40), 'the destination still reports an older commit, and that is fine');
});

test('--expect-release fails when the release has not been deployed, or the destination still serves older content', async () => {
  let main = await mainSite(marker(NEW));
  let dest = await destination(DIGEST);
  let r = await run(base({ base: dest.url, sourceOrigin: main.url, only: ['/'], expectRelease: SHA, wait: 0 }), quiet);
  main.close(); dest.close();
  assert.equal(r.ok, false);
  assert.match(r.deploy.problem, /deploy\.json names bbbbbbbbbbbb, expected aaaaaaaaaaaa/);

  main = await mainSite(marker(SHA));
  dest = await destination(STALE);
  r = await run(base({ base: dest.url, sourceOrigin: main.url, only: ['/'], expectRelease: SHA, wait: 0 }), quiet);
  main.close(); dest.close();
  assert.equal(r.ok, false);
  assert.match(r.deploy.problem, /serves content 999999999999.*staged dddddddddddd/);

  main = await mainSite('not found', 404);
  dest = await destination(DIGEST);
  r = await run(base({ base: dest.url, sourceOrigin: main.url, only: ['/'], expectRelease: SHA, wait: 0 }), quiet);
  main.close(); dest.close();
  assert.match(r.deploy.problem, /deploy\.json is not published yet/);

  r = await run(base({ dir: site(), expectRelease: SHA }), quiet);
  assert.match(r.deploy.problem, /checks a live site, not --dir/);
});

test('--expect-release waits for the marker to catch up and then passes', async () => {
  let reads = 0;
  const main = await origin({ '/deploy.json': () => { reads += 1; return reads < 2 ? { status: 200, body: marker(NEW) } : { status: 200, body: marker(SHA) }; } });
  const dest = await destination(DIGEST);
  const r = await run(base({ base: dest.url, sourceOrigin: main.url, only: ['/'], expectRelease: SHA, wait: 5, delay: 0 }), quiet);
  main.close(); dest.close();
  assert.equal(r.ok, true, JSON.stringify(r.deploy));
  assert.equal(reads, 2, "the marker is re-read once, after the first read named another release");
});

test('--behind-main follows deploy.json: current main with current content is healthy even when source.json is older', async () => {
  const main = await mainSite(marker(SHA));
  const dest = await destination(DIGEST, 'f'.repeat(40));
  const compared = [];
  const api = http.createServer((req, res) => { compared.push(req.url); res.end(JSON.stringify({ status: 'identical', ahead_by: 0, commits: [] })); });
  await new Promise((ready) => api.listen(0, '127.0.0.1', ready));
  const r = await run(base({ base: dest.url, sourceOrigin: main.url, only: ['/'], behindMain: true, mainSha: SHA, api: `http://127.0.0.1:${api.address().port}` }), quiet);
  main.close(); dest.close(); api.close();
  assert.equal(r.ok, true, JSON.stringify(r.main));
  assert.equal(r.main.state, 'current');
  assert.equal(r.main.destination.ok, true);
  assert.deepEqual(compared, [`/repos/o/r/compare/${SHA}...${SHA}`], 'main is compared with the deploy marker commit, not the destination source.json commit');
});

test('--behind-main fails when the destination does not serve the content the current deploy staged', async () => {
  const main = await mainSite(marker(SHA));
  const dest = await destination(STALE);
  const api = await fakeApi({ status: 'identical', ahead_by: 0, behind_by: 0, commits: [] });
  const r = await run(base({ base: dest.url, sourceOrigin: main.url, only: ['/'], behindMain: true, mainSha: SHA, api: api.api }), quiet);
  main.close(); dest.close(); api.close();
  assert.equal(r.ok, false);
  assert.equal(r.main.state, 'current', 'main itself is not behind');
  assert.equal(r.main.destination.ok, false);
  assert.match(r.main.problem, /serves content 999999999999.*staged dddddddddddd/);
});

test('--behind-main reports an old deploy marker as behind main, and an unreadable marker as unknown', async () => {
  let main = await mainSite(marker(SHA));
  let dest = await destination(DIGEST);
  const api = await fakeApi({ status: 'ahead', ahead_by: 5, behind_by: 0, commits: [{ sha: NEW, commit: { committer: { date: at(1662) } } }] });
  let r = await run(base({ base: dest.url, sourceOrigin: main.url, only: ['/'], behindMain: true, api: api.api, maxBehindMinutes: 60 }), quiet);
  main.close(); dest.close(); api.close();
  assert.equal(r.ok, false);
  assert.match(r.main.problem, /5 commit\(s\) behind main/);

  main = await mainSite('boom', 503);
  dest = await destination(DIGEST);
  r = await run(base({ base: dest.url, sourceOrigin: main.url, only: ['/'], behindMain: true }), quiet);
  main.close(); dest.close();
  assert.deepEqual([r.main.ok, r.main.state, r.main.problem], [false, 'unknown', 'deploy.json HTTP 503']);
});

test('--behind-main falls back to source.json only until the first deploy publishes deploy.json', async () => {
  const main = await mainSite('not found', 404);
  const dest = await destination(undefined, SHA);
  let seen = '';
  const api = http.createServer((req, res) => { seen = req.url; res.end(JSON.stringify({ status: 'identical', ahead_by: 0, commits: [] })); });
  await new Promise((ready) => api.listen(0, '127.0.0.1', ready));
  const r = await run(base({ base: dest.url, sourceOrigin: main.url, only: ['/'], behindMain: true, mainSha: SHA, api: `http://127.0.0.1:${api.address().port}` }), quiet);
  main.close(); dest.close(); api.close();
  assert.equal(r.ok, true);
  assert.equal(seen, `/repos/o/r/compare/${SHA}...${SHA}`);
  assert.equal(r.main.destination, undefined);
});

test('--expect-release must be a commit SHA', () => {
  assert.throws(() => parseArgs(['--expect-release', 'main']));
  assert.equal(parseArgs(['--expect-release', SHA]).expectRelease, SHA);
});
