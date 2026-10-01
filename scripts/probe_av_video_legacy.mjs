#!/usr/bin/env node
// Browser behavior probe for the eight legacy Video pages (docs/av-suite-consolidation-stage2-video.md,
// increment 2.0b). Serves the repository and drives Signal Flow, Video Patch, Display Plan, Projection
// Plan, Stream Plan, Record Log, Camera Shot List and Playback Check in Chromium with Playwright. Each page
// gets a synthetic fixture that fills every field-matrix field, including blanks and odd durations, and
// the probe checks reload, JSON export and import, the CSV header, print, Cmd/Ctrl shortcuts, first launch,
// unreadable storage, foreign files and the replace confirmation.
//
// Usage: node scripts/probe_av_video_legacy.mjs [--no-sandbox] [--page=<id>]
//        (CHROME_CHANNEL=chrome to use Chrome, or CHROME_BIN=/path/to/chrome for a specific binary)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const onlyArg = args.find((arg) => arg.startsWith('--page='));
const only = onlyArg ? onlyArg.slice('--page='.length) : '';
const results = [];
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://probe').pathname);
  let file = join(ROOT, pathname);
  if (!file.startsWith(ROOT)) {
    response.writeHead(403).end();
    return;
  }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
  }
});
await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
const BASE = `http://127.0.0.1:${server.address().port}`;

const channel = process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL }
  : process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {};
const browser = await chromium.launch({ headless: true, ...channel, args: args.includes('--no-sandbox') ? ['--no-sandbox'] : [] });

// A note with line breaks, doubled spaces and more than 260 characters. Notes are free text: load, import
// and edits must keep them exactly as typed (Video Patch, Projection Plan and Stream Plan used to flatten and cut them).
const LONG_NOTE = `Probe note 1\nSecond line  with two spaces\n\n  Indented after a blank line. ${'Long operator note. '.repeat(14)}`;

