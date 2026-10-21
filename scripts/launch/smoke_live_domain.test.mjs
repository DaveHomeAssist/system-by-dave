// Local self-test for smoke_live_domain.mjs (fixtures + a fake GitHub compare API; no network).
//   node --test scripts/launch/smoke_live_domain.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { behindMain, parseArgs, run } from './smoke_live_domain.mjs';

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
  assert.deepEqual(r.pages.map((p) => [p.path, p.status]), [['/', 200], ['/demos/frame-sync.html', 200], ['/field-kit/', 200]]);
  assert.equal(r.source.commit, SHA);
});

test('a missing page or marker fails and names the page', async () => {
  let r = await run(base({ dir: site({ kit: null }) }), quiet);
  assert.equal(r.ok, false);
  assert.deepEqual(r.pages.filter((p) => !p.ok).map((p) => [p.path, p.status]), [['/field-kit/', 404]]);
  r = await run(base({ dir: site({ frame: '<title>Why your screen is late</title>' }) }), quiet);
  assert.match(r.pages[1].problems.join(), /missing "demo-shell.js"/);
});

test('a 200 that is really the not-found page fails', async () => {
  const r = await run(base({ dir: site({ frame: '<title>Page not found | AV by Dave</title><title>Why your screen is late</title>demo-shell.js' }) }), quiet);
  assert.equal(r.pages[1].ok, false);
  assert.match(r.pages[1].problems.join(), /not-found page/);
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
