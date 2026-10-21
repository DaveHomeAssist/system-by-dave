#!/usr/bin/env node
// Post-publish smoke check for a domain site (default avbydave.com, docs/launch/uptime-monitoring.md).
// No dependencies beyond Node 22, no accounts, read-only GETs. Runs on a laptop or on a
// self-hosted runner; exit 0 = all good, 1 = a check failed, 2 = bad usage.
//
//   node scripts/launch/smoke_live_domain.mjs                       # live site, once
//   node scripts/launch/smoke_live_domain.mjs --expect-commit <sha> --wait 900
//        # after a deploy: retry until source.json reports <sha> (or timeout), then check pages
//   node scripts/launch/smoke_live_domain.mjs --behind-main --max-behind-minutes 60
//        # live-behind-main: compare source.json with the source repo's main (GitHub public API)
//   node scripts/launch/smoke_live_domain.mjs --dir _sites/avbydave # same checks on a staged folder
//   node scripts/launch/smoke_live_domain.mjs --json                # machine-readable summary
//
// Options: --config <file> (default scripts/launch/smoke-live.json), --base <url>,
// --only <path,...>, --retries <n> (per URL, default 3), --delay <s> (default 10),
// --main-sha <sha> (skip the API: compare with this main SHA, e.g. from `git rev-parse origin/main`).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export function parseArgs(argv) {
  const opts = { config: path.join(ROOT, 'scripts/launch/smoke-live.json'), retries: 3, delay: 10, wait: 0, json: false, behindMain: false, maxBehindMinutes: 60 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]; const v = () => { if (i + 1 >= argv.length) throw new Error(`${a} needs a value`); return argv[++i]; };
    if (a === '--config') opts.config = v();
    else if (a === '--base') opts.base = v();
    else if (a === '--dir') opts.dir = v();
    else if (a === '--only') opts.only = v().split(',').filter(Boolean);
    else if (a === '--retries') opts.retries = Number(v());
    else if (a === '--delay') opts.delay = Number(v());
    else if (a === '--wait') opts.wait = Number(v());
    else if (a === '--expect-commit') opts.expectCommit = v();
    else if (a === '--behind-main') opts.behindMain = true;
    else if (a === '--max-behind-minutes') opts.maxBehindMinutes = Number(v());
    else if (a === '--main-sha') { opts.mainSha = v(); opts.behindMain = true; }
    else if (a === '--json') opts.json = true;
    else if (a === '--help' || a === '-h') opts.help = true;
    else throw new Error(`unknown option ${a}`);
  }
  for (const k of ['retries', 'delay', 'wait', 'maxBehindMinutes']) if (!Number.isFinite(opts[k]) || opts[k] < 0) throw new Error(`--${k} must be a non-negative number`);
  if (opts.expectCommit && !/^[0-9a-f]{7,40}$/i.test(opts.expectCommit)) throw new Error('--expect-commit must be a commit SHA');
  if (opts.mainSha && !/^[0-9a-f]{7,40}$/i.test(opts.mainSha)) throw new Error('--main-sha must be a commit SHA');
  return opts;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const short = (sha) => (sha || '').slice(0, 12);

async function get(url, { timeoutMs = 20000, headers = {} } = {}) {
  const started = Date.now();
  try {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(timeoutMs), headers: { 'user-agent': 'sbd-smoke-live/1 (+docs/launch/uptime-monitoring.md)', 'cache-control': 'no-cache', ...headers } });
    const body = await res.text();
    return { status: res.status, body, type: res.headers.get('content-type') || '', ms: Date.now() - started, url: res.url };
  } catch (error) {
    return { status: 0, body: '', type: '', ms: Date.now() - started, error: error.cause?.code || error.name || String(error) };
  }
}

