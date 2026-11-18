// Power operator page (docs/power-operator-page.md): the state rules it draws from, how the relay
// serves it, and the relay behaviour its one command depends on. Simulator only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { startRelay, until } from './relay-helper.js';
import { createConnectionMonitor } from '../public/projector-connection.js';
import { createCommandBinding } from '../server/command-binding.js';
import { rigLanes } from '../public/lanes.js';
import { COOL_SECONDS, TICK_VALID_MS, STEPS, RELAY_LANES, MANUAL_LANES, emptyRecord, parseRecord, tickCurrent, coolTimer, clock, crewNotesUrl, laneReading, relayStep, manualStep, banner } from '../public/power-model.js';

const NOW = Date.parse('2026-11-18T22:30:00Z');
const PAGE_FILES = ['power.html', 'power.js', 'power-model.js', 'power.css'];
const source = name => readFile(new URL(`../public/${name}`, import.meta.url), 'utf8');

// A projector as the relay snapshot describes it, replying `ageMs` ago.
function projector(lane, power, { ageMs = 1000, online = true, state = 'online', ip = 'sim' } = {}) {
  const lastSuccessAt = new Date(NOW - ageMs).toISOString();
  return { slot: `P-${lane}`, lane, driver: 'simulator', ip, status: { power, online, updatedAt: lastSuccessAt, connection: { state, lastSuccessAt } } };
}
function readingOf(p, { relayConnected = true } = {}) {
  const entry = p ? rigLanes([p]).find(item => item.lane === p.lane) : { lane: 'B', projector: null, conflict: false };
  return laneReading(entry, createConnectionMonitor()(p, relayConnected, 5000, NOW));
}
const lanesFor = (mode, { B, C, A, D }) => [
  { lane: 'B', kind: 'relay', ...relayStep(mode, B, { playbackTicked: true }) },
  { lane: 'C', kind: 'relay', ...relayStep(mode, C, { playbackTicked: true }) },
  { lane: 'A', kind: 'manual', relayWord: A.reading.word, ...manualStep(mode, A.item, A.reading, NOW) },
  { lane: 'D', kind: 'manual', relayWord: D.reading.word, ...manualStep(mode, D.item, D.reading, NOW) },
];
const notReached = readingOf(projector('A', 'on', { online: false, state: 'reconnecting', ageMs: 6 * 3600 * 1000 }));
const tick = (state, ageMs = 60000) => ({ tick: { state, at: NOW - ageMs }, coolUntil: null });

test('the lane split and step order follow the brief', () => {
  assert.deepEqual([...RELAY_LANES], ['B', 'C']);
  assert.deepEqual([...MANUAL_LANES], ['A', 'D']);
  assert.deepEqual([...STEPS.on], ['playback', 'C', 'B', 'A', 'D']);
  assert.deepEqual([...STEPS.off], ['playback', 'B', 'C', 'A', 'D']);
  assert.equal(COOL_SECONDS, 170);
  assert.equal(clock(170), '2:50');
  assert.equal(clock(9), '0:09');
});

test('saved ticks and timers are validated, and anything else is dropped', () => {
  assert.deepEqual(parseRecord('not json'), emptyRecord());
  assert.deepEqual(parseRecord('{"v":2,"playback":{"on":5}}'), emptyRecord());
  assert.deepEqual(parseRecord('null'), emptyRecord());
  const saved = { v: 1, playback: { on: NOW, off: 'yesterday' }, lanes: {
    A: { tick: { state: 'off', at: NOW }, coolUntil: NOW + 1000 },
    D: { tick: { state: 'standby', at: NOW }, coolUntil: -5 },
    B: { tick: { state: 'off', at: NOW } }, // not a manual lane
  }, extra: '<script>' };
  const record = parseRecord(JSON.stringify(saved));
  assert.deepEqual(record, { v: 1, playback: { on: NOW, off: null }, lanes: { A: { tick: { state: 'off', at: NOW }, coolUntil: NOW + 1000 }, D: { tick: null, coolUntil: null } } });
});

