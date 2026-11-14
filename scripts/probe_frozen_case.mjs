// Frozen case, stage 1: the four projection lanes of the Frozen rig entered into the AV by Dave console through
// its own controls, the way an operator would. Every step is journalled, photographed, filmed and monitored.
// Brief, record format and findings: docs/frozen-case.md.
//
//   node scripts/probe_frozen_case.mjs [outdir] [--film]
//     outdir                 where the record is written (default: FROZEN_CASE_OUT, else a folder in the temp directory)
//     --film                 operator pace, so the session film can be watched (scripts/frozen_case_film.py captions it)
//     FROZEN_CASE_BASE=...   read the same journey back against a deployment, for example https://avbydave.com
//
// The case facts are read at run time from the public Frozen reference in this repository (wst/projectors.json
// and wst/stage/plot.json). Nothing about the rig is copied into this script, so a corrected record is a corrected
// case. They are plan records and operator reports, not the state of the show. No hardware is addressed.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync, appendFileSync, rmSync, renameSync, readdirSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { serveFamilies } from './av-family-probe.mjs';
import { closeTopics, suiteTopic, selectView, viewNames, recallPanel, savePack } from './av-menu-journey.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2), FILM = args.includes('--film');
const OUT = resolve(args.find(arg => !arg.startsWith('--')) || process.env.FROZEN_CASE_OUT || join(tmpdir(), 'frozen-case'));
const KEY = 'sbd.avVideo.v1';
// Where panels sit on this device is the console's own device-local state. It changes whenever a view is chosen.
const DEVICE_LOCAL = ['sbd.avSuite.layout.v1'];

// ---------------------------------------------------------------------------------------------- the case
const reference = JSON.parse(readFileSync(join(ROOT, 'wst/projectors.json'), 'utf8'));
const plot = JSON.parse(readFileSync(join(ROOT, 'wst/stage/plot.json'), 'utf8')).plot;
const catalog = Object.fromEntries(reference.catalog.map(item => [item.id, item]));
const flow = reference.signalFlow;
const LANES = reference.projectors.map(row => {
  const raster = (catalog[row.referenceIds[0]].facts.find(fact => /raster/i.test(fact.label)) || {}).value || '';
  const [, w, h] = raster.match(/(\d+)\s*×\s*(\d+)/) || [], screen = `${row.lane} · ${row.position}`;
  return {
    lane: row.lane,
    record: {
      'Screen name': screen,
      'Surface': `${row.position}, ${row.orientation.toLowerCase()}`,
      'Screen size': `${plot.views.front.lanes[row.lane].note.replace(/ coverage$/, '')} (plotted coverage)`,
      'Aspect ratio': w ? `${Number(w) / Number(h) === 1.6 ? '16:10' : `${w}:${h}`} native, ${w} × ${h}${row.orientation === 'Portrait' ? ', mounted portrait' : ''}` : '',
      'Projector': row.model,
      'Lens': row.lens,
      'Throw distance': row.throwDistance || '',
      'Projector position': plot.views.plan.lanes[row.lane].note,
      'Destination input': `${flow.preferredInput.label} (${flow.preferredInput.status})`,
      'Destination notes': row.note,
    },
    // A lane whose record reports an operator limit is entered as an issue; the others keep the application's default.
    status: /shift limit/i.test(row.note) ? 'issue' : 'planned',
    route: { 'Route name': `Playback → ${row.lane}`, 'Source': flow.videoSource.label, 'Destination': screen, notes: `${flow.videoSource.note} ${flow.transport.note}` },
  };
});
assert.deepEqual(LANES.map(lane => lane.lane), ['A', 'B', 'C', 'D'], 'the Frozen reference should list lanes A to D');
// What the application should report for this case: exactly what the reference leaves unknown.
const expectedChecks = [
  ...LANES.map(lane => ({ name: lane.route['Route name'], gaps: ['Format missing', 'Connector missing', 'Input missing'] })),
  ...LANES.map(lane => ({ name: lane.record['Screen name'], gaps: [...(lane.record['Throw distance'] ? [] : ['Throw distance missing']), ...(lane.status === 'issue' ? ['Reported issue'] : [])] })).filter(row => row.gaps.length),
];
const PLAN = { name: 'Frozen · projection', venue: 'Walnut Street Theatre' };