// One page: right status, not the site's 404 page, every marker present. Retries transient failures.
export async function checkPage(base, check, cfg, opts) {
  const url = new URL(check.path, base.endsWith('/') ? base : `${base}/`).toString();
  let last;
  for (let attempt = 1; attempt <= Math.max(1, opts.retries); attempt++) {
    // Cache-busting query so a CDN edge can't hand back the pre-deploy copy.
    const r = await get(`${url}${url.includes('?') ? '&' : '?'}smoke=${Date.now()}`);
    const problems = [];
    if (r.status !== (check.status || 200)) problems.push(r.error ? `request failed (${r.error})` : `HTTP ${r.status}`);
    if (r.status === 200 && cfg.notFoundMarker && r.body.includes(cfg.notFoundMarker)) problems.push('served the not-found page');
    for (const m of check.contains || []) if (r.status === 200 && !r.body.includes(m)) problems.push(`missing ${JSON.stringify(m)}`);
    last = { path: check.path, url, ok: problems.length === 0, status: r.status, ms: r.ms, attempts: attempt, problems, since: check.since };
    if (last.ok) return last;
    if (attempt < opts.retries) await sleep(opts.delay * 1000);
  }
  return last;
}

export async function readSource(base) {
  const r = await get(new URL('/source.json', base).toString() + `?smoke=${Date.now()}`);
  if (r.status !== 200) return { ok: false, problem: r.error ? `source.json request failed (${r.error})` : `source.json HTTP ${r.status}` };
  try {
    const j = JSON.parse(r.body);
    if (!/^[0-9a-f]{40}$/.test(j.sourceCommit || '')) return { ok: false, problem: 'source.json has no sourceCommit' };
    return { ok: true, commit: j.sourceCommit, repository: j.sourceRepository, site: j.site, files: j.files };
  } catch { return { ok: false, problem: 'source.json is not JSON' }; }
}

// Live-behind-main: is the published commit main's HEAD, and if not, how long has main waited?
// Uses the public GitHub compare API (no token; 60 requests/hour per IP is plenty for a 5-15 min
// schedule) or a main SHA passed in. Alerts only when main has been ahead for longer than
// maxBehindMinutes, so a deploy in progress is not an alert.
export async function behindMain({ deployed, repository, branch, mainSha, maxBehindMinutes, api = 'https://api.github.com', now = Date.now() }) {
  const headers = { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' };
  const target = mainSha || branch;
  const r = await get(`${api}/repos/${repository}/compare/${deployed}...${target}`, { headers });
  if (r.status !== 200) return { ok: false, state: 'unknown', problem: r.error ? `compare request failed (${r.error})` : `compare API HTTP ${r.status}` };
  let j; try { j = JSON.parse(r.body); } catch { return { ok: false, state: 'unknown', problem: 'compare API returned non-JSON' }; }
  const head = j.commits?.at(-1)?.sha || (j.status === 'identical' ? deployed : null);
  if (j.status === 'identical' || j.ahead_by === 0) return { ok: true, state: 'current', aheadBy: 0, head: head || deployed };
  if (j.status === 'ahead') {
    // Oldest commit main has that the site doesn't: how long it has been waiting to go out.
    const oldest = j.commits?.[0];
    const waitedAt = Date.parse(oldest?.commit?.committer?.date || oldest?.commit?.author?.date || '');
    const minutes = Number.isFinite(waitedAt) ? Math.round((now - waitedAt) / 60000) : null;
    const ok = minutes !== null && minutes <= maxBehindMinutes;
    return { ok, state: 'behind', aheadBy: j.ahead_by, head, oldestPending: oldest?.sha, minutesBehind: minutes, problem: ok ? undefined : `live is ${j.ahead_by} commit(s) behind ${branch}; oldest unpublished commit ${short(oldest?.sha)} is ${minutes ?? '?'} min old (limit ${maxBehindMinutes})` };
  }
  // 'behind' = the site has commits main doesn't (published from a branch); 'diverged' = both.
  return { ok: false, state: j.status, aheadBy: j.ahead_by, behindBy: j.behind_by, head, problem: `published commit ${short(deployed)} is ${j.status} relative to ${branch} (not on main)` };
}

// A static server for --dir, so a staged _sites/<site> folder gets the very same checks.
function serveDir(dir) {
  const root = path.resolve(dir);
  return new Promise((resolve) => {
    const s = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://local');
      let file = path.join(root, decodeURIComponent(u.pathname));
      if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
      if (!fs.existsSync(file)) { const nf = path.join(root, '404.html'); res.writeHead(404, { 'content-type': 'text/html' }); res.end(fs.existsSync(nf) ? fs.readFileSync(nf) : ''); return; }
      res.writeHead(200, { 'content-type': file.endsWith('.json') ? 'application/json' : 'text/html' }); res.end(fs.readFileSync(file));
    });
    s.listen(0, '127.0.0.1', () => resolve(s));
  });
}