test('a tick is current for 30 minutes and never from the future', () => {
  assert.equal(tickCurrent(NOW, NOW), true);
  assert.equal(tickCurrent(NOW - TICK_VALID_MS + 1, NOW), true);
  assert.equal(tickCurrent(NOW - TICK_VALID_MS, NOW), false);
  assert.equal(tickCurrent(NOW + 5 * 60000, NOW), false, 'a clock that jumped back does not keep a tick alive');
  assert.equal(tickCurrent(null, NOW), false);
});

test('the cooling countdown runs from the stored end time and ignores a bogus one', () => {
  assert.deepEqual(coolTimer(NOW + 170000, NOW), { running: true, remaining: 170, finishedAt: null });
  assert.deepEqual(coolTimer(NOW + 500, NOW), { running: true, remaining: 1, finishedAt: null });
  assert.deepEqual(coolTimer(NOW - 2000, NOW), { running: false, remaining: 0, finishedAt: NOW - 2000 });
  assert.equal(coolTimer(NOW + 24 * 3600 * 1000, NOW).running, false, 'an end time further away than one countdown is not a countdown');
  assert.equal(coolTimer(NOW - TICK_VALID_MS, NOW).finishedAt, null);
  assert.equal(coolTimer(null, NOW).running, false);
});

test('only a fresh reply with a power state counts as a relay reading', () => {
  assert.deepEqual(readingOf(projector('B', 'off')), { kind: 'reading', power: 'off', word: 'STANDBY', ageLabel: 'Just now' });
  assert.equal(readingOf(projector('B', 'cooling')).word, 'COOLING');
  assert.equal(readingOf(projector('B', 'warming')).word, 'WARMING');
  assert.equal(readingOf(projector('B', 'on')).word, 'ON');

  const stale = readingOf(projector('B', 'off', { ageMs: 60000 }));
  assert.equal(stale.kind, 'noreply');
  assert.equal(stale.word, 'NO REPLY');
  assert.equal(stale.lastKnown, 'STANDBY', 'the old value is kept only as last known');

  assert.equal(readingOf(projector('B', 'off', { online: false, state: 'reconnecting' })).kind, 'noreply');
  assert.equal(readingOf(projector('B', 'off'), { relayConnected: false }).kind, 'disconnected');
  assert.equal(readingOf(projector('B', 'unknown')).kind, 'unknown');
  assert.equal(readingOf(projector('B', 'off', { ip: '' })).kind, 'unassigned');
  assert.equal(readingOf(null).kind, 'unassigned');
  assert.equal(laneReading({ lane: 'B', projector: null, conflict: true }, {}).kind, 'conflict');
});

test('a relay lane offers its command only when every guard passes', () => {
  const standby = readingOf(projector('C', 'off')), on = readingOf(projector('C', 'on'));
  const cooling = readingOf(projector('C', 'cooling')), warming = readingOf(projector('C', 'warming'));
  const ready = { playbackTicked: true };

  assert.equal(relayStep('on', standby, ready).enabled, true);
  assert.equal(relayStep('on', standby, {}).enabled, false, 'power waits for the playback tick');
  assert.match(relayStep('on', standby, {}).reason, /Tick step 1/);
  assert.equal(relayStep('on', standby, { ...ready, lock: true }).enabled, true, 'Show Lock does not block power on');
  assert.equal(relayStep('on', cooling, ready).enabled, false);
  assert.match(relayStep('on', cooling, ready).reason, /Wait for Standby/);
  assert.equal(relayStep('on', warming, ready).enabled, false);
  assert.deepEqual([relayStep('on', on, ready).done, relayStep('on', on, ready).enabled], [true, false]);
  assert.equal(relayStep('on', standby, { ...ready, busy: true }).enabled, false);

  assert.equal(relayStep('off', on, ready).enabled, true);
  assert.equal(relayStep('off', warming, ready).enabled, true);
  assert.equal(relayStep('off', on, { ...ready, lock: true }).enabled, false);
  assert.match(relayStep('off', on, { ...ready, lock: true }).reason, /Show Lock/);
  assert.equal(relayStep('off', cooling, ready).enabled, false);
  assert.equal(relayStep('off', cooling, ready).done, false, 'cooling is not Standby');
  assert.deepEqual([relayStep('off', standby, ready).done, relayStep('off', standby, ready).enabled], [true, false]);

  for (const reading of [readingOf(projector('C', 'off', { ageMs: 60000 })), readingOf(projector('C', 'off'), { relayConnected: false }), readingOf(null), { kind: 'conflict', word: 'CONFLICT' }]) {
    for (const mode of ['on', 'off']) {
      const step = relayStep(mode, reading, ready);
      assert.deepEqual([step.done, step.enabled, step.tone], [false, false, 'blocked'], `${mode} ${reading.kind}`);
      assert.ok(step.reason, `${mode} ${reading.kind} explains itself`);
    }
  }
  assert.match(relayStep('off', readingOf(projector('C', 'off', { ageMs: 60000 })), ready).reason, /does not confirm power off/);
});

