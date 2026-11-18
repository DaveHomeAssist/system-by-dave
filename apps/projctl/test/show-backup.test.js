// Show backup page: what counts as a reading, what the strip may claim, how the page is served,
// and what its source is allowed to contain. Simulator only; nothing here reaches a projector.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { startRelay, until } from './relay-helper.js';
import { createConnectionMonitor } from '../public/projector-connection.js';
import { laneViews, buildChecks, verdictOf, snapshotText, smsHref, alarmSummary, STATE_WORDS } from '../public/show-model.js';
import { cleanLink, readCrewLinks } from '../server/crew-links.js';

const NOW = Date.parse('2026-11-18T19:00:00Z');
const ago = ms => new Date(NOW - ms).toISOString();
const QUIET = { fan: 0, lamp: 0, temp: 0, cover: 0, filter: 0, other: 0 };
function projector(slot, lane, status = {}, connection = {}) {
  return { slot, lane, driver: 'simulator', ip: 'sim', model: `Model ${lane}`, controlRevision: lane.toLowerCase().repeat(64),
    status: { power: 'on', shutter: 'open', errors: QUIET, online: true, updatedAt: ago(2000), ...status,
      connection: { state: 'online', lastSuccessAt: ago(2000), ...connection } } };
}
// The normal show state: the relay still holds an old ON reading for A and D but cannot reach them.
const held = (slot, lane) => projector(slot, lane, { online: false }, { state: 'reconnecting', lastSuccessAt: ago(9 * 3600000) });
const showRig = () => ({ type: 'snapshot', lock: true, simulation: false, relay: { startedAt: ago(10 * 3600000), pollIntervalMs: 5000 },
  projectors: [held('P1', 'A'), projector('P2', 'B'), projector('P3', 'C'), held('P4', 'D')] });
const up = { connected: true, everConnected: true, lastMessageAt: NOW - 1000, startedAt: ago(10 * 3600000) };
const views = (snapshot, relay = up) => laneViews(snapshot, { relayConnected: relay.connected, everConnected: relay.everConnected, monitor: createConnectionMonitor(), now: NOW });
const byLane = list => Object.fromEntries(list.map(view => [view.lane, view]));
const displayReport = (count, extra = {}) => ({ status: 'ok', data: { scope: 'relay-computer', state: 'reported', collectedAt: ago(20000), reason: null,
  displays: Array.from({ length: count }, (_, i) => ({ id: `display-${i + 1}`, name: `Display ${i + 1}`, online: true, main: i === 0, mirror: false })), ...extra } });
const check = (list, id) => list.find(item => item.id === id);

test('a lane the relay has not reached reads "check by eye", never its last known state', () => {
  const lanes = byLane(views(showRig()));
  for (const lane of ['A', 'D']) {
    assert.equal(lanes[lane].reach, 'unreached');
    assert.equal(lanes[lane].headline, 'CHECK BY EYE');
    assert.equal(lanes[lane].power, null, 'the old ON reading is not carried forward');
    assert.equal(lanes[lane].lit, false);
    assert.match(lanes[lane].freshText, /^Last reply \d+:\d\d [AP]M$/);
    assert.deepEqual([lanes[lane].move.enabled, lanes[lane].move.reason], [false, "Relay can't reach it. Use the remote."]);
  }
  for (const lane of ['B', 'C']) {
    assert.deepEqual([lanes[lane].reach, lanes[lane].headline, lanes[lane].shutterText, lanes[lane].tone], ['live', 'ON', 'Shutter OPEN', 'ok']);
    assert.equal(lanes[lane].freshText, 'Reply 2s ago');
    assert.deepEqual(lanes[lane].move, { arg: 1, verb: 'Close', label: 'Close shutter', enabled: true, reason: '' });
  }
});

