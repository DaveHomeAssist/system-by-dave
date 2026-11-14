// Frozen case: the Frozen rig built into the AV by Dave console through its own controls, the way an operator
// would. Every step is journalled, photographed, filmed and monitored.
//   Stage 1  the four projection lanes in AV Video, and each projector looked up in Equipment Lab
//   Stage 2  each lane's lens and throw in Throwline, against its plotted coverage
// Brief, record format and findings: docs/frozen-case.md.
//
//   node scripts/probe_frozen_case.mjs [outdir] [--film] [--stage N]
//     outdir                 where the record is written (default: FROZEN_CASE_OUT, else a folder in the temp directory)
//     --film                 operator pace, so the session film can be watched (scripts/frozen_case_film.py captions it)
//     --stage N              run one stage on its own; the stages do not depend on each other's saved data
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
const ONLY = args.includes('--stage') ? Number(args[args.indexOf('--stage') + 1]) : 0;
const OUT = resolve(args.find((arg, index) => !arg.startsWith('--') && args[index - 1] !== '--stage') || process.env.FROZEN_CASE_OUT || join(tmpdir(), 'frozen-case'));
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

// Stage 2: what each lane throws. Sizes are whole inches from the plot; a ratio comes from the lane record when it
// writes one, otherwise from the first lens the lane names that carries a ratio for the projector's raster.
const plotted = lane => { const m = plot.views.front.lanes[lane].note.match(/(\d+)′\s*(\d+)″\s*×\s*(\d+)′\s*(\d+)″/); assert.ok(m, `lane ${lane} has no plotted size`); return { w: m[1] * 12 + Number(m[2]), h: m[3] * 12 + Number(m[4]) }; };
const RANGE = /(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)\s*:\s*1/;
const THROWS = reference.projectors.map(row => {
  const raster = (catalog[row.referenceIds[0]].facts.find(fact => /raster/i.test(fact.label)) || {}).value || '';
  const imager = /1280\s*×\s*800/.test(raster) ? 'WXGA' : /1920\s*×\s*1200/.test(raster) ? 'WUXGA' : '';
  const size = plotted(row.lane), portrait = row.orientation === 'Portrait', written = row.lens.match(RANGE);
  let ratio = written ? [Number(written[1]), Number(written[2])] : null, ratioFrom = written ? 'the lane record' : '';
  for (const id of ratio ? [] : row.referenceIds.slice(1)) {
    const item = catalog[id], fact = item && imager && item.facts.find(entry => entry.label.includes(imager) && RANGE.test(entry.value));
    if (fact) { const m = fact.value.match(RANGE); ratio = [Number(m[1]), Number(m[2])]; ratioFrom = `${item.name}, ${fact.label}`; break; }
  }
  const told = (row.throwDistance || '').match(/(\d+(?:\.\d+)?)(?:\s*[–-]\s*(\d+(?:\.\d+)?))?\s*ft/);
  // The ratio is measured across the imager's long side. A projector on its side throws that side up the wall.
  return { lane: row.lane, job: `Frozen · lane ${row.lane}`, model: row.model, lens: row.lens, portrait, size, basis: portrait ? size.h : size.w, across: portrait ? size.w : size.h,
    ratio, ratioFrom, recorded: told ? [Number(told[1]), Number(told[2] || told[1])] : null, position: plot.views.plan.lanes[row.lane].note.split(';')[0].trim() };
});
const feet = total => `${Math.floor(total / 12)}' ${Math.round(total % 12)}"`;
const PARTS = { '¼': 0.25, '½': 0.5, '¾': 0.75, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 };
const toInches = text => { const m = String(text).match(/(\d+)'\s*(\d+)?([¼½¾⅛⅜⅝⅞])?/); return m ? m[1] * 12 + Number(m[2] || 0) + (PARTS[m[3]] || 0) : NaN; };
const SHOW = 'Frozen · projection';

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

const steps = [], findings = []; let count = 0, stopped = null, stage = 0;
// One step: what the operator does, what must be true afterwards, and what the monitors saw while it happened.
// `writes` names the saved keys the step may change; drafts kept for recovery and device-local layout always may.
// A step that is not `blocking` records its failure and lets the journey go on. `scrolls` marks a page that
// scrolls by design, where a scrolling document is not a fault.
async function step(id, title, action, { writes = [], detail = '', blocking = true, scrolls = false } = {}) {
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
  const flags = [...monitors.pageErrors.map(text => `page error: ${text}`), ...monitors.consoleErrors.map(text => `console error: ${text}`), ...monitors.failedRequests.map(text => `request failed: ${text}`), ...monitors.badResponses.map(text => `bad response: ${text}`), ...unexpected.map(key => `unexpected saved key changed: ${key}`), ...(!scrolls && monitors.overflow && (monitors.overflow.x > 0 || monitors.overflow.y > 0) ? [`page scrolls by ${monitors.overflow.x} x ${monitors.overflow.y} px`] : [])];
  if (status === 'passed' && flags.length) status = 'flagged';
  const entry = { stage, step: id, index, title, detail, status, duration_ms: Date.now() - began, film: [from, clock()], observed, flags, monitors, evidence: [{ file: shot, sha256: sha(join(OUT, shot)) }], ...(error ? { error } : {}) };
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
async function stageOne() {
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
}

// ---------------------------------------------------------------------------------------------- stage 2
// Throwline. The console shows it as a panel; exact ratios are entered in its planner page, which keeps a show
// board and saved jobs of its own. The planner page scrolls by design.
const planner = {
  tab: async id => { await page.locator(`#${id}`).click(); await settle(150); await pause(200); },
  set: async (id, value) => { const field = page.locator(`#${id}`); await type(field, value); await field.press('Enter'); await field.blur(); await settle(120); },
  // The hand-off card is the planner's own summary of the job; wait for it to carry this job before reading.
  card: async job => { await planner.tab('result-tab-handoff'); const card = page.locator('#result-panel-handoff'); await card.filter({ hasText: job }).waitFor(); await settle(150); return card.innerText(); },
  warnings: async () => {
    await planner.tab('result-tab-warnings'); await page.locator('#result-panel-warnings').filter({ hasText: /good to know|check before|fix before/i }).waitFor(); await settle(150);
    const lines = (await page.locator('#result-panel-warnings').innerText()).split('\n').map(line => line.trim()).filter(Boolean), found = { fix: [], check: [], note: [] }; let into = null;
    for (const line of lines) { if (/^fix before/i.test(line)) into = 'fix'; else if (/^check before/i.test(line)) into = 'check'; else if (/^good to know/i.test(line)) into = 'note'; else if (into && !/^\d+$/.test(line)) found[into].push(line); }
    return found;
  },
  read: text => {
    const throwLine = text.match(/Throw\s+(.+?) closest → (.+?) farthest/), mark = text.match(/(Set|Plan) mark\s+(.+?) screen → optical origin · (.+)/), comfort = text.match(/Comfort zone\s+(.+?) → (.+?) ·/);
    return { closest: throwLine && throwLine[1].trim(), farthest: throwLine && throwLine[2].trim(), comfort: comfort && [comfort[1].trim(), comfort[2].trim()], mark: mark && mark[2].trim(), verdict: mark && mark[3].trim() };
  },
  // Screen, ratio and picture shape for one lane. `turned` enters a portrait picture on its side.
  enter: async (lane, { turned = lane.portrait, job = lane.job } = {}) => {
    await planner.tab('setup-tab-screen'); await planner.set('job', job);
    await page.locator('#sasp').selectOption({ label: 'Free' });
    await planner.set('sw', feet(turned ? lane.basis : lane.size.w)); await planner.set('sh', feet(turned ? lane.across : lane.size.h));
    await planner.tab('setup-tab-optics');
    await page.locator('#lens').selectOption({ index: 0 }); await planner.set('trmin', String(lane.ratio[0])); await planner.set('trmax', String(lane.ratio[1]));
    const shape = await page.locator('#raster option').evaluateAll(options => options.find(option => option.textContent.trim().startsWith('16:10'))?.value);
    await page.locator('#raster').selectOption(shape); await pause(200);
  },
};
const THROWLINE_KEYS = ['throwline:jobs:v2', 'throwline:show:v1'];
const plannedThrows = {};

async function stageTwo() {
  await step('throwline-panel', 'Open Throwline in the console', async () => {
    if (new URL(page.url()).pathname !== '/av/') { await page.goto(`${base}/av/`); await page.locator('.suite-app').first().waitFor(); const dismiss = page.getByRole('button', { name: 'Dismiss', exact: true }); if (await dismiss.count()) await dismiss.click(); }
    await page.locator('.sbd-rail__all').click(); await page.locator('#sbdRailAllApps').waitFor({ state: 'visible' }); await pause(400);
    await page.locator('#sbdRailAllApps [data-rail-ref="tool:throwline"]').click();
    await page.waitForFunction(() => document.querySelector('.suite-header h1')?.textContent === 'Throwline');
    const frame = page.locator('.console-panel iframe'); await frame.waitFor();
    const source = new URL(await frame.getAttribute('src'), base);
    ensure(new URL(page.url()).pathname === '/av/', 'Throwline should open inside the console');
    ensure(source.pathname === '/ProjectorThrow/' && source.searchParams.get('sbdEmbed') === 'panel', `the panel should hold Throwline without its page chrome; it holds ${source.pathname}${source.search}`);
    const inside = page.frameLocator('.console-panel iframe');
    await inside.locator('html[data-sbd-embed="panel"]').waitFor(); await inside.locator('three-d-stage').waitFor(); await pause(900);
    return { panel: `${source.pathname}${source.search}`, page: await inside.locator('title').textContent().catch(() => null), lensChoices: await inside.locator('#lens option').allTextContents(), openFull: new URL(await page.locator('.suite-app-open').getAttribute('href'), base).pathname };
  }, { writes: ['sbd.avSuite.intro.v1'], detail: 'The panel shows Stage 3D, which offers five preset ratio ranges and no typed ratio.' });

  await step('throwline-planner', 'Open the Throwline planner', async () => {
    await page.goto(new URL(await page.locator('.suite-app-open').getAttribute('href'), `${base}/av/`).href);
    await page.locator('three-d-stage').waitFor(); await pause(700);
    const welcome = page.locator('#onboardingExplore'), welcomed = await welcome.isVisible().catch(() => false);
    if (welcomed) { await welcome.click(); await pause(300); }
    await page.getByRole('link', { name: 'Planner', exact: true }).click();
    await page.locator('#setup-tab-screen').waitFor(); await pause(600);
    ensure(new URL(page.url()).searchParams.get('workspace') === 'planner', 'the Planner link should open the planner page');
    return { welcomed, planner: `${new URL(page.url()).pathname}?workspace=planner` };
  }, { writes: ['throwline:stage-onboarding:v1'], scrolls: true, detail: 'Open full lands on Stage 3D; exact ratios are typed in the planner, one link further.' });

  await step('throwline-catalog', 'Look for the Frozen projectors and lenses in Throwline', async () => {
    await planner.tab('setup-tab-optics');
    const plain = text => text.toLowerCase().replace(/[^a-z0-9]/g, '');
    const audited = (await page.locator('#catalogProjector option').allTextContents()).slice(1).map(text => text.trim());
    const models = [...new Set(THROWS.map(lane => lane.model))], lensNames = [...new Set(reference.catalog.filter(item => /^lens/i.test(item.category)).map(item => item.name.replace(/^(Panasonic|Barco)\s+/, '')).filter(name => /^[A-Z]{2}-/.test(name)))];
    const inAudited = models.filter(model => audited.some(entry => plain(entry).includes(plain(model.replace(/^(Panasonic|Barco)\s+/, '').replace(/U$/, '')))));
    // The older list: which families name a Frozen model, and what ratio it shows for each Frozen lens.
    const families = await page.locator('#family option').evaluateAll(options => options.map(option => ({ value: option.value, text: option.textContent.trim() }))), first = await page.locator('#family').inputValue(), listed = {};
    for (const family of families) {
      await page.locator('#family').selectOption(family.value); await settle(60);
      for (const text of await page.locator('#lens option').allTextContents()) for (const name of lensNames) if (plain(text).includes(plain(name))) (listed[name] = listed[name] || new Set()).add((text.match(RANGE) || [text.trim()])[0].replace(/\s/g, ''));
    }
    await page.locator('#family').selectOption(first); await pause(300);
    const named = Object.fromEntries(models.map(model => { const key = plain(model.replace(/^(Panasonic|Barco)\s+/, '').replace(/U$/, '').replace(/\s?4K22$/i, '')); return [model, families.filter(family => plain(family.text).includes(key)).map(family => family.text)]; }));
    const observed = { auditedModels: audited, frozenModelsAudited: inAudited, familiesNamingModel: named, olderListRatios: Object.fromEntries(Object.entries(listed).map(([name, set]) => [name, [...set]])), portraitControl: /portrait|rotat/i.test(await page.locator('body').innerText()) };
    if (!inAudited.length) finding('FC-F3', `Throwline's audited catalog holds none of the Frozen projectors (${models.join(', ')}). Every lane is planned from a ratio typed by hand and reads as a manual estimate.`);
    for (const lane of THROWS.filter(entry => entry.ratioFrom === 'the lane record')) {
      const name = lensNames.find(lensName => plain(lane.lens).includes(plain(lensName))), shown = name && observed.olderListRatios[name], wrote = `${lane.ratio[0].toFixed(3)}–${lane.ratio[1].toFixed(3)}:1`;
      if (shown && !shown.includes(wrote) && !findings.some(entry => entry.id === 'FC-F4')) finding('FC-F4', `Throwline's older lens list shows ${name} at ${shown.join(' or ')}. The lane record gives ${lane.ratio[0]}–${lane.ratio[1]}:1 for the ${lane.model}. Picking the lens by name plans a different throw.`);
    }
    return observed;
  }, { scrolls: true, detail: 'The audited catalog, then the older family and lens lists.' });

  for (const lane of THROWS) {
    await step(`throw-${lane.lane}`, `Plan lane ${lane.lane} in Throwline`, async () => {
      ensure(lane.ratio, `the reference gives no throw ratio for lane ${lane.lane}`);
      await planner.enter(lane);
      await planner.tab('setup-tab-placement');
      const want = { closest: lane.ratio[0] * lane.basis, farthest: lane.ratio[1] * lane.basis }, recorded = [];
      for (const told of lane.recorded ? [...new Set(lane.recorded)] : []) {
        await planner.set('dist', feet(told * 12));
        const at = planner.read(await planner.card(lane.job)), inside = told * 12 >= want.closest * 1.05 && told * 12 <= want.farthest * 0.95;
        recorded.push({ throw: `${told} ft`, mark: at.mark, verdict: at.verdict, insideComfortZone: inside });
        ensure(!inside || /good/i.test(at.verdict || ''), `lane ${lane.lane} at ${told} ft is inside the lens's comfort zone by arithmetic; the planner says "${at.verdict}"`, recorded);
        await planner.tab('setup-tab-placement');
      }
      await planner.set('dist', lane.recorded ? feet((lane.recorded[0] + lane.recorded[1]) * 6) : '');
      const card = await planner.card(lane.job), got = planner.read(card), warnings = await planner.warnings();
      const observed = { entered: { width: feet(lane.basis), height: feet(lane.across), turnedOnItsSide: lane.portrait }, ratio: lane.ratio, ratioFrom: lane.ratioFrom, throw: { closest: got.closest, farthest: got.farthest }, comfortZone: got.comfort, mark: got.mark, verdict: got.verdict, recorded, warnings };
      ensure(Math.abs(toInches(got.closest) - want.closest) <= 0.3 && Math.abs(toInches(got.farthest) - want.farthest) <= 0.3, `lane ${lane.lane}: ${lane.ratio[0]}–${lane.ratio[1]} across ${feet(lane.basis)} is ${feet(want.closest)} to ${feet(want.farthest)}; the planner says ${got.closest} to ${got.farthest}`, observed);
      plannedThrows[lane.lane] = { ...want, warnings };
      await planner.tab('result-tab-show'); await page.locator('#showAdd').click(); await pause(300);
      await planner.tab('setup-tab-jobs'); await page.locator('#saveJob').click(); await pause(300);
      return observed;
    }, { writes: THROWLINE_KEYS, scrolls: true, detail: `${lane.model} · ${lane.ratio ? `${lane.ratio[0]}–${lane.ratio[1]}:1` : 'no ratio on record'} · ${lane.portrait ? 'portrait, entered on its side' : 'landscape'}${lane.recorded ? ` · recorded throw ${lane.recorded[0]}–${lane.recorded[1]} ft` : ' · no throw on record'}` });
  }

  const upright = THROWS.find(lane => lane.portrait && lane.recorded) || THROWS.find(lane => lane.portrait);
  if (upright) await step('throw-upright', `Enter lane ${upright.lane} as plotted, upright`, async () => {
    const hasControl = /portrait|rotat/i.test(await page.locator('body').innerText());
    await planner.enter(upright, { turned: false, job: `${upright.job} · as plotted` });
    await planner.tab('setup-tab-placement'); await planner.set('dist', upright.recorded ? feet((upright.recorded[0] + upright.recorded[1]) * 6) : '');
    const got = planner.read(await planner.card(`${upright.job} · as plotted`));
    const observed = { entered: { width: feet(upright.size.w), height: feet(upright.size.h) }, throw: { closest: got.closest, farthest: got.farthest }, mark: got.mark, verdict: got.verdict, portraitControl: hasControl, onItsSide: { closest: feet(plannedThrows[upright.lane]?.closest ?? upright.ratio[0] * upright.basis), farthest: feet(plannedThrows[upright.lane]?.farthest ?? upright.ratio[1] * upright.basis) } };
    if (!hasControl && Math.abs(toInches(got.closest) - upright.ratio[0] * upright.basis) > 6) finding('FC-F5', `Throwline has no portrait mounting. Entered as plotted (${feet(upright.size.w)} wide by ${feet(upright.size.h)} high), lane ${upright.lane} reads ${got.closest} to ${got.farthest}${upright.recorded ? ` and calls the recorded ${upright.recorded[0]}–${upright.recorded[1]} ft "${got.verdict}"` : ''}. It reads ${observed.onItsSide.closest} to ${observed.onItsSide.farthest} only when the picture is entered on its side.`);
    return observed;
  }, { scrolls: true, detail: 'Two of the four lanes are portrait. This is what the planner says when one is entered the way it is drawn.' });

  await step('show-board', 'Name the show board and export it', async () => {
    await planner.tab('result-tab-show');
    await type(page.locator('#showName'), SHOW); await page.locator('#showName').blur(); await pause(300);
    const rows = await page.locator('#showOut .board-row').evaluateAll(nodes => nodes.map(node => ({ name: node.querySelector('.board-title')?.lastChild?.textContent.trim() || '', badge: node.querySelector('.badge')?.textContent.trim() || '', mark: (node.querySelectorAll('.board-meta')[1]?.innerText || '').split('\n')[0] })));
    same(rows.map(row => row.name), THROWS.map(lane => lane.job), 'the outputs on the show board');
    const file = await download(() => page.locator('#showExport').click(), 'frozen-throwline-show.json'), show = JSON.parse(readFileSync(file, 'utf8')).show;
    same(show.outputs.map(output => [output.name, output.state.trA, output.state.trB, output.state.w, output.state.h]), THROWS.map(lane => [lane.job, lane.ratio[0], lane.ratio[1], lane.basis, lane.across]), 'the exported show');
    const stopped = rows.filter(row => /stop/i.test(row.badge)).map(row => row.name.replace('Frozen · ', '')), zone = THROWS.filter(lane => (plannedThrows[lane.lane]?.warnings.fix || []).some(text => /placement zone you entered/i.test(text))).map(lane => `lane ${lane.lane}`);
    await planner.tab('setup-tab-solver');
    const solverZone = [await page.locator('#solverNear').inputValue(), await page.locator('#solverFar').inputValue()];
    if (zone.length) finding('FC-F6', `Throwline marks ${zone.join(' and ')} "Fix before you hang it: no projector and lens in the catalog can reach the placement zone you entered"${stopped.length ? ', and the show board shows STOP' : ''}. No zone was entered: the solver's default ${solverZone[0]} to ${solverZone[1]} zone raises it.`);
    return { show: show.name, rows, solverZone, file: { file: file.slice(OUT.length + 1), bytes: readFileSync(file).length, sha256: sha(file) } };
  }, { writes: THROWLINE_KEYS, scrolls: true, detail: 'Four outputs, one per lane, in drawing order.' });

  // What the records imply together, where the reference gives one lane a throw and puts the others beside it.
  const anchor = THROWS.find(lane => lane.recorded);
  if (anchor) {
    const beside = THROWS.filter(lane => lane !== anchor && !lane.recorded && lane.ratio && lane.position === anchor.position);
    const over = beside.map(lane => ({ lane, narrowest: anchor.recorded[0] * 12 / lane.ratio[1], widest: anchor.recorded[1] * 12 / lane.ratio[0] })).filter(row => row.narrowest > row.lane.basis * 1.05);
    if (over.length) finding('FC-R1', `Records, not the application: at lane ${anchor.lane}'s recorded ${anchor.recorded[0]}–${anchor.recorded[1]} ft, ${over.map(row => `lane ${row.lane.lane} (${row.lane.ratio[0]}–${row.lane.ratio[1]}:1 from ${row.lane.ratioFrom}) would throw ${feet(row.narrowest)} to ${feet(row.widest)} across a plotted ${feet(row.lane.basis)}`).join('; ')}. All are plotted at "${anchor.position}". Either they sit closer, or their rasters overfill the plotted coverage; the reference has no throw for them.`);
  }

  await step('throwline-reload', 'Reload the planner and read the jobs back', async () => {
    const before = await storage();
    await page.reload(); await page.locator('#setup-tab-screen').waitFor(); await pause(600);
    await planner.tab('setup-tab-jobs'); await page.locator('#setup-panel-jobs').filter({ hasText: THROWS[0].job }).waitFor(); await settle(200);
    const jobs = await page.locator('#setup-panel-jobs').innerText();
    ensure(THROWS.every(lane => jobs.includes(lane.job)), 'every lane should still be a saved job after a reload');
    await planner.tab('result-tab-show');
    same(await page.locator('#showOut .board-row .board-title').evaluateAll(nodes => nodes.map(node => node.lastChild.textContent.trim())), THROWS.map(lane => lane.job), 'the show board after a reload');
    same(await page.locator('#showName').inputValue(), SHOW, 'the show name after a reload');
    const after = await storage();
    return { savedJobs: THROWS.length, outputs: THROWS.length, sameBytes: THROWLINE_KEYS.every(key => before[key] === after[key]) };
  }, { writes: THROWLINE_KEYS, scrolls: true, detail: 'Jobs and the show board live in this browser only.' });

  const sent = anchor || THROWS[THROWS.length - 1];
  await step('stage-3d', `Send lane ${sent.lane} to Stage 3D`, async () => {
    await planner.tab('result-tab-show');
    await page.locator('#showOut .board-row').filter({ hasText: sent.job }).locator('button[data-output-load]').first().click(); await pause(500);
    const link = new URL(await page.locator('#stage3dLink').getAttribute('href'), page.url());
    await page.locator('#stage3dLink').click(); await page.locator('three-d-stage').waitFor(); await pause(900);
    const welcome = page.locator('#onboardingExplore'); if (await welcome.isVisible().catch(() => false)) { await welcome.click(); await pause(300); }
    await settle(1200);
    const params = new URL(page.url()).searchParams, strip = (await page.locator('[class*=flight]').first().innerText()).replace(/\s+/g, ' ').trim(), badge = (await page.locator('#provenanceBadge').innerText()).trim(), line = (await page.locator('.provenance-line').first().innerText()).replace(/\s+/g, ' ').trim();
    const observed = { sent: link.search, ratio: [Number(params.get('min')), Number(params.get('max'))], distanceFeet: Number(params.get('dist')), screenFeet: Number(params.get('w')), provenance: badge, verdict: line, strip };
    same(observed.ratio, sent.ratio, 'the ratio Stage 3D received');
    ensure(Math.abs(observed.screenFeet * 12 - sent.basis) < 0.05, `Stage 3D should receive a ${feet(sent.basis)} screen; it received ${observed.screenFeet} ft`, observed);
    ensure(/manual/i.test(badge), `a typed ratio should arrive as a manual estimate; the badge says "${badge}"`, observed);
    ensure(strip.includes(feet(sent.basis)), `the Stage 3D strip should show a ${feet(sent.basis)} screen; it shows "${strip}"`, observed);
    return observed;
  }, { writes: ['throwline:stage-onboarding:v1'], detail: 'The typed ratio must arrive as a manual estimate, never as verified.' });
}

const STAGES = [{ n: 1, title: 'Projection lanes in AV Video', run: stageOne }, { n: 2, title: 'Lens and throw in Throwline', run: stageTwo }].filter(entry => !ONLY || entry.n === ONLY);
assert.ok(STAGES.length, `no stage ${ONLY}`);
try {
  for (const entry of STAGES) { stage = entry.n; emit({ event: 'stage_started', stage: entry.n, title: entry.title }); await entry.run(); }
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
writeFileSync(join(OUT, 'summary.json'), JSON.stringify({ schema: 'system-by-dave.frozen-case.summary.v1', run_id: runId, result, stages: STAGES.map(entry => ({ n: entry.n, title: entry.title })), base: live ? base : 'local checkout', commit, deployed, film: FILM, referenceUpdated: reference.updated, totals, expectedChecks, findings, steps }, null, 1));
console.log(`${result === 'failed' ? 'FAIL' : 'PASS'} frozen case: ${live ? base : 'local checkout'}, ${totals.steps} steps, ${totals.passed} passed, ${totals.flagged} flagged, ${totals.failed} failed, ${totals.findings} noted. Record: ${OUT}`);
process.exit(result === 'failed' ? 1 : 0);