test('a relay lane whose fresh reply has no power state can still be powered, and is never counted as done', () => {
  // Seen on a relay whose driver does not name one of a unit's standby states: the unit replies, power reads unknown.
  const unread = readingOf(projector('C', 'unknown')), ready = { playbackTicked: true };
  assert.deepEqual([unread.kind, unread.word], ['unknown', 'UNKNOWN']);
  for (const mode of ['on', 'off']) {
    const step = relayStep(mode, unread, ready);
    assert.deepEqual([step.enabled, step.done, step.tone, step.word], [true, false, 'waiting', 'UNKNOWN'], mode);
    assert.match(step.reason, mode === 'on' ? /cannot read this unit's power state\. Look at it first: power on only from standby\./ : /Look at it first: power off only if it is lit\./, `${mode} says to look first`);
    assert.equal(relayStep(mode, unread, {}).enabled, false, `${mode} still waits for the playback tick`);
    assert.equal(relayStep(mode, unread, { ...ready, busy: true }).enabled, false, `${mode} still waits for a running operation`);
  }
  assert.equal(relayStep('off', unread, { ...ready, lock: true }).enabled, false, 'Show Lock still blocks power off');
  assert.equal(relayStep('on', unread, { ...ready, lock: true }).enabled, true);

  // The banner never takes an unread lane for Standby or On.
  const ticked = { item: tick('off'), reading: notReached };
  const night = banner('off', lanesFor('off', { B: readingOf(projector('B', 'off')), C: unread, A: ticked, D: ticked }));
  assert.deepEqual([night.state, night.detail], ['wait', 'Waiting on: C unknown']);

  // The relay's own guard agrees: it refuses power on only while cooling, and power off only under Show Lock.
  const state = power => ({ projector: { slot: 'P3', driver: 'simulator', ip: 'sim' }, status: { online: true, power }, connection: { state: 'online', lastSuccessAt: new Date().toISOString() }, lock: false, lockRevision: 0, busy: false });
  const binding = createCommandBinding();
  assert.doesNotThrow(() => binding.commandGuard('P3', () => state('unknown'))('power', true));
  assert.doesNotThrow(() => binding.commandGuard('P3', () => state('unknown'))('power', false));
  assert.throws(() => binding.commandGuard('P3', () => state('cooling'))('power', true), /cooling/);
  assert.throws(() => binding.commandGuard('P3', () => ({ ...state('unknown'), lock: true }))('power', false), /show lock/);
});

test('a manual lane goes by the operator tick, and a fresh relay reading can only veto it', () => {
  const none = manualStep('off', { tick: null, coolUntil: null }, notReached, NOW);
  assert.deepEqual([none.done, none.word, none.tickEnabled], [false, 'TO DO', true]);
  assert.equal(none.word in { ON: 1, STANDBY: 1, COOLING: 1, WARMING: 1 }, false, 'a lane the relay has not reached never shows a power word');

  const off = manualStep('off', tick('off'), notReached, NOW);
  assert.deepEqual([off.done, off.word, off.tickedAt], [true, 'OFF BY EYE', NOW - 60000]);
  assert.equal(manualStep('on', tick('off'), notReached, NOW).done, false, 'a night tick does not count in the morning');
  assert.deepEqual([manualStep('on', tick('lit'), notReached, NOW).done, manualStep('on', tick('lit'), notReached, NOW).word], [true, 'LIT BY EYE']);

  const lapsed = manualStep('off', tick('off', TICK_VALID_MS + 1000), notReached, NOW);
  assert.deepEqual([lapsed.done, lapsed.lapsed, lapsed.word], [false, true, 'TICK LAPSED']);

  const timing = manualStep('off', { tick: null, coolUntil: NOW + 90000 }, notReached, NOW);
  assert.deepEqual([timing.word, timing.tickEnabled, timing.timer.remaining], ['COOLING TIMER', false, 90]);
  assert.match(timing.tickReason, /cooling countdown/);

  // With the playback app closed the relay may reach a manual lane. A fresh reading that disagrees wins.
  for (const power of ['on', 'warming', 'cooling']) {
    const disputed = manualStep('off', tick('off'), readingOf(projector('A', power)), NOW);
    assert.deepEqual([disputed.done, disputed.conflict, disputed.word], [false, true, 'CHECK AGAIN'], power);
  }
  assert.equal(manualStep('off', tick('off'), readingOf(projector('A', 'off')), NOW).done, true);
  assert.equal(manualStep('on', tick('lit'), readingOf(projector('A', 'off')), NOW).conflict, true);
  assert.equal(manualStep('on', tick('lit'), readingOf(projector('A', 'warming')), NOW).done, true);
});

test('safe to leave needs B and C in Standby from fresh replies and A and D ticked off', () => {
  const standby = lane => readingOf(projector(lane, 'off'));
  const ticked = { item: tick('off'), reading: notReached };
  const all = { B: standby('B'), C: standby('C'), A: ticked, D: ticked };

  const safe = banner('off', lanesFor('off', all));
  assert.deepEqual([safe.state, safe.title], ['safe', 'Safe to leave the building']);
  assert.equal(safe.detail, 'B and C read Standby. A and D confirmed off by eye.');

  const cases = {
    'B cooling': { ...all, B: readingOf(projector('B', 'cooling')) },
    'B on': { ...all, B: readingOf(projector('B', 'on')) },
    'C no reply': { ...all, C: readingOf(projector('C', 'off', { ageMs: 60000 })) },
    'C page offline': { ...all, C: readingOf(projector('C', 'off'), { relayConnected: false }) },
    'C unknown': { ...all, C: readingOf(projector('C', 'unknown')) },
    'A not ticked': { ...all, A: { item: { tick: null, coolUntil: null }, reading: notReached } },
    'A cooling timer': { ...all, A: { item: { tick: null, coolUntil: NOW + 60000 }, reading: notReached } },
    'D tick lapsed': { ...all, D: { item: tick('off', TICK_VALID_MS + 1), reading: notReached } },
    'D not ticked': { ...all, D: { item: tick('lit'), reading: notReached } },
    'A ticked, but the relay reads ON': { ...all, A: { item: tick('off'), reading: readingOf(projector('A', 'on')) } },
  };
  for (const [why, lanes] of Object.entries(cases)) {
    const result = banner('off', lanesFor('off', lanes));
    assert.deepEqual([result.state, result.title], ['wait', 'Not safe to leave yet'], why);
    assert.equal(result.detail, `Waiting on: ${why}`);
  }
  assert.equal(banner('off', []).state, 'wait', 'no lanes is never safe');

  const lit = { item: tick('lit'), reading: notReached };
  const morning = { B: readingOf(projector('B', 'on')), C: readingOf(projector('C', 'on')), A: lit, D: lit };
  assert.deepEqual([banner('on', lanesFor('on', morning)).state, banner('on', lanesFor('on', morning)).title], ['ready', 'All four on']);
  assert.equal(banner('on', lanesFor('on', { ...morning, B: readingOf(projector('B', 'warming')) })).detail, 'Waiting on: B warming');
});

test('the crew notes link accepts only a plain web address from the relay', () => {
  assert.equal(crewNotesUrl({ notes: { url: 'https://notes.example.test/crew' }, state: 'configured' }), 'https://notes.example.test/crew');
  assert.equal(crewNotesUrl({ notes: { url: 'http://notes.example.test:8443/' } }), 'http://notes.example.test:8443/');
  for (const payload of [null, undefined, {}, [], 'https://notes.example.test/', { notes: null, state: 'not-configured' }, { notes: null, state: 'invalid' }, { notes: {} }, { notes: { url: 7 } }, { notes: { url: '' } },
    { notes: { url: 'javascript:alert(1)' } }, { notes: { url: 'data:text/html,x' } }, { notes: { url: 'file:///etc/hosts' } }, { notes: { url: '/local/path' } }, { notes: { url: 'notes.example.test' } },
    { notes: { url: 'https://user:secret@notes.example.test/' } }, { notes: { url: 'https://notes.example.test/a b' } }, { notes: { url: 'https://notes.example.test/\nx' } }, { notes: { url: `https://notes.example.test/${'a'.repeat(300)}` } }]) {
    assert.equal(crewNotesUrl(payload), null, JSON.stringify(payload)?.slice(0, 60));
  }
});

test('the relay hands the crew notes address to a signed-in page only, from private settings', async () => {
  const get = async (relay, headers = {}) => { const r = await fetch(relay.base + '/api/crew-links', { headers }); return { status: r.status, body: await r.json() }; };
  const none = await startRelay();
  try {
    assert.deepEqual(await get(none), { status: 200, body: { notes: null, state: 'not-configured' } });
    assert.equal(crewNotesUrl((await get(none)).body), null);
  } finally { await none.close(); }

  const set = await startRelay({ PJ_PASSCODE: 'fixture-only-passcode' }, { files: { 'crew-links.json': JSON.stringify({ notes: { url: 'https://notes.example.test/crew' } }) } });
  try {
    assert.equal((await get(set)).status, 401, 'the address is not public');
    const login = await fetch(set.base + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: 'fixture-only-passcode' }) });
    const cookie = login.headers.getSetCookie().find(value => value.startsWith('pj=')).split(';')[0];
    const answer = await get(set, { cookie });
    assert.deepEqual(answer, { status: 200, body: { notes: { url: 'https://notes.example.test/crew' }, state: 'configured' } });
    assert.equal(crewNotesUrl(answer.body), 'https://notes.example.test/crew');
  } finally { await set.close(); }

  const bad = await startRelay({}, { files: { 'crew-links.json': JSON.stringify({ notes: { url: 'javascript:alert(1)' } }) } });
  try {
    assert.deepEqual(await get(bad), { status: 200, body: { notes: null, state: 'invalid' } });
  } finally { await bad.close(); }
});

