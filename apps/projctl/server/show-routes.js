import fs from 'node:fs';
import path from 'node:path';
import { readHostPaths } from './host-paths.js';
import { createCueFeed } from './cue-feed.js';
import { readHostChecks, reportFileProvider } from './host-checks.js';
import { readKnow, resolveKnowFile, knowHeaders, KNOW_AUDIENCES } from './know-folder.js';
import { createPowerRun } from './power-run.js';

// Routes for the role pages. The relay calls this after its sign-in check, so every route here is
// for signed-in devices only. The first four only read; nothing here sends MIDI. The power run is
// the one thing that commands a projector, through the relay's own guarded power command.
//   GET /api/cue-feed      what the listen-only observer has seen
//   GET /api/host-checks   checks a provider on the relay computer answers
//   GET /api/know          the documents manifest, filtered by audience
//   GET /api/know/file     one file named in that manifest
//   GET  /api/power-run        the all-four run every page shares
//   POST /api/power-run/plan   what a run would do now, with a one-use confirm
//   POST /api/power-run/start  begin the reviewed run
//   POST /api/power-run/stop   send nothing more
const ROUTES = new Set(['/api/cue-feed', '/api/host-checks', '/api/know', '/api/know/file']);
const RUN_POSTS = new Set(['/api/power-run/plan', '/api/power-run/start', '/api/power-run/stop']);

export function createShowRoutes({ dataDir, appDir, sim = false, relay = null }) {
  const settings = path.join(dataDir, 'host-paths.json');
  const samples = path.join(appDir, 'samples', 'know'); // invented files, shown in simulation only
  const cueFeed = createCueFeed();
  // relay: the hooks the run needs from the relay (projectors, status, power, refresh, revision, locked, broadcast, body).
  const powerRun = relay ? createPowerRun({ projectors: relay.projectors, status: relay.status, power: relay.power, refresh: relay.refresh, revision: relay.revision, locked: relay.locked,
    maxStatusAgeMs: relay.maxStatusAgeMs, file: path.join(dataDir, 'power-run.json'), changed: state => relay.broadcast({ type: 'powerRun', ...state }) }) : null;

  return async function showRoutes(req, res, url, json) {
    if (powerRun && url.pathname === '/api/power-run') { if (req.method !== 'GET') json(res, 405, { error: 'read only' }); else json(res, 200, powerRun.view()); return true; }
    if (powerRun && RUN_POSTS.has(url.pathname)) {
      if (req.method !== 'POST') { json(res, 405, { error: 'post only' }); return true; }
      try {
        const { direction, confirm } = await relay.body(req);
        if (url.pathname.endsWith('/plan')) json(res, 200, powerRun.plan(direction));
        else if (url.pathname.endsWith('/start')) json(res, 200, powerRun.start(direction, typeof confirm === 'string' ? confirm.slice(0, 64) : ''));
        else json(res, 200, powerRun.stop());
      } catch (error) { if (!error.status || error.status >= 500) throw error; json(res, error.status, { error: error.message, ...(error.run ? error.run : {}) }); }
      return true;
    }
    if (!ROUTES.has(url.pathname)) return false;
    if (req.method !== 'GET') { json(res, 405, { error: 'read only' }); return true; }
    const paths = await readHostPaths(settings);
    if (url.pathname === '/api/cue-feed') { json(res, 200, await cueFeed.read(paths.cueObserver)); return true; }
    if (url.pathname === '/api/host-checks') {
      json(res, 200, await readHostChecks(paths.hostChecks ? [reportFileProvider(paths.hostChecks)] : []));
      return true;
    }
    const folder = paths.knowFolder || (sim ? samples : null), sample = !paths.knowFolder && sim;
    if (url.pathname === '/api/know') {
      const asked = (url.searchParams.get('audience') || '').split(',').filter(name => KNOW_AUDIENCES.includes(name));
      json(res, 200, await readKnow(folder, { audience: asked.length ? asked : KNOW_AUDIENCES, sample }));
      return true;
    }
    const found = await resolveKnowFile(folder, url.searchParams.get('f'));
    if (!found) { json(res, 404, { error: 'not in the documents folder' }); return true; }
    res.writeHead(200, knowHeaders(found));
    fs.createReadStream(found.path).on('error', () => res.destroy()).pipe(res);
    return true;
  };
}
