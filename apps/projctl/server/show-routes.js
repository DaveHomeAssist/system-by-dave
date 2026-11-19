import fs from 'node:fs';
import path from 'node:path';
import { readHostPaths } from './host-paths.js';
import { createCueFeed } from './cue-feed.js';
import { readHostChecks, reportFileProvider } from './host-checks.js';
import { readKnow, resolveKnowFile, knowHeaders, KNOW_AUDIENCES } from './know-folder.js';

// Read-only routes for the role pages. The relay calls this after its sign-in check, so every
// route here is for signed-in devices only. Nothing here writes, sends MIDI or runs a command.
//   GET /api/cue-feed      what the listen-only observer has seen
//   GET /api/host-checks   checks a provider on the relay computer answers
//   GET /api/know          the documents manifest, filtered by audience
//   GET /api/know/file     one file named in that manifest
const ROUTES = new Set(['/api/cue-feed', '/api/host-checks', '/api/know', '/api/know/file']);

export function createShowRoutes({ dataDir, appDir, sim = false }) {
  const settings = path.join(dataDir, 'host-paths.json');
  const samples = path.join(appDir, 'samples', 'know'); // invented files, shown in simulation only
  const cueFeed = createCueFeed();

  return async function showRoutes(req, res, url, json) {
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