test('the relay serves the page with a full head, a strict policy and no outside dependency', async () => {
  const relay = await startRelay();
  try {
    const page = await fetch(relay.base + '/power.html');
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-type'), /text\/html/);
    assert.match(page.headers.get('content-security-policy'), /frame-ancestors/);
    const html = await page.text();
    assert.match(html, /<title>Projctl \| Power checklist<\/title>/);
    assert.match(html, /<link rel="canonical" href="http:\/\/localhost:8080\/power\.html">/);
    for (const tag of ['property="og:title"', 'property="og:description"', 'property="og:type"', 'property="og:url"', 'name="twitter:card"', 'name="twitter:title"', 'name="twitter:description"', 'name="description"', 'name="theme-color"', 'name="robots" content="noindex, nofollow"']) assert.ok(html.includes(`<meta ${tag}`), `power.html lacks ${tag}`);
    const policy = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1] || '';
    assert.match(policy, /default-src 'self'/);
    assert.match(policy, /script-src 'self';/, 'no inline script');
    assert.match(policy, /style-src 'self';/, 'no inline style');
    assert.doesNotMatch(policy, /https?:/, 'the policy allows no outside host');
    assert.doesNotMatch(html, /\sstyle="|<style|\son[a-z]+="/, 'styles and handlers stay in power.css and power.js');

    for (const [name, type] of [['power.js', /text\/javascript/], ['power-model.js', /text\/javascript/], ['power.css', /text\/css/]]) {
      const r = await fetch(`${relay.base}/${name}`);
      assert.equal(r.status, 200, name);
      assert.match(r.headers.get('content-type'), type, name);
    }
  } finally { await relay.close(); }
});