// ---------------------------------------------------------------------------------------------- the recorder
rmSync(OUT, { recursive: true, force: true });
for (const dir of ['steps', 'exports', 'film']) mkdirSync(join(OUT, dir), { recursive: true });
const runId = randomUUID(), journalFile = join(OUT, 'journal.jsonl');
const commit = (() => { try { return execFileSync('git', ['-C', ROOT, 'rev-parse', 'HEAD'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return 'unknown'; } })();
const sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const emit = event => appendFileSync(journalFile, `${JSON.stringify({ schema: 'system-by-dave.frozen-case.journal.v1', run_id: runId, at: new Date().toISOString(), ...event })}\n`);
const settle = ms => new Promise(done => setTimeout(done, ms));
const pause = ms => FILM ? settle(ms) : Promise.resolve();

const live = Boolean(process.env.FROZEN_CASE_BASE);
const server = live ? null : await serveFamilies();
const base = live ? process.env.FROZEN_CASE_BASE.replace(/\/$/, '') : server.base;
const channel = process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {};
const proxy = live && process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } } : {};
const browser = await chromium.launch({ headless: true, ...channel, ...proxy, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
// One scale for the film and the step photographs: a photograph at another scale makes the film jump for a frame.
const context = await browser.newContext({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 1, acceptDownloads: true, recordVideo: { dir: join(OUT, 'film'), size: { width: 1440, height: 810 } } });
// A pointer for the film: a headless browser draws none. It is the only thing this run adds to the page. It takes
// no part in layout or input, and is raised above any open dialog so it stays in view.
await context.addInitScript(() => {
  if (window.top !== window) return;
  const start = () => {
    if (document.getElementById('case-pointer')) return;
    const dot = document.createElement('div'); dot.id = 'case-pointer'; dot.setAttribute('popover', 'manual'); dot.setAttribute('aria-hidden', 'true');
    dot.style.cssText = 'position:fixed;inset:auto;left:0;top:0;width:20px;height:20px;margin:-10px 0 0 -10px;padding:0;border-radius:50%;background:rgba(214,96,36,.5);border:2px solid #fff;box-shadow:0 0 0 1.5px rgba(20,20,20,.55);pointer-events:none;overflow:visible;transform:translate(-80px,-80px);transition:transform .22s ease-out,background .08s';
    document.documentElement.appendChild(dot); try { dot.showPopover(); } catch {}
    let above = null;
    addEventListener('mousemove', event => {
      const dialog = [...document.querySelectorAll('dialog[open]')].pop() || null;
      if (dialog !== above) { above = dialog; try { dot.hidePopover(); dot.showPopover(); } catch {} }
      dot.style.transform = `translate(${event.clientX}px,${event.clientY}px)`;
    }, true);
    addEventListener('mousedown', () => { dot.style.background = 'rgba(214,96,36,.98)'; }, true);
    addEventListener('mouseup', () => { dot.style.background = 'rgba(214,96,36,.5)'; }, true);
  };
  if (document.documentElement) start(); else addEventListener('DOMContentLoaded', start);
});
const page = await context.newPage(); page.setDefaultTimeout(15000);
const filmStart = Date.now(), clock = () => Math.round((Date.now() - filmStart) / 10) / 100;

// Monitors: what the page did while the operator worked, collected between steps.
const seen = { pageErrors: [], consoleErrors: [], failedRequests: [], badResponses: [] };
page.on('pageerror', error => seen.pageErrors.push(String(error.message || error).slice(0, 300)));
page.on('console', message => { if (message.type() === 'error') seen.consoleErrors.push(message.text().slice(0, 300)); });
page.on('requestfailed', request => seen.failedRequests.push(`${request.method()} ${new URL(request.url()).pathname} ${request.failure()?.errorText || ''}`.trim()));
page.on('response', response => { if (response.status() >= 400) seen.badResponses.push(`${response.status()} ${new URL(response.url()).pathname}`); });
page.on('dialog', dialog => dialog.accept());
const drain = () => Object.fromEntries(Object.entries(seen).map(([name, list]) => [name, list.splice(0)]));
const storage = () => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]))).catch(() => ({}));
const overflow = () => page.evaluate(() => { const d = document.documentElement; return { x: d.scrollWidth - d.clientWidth, y: d.scrollHeight - d.clientHeight }; }).catch(() => null);
const savedRaw = () => page.evaluate(key => localStorage.getItem(key), KEY);