// Fixtures fill every field-matrix field. Blank strings and odd durations are deliberate: they must
// survive a reload exactly as stored. `expect` overrides a field whose stored value is derived on load.
const PAGES = [
  {
    id: 'signal-flow', file: 'signal-flow.html', key: 'signal-flow.v1', schema: 'system-by-dave.signal-flow.v1',
    list: 'routes', body: '#routeBody', sample: '#loadSampleBtn', importInput: '#importInput', foreign: 'system-by-dave.record-log.v1',
    fields: ['route', 'system', 'source', 'format', 'connector', 'processor', 'destination', 'status', 'backup', 'notes'],
    meta: { showName: 'Probe Gala', venue: 'Hall P', showDate: '2026-10-01', videoLead: 'Vic Video', audioLead: '', networkLead: 'Nia Net', tdName: 'Tess TD' },
    rows: [
      { id: 'route-probe-1', route: 'SF 101', system: 'video', source: 'Cam 1', format: 'SDI', connector: 'BNC', processor: 'Fiber A', destination: 'Switcher In 1', status: 'verified', backup: 'Cam 3 wide', notes: LONG_NOTE },
      { id: 'route-probe-2', route: '', system: 'record', source: '', format: 'NDI', connector: 'RJ45', processor: '', destination: 'Recorder B', status: 'issue', backup: '', notes: '' },
      { id: 'route-probe-3', route: 'SF 103', system: 'power', source: 'Distro A', format: 'AC', connector: 'PowerCON', processor: 'UPS', destination: 'Video rack', status: 'backup', backup: 'House quad', notes: 'Comma, and "quote"' },
    ],
  },
  {
    id: 'video-patch', file: 'video-patch.html', key: 'sbd.videoPatch.v1', schema: 'system-by-dave.video-patch.v1',
    list: 'items', body: '#itemBody', sample: '#loadSampleBtn', importInput: '#importInput', foreign: 'system-by-dave.display-plan.v1',
    fields: ['source', 'type', 'format', 'connector', 'input', 'converter', 'destination', 'route', 'backup', 'status', 'notes'],
    meta: { showName: 'Probe Gala', client: 'Client P', venue: 'Hall P', showDate: '2026-10-01', v1: '', videoEngineer: 'Vee Engineer', handoffTo: 'Next Op' },
    rows: [
      { id: 'video-probe-1', source: 'Camera 1', type: 'camera', format: '1080p59.94', connector: '3G SDI', input: 'Switcher In 1', converter: 'None', destination: 'Program switcher', route: 'ME 1 input 1', backup: 'Camera 3', status: 'ready', notes: LONG_NOTE },
      { id: 'video-probe-2', source: '', type: 'slides', format: '', connector: '', input: '', converter: '', destination: '', route: '', backup: '', status: 'issue', notes: '' },
      { id: 'video-probe-3', source: 'LED processor', type: 'display', format: '3840x1080p60', connector: 'DisplayPort', input: 'Processor In 1', converter: 'Fiber TX A', destination: 'LED wall', route: 'Media out 1', backup: 'Scaler feed', status: 'spare', notes: 'Comma, and "quote"' },
    ],
  },
  {
    id: 'display-plan', file: 'display-plan.html', key: 'display-plan.v1', schema: 'system-by-dave.display-plan.v1',
    list: 'items', body: '#itemBody', sample: '#loadSampleBtn', importInput: '#importInput', foreign: 'system-by-dave.video-patch.v1',
    fields: ['display', 'type', 'input', 'processor', 'resolution', 'aspect', 'refresh', 'route', 'backup', 'status', 'notes'],
    meta: { showName: 'Probe Gala', client: 'Client P', venue: 'Hall P', showDate: '2026-10-01', lead: '', processor: 'Barco E2', handoffTo: 'Video crew' },
    rows: [
      { id: 'display-probe-1', display: 'Main LED wall', type: 'led-wall', input: 'Program', processor: 'E2', resolution: '3840x1080', aspect: '32:9', refresh: '59.94', route: 'PGM to E2 layer 1', backup: 'Backup laptop', status: 'ready', notes: LONG_NOTE },
      { id: 'display-probe-2', display: '', type: 'confidence', input: '', processor: '', resolution: '', aspect: '', refresh: '', route: '', backup: '', status: 'issue', notes: '' },
      { id: 'display-probe-3', display: 'Lobby', type: 'lobby', input: 'Loop', processor: 'Laptop', resolution: '1920x1080', aspect: '16:9', refresh: '60', route: 'HDMI to scaler', backup: 'USB stick', status: 'backup', notes: 'Comma, and "quote"' },
    ],
  },
  {
    id: 'projection-plan', file: 'projection-plan.html', key: 'sbd.projectionPlan.v1', schema: 'system-by-dave.projection-plan.v1',
    list: 'items', body: '#itemBody', sample: '#loadSampleBtn', importInput: '#importInput', foreign: 'system-by-dave.stream-plan.v1',
    fields: ['screen', 'surface', 'size', 'aspect', 'projector', 'lens', 'throwDistance', 'position', 'input', 'route', 'blend', 'backup', 'status', 'notes'],
    meta: { showName: 'Probe Gala', client: 'Client P', venue: 'Hall P', showDate: '2026-10-01', v1: 'Vee One', projectionLead: '', handoffTo: 'Next Op' },
    rows: [
      { id: 'projection-probe-1', screen: 'Main screen', surface: 'front', size: '16x9 ft', aspect: '16:9', projector: 'Panasonic 12K', lens: '1.4-2.0', throwDistance: '24 ft', position: 'FOH', input: 'SDI', route: 'Aux 1', blend: 'None', backup: 'Spare laser', status: 'ready', notes: LONG_NOTE },
      { id: 'projection-probe-2', screen: '', surface: 'rear', size: '', aspect: '', projector: '', lens: '', throwDistance: '', position: '', input: '', route: '', blend: '', backup: '', status: 'issue', notes: '' },
      { id: 'projection-probe-3', screen: 'Side screen', surface: 'blend', size: '12x7 ft', aspect: '3:1', projector: 'Pair B', lens: '0.8', throwDistance: '18 ft', position: 'House right', input: 'Fiber RX', route: 'Scaler B', blend: 'Two way', backup: 'Main carries', status: 'lined', notes: 'Comma, and "quote"' },
    ],
  },
  {
    id: 'stream-plan', file: 'stream-plan.html', key: 'sbd.streamPlan.v1', schema: 'system-by-dave.stream-plan.v1',
    list: 'items', body: '#itemBody', sample: '#loadSampleBtn', importInput: '#importInput', foreign: 'system-by-dave.projection-plan.v1',
    fields: ['encoder', 'type', 'platform', 'destination', 'server', 'keyLabel', 'input', 'resolution', 'bitrate', 'audio', 'record', 'backup', 'status', 'notes'],
    meta: { showName: 'Probe Gala', client: 'Client P', venue: 'Hall P', showDate: '2026-10-01', streamTech: 'Sam Stream', producer: '', handoffTo: 'Next Op' },
    rows: [
      { id: 'stream-probe-1', encoder: 'Pearl main', type: 'primary', platform: 'YouTube Live', destination: 'Event page', server: 'Primary RTMP', keyLabel: 'YT event key', input: 'Program SDI', resolution: '1080p59.94', bitrate: '8 Mbps', audio: 'Stereo', record: 'Internal MP4', backup: 'Pearl Mini', status: 'ready', notes: LONG_NOTE },
      { id: 'stream-probe-2', encoder: '', type: 'backup', platform: '', destination: '', server: '', keyLabel: '', input: '', resolution: '', bitrate: '', audio: '', record: '', backup: '', status: 'issue', notes: '' },
      { id: 'stream-probe-3', encoder: 'OBS laptop', type: 'simulcast', platform: 'Vimeo', destination: 'Client embed', server: 'Vimeo RTMP', keyLabel: 'live_abcdEFGH1234ijklMNOP', input: 'Capture 1', resolution: '1080p30', bitrate: '5 Mbps', audio: 'USB', record: 'Local MKV', backup: 'Archive', status: 'configured', notes: 'Comma, and "quote"' },
    ],
    rawKeyRow: 'stream-probe-3',
    labelRow: 'stream-probe-1',
  },
  {
    id: 'record-log', file: 'record-log.html', key: 'record-log.v1', schema: 'system-by-dave.record-log.v1',
    list: 'records', body: '#recordBody', sample: '#loadSampleBtn', importInput: '#importInput', foreign: 'system-by-dave.playback-check.v1',
    fields: ['record', 'source', 'type', 'format', 'resolution', 'audio', 'media', 'status', 'duration', 'backup', 'notes'],
    meta: { showName: 'Probe Gala', venue: 'Hall P', showDate: '2026-10-01', recordOp: 'Rae Record', producer: '', audioLead: 'A1', handoffTo: 'Post' },
    rows: [
      { id: 'record-probe-1', record: 'REC 101', source: 'Program clean', type: 'program', format: 'ProRes', resolution: '1080p', audio: 'embedded', media: 'SSD 1', status: 'armed', duration: '45:00', backup: 'Recorder B', notes: LONG_NOTE },
      { id: 'record-probe-2', record: 'REC 102', source: 'Cam 1 ISO', type: 'iso', format: 'MOV', resolution: '4K', audio: 'none', media: 'ISO A', status: 'rolling', duration: '2m30s', backup: '', notes: '' },
      { id: 'record-probe-3', record: 'REC 103', source: 'Slides', type: 'slides', format: 'MP4', resolution: 'mixed', audio: 'separate', media: 'Capture Mac', status: 'issue', duration: '01:02:03:04', backup: 'PDF', notes: 'Comma, and "quote"' },
      { id: 'record-probe-4', record: '', source: '', type: 'audio', format: 'WAV', resolution: 'audio only', audio: 'multitrack', media: '', status: 'stopped', duration: 'TBD', backup: '', notes: '' },
      { id: 'record-probe-5', record: 'REC 105', source: 'Stream archive', type: 'stream', format: 'MKV', resolution: '720p', audio: 'program', media: 'Platform', status: 'delivered', duration: '45 min', backup: 'Program A', notes: '' },
      { id: 'record-probe-6', record: 'REC 106', source: 'Backup feed', type: 'backup', format: 'H.265', resolution: 'other', audio: 'matrix', media: 'Laptop', status: 'armed', duration: '', backup: '', notes: '' },
    ],
    durations: { unrecognized: ['record-probe-2', 'record-probe-4', 'record-probe-5'], recognized: ['record-probe-1', 'record-probe-3', 'record-probe-6'], runtime: '01:47:03', bareSeconds: true },
  },
  {
    id: 'camera-shot-list', file: 'camera-shot-list.html', key: 'camera-shot-list.v1', schema: 'system-by-dave.camera-shot-list.v1',
    list: 'shots', body: '#shotBody', sample: '#sampleBtn', importInput: '#jsonInput', foreign: 'system-by-dave.comms-check.v1',
    fields: ['number', 'cue', 'camera', 'type', 'subject', 'framing', 'movement', 'preset', 'status', 'notes'],
    csvHeader: ['Shot', 'Time or cue', 'Camera', 'Type', 'Subject', 'Framing', 'Movement', 'Preset', 'Status', 'Notes'],
    meta: { showName: 'Probe Gala', venue: 'Hall P', date: '2026-10-01', director: 'Dee Director', td: '' },
    rows: [
      { id: 'shot-probe-1', number: '101', cue: 'Cue 01', camera: 'Cam 2', type: 'Close', subject: 'Keynote', framing: 'Tight single', movement: 'Static', preset: '4', status: 'ready', notes: LONG_NOTE },
      { id: 'shot-probe-2', number: '', cue: '', camera: '', type: '', subject: '', framing: '', movement: '', preset: '', status: 'problem', notes: '' },
      { id: 'shot-probe-3', cue: 'Wrap', camera: 'Cam 1', type: 'Wide', subject: 'Stage', framing: 'Full stage', movement: 'Slow pull', preset: '1', status: 'hold', notes: 'Comma, and "quote"', expect: { number: '003' } },
    ],
  },
  {
    id: 'playback-check', file: 'playback-check.html', key: 'playback-check.v1', schema: 'system-by-dave.playback-check.v1',
    list: 'cues', body: '#cueBody', sample: '#loadSampleBtn', importInput: '#importInput', foreign: 'system-by-dave.record-log.v1',
    fields: ['cue', 'file', 'type', 'duration', 'aspect', 'audio', 'destination', 'status', 'backup', 'notes'],
    meta: { showName: 'Probe Gala', venue: 'Hall P', showDate: '2026-10-01', playbackOp: 'Pat Playback', tdName: '', audioLead: 'A1' },
    rows: [
      { id: 'cue-probe-1', cue: 'PB 101', file: 'walk_in.mov', type: 'walk in', duration: '12:00', aspect: '16:9', audio: 'embedded', destination: 'Main screen', status: 'ready', backup: 'SSD A', notes: LONG_NOTE },
      { id: 'cue-probe-2', cue: 'PB 102', file: 'sting.mp4', type: 'sting', duration: '2m30s', aspect: '9:16', audio: 'click', destination: '', status: 'pending', backup: '', notes: '' },
      { id: 'cue-probe-3', cue: 'PB 103', file: 'product.mp4', type: 'video', duration: '01:02:03:04', aspect: '21:9', audio: 'separate', destination: 'Lobby', status: 'issue', backup: 'Laptop 2', notes: 'Comma, and "quote"' },
      { id: 'cue-probe-4', cue: '', file: '', type: 'audio', duration: 'TBD', aspect: 'audio only', audio: 'house music', destination: 'Audio console', status: 'played', backup: '', notes: '' },
      { id: 'cue-probe-5', cue: 'PB 105', file: 'slide.png', type: 'slide', duration: '', aspect: 'mixed', audio: 'none', destination: 'Stream', status: 'pending', backup: '', notes: '' },
    ],
    durations: { unrecognized: ['cue-probe-2', 'cue-probe-4'], recognized: ['cue-probe-1', 'cue-probe-3', 'cue-probe-5'], runtime: '01:14:03', bareSeconds: true },
  },
];