test('the page source keeps every URL relative and holds no private address', async () => {
  for (const name of PAGE_FILES) {
    const text = await source(name);
    const outside = (text.match(/\b(?:https?|wss?):\/\/[^\s"'`)<]+/g) || []).filter(url => !/^http:\/\/localhost:8080\/power\.html$/.test(url));
    assert.deepEqual(outside, [], `${name} names an absolute URL`);
    assert.doesNotMatch(text, /\b(?:192\.168\.\d{1,3}|10\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}|100\.\d{1,3}\.\d{1,3})\.(?:\d{1,3}|x)\b/, `${name} hard-codes a private address`);
    assert.doesNotMatch(text, /(?:src|href)="\/|fetch\(\s*['"`]\/|url\(\s*['"]?\//, `${name} uses a root-absolute URL`);
    assert.doesNotMatch(text, /@import|\bimport\s*\(/, `${name} loads nothing dynamically`);
  }
  const script = await source('power.js');
  assert.deepEqual([...new Set(script.match(/['"`]api\/[a-z-]+/g).map(route => route.slice(1)))].sort(), ['api/command', 'api/crew-links', 'api/state'], 'the page reads state and the crew notes address, and sends commands, nothing else');
  const html = await source('power.html');
  assert.match(html, /<a class="[^"]*" data-crew-notes target="_blank" rel="noopener noreferrer">/, 'the crew notes link opens a new tab without an opener');
  assert.doesNotMatch(html, /\shref="(?!#panels"|avd\/|app\.css|power\.css|frozen-theme\.css|http:\/\/localhost:8080\/power\.html")/, 'no address is written into the page');
  assert.match(html, /data-rule-set="notes"[^>]* hidden>/, 'the crew notes rule set starts hidden');
  assert.match(html, /data-rule-pick="notes"[^>]* hidden>/, 'the crew notes button starts hidden');
  assert.deepEqual([...new Set(script.match(/cmd:\s*'[a-z]+'/gi))], ["cmd: 'power'"], 'power is the only command');
  assert.doesNotMatch(script, /slot:\s*'all'|innerHTML|\beval\(/);
  for (const name of ['power.js', 'power-model.js']) {
    const imports = [...(await source(name)).matchAll(/from '([^']+)'/g)].map(match => match[1]);
    assert.ok(imports.every(path => /^\.\/[a-z-]+\.js$/.test(path)), `${name} imports only sibling modules: ${imports}`);
  }
});

test('a signed-out visit is sent to sign in and back to the page', async () => {
  const relay = await startRelay({ PJ_PASSCODE: 'fixture-only-passcode' });
  try {
    const get = route => fetch(relay.base + route, { redirect: 'manual' });
    const page = await get('/power.html');
    assert.equal(page.status, 302);
    assert.equal(page.headers.get('location'), '/login.html?next=%2Fpower.html');
    for (const asset of ['/power.js', '/power-model.js', '/power.css']) assert.equal((await get(asset)).status, 302, `${asset} is not public`);
    assert.equal((await get('/api/state')).status, 401);
    const blocked = await fetch(relay.base + '/api/command', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slot: 'P2', cmd: 'power', arg: 1 }) });
    assert.equal(blocked.status, 401);

    const login = await fetch(relay.base + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: 'fixture-only-passcode' }) });
    assert.equal(login.status, 200);
    const cookie = login.headers.getSetCookie().find(value => value.startsWith('pj=')).split(';')[0];
    const signedIn = await fetch(relay.base + '/power.html', { headers: { cookie }, redirect: 'manual' });
    assert.equal(signedIn.status, 200);
  } finally { await relay.close(); }
});