export async function run(opts, log = console.log) {
  const cfg = JSON.parse(fs.readFileSync(opts.config, 'utf8'));
  let server = null;
  let base = opts.base || cfg.base;
  if (opts.dir) { server = await serveDir(opts.dir); base = `http://127.0.0.1:${server.address().port}`; }
  const result = { site: cfg.site, base: opts.dir ? `dir:${opts.dir}` : base, startedAt: new Date().toISOString(), pages: [], source: null, deploy: null, main: null, ok: true };
  try {
    let source = await readSource(base);
    if (opts.expectCommit) {
      // Post-publish: GitHub Pages takes a minute or two; wait for the new source.json first.
      const deadline = Date.now() + opts.wait * 1000;
      while (!(source.ok && source.commit.startsWith(opts.expectCommit.toLowerCase())) && Date.now() < deadline) {
        await sleep(Math.max(1, opts.delay) * 1000);
        source = await readSource(base);
      }
      const ok = source.ok && source.commit.startsWith(opts.expectCommit.toLowerCase());
      result.deploy = { expected: opts.expectCommit, live: source.commit || null, ok, problem: ok ? undefined : `source.json reports ${short(source.commit) || source.problem}, expected ${short(opts.expectCommit)} after ${opts.wait}s` };
    }
    result.source = source;
    const checks = cfg.checks.filter((c) => !opts.only || opts.only.includes(c.path));
    for (const check of checks) result.pages.push(await checkPage(base, check, cfg, opts));
    if (cfg.analytics?.umamiWebsiteId) {
      // Wired only once Dave provides the ID (placeholder: null in smoke-live.json).
      const demo = result.pages.find((p) => p.path.startsWith('/demos/'));
      if (demo) {
        const cfgJs = await get(new URL('/demos/config.js', base).toString());
        const okA = cfgJs.status === 200 && cfgJs.body.includes(cfg.analytics.umamiWebsiteId);
        result.analytics = { ok: okA, problem: okA ? undefined : 'demos/config.js does not carry the Umami website ID' };
      }
    }
    if (opts.behindMain) {
      if (!source.ok) result.main = { ok: false, state: 'unknown', problem: source.problem };
      else result.main = await behindMain({ deployed: source.commit, repository: source.repository || cfg.sourceRepository, branch: cfg.mainBranch || 'main', mainSha: opts.mainSha, maxBehindMinutes: opts.maxBehindMinutes, api: opts.api });
    }
  } finally { server?.close(); }
  result.ok = result.pages.every((p) => p.ok) && (!result.deploy || result.deploy.ok) && (!result.main || result.main.ok) && (!result.analytics || result.analytics.ok);
  if (opts.json) log(JSON.stringify(result, null, 2));
  else {
    log(`smoke ${result.base}  ${result.ok ? 'OK' : 'FAIL'}`);
    log(`  source.json: ${result.source?.ok ? `${short(result.source.commit)} (${result.source.files} files)` : result.source?.problem}`);
    if (result.deploy) log(`  deploy: ${result.deploy.ok ? `live is ${short(result.deploy.live)}` : result.deploy.problem}`);
    for (const p of result.pages) log(`  ${p.ok ? 'ok  ' : 'FAIL'} ${p.path}  HTTP ${p.status} ${p.ms}ms${p.attempts > 1 ? ` (${p.attempts} tries)` : ''}${p.ok ? '' : `  ${p.problems.join('; ')}  [ships with: ${p.since}]`}`);
    if (result.analytics) log(`  analytics: ${result.analytics.ok ? 'ok' : result.analytics.problem}`);
    if (result.main) log(`  main: ${result.main.state}${result.main.aheadBy ? `, ${result.main.aheadBy} commit(s) unpublished${result.main.minutesBehind != null ? `, oldest ${result.main.minutesBehind} min` : ''}` : ''}${result.main.ok ? '' : `  FAIL ${result.main.problem}`}`);
  }
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let opts;
  try { opts = parseArgs(process.argv.slice(2)); } catch (error) { console.error(String(error.message || error)); process.exit(2); }
  if (opts.help) { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 17).map((l) => l.replace(/^\/\/ ?/, '')).join('\n')); process.exit(0); }
  const result = await run(opts);
  process.exit(result.ok ? 0 : 1);
}