test('a stale reply, a missing lane and a lost relay all stop being readings', () => {
  const rig = showRig();
  rig.projectors[1] = projector('P2', 'B', {}, { lastSuccessAt: ago(40000) }); // still "online", but 40 s old
  rig.projectors[2].lane = '';                                                 // nothing assigned to C
  const lanes = byLane(views(rig));
  assert.deepEqual([lanes.B.reach, lanes.B.headline, lanes.B.move.enabled], ['stale', 'CHECK BY EYE', false]);
  assert.equal(lanes.B.freshText, 'Last reply 40s ago');
  assert.deepEqual([lanes.C.reach, lanes.C.slot, lanes.C.move.enabled], ['unassigned', null, false]);

  const lost = { ...up, connected: false };
  for (const view of views(showRig(), lost)) assert.deepEqual([view.reach, view.headline, view.move.enabled], ['relay-offline', 'CHECK BY EYE', false]);
  for (const view of views(null, { connected: false, everConnected: false })) assert.deepEqual([view.reach, view.headline, view.tone], ['connecting', 'CONNECTING', 'off']);
});

test('a shutter move is offered only on a current ON reading, in the direction the reading allows', () => {
  const rig = showRig();
  rig.projectors[1] = projector('P2', 'B', { shutter: 'closed' });
  rig.projectors[2] = projector('P3', 'C', { shutter: 'unknown' });
  let lanes = byLane(views(rig));
  assert.deepEqual([lanes.B.move.arg, lanes.B.move.label, lanes.B.move.enabled], [0, 'Open shutter', true]);
  assert.equal(lanes.B.shutterText, 'Shutter CLOSED · dark on stage');
  assert.deepEqual([lanes.C.move.arg, lanes.C.move.enabled, lanes.C.move.reason], [1, true, 'Position not reported. Close is available.']);
  for (const power of ['off', 'warming', 'cooling']) {
    rig.projectors[1] = projector('P2', 'B', { power });
    lanes = byLane(views(rig));
    assert.deepEqual([lanes.B.headline, lanes.B.tone, lanes.B.move.enabled], [power.toUpperCase(), 'attention', false]);
    assert.equal(lanes.B.move.reason, `Reports ${power.toUpperCase()}, so no shutter move.`);
  }
});

test('the strip states only what the relay can vouch for', () => {
  const lanes = views(showRig());
  let checks = buildChecks({ lanes, relay: up, displays: displayReport(5), now: NOW });
  assert.deepEqual(checks.map(item => item.id), ['lanes', 'outputs', 'cues', 'computer']);
  assert.deepEqual([check(checks, 'lanes').state, check(checks, 'lanes').value, check(checks, 'lanes').note], ['eye', '2 of 4 lit', 'A and D: check by eye']);
  assert.deepEqual([check(checks, 'outputs').state, check(checks, 'outputs').value], ['ok', '4 outputs + main']);
  assert.match(check(checks, 'outputs').note, /^Windows not reported · read 20s ago$/);
  assert.deepEqual([check(checks, 'cues').state, check(checks, 'cues').value], ['off', 'Not connected']);
  assert.deepEqual([check(checks, 'computer').state, check(checks, 'computer').value], ['ok', 'Answering']);
  assert.match(check(checks, 'computer').note, /lock screen not reported/);
  for (const item of checks) { assert.ok(item.detail.length && item.cannot.length, `${item.id} says what it cannot tell`); assert.ok(STATE_WORDS[item.state]); }
  // The cue link is never readable today, so the page can never call the whole rig good.
  assert.deepEqual([verdictOf(checks, up).state, verdictOf(checks, up).title], ['eye', 'Nothing wrong reported']);

  const outputs = displays => check(buildChecks({ lanes, relay: up, displays, now: NOW }), 'outputs');
  assert.deepEqual([outputs(displayReport(4)).state, outputs(displayReport(4)).value], ['attention', '3 of 4 outputs']);
  assert.deepEqual([outputs(displayReport(5, { collectedAt: ago(300000) })).state, outputs(displayReport(5, { collectedAt: ago(300000) })).value], ['eye', 'Stale']);
  const noMain = displayReport(5); noMain.data.displays[0].main = null;
  assert.deepEqual([outputs(noMain).state, outputs(noMain).note], ['eye', 'Main display not identified']);
  const mirrored = displayReport(5); mirrored.data.displays[4].mirror = true;
  assert.equal(outputs(mirrored).state, 'attention', 'a mirrored display is not an output of its own');
  assert.deepEqual([outputs({ status: 'ok', data: { scope: 'relay-computer', state: 'simulation', displays: [] } }).state, outputs({ status: 'ok', data: { scope: 'relay-computer', state: 'simulation', displays: [] } }).value], ['off', 'Not read']);
  assert.equal(outputs({ status: 'error', error: 'Display report failed' }).state, 'off');
  assert.equal(outputs({ status: 'loading' }).value, 'Reading');

  const lost = { ...up, connected: false };
  checks = buildChecks({ lanes: views(showRig(), lost), relay: lost, displays: displayReport(5), now: NOW });
  assert.deepEqual(checks.map(item => item.state), ['eye', 'off', 'off', 'attention'], 'a lost relay leaves an old display report unread');
  assert.equal(verdictOf(checks, lost).state, 'attention');
  assert.equal(verdictOf(checks, { connected: false, everConnected: false }).title, 'Connecting');
});