test('the relay keeps its power guards for the exact request the page sends', async () => {
  const relay = await startRelay();
  try {
    // A fresh test rig has no drawing lanes. Assign them the way the venue rig does.
    for (const [index, slot] of ['P1', 'P2', 'P3', 'P4'].entries()) assert.equal((await relay.api('projector', { slot, lane: 'ABCD'[index] })).status, 200);
    await until(async () => (await relay.state()).projectors.every(p => p.status.online));
    const lane = async letter => (await relay.state()).projectors.find(p => p.lane === letter);
    const powerOf = async letter => (await lane(letter)).status.power;
    const send = async (letter, arg, extra = {}) => {
      const p = await lane(letter);
      const r = await relay.api('command', { slot: p.slot, cmd: 'power', arg, expectedTargets: [{ slot: p.slot, revision: p.controlRevision }], ...extra });
      return { status: r.status, body: r.body, result: r.body[p.slot] };
    };

    assert.equal((await send('B', 1)).result.result, 'OK');
    await until(async () => await powerOf('B') === 'on');

    // First tap: a confirmation only. Nothing reaches the projector.
    const first = await send('B', 0);
    assert.equal(first.status, 200);
    assert.equal(typeof first.result.confirm, 'string');
    assert.deepEqual(first.result.targets, [(await lane('B')).slot]);
    assert.equal(await powerOf('B'), 'on');

    // Show Lock blocks power off outright and voids the pending confirmation.
    await relay.api('lock', { lock: true });
    const locked = await send('B', 0, { confirm: first.result.confirm });
    assert.equal(locked.status, 423);
    assert.equal(await powerOf('B'), 'on');
    assert.equal((await send('B', 1)).status, 200, 'power on is not blocked by Show Lock');
    await relay.api('lock', { lock: false });
    const voided = await send('B', 0, { confirm: first.result.confirm });
    assert.equal(typeof voided.result.confirm, 'string', 'the old confirmation no longer powers off');
    assert.equal(await powerOf('B'), 'on');

    // A command aimed at a projector whose configuration changed since the page read it is refused.
    const p = await lane('B');
    const wrong = await relay.api('command', { slot: p.slot, cmd: 'power', arg: 0, expectedTargets: [{ slot: p.slot, revision: 'a'.repeat(64) }] });
    assert.equal(wrong.status, 409);
    assert.match(wrong.body.error, /configuration changed/i);

    // Second tap with the confirmation: cooling, then Standby. Power on is refused while cooling.
    const off = await send('B', 0, { confirm: voided.result.confirm });
    assert.equal(off.result.result, 'OK');
    await until(async () => await powerOf('B') === 'cooling');
    const early = await send('B', 1);
    assert.match(early.result.error, /cooling/);
    await until(async () => await powerOf('B') === 'off', 15000);

    // A lane with no reply gets no confirmation and no command.
    const c = await lane('C');
    await relay.api('sim', { slot: c.slot, offline: true });
    await until(async () => !(await lane('C')).status.online);
    const dark = await send('C', 0);
    assert.match(dark.result.error, /offline/);
    assert.equal(dark.result.confirm, undefined);
    assert.match((await send('C', 1)).result.error, /offline|no fresh projector reply/i);
  } finally { await relay.close(); }
});