const steps = [], findings = []; let count = 0, stopped = null;
// One step: what the operator does, what must be true afterwards, and what the monitors saw while it happened.
// `writes` names the saved keys the step may change; drafts kept for recovery and device-local layout always may.
// A step that is not `blocking` records its failure and lets the journey go on.
async function step(id, title, action, { writes = [], detail = '', blocking = true } = {}) {
  if (stopped) return;
  const index = ++count, began = Date.now(), from = clock(), before = await storage();
  emit({ event: 'step_started', step: id, index, title });
  let status = 'passed', error = null, observed = null;
  try { observed = (await action()) ?? null; }
  catch (failure) { status = 'failed'; error = String(failure.message || failure).split('\n').slice(0, 3).join(' | ').slice(0, 500); observed = failure.observed ?? null; }
  await pause(900);
  const after = await storage(), changed = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(key => before[key] !== after[key]);
  const unexpected = changed.filter(key => !writes.includes(key) && !DEVICE_LOCAL.includes(key) && !/draft|recovery/i.test(key));
  const shot = `steps/${String(index).padStart(2, '0')}-${id}.png`; await page.screenshot({ path: join(OUT, shot) }).catch(() => {});
  const monitors = { ...drain(), storageChanged: changed, unexpectedWrites: unexpected, overflow: await overflow() };
  const flags = [...monitors.pageErrors.map(text => `page error: ${text}`), ...monitors.consoleErrors.map(text => `console error: ${text}`), ...monitors.failedRequests.map(text => `request failed: ${text}`), ...monitors.badResponses.map(text => `bad response: ${text}`), ...unexpected.map(key => `unexpected saved key changed: ${key}`), ...(monitors.overflow && (monitors.overflow.x > 0 || monitors.overflow.y > 0) ? [`page scrolls by ${monitors.overflow.x} x ${monitors.overflow.y} px`] : [])];
  if (status === 'passed' && flags.length) status = 'flagged';
  const entry = { step: id, index, title, detail, status, duration_ms: Date.now() - began, film: [from, clock()], observed, flags, monitors, evidence: [{ file: shot, sha256: sha(join(OUT, shot)) }], ...(error ? { error } : {}) };
  emit({ event: 'step_finished', ...entry }); steps.push(entry);
  console.log(`${status.toUpperCase().padEnd(7)} ${String(index).padStart(2, '0')} ${id}${error ? ` :: ${error}` : ''}${flags.length ? ` :: ${flags.join('; ')}` : ''}`);
  if (status === 'failed' && blocking) stopped = id;
}
// Something worth knowing that is not a failed expectation: recorded with the run and listed in the report.
const finding = (id, text) => { findings.push({ id, text }); emit({ event: 'finding', id, text }); console.log(`NOTED   ${id} :: ${text}`); };
const ensure = (condition, message, observed) => { if (!condition) throw Object.assign(Error(message), { observed }); };
// Compared by content: the order of keys in a JSON object carries no meaning.
const canon = value => Array.isArray(value) ? value.map(canon) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canon(value[key])])) : value;
const same = (actual, expected, message) => ensure(JSON.stringify(canon(actual)) === JSON.stringify(canon(expected)), `${message}: expected ${JSON.stringify(expected).slice(0, 300)}, saw ${JSON.stringify(actual).slice(0, 300)}`);
// Typed the way an operator would: select what the field holds, then type over it. Long notes are pasted.
const type = async (locator, text) => {
  await locator.click();
  if (FILM && text.length <= 70) { if (await locator.inputValue()) { await locator.press('ControlOrMeta+A'); await locator.press('Backspace'); } await locator.pressSequentially(text, { delay: 9 }); }
  else await locator.fill(text);
  await pause(160);
};
const choose = async (label, option) => { await page.getByRole('combobox', { name: label, exact: true }).click(); await pause(250); await page.getByRole('listbox', { name: label, exact: true }).getByRole('option', { name: option, exact: true }).click(); await pause(200); };
const download = async (trigger, name) => { const pending = page.waitForEvent('download'); await trigger(); const file = join(OUT, 'exports', name); await (await pending).saveAs(file); return file; };
const panel = name => page.locator(`.console-panel[data-panel=${name}]`);
const cards = name => panel(name).locator('.route-card');
const rail = name => page.locator('[data-sbd-rail-host]').getByText(name, { exact: true }).first();
const diagramMenu = async topic => { await panel('flow').locator('.flow-compact-tools').getByRole('button', { name: /^Diagram/ }).click(); await pause(300); await page.locator('dialog.topic-menu[open]').getByRole('button', { name: topic }).click(); await pause(300); };
const drawnCables = async () => ({ devices: await panel('flow').locator('.react-flow__node').count(), cables: await panel('flow').locator('.react-flow__edge').evaluateAll(nodes => nodes.map(node => (node.getAttribute('aria-label') || '').replace(/^Connection /, '').replace(/:.*$/, ''))) });