function record(ok, name, detail = '') {
  results.push({ ok, name, detail });
  console.log(`${ok ? 'ok' : 'not ok'} - ${name}${detail ? `: ${detail}` : ''}`);
}

async function check(name, fn) {
  try {
    const detail = await fn();
    record(true, name, detail || '');
  } catch (error) {
    record(false, name, error.message.split('\n')[0]);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function rowsOf(cfg) {
  return cfg.rows.map((row) => {
    const copy = { ...row };
    delete copy.expect;
    return copy;
  });
}

function expected(cfg) {
  return cfg.rows.map((row) => ({ ...row, ...(row.expect || {}) }));
}

function storedState(cfg, rows = rowsOf(cfg)) {
  const state = { meta: { ...cfg.meta }, [cfg.list]: rows };
  if (['signal-flow', 'display-plan', 'record-log', 'camera-shot-list', 'playback-check'].includes(cfg.id)) state.schema = cfg.schema;
  return state;
}

function compareRows(cfg, actualRows, label) {
  const want = expected(cfg);
  assert(Array.isArray(actualRows), `${label}: no ${cfg.list} array`);
  assert(actualRows.length === want.length, `${label}: ${actualRows.length} rows, expected ${want.length}`);
  want.forEach((row, index) => {
    const got = actualRows[index] || {};
    assert(got.id === row.id, `${label}: row ${index + 1} id ${got.id}`);
    cfg.fields.forEach((field) => {
      assert(got[field] === row[field], `${label}: ${row.id}.${field} is ${JSON.stringify(got[field])}, expected ${JSON.stringify(row[field])}`);
    });
  });
}

function compareMeta(cfg, meta, label) {
  Object.keys(cfg.meta).forEach((field) => {
    assert(meta && meta[field] === cfg.meta[field], `${label}: meta.${field} is ${JSON.stringify(meta && meta[field])}`);
  });
}

async function newContext() {
  const context = await browser.newContext({ acceptDownloads: true });
  await context.addInitScript(() => {
    window.__copied = '';
    try {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: (text) => { window.__copied = String(text); return Promise.resolve(); } },
      });
    } catch (error) { /* keep the real clipboard */ }
  });
  return context;
}