test('a dark or alarmed lane is attention, and alarms never read as "OK"', () => {
  assert.equal(alarmSummary(QUIET), null);
  assert.deepEqual(alarmSummary({ ...QUIET, filter: 1, lamp: 2 }), { level: 'error', text: 'Lamp error, filter warning' });
  const rig = showRig();
  rig.projectors[1] = projector('P2', 'B', { errors: { ...QUIET, lamp: 2 } });
  rig.projectors[2] = projector('P3', 'C', { power: 'off' });
  const lanes = views(rig), map = byLane(lanes);
  assert.deepEqual([map.B.tone, map.B.alarm.text, map.B.alarmsReported], ['attention', 'Lamp error', true]);
  const lanesCheck = check(buildChecks({ lanes, relay: up, displays: displayReport(5), now: NOW }), 'lanes');
  assert.deepEqual([lanesCheck.state, lanesCheck.value, lanesCheck.note], ['attention', '1 of 4 lit', 'B lamp error · C reports OFF · A and D by eye']);
});

test('the snapshot is plain text with ages and stated gaps, and carries no number', () => {
  const lanes = views(showRig());
  const checks = buildChecks({ lanes, relay: up, displays: displayReport(5), now: NOW });
  const text = snapshotText({ lanes, checks, verdict: verdictOf(checks, up), lock: true, simulation: true, relay: up, now: NOW,
    lastMove: { lane: 'B', verb: 'Close', at: NOW - 60000, outcome: 'projector reported closed' } });
  const lines = text.split('\n');
  assert.match(lines[0], /^Projection snapshot, Wed, Nov 18, 2:00:00 PM EST \(SIMULATION, not the real rig\)$/);
  assert.equal(lines[1], 'Nothing wrong reported: 2 of 4 need your eyes: lanes lit and cue link.');
  assert.equal(lines[2], 'A SL Portal: no reading (last reply 5:00 AM). Check by eye.');
  assert.equal(lines[3], 'B Top Portal: ON, shutter OPEN, reply 2s ago. No alarms reported.');
  assert.ok(lines.includes('Cue link: not connected. Console cues do not reach this page.'));
  assert.ok(lines.includes('Show Lock: on.'));
  assert.equal(lines.at(-1), 'Last move from this page: Close shutter B, 1:59 PM, projector reported closed.');
  assert.doesNotMatch(text, /undefined|null|NaN|\[object/);
  assert.ok(text.length < 900, 'short enough for a text message');
  assert.equal(smsHref('a b'), 'sms:?&body=a%20b');
});

const SHOW_FILES = ['show.html', 'show.js', 'show-model.js', 'show.css'];
test('the page source holds no address, number or name, and can send only a shutter command', async () => {
  const source = {};
  for (const name of SHOW_FILES) source[name] = await readFile(new URL(`../public/${name}`, import.meta.url), 'utf8');
  for (const [name, text] of Object.entries(source)) {
    assert.doesNotMatch(text, /\b(?:192\.168\.\d{1,3}|10\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}|100\.\d{1,3}\.\d{1,3})\.(?:\d{1,3}|x)\b/, `${name} hard-codes a private address`);
    assert.doesNotMatch(text, /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/, `${name} holds a phone number`);
    assert.doesNotMatch(text, /\.ts\.net|\.local\b/, `${name} names a host`);
  }
  const script = source['show.js'];
  assert.deepEqual([...script.matchAll(/fetch\('([^']+)'/g)].map(match => match[1]).sort(), ['api/command', 'api/crew-links', 'api/host-displays', 'api/state'], 'relative relay routes only');
  assert.deepEqual([...script.matchAll(/method: '(\w+)'/g)].map(match => match[1]), ['POST'], 'one write, the command route');
  assert.deepEqual([...script.matchAll(/cmd: '(\w+)'/g)].map(match => match[1]), ['shutter']);
  assert.doesNotMatch(script, /api\/(?:lock|preset|projector|power-schedules|discover|preferred-input|health-reports|logout)/);
  const html = source['show.html'];
  assert.doesNotMatch(html, /\s(?:src|href)="\/(?!\/)/, 'relative URLs, so the page works behind a path prefix');
  assert.deepEqual([...html.matchAll(/https?:\/\/[^"'\s<]+/g)].map(match => match[0]).filter(url => !url.startsWith('http://localhost:8080/show.html')), [], 'no external host');
});

test('the relay serves the page with a full head, and hides it behind the login when a passcode is set', async () => {
  const relay = await startRelay();
  try {
    const page = await fetch(`${relay.base}/show.html`, { redirect: 'manual' });
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-type'), /text\/html/);
    assert.match(page.headers.get('content-security-policy'), /frame-ancestors/);
    const html = await page.text();
    assert.match(html, /<title>Projctl \| Show backup<\/title>/);
    assert.match(html, /http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self';/);
    assert.doesNotMatch(html, /unsafe-inline|\sstyle="|<style/);
    assert.match(html, /<link rel="canonical" href="http:\/\/localhost:8080\/show\.html">/);
    for (const tag of ['property="og:title"', 'property="og:description"', 'property="og:type"', 'property="og:url"', 'name="twitter:card"', 'name="twitter:title"', 'name="twitter:description"', 'name="theme-color"', 'name="description"', 'name="robots" content="noindex, nofollow"']) assert.ok(html.includes(`<meta ${tag}`), `show.html lacks ${tag}`);
    for (const [asset, type] of [['show.js', /javascript/], ['show-model.js', /javascript/], ['show.css', /text\/css/]]) {
      const response = await fetch(`${relay.base}/${asset}`);
      assert.equal(response.status, 200, asset);
      assert.match(response.headers.get('content-type'), type, asset);
    }
  } finally { await relay.close(); }

  const locked = await startRelay({ PJ_PASSCODE: 'simulator-only-code' });
  try {
    for (const asset of ['show.html', 'show.js', 'show-model.js', 'show.css']) {
      const response = await fetch(`${locked.base}/${asset}`, { redirect: 'manual' });
      assert.equal(response.status, 302, asset);
      assert.equal(response.headers.get('location'), `/login.html?next=${encodeURIComponent('/' + asset)}`);
    }
    assert.equal((await fetch(`${locked.base}/api/host-displays`)).status, 401);
    assert.equal((await fetch(`${locked.base}/api/command`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slot: 'P2', cmd: 'shutter', arg: 1 }) })).status, 401);
  } finally { await locked.close(); }
});

test('the relay rules this page leans on: reviewed target, Show Lock and an unreached lane', async () => {
  const relay = await startRelay();
  try {
    await relay.api('command', { slot: 'P2', cmd: 'power', arg: 1 });
    await until(async () => (await relay.state()).projectors.find(p => p.slot === 'P2').status.power === 'on', 15000);
    const target = async () => { const p = (await relay.state()).projectors.find(x => x.slot === 'P2'); return [{ slot: 'P2', revision: p.controlRevision }]; };
    const shutter = async () => (await relay.state()).projectors.find(p => p.slot === 'P2').status.shutter;

    let reply = await relay.api('command', { slot: 'P2', cmd: 'shutter', arg: 0, expectedTargets: await target() });
    assert.equal(reply.body.P2.result, 'OK');
    await until(async () => await shutter() === 'open');

    // Show Lock guards power, input, pattern and lens. The shutter stays available under it.
    assert.equal((await relay.api('lock', { lock: true })).body.lock, true);
    reply = await relay.api('command', { slot: 'P2', cmd: 'shutter', arg: 1, expectedTargets: await target() });
    assert.equal(reply.body.P2.result, 'OK');
    await until(async () => await shutter() === 'closed');

    // A target that changed since the page drew it is refused before anything is sent.
    reply = await relay.api('command', { slot: 'P2', cmd: 'shutter', arg: 0, expectedTargets: [{ slot: 'P2', revision: 'f'.repeat(64) }] });
    assert.equal(reply.status, 409);
    assert.equal(await shutter(), 'closed');

    // A lane the relay cannot reach refuses the move, which is why the page disables it first.
    await relay.api('sim', { slot: 'P2', offline: true });
    await until(async () => !(await relay.state()).projectors.find(p => p.slot === 'P2').status.online);
    reply = await relay.api('command', { slot: 'P2', cmd: 'shutter', arg: 0, expectedTargets: await target() });
    assert.match(reply.body.P2?.error || reply.body.error, /offline/);
  } finally { await relay.close(); }
});

// The crew notes link is optional. Its address lives in a private file beside the rig, never in the source.
const NOTES = 'https://notes.example.test/crew';
test('the crew notes address is accepted only as a plain http or https link', () => {
  assert.equal(cleanLink(NOTES), NOTES);
  assert.equal(cleanLink('http://notes.example.test:8443'), 'http://notes.example.test:8443/');
  for (const bad of ['', null, 42, 'notes.example.test', 'javascript:alert(1)', 'data:text/html,x', 'file:///etc/hosts', 'sms:5', 'https://user:secret@notes.example.test/',
    'https://notes.example.test/a b', 'https://notes.example.test/\n', `https://notes.example.test/${'a'.repeat(300)}`]) assert.equal(cleanLink(bad), null, String(bad).slice(0, 40));
});

test('crew links read as configured, not configured or invalid, and never throw', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'projctl-crew-links-'));
  const file = path.join(dir, 'crew-links.json');
  try {
    assert.deepEqual(await readCrewLinks(file), { notes: null, state: 'not-configured' });
    await writeFile(file, JSON.stringify({ notes: { url: NOTES } }));
    assert.deepEqual(await readCrewLinks(file), { notes: { url: NOTES }, state: 'configured' });
    for (const [text, state] of [['{}', 'not-configured'], ['{"notes":null}', 'not-configured'], ['[]', 'not-configured'], ['not json', 'invalid'],
      ['{"notes":{"url":"javascript:alert(1)"}}', 'invalid'], ['{"notes":{}}', 'invalid'], ['{"notes":"https://notes.example.test/"}', 'invalid'], [JSON.stringify({ notes: { url: NOTES }, pad: 'x'.repeat(5000) }), 'invalid']]) {
      await writeFile(file, text);
      assert.deepEqual(await readCrewLinks(file), { notes: null, state }, text.slice(0, 40));
    }
    assert.deepEqual(await readCrewLinks(dir), { notes: null, state: 'invalid' }, 'a folder is not a settings file');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('the relay serves crew links behind the login, from the private file beside the rig', async () => {
  const plain = await startRelay();
  try { assert.deepEqual((await plain.api('crew-links')).body, { notes: null, state: 'not-configured' }); } finally { await plain.close(); }
  const configured = await startRelay({}, { files: { 'crew-links.json': JSON.stringify({ notes: { url: NOTES } }) } });
  try {
    const reply = await configured.api('crew-links');
    assert.deepEqual([reply.status, reply.body], [200, { notes: { url: NOTES }, state: 'configured' }]);
    assert.equal((await fetch(`${configured.base}/api/crew-links`, { method: 'POST' })).status, 404, 'read only');
  } finally { await configured.close(); }
  const locked = await startRelay({ PJ_PASSCODE: 'simulator-only-code' }, { files: { 'crew-links.json': JSON.stringify({ notes: { url: NOTES } }) } });
  try { assert.equal((await fetch(`${locked.base}/api/crew-links`)).status, 401); } finally { await locked.close(); }
});