// ---------------------------------------------------------------------------------------------- the journey
let deployed = null;
if (live) { try { const response = await context.request.get(`${base}/source.json`); if (response.ok()) { const source = await response.json(); deployed = { commit: source.sourceCommit || null, files: source.files ?? null }; } } catch {} }
emit({ event: 'run_started', base: live ? base : 'local checkout', commit, deployed, film: FILM, case: { source: ['wst/projectors.json', 'wst/stage/plot.json'], referenceUpdated: reference.updated, lanes: LANES.map(lane => lane.lane), plan: PLAN } });
let saved = null;
try {
  await step('open-console', 'Open the AV by Dave console', async () => {
    await page.goto(`${base}/av/`); await page.locator('.suite-app').first().waitFor(); await pause(900);
    ensure(await page.locator('.console-panel').count() === 0, 'the console should open on an empty Workspace view');
    return { url: new URL(page.url()).pathname, savedKeys: Object.keys(await storage()) };
  }, { detail: 'Expect an empty Workspace view and nothing saved.' });

  await step('dismiss-welcome', 'Dismiss the welcome banner', async () => {
    const dismiss = page.getByRole('button', { name: 'Dismiss', exact: true });
    ensure(await dismiss.count() === 1, 'a first visit should show the welcome banner');
    await dismiss.click(); await pause(300);
    ensure(await dismiss.count() === 0, 'the banner should go');
    return { savedKeys: Object.keys(await storage()) };
  }, { writes: ['sbd.avSuite.intro.v1'], detail: 'A first visit shows it; an operator clears it to get the room back.' });

  await step('open-video', 'Choose AV Video on the Rail', async () => {
    await rail('AV Video').click(); await page.locator('.suite-app[data-active-app="video"]').waitFor(); await pause(500);
    ensure(new URL(page.url()).pathname === '/av/', 'the address should stay on /av/');
    ensure(await savedRaw() === null, 'opening Video must not save a plan');
    return { heading: await page.locator('.suite-header h1').textContent(), views: await viewNames(page) };
  }, { detail: 'Expect the same console to switch to Video without saving a plan.' });

  await step('name-plan', 'Name the plan and the venue', async () => {
    await recallPanel(page, 'Project'); await pause(400);
    await type(panel('project').getByLabel('Plan name', { exact: true }), PLAN.name);
    await type(panel('project').getByLabel('Venue', { exact: true }), PLAN.venue);
    await panel('project').getByLabel('Venue', { exact: true }).blur();
    ensure(await savedRaw() === null, 'typing must not save the plan');
    return { planName: await panel('project').getByLabel('Plan name', { exact: true }).inputValue(), venue: await panel('project').getByLabel('Venue', { exact: true }).inputValue() };
  }, { detail: 'Video lead is left empty: the case carries no personal names.' });

  await step('open-projection', 'Open the Projection view', async () => {
    await selectView(page, 'Projection'); await page.getByRole('heading', { name: 'Displays & Projection', exact: true }).waitFor(); await pause(400);
    return { panels: await page.locator('.console-panel').evaluateAll(nodes => nodes.map(node => node.dataset.panel)) };
  });

  for (const lane of LANES) {
    await step(`lane-${lane.lane}`, `Add projection ${lane.record['Screen name']}`, async () => {
      await page.getByRole('button', { name: 'Add projection', exact: true }).click(); await pause(350);
      const editor = page.locator('.display-inspector');
      for (const [label, value] of Object.entries(lane.record)) if (value) await type(editor.getByLabel(label, { exact: true }), value);
      await editor.getByLabel('Destination notes', { exact: true }).blur();
      if (lane.status !== 'planned') await choose('Destination status', lane.status);
      const card = cards('displays').filter({ hasText: lane.record['Screen name'] });
      ensure(await card.count() === 1, 'one destination card should carry this screen name');
      return { card: (await card.innerText()).replace(/\n+/g, ' | '), checks: await editor.locator('.route-checks li').allTextContents(), empty: Object.entries(lane.record).filter(([, value]) => !value).map(([label]) => label) };
    }, { detail: `${lane.record['Projector']} · ${lane.record['Lens']}` });
  }

  await step('open-routing', 'Open the Routing view', async () => {
    await selectView(page, 'Routing'); await panel('flow').waitFor(); await pause(400);
    return { panels: await page.locator('.console-panel').evaluateAll(nodes => nodes.map(node => node.dataset.panel)), patchSays: (await panel('patch').locator('.empty').innerText()).replace(/\n+/g, ' | ') };
  });

  for (const lane of LANES) {
    await step(`route-${lane.lane}`, `Add the signal route ${lane.route['Route name']}`, async () => {
      await diagramMenu(/^Devices/);
      await page.locator('dialog.topic-menu[open]').getByRole('button', { name: 'Add route', exact: true }).click(); await pause(400);
      const editor = panel('inspector');
      for (const label of ['Route name', 'Source', 'Destination']) await type(editor.getByLabel(label, { exact: true }), lane.route[label]);
      await editor.locator('textarea').last().fill(lane.route.notes); await editor.locator('textarea').last().blur(); await pause(300);
      return { routes: await cards('patch').count(), checks: await editor.locator('.route-checks li').allTextContents() };
    }, { detail: 'Format, connector and input stay empty: the reference records the video path as unknown.' });
  }

  await step('diagram', 'Read the signal flow diagram', async () => {
    await panel('flow').locator('.react-flow__controls-fitview').click(); await settle(700);
    await diagramMenu(/^Devices/); await pause(300);
    const says = (await page.locator('dialog.topic-menu[open] p').first().innerText()).trim();
    await closeTopics(page); await pause(600);
    const drawn = await drawnCables(), missing = LANES.map(lane => lane.record['Screen name']).filter(name => !drawn.cables.some(cable => cable.endsWith(`to ${name}`)));
    const observed = { says, drawnDevices: drawn.devices, drawnCables: drawn.cables.length, missingCableTo: missing };
    ensure(says === `${LANES.length + 1} devices · ${LANES.length} connections`, `the diagram should count one shared source, ${LANES.length} destinations and ${LANES.length} connections; it says "${says}"`, observed);
    ensure(drawn.devices === LANES.length + 1 && !missing.length, `the diagram says "${says}" but draws ${drawn.cables.length} cables; none reaches ${missing.join(', ')}`, observed);
    return observed;
  }, { blocking: false, detail: 'One shared playback source should feed four destinations, with a cable to each.' });

  await step('link-routes', 'Link each projection to its signal route', async () => {
    await selectView(page, 'Projection'); await pause(400);
    const linked = [];
    for (const lane of LANES) {
      await cards('displays').filter({ hasText: lane.record['Screen name'] }).click(); await pause(300);
      const hint = await page.locator('.display-inspector .route-link').innerText();
      await choose('Linked route', lane.route['Route name']);
      linked.push({ lane: lane.lane, suggested: /Possible matches/.test(hint), now: await page.locator('.display-inspector .route-link p').first().innerText() });
    }
    ensure(linked.every(row => row.now.includes('→')), 'every projection should show its linked route');
    return linked;
  }, { detail: 'The application may suggest a match by name; it must not link by itself.' });

  await step('trace', 'Trace lane D back through its route', async () => {
    await page.getByRole('button', { name: 'Trace linked route', exact: true }).click(); await pause(700);
    ensure(await page.locator('.console-panel.is-focused[data-panel=flow]').count() === 1, 'tracing should bring Signal Flow forward');
    return { flowFocused: true };
  });

  await step('checks', 'Read the planning checks', async () => {
    await recallPanel(page, /^Checks/); await page.getByRole('heading', { name: 'Planning checks', exact: true }).waitFor(); await pause(500);
    const rows = await panel('checks').locator('.check-list > button').evaluateAll(nodes => nodes.map(node => ({ name: node.querySelector('strong')?.textContent || '', gaps: (node.querySelector('span')?.textContent || '').split(' · ') })));
    const sort = list => [...list].map(row => ({ name: row.name, gaps: [...row.gaps].sort() })).sort((a, b) => a.name.localeCompare(b.name));
    same(sort(rows), sort(expectedChecks), 'the checks should be exactly the unknowns in the reference');
    return { needAttention: rows.length, rows };
  }, { detail: 'Expected: every route lacks format, connector and input; A, B and C lack a throw distance; D carries the reported issue.' });

  await step('save', 'Save the plan', async () => {
    await savePack(page); await page.waitForFunction(key => localStorage.getItem(key) !== null, KEY); await pause(400);
    saved = await savedRaw(); const doc = JSON.parse(saved);
    same([doc.title, doc.meta.venue, doc.displays.length, doc.routes.length], [PLAN.name, PLAN.venue, LANES.length, LANES.length], 'the saved plan');
    ensure(doc.displays.every(row => row.kind === 'projection' && doc.routes.some(route => route.id === row.routeId)), 'every projection should be linked to a saved route');
    writeFileSync(join(OUT, 'exports', 'frozen-projection.saved.json'), saved);
    return { key: KEY, schema: doc.schema, bytes: saved.length, sha256: createHash('sha256').update(saved).digest('hex') };
  }, { writes: [KEY], detail: 'Only the Video plan key may change.' });

  await step('export', 'Export the plan and the destination list', async () => {
    await suiteTopic(page, 'Project'); await pause(300);
    const json = await download(() => page.locator('.suite-header').getByRole('button', { name: 'Export', exact: true }).click(), 'frozen-projection.av-video.json');
    await closeTopics(page);
    same(JSON.parse(readFileSync(json, 'utf8')), JSON.parse(saved), 'the exported plan should equal the saved plan');
    await selectView(page, 'Projection'); await pause(300);
    const csv = await download(() => page.getByRole('button', { name: 'Export CSV', exact: true }).click(), 'frozen-projection.destinations.csv');
    ensure(LANES.every(lane => readFileSync(csv, 'utf8').includes(lane.record['Projector'])), 'the list should name every projector');
    return { files: [json, csv].map(file => ({ file: file.slice(OUT.length + 1), bytes: readFileSync(file).length, sha256: sha(file) })) };
  });

  await step('reload', 'Reload and read the plan back', async () => {
    await page.reload(); await page.locator('.suite-app[data-active-app="video"]').waitFor(); await selectView(page, 'Projection'); await pause(500);
    ensure(await savedRaw() === saved, 'the saved plan should be the same bytes after a reload');
    const names = await cards('displays').locator('strong').allTextContents();
    same(names, LANES.map(lane => lane.record['Screen name']), 'the four lanes after a reload');
    await cards('displays').filter({ hasText: LANES[3].record['Screen name'] }).click(); await pause(400);
    const lensD = await page.locator('.display-inspector').getByLabel('Lens', { exact: true }).inputValue();
    same(lensD, LANES[3].record['Lens'], 'the lens on lane D after a reload');
    await selectView(page, 'Routing'); await panel('flow').locator('.react-flow__node').first().waitFor(); await settle(900);
    const drawn = await drawnCables();
    same([drawn.devices, drawn.cables.length], [LANES.length + 1, LANES.length], 'the diagram after a reload');
    return { lanes: names, lensD, diagramAfterReload: { devices: drawn.devices, cables: drawn.cables.length } };
  }, { detail: 'The plan lives in this browser only.' });

  await step('equipment-lab', 'Find each projector in Equipment Lab', async () => {
    await rail('Equipment Lab').click(); await page.locator('.suite-app[data-active-app="equipment-lab"]').waitFor(); await pause(700);
    const search = page.getByRole('searchbox').first(), found = [];
    const look = async term => { await search.fill(''); await type(search, term); await pause(450); return page.locator('.lab-library .lab-card').evaluateAll(nodes => nodes.map(node => (node.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60))); };
    // First the model as the rig record writes it, then the catalogue spelling: maker dropped, variant letter dropped, hyphenated.
    for (const written of [...new Set(LANES.map(lane => lane.record['Projector']))]) {
      const asWritten = await look(written), spelling = written.replace(/^(Panasonic|Barco)\s+/, '').replace(/U$/, '').replace(' ', '-'), bySpelling = await look(spelling);
      found.push({ written, foundAsWritten: asWritten.length, spelling, entries: bySpelling.length, first: bySpelling[0] || null });
    }
    ensure(found.every(row => row.entries >= 1), `every projector model should have a library entry: ${JSON.stringify(found)}`, found);
    const missed = found.filter(row => !row.foundAsWritten).map(row => `"${row.written}"`);
    if (missed.length) finding('FC-F2', `Equipment Lab finds nothing for ${missed.join(' or ')} as the rig record writes ${missed.length === 1 ? 'it' : 'them'}; the catalogue spelling works.`);
    return found;
  }, { detail: 'Nothing links a projection record to the library yet; this looks each model up by hand.' });
} finally {
  const video = page.video(); await context.close(); await browser.close(); if (server) await server.close();
  const raw = video ? await video.path().catch(() => null) : null;
  if (raw) renameSync(raw, join(OUT, 'film', 'session.webm'));
  for (const file of readdirSync(join(OUT, 'film'))) if (file !== 'session.webm') rmSync(join(OUT, 'film', file), { recursive: true, force: true });
}
const tally = name => steps.filter(entry => entry.status === name).length;
const result = tally('failed') ? 'failed' : tally('flagged') ? 'flagged' : 'passed';
const totals = { steps: steps.length, passed: tally('passed'), flagged: tally('flagged'), failed: tally('failed'), findings: findings.length };
emit({ event: 'run_finished', result, ...totals, stoppedAt: stopped, film_seconds: clock() });
writeFileSync(join(OUT, 'summary.json'), JSON.stringify({ schema: 'system-by-dave.frozen-case.summary.v1', run_id: runId, result, base: live ? base : 'local checkout', commit, deployed, film: FILM, referenceUpdated: reference.updated, totals, expectedChecks, findings, steps }, null, 1));
console.log(`${result === 'failed' ? 'FAIL' : 'PASS'} frozen case: ${live ? base : 'local checkout'}, ${totals.steps} steps, ${totals.passed} passed, ${totals.flagged} flagged, ${totals.failed} failed, ${totals.findings} noted. Record: ${OUT}`);
process.exit(result === 'failed' ? 1 : 0);