// Opens a page and records dialogs. `answer` decides each confirm: true accepts, false dismisses.
async function open(context, cfg, answer = false) {
  const page = await context.newPage();
  const errors = [];
  const dialogs = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.message());
    if (typeof page.answer === 'boolean' ? page.answer : answer) await dialog.accept();
    else await dialog.dismiss();
  });
  await page.goto(`${BASE}/${cfg.file}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(120);
  return { page, errors, dialogs };
}

// Writes storage for the page's origin before the tool loads.
async function seed(context, entries) {
  const page = await context.newPage();
  await page.goto(`${BASE}/__probe_seed__`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((items) => {
    localStorage.clear();
    Object.keys(items).forEach((key) => localStorage.setItem(key, items[key]));
  }, entries);
  await page.close();
}

const read = (page, key) => page.evaluate((name) => localStorage.getItem(name), key);
const rowCount = (page, cfg) => page.locator(`${cfg.body} tr[data-id]`).count();
const hint = (page) => page.locator('#hint').innerText();

// Saves the current page state the way an edit would, without changing any value.
async function touch(page) {
  await page.evaluate(() => {
    const input = document.getElementById('showName');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(80);
}

async function editShowName(page, value) {
  await page.fill('#showName', value);
  await page.dispatchEvent('#showName', 'change');
  await page.waitForTimeout(80);
}

async function download(page, selector) {
  const [file] = await Promise.all([page.waitForEvent('download'), page.click(selector)]);
  return readFile(await file.path(), 'utf8');
}

async function importFile(page, cfg, payload) {
  await page.setInputFiles(cfg.importInput, {
    name: `${cfg.id}.probe.json`,
    mimeType: 'application/json',
    buffer: Buffer.from(typeof payload === 'string' ? payload : JSON.stringify(payload)),
  });
  await page.waitForTimeout(250);
}

async function seeded(cfg, answer = false) {
  const context = await newContext();
  await seed(context, { [cfg.key]: JSON.stringify(storedState(cfg)) });
  const opened = await open(context, cfg, answer);
  return { context, ...opened };
}

async function runPage(cfg) {
  await check(`${cfg.id}: a fixture with every field survives load, save and reload unchanged`, async () => {
    const { context, page, errors } = await seeded(cfg);
    await touch(page);
    const first = JSON.parse(await read(page, cfg.key));
    compareRows(cfg, first[cfg.list], 'after load and save');
    compareMeta(cfg, first.meta, 'after load and save');
    await page.reload({ waitUntil: 'networkidle' });
    await touch(page);
    const second = JSON.parse(await read(page, cfg.key));
    compareRows(cfg, second[cfg.list], 'after reload and save');
    compareMeta(cfg, second.meta, 'after reload and save');
    const shown = await rowCount(page, cfg);
    await context.close();
    assert(shown === cfg.rows.length, `${shown} rows rendered`);
    assert(errors.length === 0, errors.join('; '));
  });

  await check(`${cfg.id}: a multi-line note typed in a row keeps its line breaks and length through reload`, async () => {
    const { context, page, errors } = await seeded(cfg);
    const typed = `Typed line one\nTyped line two  spaced\n${'More detail for the next operator. '.repeat(9)}`;
    await page.locator(`${cfg.body} tr[data-id="${cfg.rows[0].id}"] textarea[data-field="notes"]`).fill(typed);
    await page.waitForTimeout(80);
    const saved = JSON.parse(await read(page, cfg.key))[cfg.list][0].notes;
    await page.reload({ waitUntil: 'networkidle' });
    await touch(page);
    const reloaded = JSON.parse(await read(page, cfg.key))[cfg.list][0].notes;
    await context.close();
    assert(saved === typed, `saved as ${JSON.stringify(saved.slice(0, 60))} (${saved.length} of ${typed.length} characters)`);
    assert(reloaded === typed, `after reload ${JSON.stringify(reloaded.slice(0, 60))} (${reloaded.length} of ${typed.length} characters)`);
    assert(errors.length === 0, errors.join('; '));
  });

  await check(`${cfg.id}: JSON export carries ${cfg.schema} and round-trips through import`, async () => {
    const { context, page } = await seeded(cfg);
    const exported = JSON.parse(await download(page, '#exportJsonBtn'));
    await context.close();
    assert(exported.schema === cfg.schema, `export schema ${exported.schema}`);
    compareRows(cfg, exported[cfg.list], 'export');
    const fresh = await newContext();
    const target = await open(fresh, cfg);
    await importFile(target.page, cfg, exported);
    const stored = JSON.parse(await read(target.page, cfg.key) || 'null');
    const asked = target.dialogs.length;
    await fresh.close();
    assert(stored, 'import saved nothing');
    compareRows(cfg, stored[cfg.list], 'after import');
    compareMeta(cfg, stored.meta, 'after import');
    assert(asked === 0, 'an empty page asked before importing');
  });

  await check(`${cfg.id}: CSV header matches the field matrix`, async () => {
    const { context, page } = await seeded(cfg);
    const csv = await download(page, '#exportCsvBtn');
    await context.close();
    const header = csv.split('\n')[0].split(',').map((cell) => cell.replace(/^"|"$/g, ''));
    const want = cfg.csvHeader || cfg.fields;
    assert(JSON.stringify(header) === JSON.stringify(want), `header ${header.join(',')}`);
  });

  await check(`${cfg.id}: print hides the toolbar, side panel and card view`, async () => {
    const { context, page } = await seeded(cfg);
    const hasCards = await page.locator('.av-domain-view').count();
    await page.emulateMedia({ media: 'print' });
    const shown = await page.evaluate(() => {
      const visible = (el) => getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0;
      const chrome = Array.from(document.querySelectorAll('.topbar, .toolbar, .side, .av-domain-view'));
      return {
        chrome: chrome.filter(visible).map((el) => el.className),
        table: Array.from(document.querySelectorAll('table')).some(visible),
      };
    });
    await context.close();
    assert(shown.chrome.length === 0, `still printed: ${shown.chrome.join(' | ')}`);
    assert(shown.table, 'the table itself is hidden in print');
    return hasCards ? 'card view present and hidden' : '';
  });

  await check(`${cfg.id}: Cmd, Ctrl and Alt shortcuts are left to the browser`, async () => {
    const { context, page } = await seeded(cfg);
    await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
    const before = await read(page, cfg.key);
    const rowsBefore = await rowCount(page, cfg);
    const prevented = await page.evaluate(() => {
      const combos = [['metaKey', 'p'], ['ctrlKey', 'p'], ['metaKey', 'n'], ['ctrlKey', 'n'], ['metaKey', 'd'], ['ctrlKey', 'd'], ['metaKey', 'r'], ['ctrlKey', 'r'], ['altKey', 'n'], ['metaKey', 't']];
      return combos.filter(([modifier, key]) => {
        const event = new KeyboardEvent('keydown', { key, [modifier]: true, bubbles: true, cancelable: true });
        document.body.dispatchEvent(event);
        return event.defaultPrevented;
      }).map(([modifier, key]) => `${modifier}+${key}`);
    });
    const after = await read(page, cfg.key);
    const rowsAfter = await rowCount(page, cfg);
    const plain = await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', { key: 'n', bubbles: true, cancelable: true });
      document.body.dispatchEvent(event);
      return event.defaultPrevented;
    });
    const rowsPlain = await rowCount(page, cfg);
    await context.close();
    assert(prevented.length === 0, `default prevented for ${prevented.join(', ')}`);
    assert(after === before && rowsAfter === rowsBefore, 'a modified key changed the rows');
    assert(plain && rowsPlain === rowsBefore + 1, 'the plain N shortcut no longer adds a row');
  });

  await check(`${cfg.id}: first launch starts empty and writes nothing until the first edit`, async () => {
    const context = await newContext();
    const { page, errors } = await open(context, cfg);
    const before = await read(page, cfg.key);
    const shown = await rowCount(page, cfg);
    await editShowName(page, 'First Edit Show');
    const after = JSON.parse(await read(page, cfg.key) || 'null');
    await context.close();
    assert(before === null, `wrote ${String(before).slice(0, 60)} on first launch`);
    assert(shown === 0, `${shown} rows on first launch`);
    assert(after && Array.isArray(after[cfg.list]) && after[cfg.list].length === 0, `first edit saved ${after && after[cfg.list] ? after[cfg.list].length : 'no'} rows`);
    assert(errors.length === 0, errors.join('; '));
  });

  await check(`${cfg.id}: an empty saved list stays empty`, async () => {
    const context = await newContext();
    await seed(context, { [cfg.key]: JSON.stringify(storedState(cfg, [])) });
    const { page } = await open(context, cfg);
    const shown = await rowCount(page, cfg);
    await touch(page);
    const after = JSON.parse(await read(page, cfg.key));
    await context.close();
    assert(shown === 0, `${shown} rows shown for an empty list`);
    assert(after[cfg.list].length === 0, `${after[cfg.list].length} rows saved for an empty list`);
  });

  await check(`${cfg.id}: Load Sample fills an empty page and asks before replacing rows`, async () => {
    const context = await newContext();
    const { page, dialogs } = await open(context, cfg);
    await page.click(cfg.sample);
    await page.waitForTimeout(100);
    const loaded = await rowCount(page, cfg);
    const firstAsk = dialogs.length;
    const before = await read(page, cfg.key);
    await page.click(cfg.sample);
    await page.waitForTimeout(100);
    const after = await read(page, cfg.key);
    await context.close();
    assert(loaded > 0, 'Load Sample loaded nothing');
    assert(firstAsk === 0, 'asked before loading samples into an empty page');
    assert(dialogs.length === 1, 'did not ask before replacing rows with samples');
    assert(after === before, 'a dismissed Load Sample changed storage');
  });

  await check(`${cfg.id}: unreadable saved data is kept aside and reported`, async () => {
    const context = await newContext();
    await seed(context, { [cfg.key]: '{not json' });
    const { page } = await open(context, cfg);
    const kept = await read(page, `${cfg.key}.unreadable`);
    const original = await read(page, cfg.key);
    const message = await hint(page);
    const shown = await rowCount(page, cfg);
    await editShowName(page, 'After Unreadable');
    const saved = await read(page, cfg.key);
    const keptAfter = await read(page, `${cfg.key}.unreadable`);
    await context.close();
    assert(kept === '{not json', `copy holds ${JSON.stringify(kept)}`);
    assert(original === '{not json', 'the unreadable value was replaced on load');
    assert(/could not be read/i.test(message) && message.includes(`${cfg.key}.unreadable`), `hint: ${message}`);
    assert(shown === 0, `${shown} rows shown after an unreadable load`);
    assert(keptAfter === '{not json', 'the kept copy changed after the first save');
    assert(/After Unreadable/.test(saved || '') && JSON.parse(saved)[cfg.list].length === 0, 'the first edit did not save an empty list');
  });

  await check(`${cfg.id}: an older unreadable copy is never overwritten, and the page does not save over the new one`, async () => {
    const context = await newContext();
    await seed(context, { [cfg.key]: '{broken again', [`${cfg.key}.unreadable`]: 'older copy' });
    const { page } = await open(context, cfg);
    await editShowName(page, 'Blocked Save');
    const main = await read(page, cfg.key);
    const kept = await read(page, `${cfg.key}.unreadable`);
    const message = await hint(page);
    await context.close();
    assert(kept === 'older copy', `older copy became ${JSON.stringify(kept)}`);
    assert(main === '{broken again', 'the page saved over unreadable data that has no copy');
    assert(/not saving/i.test(message), `hint: ${message}`);
  });

  await check(`${cfg.id}: a file from another tool is rejected`, async () => {
    const { context, page, dialogs } = await seeded(cfg, true);
    const before = await read(page, cfg.key);
    const row = rowsOf(cfg)[0];
    await importFile(page, cfg, { schema: cfg.foreign, exportedAt: '2026-10-01T00:00:00.000Z', meta: { showName: 'Foreign' }, [cfg.list]: [row], items: [row] });
    const after = await read(page, cfg.key);
    const message = await hint(page);
    await context.close();
    assert(after === before, 'storage changed');
    assert(dialogs.length === 0, 'asked to replace with a foreign file');
    assert(/another tool/i.test(message), `hint: ${message}`);
  });

  await check(`${cfg.id}: a file without a schema is still accepted`, async () => {
    const context = await newContext();
    const { page } = await open(context, cfg);
    await importFile(page, cfg, { meta: cfg.meta, [cfg.list]: rowsOf(cfg) });
    const stored = JSON.parse(await read(page, cfg.key) || 'null');
    await context.close();
    assert(stored, 'nothing imported');
    compareRows(cfg, stored[cfg.list], 'schema-less import');
  });

  await check(`${cfg.id}: replacing rows asks with both counts, and Cancel leaves storage unchanged`, async () => {
    const { context, page, dialogs } = await seeded(cfg, false);
    const before = await read(page, cfg.key);
    const incoming = { schema: cfg.schema, meta: cfg.meta, [cfg.list]: [rowsOf(cfg)[0]] };
    await importFile(page, cfg, incoming);
    const afterCancel = await read(page, cfg.key);
    page.answer = true;
    await importFile(page, cfg, incoming);
    const afterAccept = JSON.parse(await read(page, cfg.key));
    await context.close();
    assert(dialogs.length === 2, `${dialogs.length} confirmations`);
    assert(new RegExp(`\\b${cfg.rows.length}\\b`).test(dialogs[0]) && /\b1\b/.test(dialogs[0]) && /replace/i.test(dialogs[0]), `message: ${dialogs[0]}`);
    assert(afterCancel === before, 'a dismissed confirmation changed storage');
    assert(afterAccept[cfg.list].length === 1, 'an accepted confirmation did not import');
    return dialogs[0];
  });

  if (cfg.durations) {
    await check(`${cfg.id}: unrecognized durations stay as typed and are flagged in the row`, async () => {
      const { context, page } = await seeded(cfg);
      const flags = await page.evaluate((body) => Array.from(document.querySelectorAll(`${body} tr[data-id]`)).map((row) => {
        const input = row.querySelector('[data-field="duration"]');
        const marker = row.querySelector('.duration-flag');
        const style = marker ? getComputedStyle(marker) : null;
        return {
          id: row.dataset.id,
          value: input.value,
          marker: marker && style.display !== 'none' && style.visibility !== 'hidden' ? marker.textContent.trim() : '',
          described: [input.getAttribute('title') || '', input.getAttribute('aria-label') || '',
            (input.getAttribute('aria-describedby') || '').split(' ').map((id) => (document.getElementById(id) || {}).textContent || '').join(' ')].join(' '),
        };
      }), cfg.body);
      const runtime = await page.locator('#runtimeOut').innerText();
      await context.close();
      cfg.durations.unrecognized.forEach((id) => {
        const row = flags.find((item) => item.id === id);
        assert(row && /unrecognized duration/i.test(row.marker), `${id} has no visible marker`);
        assert(/unrecognized duration/i.test(row.described), `${id} has no title or aria text`);
      });
      cfg.durations.recognized.forEach((id) => {
        const row = flags.find((item) => item.id === id);
        assert(row && !row.marker, `${id} (${row && row.value}) is flagged`);
      });
      assert(runtime === cfg.durations.runtime, `runtime ${runtime}, expected ${cfg.durations.runtime}`);
    });

    await check(`${cfg.id}: clean durations keep today's meaning when edited`, async () => {
      const { context, page } = await seeded(cfg);
      const id = cfg.durations.recognized[0];
      const field = page.locator(`${cfg.body} tr[data-id="${id}"] [data-field="duration"]`);
      const results = {};
      for (const typed of ['90', '1:5', '75:00', '01:02:03', '3m']) {
        await field.fill(typed);
        await field.dispatchEvent('change');
        await page.waitForTimeout(60);
        const stored = JSON.parse(await read(page, cfg.key))[cfg.list].find((row) => row.id === id);
        results[typed] = stored.duration;
      }
      await context.close();
      const want = { '90': '01:30', '1:5': '01:05', '75:00': '01:15:00', '01:02:03': '01:02:03', '3m': '3m' };
      Object.keys(want).forEach((typed) => assert(results[typed] === want[typed], `${typed} saved as ${results[typed]}`));
    });
  }

  if (cfg.rawKeyRow) {
    await check(`${cfg.id}: a raw-looking stream key is warned about in the row and in Copy Summary`, async () => {
      const { context, page } = await seeded(cfg);
      const warned = await page.locator(`${cfg.body} tr[data-id="${cfg.rawKeyRow}"] .key-warning`).isVisible();
      const label = await page.locator(`${cfg.body} tr[data-id="${cfg.labelRow}"] .key-warning`).count();
      await page.click('#copySummaryBtn');
      await page.waitForTimeout(100);
      const summary = await page.evaluate(() => window.__copied);
      const before = await read(page, cfg.key);
      await context.close();
      assert(warned, 'no warning on the raw key row');
      assert(label === 0, 'a key label was warned about');
      assert(/raw stream key/i.test(summary) && /OBS laptop/.test(summary), 'Copy Summary has no raw-key line');
      assert(/live_abcdEFGH1234ijklMNOP/.test(before || ''), 'the warning changed the stored key label');
    });
  }

  if (['video-patch', 'projection-plan', 'stream-plan'].includes(cfg.id)) {
    await check(`${cfg.id}: new rows still get placeholder defaults`, async () => {
      const context = await newContext();
      const { page } = await open(context, cfg);
      await page.click('#addItemBtn');
      await page.waitForTimeout(80);
      const stored = JSON.parse(await read(page, cfg.key))[cfg.list][0];
      await context.close();
      const want = { 'video-patch': { source: 'New source', format: '1080p59.94' }, 'projection-plan': { screen: 'New screen', aspect: '16:9' }, 'stream-plan': { encoder: 'New encoder' } }[cfg.id];
      Object.keys(want).forEach((field) => assert(stored[field] === want[field], `${field} is ${stored[field]}`));
    });
  }
}

for (const cfg of PAGES) {
  if (only && cfg.id !== only) continue;
  await runPage(cfg);
}

await browser.close();
server.close();
const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} AV Video legacy checks passed`);
process.exit(failed.length ? 1 : 0);
