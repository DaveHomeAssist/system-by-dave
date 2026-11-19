// Show backup page: what the strip may claim, the setup check, the MIDI test, how the page is
// served, and what its source is allowed to contain. Simulator only; nothing here reaches a
// projector, and nothing sends MIDI. Control rules are in projector-control.test.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { startRelay, until } from './relay-helper.js';
import { createConnectionMonitor } from '../public/projector-connection.js';
import { laneViews, buildChecks, verdictOf, alarmSummary, STATE_WORDS, STATE_MARKS, feedState, feedView, setupCheck, setupBlocked, SETUP_WORDS,
  MIDI_TEST, midiTestBlocked, midiTestStart, midiTestStep, midiTestView, midiTestRunning } from '../public/show-model.js';
import { textBlocks } from '../public/show-know.js';
import { cleanLink, readCrewLinks } from '../server/crew-links.js';

const NOW = Date.parse('2026-11-18T19:00:00Z');
const ago = ms => new Date(NOW - ms).toISOString();
const QUIET = { fan: 0, lamp: 0, temp: 0, cover: 0, filter: 0, other: 0 };
function projector(slot, lane, status = {}, connection = {}, extra = {}) {
  return { slot, lane, driver: 'simulator', ip: 'sim', model: `Model ${lane}`, controlRevision: lane.toLowerCase().repeat(64),
    inputs: { 31: 'HDMI 1', 32: 'SDI 1' }, inputPreference: { available: true, value: '31', label: 'HDMI 1' }, patterns: { '00': 'Off', '08': 'Crosshatch' },
    status: { power: 'on', shutter: 'open', input: '31', pattern: '00', errors: QUIET, online: true, updatedAt: ago(2000), ...status,
      connection: { state: 'online', lastSuccessAt: ago(2000), ...connection } }, ...extra };
}
// A lane the relay still holds an old ON reading for but cannot reach.
const held = (slot, lane) => projector(slot, lane, { online: false }, { state: 'reconnecting', lastSuccessAt: ago(9 * 3600000) });
const rig = (...projectors) => ({ type: 'snapshot', lock: false, simulation: false, relay: { startedAt: ago(10 * 3600000), pollIntervalMs: 5000 }, projectors });
const showRig = () => rig(held('P1', 'A'), projector('P2', 'B'), projector('P3', 'C'), held('P4', 'D'));
const allUp = () => rig(projector('P1', 'A'), projector('P2', 'B'), projector('P3', 'C'), projector('P4', 'D'));
const up = { connected: true, everConnected: true, lastMessageAt: NOW - 1000, startedAt: ago(10 * 3600000) };
const lost = { ...up, connected: false };
const views = (snapshot, relay = up) => laneViews(snapshot, { relayConnected: relay.connected, everConnected: relay.everConnected, monitor: createConnectionMonitor(), now: NOW });
const displayReport = (count, extra = {}) => ({ status: 'ok', data: { scope: 'relay-computer', state: 'reported', collectedAt: ago(20000), reason: null,
  displays: Array.from({ length: count }, (_, i) => ({ id: `display-${i + 1}`, name: `Display ${i + 1}`, online: true, main: i === 0, mirror: false, resolution: i ? '1920 x 1200 @ 60.00Hz' : '2560 x 1440 @ 60.00Hz' })), ...extra } });
const check = (list, id) => list.find(item => item.id === id);
const cue = (seq, number, { at = NOW - 60000, command = 'go', source = 'Console A' } = {}) => ({ seq, at: new Date(at).toISOString(), source, device: 3, format: 1, commandCode: 1, command, cue: number, list: '1', path: null });
// What GET api/cue-feed answers, as the page holds it.
const feedOf = (data = {}, fetchedAt = NOW - 1000) => ({ status: 'ok', fetchedAt, data: { feedId: 'feed-1', state: 'listening', reason: null, seq: 0, lastRowAt: ago(3000), heartbeatAt: ago(3000), sources: 2, destinations: 2, sourceNames: ['Console A'], lastCue: null, recent: [], skippedLines: 0, ...data } });
const noFeed = { status: 'ok', fetchedAt: NOW - 1000, data: { feedId: 'feed-1', state: 'not-configured', seq: 0, lastCue: null, recent: [] } };

test('the strip states only what the relay can vouch for', () => {
  const lanes = views(showRig());
  let checks = buildChecks({ lanes, relay: up, displays: displayReport(5), feed: noFeed, now: NOW });
  assert.deepEqual(checks.map(item => [item.id, item.short]), [['lanes', 'Lanes'], ['outputs', 'Outs'], ['cues', 'Cues'], ['computer', 'Relay']]);
  assert.deepEqual([check(checks, 'lanes').state, check(checks, 'lanes').value, check(checks, 'lanes').brief, check(checks, 'lanes').note], ['eye', '2 of 4 lit', '2/4 lit', 'A and D: check by eye']);
  assert.deepEqual([check(checks, 'outputs').state, check(checks, 'outputs').value, check(checks, 'outputs').brief], ['ok', '4 outputs + main', '4 + main']);
  assert.match(check(checks, 'outputs').note, /^Windows not reported · read 20s ago$/);
  assert.deepEqual([check(checks, 'cues').state, check(checks, 'cues').value, check(checks, 'cues').brief], ['off', 'Not connected', 'No feed']);
  assert.deepEqual([check(checks, 'computer').state, check(checks, 'computer').value], ['ok', 'Answering']);
  for (const item of checks) { assert.ok(item.detail.length && item.cannot.length, `${item.id} says what it cannot tell`); assert.ok(STATE_WORDS[item.state] && STATE_MARKS[item.state] && item.brief); }
  // With no cue feed the page can never call the whole rig good.
  assert.deepEqual([verdictOf(checks, up).state, verdictOf(checks, up).title, verdictOf(checks, up).short], ['eye', 'Nothing wrong reported', 'By eye']);

  const outputs = displays => check(buildChecks({ lanes, relay: up, displays, feed: noFeed, now: NOW }), 'outputs');
  assert.deepEqual([outputs(displayReport(4)).state, outputs(displayReport(4)).value], ['attention', '3 of 4 outputs']);
  assert.deepEqual([outputs(displayReport(5, { collectedAt: ago(300000) })).state, outputs(displayReport(5, { collectedAt: ago(300000) })).value], ['eye', 'Stale']);
  const noMain = displayReport(5); noMain.data.displays[0].main = null;
  assert.deepEqual([outputs(noMain).state, outputs(noMain).note], ['eye', 'Main display not identified']);
  const mirrored = displayReport(5); mirrored.data.displays[4].mirror = true;
  assert.equal(outputs(mirrored).state, 'attention', 'a mirrored display is not an output of its own');
  assert.deepEqual([outputs({ status: 'ok', data: { scope: 'relay-computer', state: 'simulation', displays: [] } }).state, outputs({ status: 'error', error: 'Display report failed' }).state, outputs({ status: 'loading' }).value], ['off', 'off', 'Reading']);

  checks = buildChecks({ lanes: views(showRig(), lost), relay: lost, displays: displayReport(5), feed: feedOf(), now: NOW });
  assert.deepEqual(checks.map(item => item.state), ['eye', 'off', 'off', 'attention'], 'a lost relay leaves old reports unread');
  assert.equal(verdictOf(checks, lost).state, 'attention');
  assert.equal(verdictOf(checks, { connected: false, everConnected: false }).title, 'Connecting');
});

test('with every lane lit, outputs present and the listener running, and only then, the strip reads all good', () => {
  const lanes = views(allUp());
  const good = buildChecks({ lanes, relay: up, displays: displayReport(5), feed: feedOf({ seq: 4, lastCue: cue(4, '12'), recent: [cue(4, '12')] }), now: NOW });
  assert.deepEqual(good.map(item => item.state), ['ok', 'ok', 'ok', 'ok']);
  assert.deepEqual(verdictOf(good, up), { state: 'ok', title: 'All reported good', short: 'Good', text: 'Every item has a current reading.' });
  assert.deepEqual([check(good, 'cues').value, check(good, 'cues').brief], ['Cue 12, list 1', 'Cue 12']);
  assert.match(check(good, 'cues').note, /^Heard 1:59 PM from Console A · not proof that video followed$/);

  const dark = allUp(); dark.projectors[1] = projector('P2', 'B', { errors: { ...QUIET, lamp: 2 } }); dark.projectors[2] = projector('P3', 'C', { power: 'off' }); dark.projectors[3] = projector('P4', 'D', { pattern: '08' });
  const lanesCheck = check(buildChecks({ lanes: views(dark), relay: up, displays: displayReport(5), feed: feedOf(), now: NOW }), 'lanes');
  assert.deepEqual([lanesCheck.state, lanesCheck.value, lanesCheck.note], ['attention', '3 of 4 lit', 'B lamp error · C reports OFF · D test pattern on']);
  assert.equal(alarmSummary(QUIET), null);
});

test('the cue item tells a running listener from a stopped one and from no feed at all', () => {
  const lanes = views(allUp()), cues = feed => check(buildChecks({ lanes, relay: up, displays: displayReport(5), feed, now: NOW }), 'cues');
  assert.deepEqual([cues(feedOf()).state, cues(feedOf()).value, cues(feedOf()).note], ['ok', 'Listening', 'Listening · no cue heard yet']);
  const stopped = feedOf({ state: 'stopped', lastRowAt: ago(200000), lastCue: cue(2, '40') });
  assert.deepEqual([cues(stopped).state, cues(stopped).value, cues(stopped).brief], ['eye', 'Listener stopped', 'Stopped']);
  assert.equal(cues(stopped).note, 'Listener stopped. Last heard 3m ago · last: cue 40, list 1 at 1:59 PM', 'a stopped listener is not "no cue"');
  assert.deepEqual([cues(feedOf({ state: 'missing', reason: 'The observer file is not there.' })).state, cues(feedOf({ state: 'missing', reason: 'The observer file is not there.' })).note], ['eye', 'The observer file is not there.']);
  assert.deepEqual([cues({ status: 'absent' }).state, cues({ status: 'absent' }).value], ['off', 'Not connected'], 'a relay without the route');
  assert.deepEqual([cues({ status: 'error' }).state, cues({ status: 'loading' }).value], ['eye', 'Reading']);
  assert.equal(cues(feedOf({}, NOW - 60000)).state, 'eye', 'the page\'s own copy of the feed has gone old');
  assert.deepEqual(['listening', 'stopped', 'not-connected', 'unread', 'loading'], [feedState(feedOf(), NOW).kind, feedState(stopped, NOW).kind, feedState(noFeed, NOW).kind, feedState({ status: 'error' }, NOW).kind, feedState(undefined, NOW).kind]);

  const seen = feedView(feedOf({ seq: 3, lastCue: cue(3, '999.5'), recent: [cue(1, '12'), cue(2, '999', { command: 'stop' }), cue(3, '999.5')] }), NOW);
  assert.deepEqual([seen.kind, seen.tone, seen.title, seen.text], ['listening', 'ok', 'Listening', 'Last row 3s ago · 2 MIDI sources · Console A']);
  assert.deepEqual(seen.lastCue, { title: 'Cue 999.5, list 1', text: '1:59:00 PM · from Console A · 1m ago' });
  assert.deepEqual(seen.recent.map(item => [item.seq, item.text]), [[3, 'Cue 999.5, list 1'], [2, 'STOP cue 999, list 1'], [1, 'Cue 12, list 1']], 'newest first');
  assert.deepEqual([feedView(noFeed, NOW).title, feedView(noFeed, NOW).lastCue.title, feedView(noFeed, NOW).recent], ['Not connected', 'Not available', []]);
  assert.equal(feedView(feedOf(), NOW).lastCue.title, 'No cue heard yet');
});

test('the setup check gives each line a pass, a fail or "cannot check", always with its reading', () => {
  const host = { status: 'ok', data: { checks: [{ id: 'playback-app', state: 'cannot-check', reading: 'No provider is configured for this check.' }, { id: 'midi-interface', state: 'cannot-check', reading: 'No provider is configured for this check.' }, { id: 'computer-awake', state: 'pass', reading: 'Awake and unlocked' }] } };
  const good = setupCheck({ lanes: views(allUp()), relay: up, displays: displayReport(5), feed: feedOf(), hostChecks: host, lock: false, release: '2026.11.15.2', now: NOW });
  const line = (result, id) => result.lines.find(item => item.id === id);
  assert.deepEqual(good.counts, { pass: 4 * 5 + 4, fail: 0, cannot: 2 });
  assert.equal(good.summary, '24 pass · 0 fail · 2 cannot check');
  assert.deepEqual([line(good, 'relay').state, line(good, 'relay').reading], ['pass', 'Answering, release 2026.11.15.2, up since 4:00 AM']);
  assert.deepEqual([line(good, 'lock').state, line(good, 'lock').reading], ['reading', 'Off'], 'a state with no rule is a reading, not a pass');
  assert.deepEqual(['A-reach', 'A-power', 'A-input', 'A-shutter', 'A-pattern', 'A-link'].map(id => [line(good, id).label, line(good, id).state, line(good, id).reading]),
    [['Reachable', 'pass', 'Reply 2s ago, Model A'], ['Power', 'pass', 'ON'], ['Input', 'pass', 'HDMI 1'], ['Shutter', 'pass', 'OPEN'], ['Test pattern off', 'pass', 'Off'], ['Link', 'reading', 'Simulator']]);
  assert.deepEqual([line(good, 'displays').state, line(good, 'displays').reading], ['pass', '5 displays · 1 main: 2560 x 1440 @ 60.00Hz · 2: 1920 x 1200 @ 60.00Hz · 3: 1920 x 1200 @ 60.00Hz · 4: 1920 x 1200 @ 60.00Hz · 5: 1920 x 1200 @ 60.00Hz']);
  assert.deepEqual([line(good, 'listener').state, line(good, 'listener').reading], ['pass', 'Running, last row 3s ago, 2 MIDI sources']);
  assert.deepEqual([line(good, 'playback-app').state, line(good, 'playback-app').reading, line(good, 'computer-awake').state, line(good, 'computer-awake').reading], ['cannot', 'No provider is configured for this check.', 'pass', 'Awake and unlocked']);
  assert.deepEqual([...new Set(good.lines.map(item => item.group))], ['Relay and show computer', 'Lane A · SL Portal', 'Lane B · Top Portal', 'Lane C · Stage', 'Lane D · SR Portal', 'Displays', 'Cues']);
  for (const item of good.lines) assert.ok(SETUP_WORDS[item.state] && item.reading, `${item.id} has a state and a reading`);

  // A rig with trouble: nothing unknown is ever counted as a pass.
  const bad = rig(held('P1', 'A'), projector('P2', 'B', { power: 'off' }), projector('P3', 'C', { controlLink: 'control-port', input: null, shutter: 'closed', pattern: '08' }, {}, { driver: 'panasonic' }), projector('P4', 'D', { input: '32', shutter: 'unknown', pattern: null }));
  bad.projectors.push(projector('P5', '')); // a projector with no lane is not a lane line
  const result = setupCheck({ lanes: views(bad), relay: up, displays: displayReport(4), feed: feedOf({ state: 'stopped', lastRowAt: ago(200000) }), hostChecks: { status: 'error' }, lock: false, now: NOW });
  const got = id => [line(result, id).state, line(result, id).reading];
  assert.deepEqual(got('A-reach'), ['fail', "Relay can't reach it. Use the remote. Last reply 5:00 AM."]);
  for (const id of ['A-power', 'A-input', 'A-shutter', 'A-pattern']) assert.deepEqual(got(id), ['cannot', 'Lane not reachable']);
  assert.deepEqual(got('A-link'), ['reading', 'Not reported']);
  assert.deepEqual([got('B-power'), got('B-shutter')], [['fail', 'OFF'], ['cannot', 'Projector is not ON']]);
  assert.deepEqual([got('C-input'), got('C-shutter'), got('C-pattern'), got('C-link')], [['cannot', 'Not reported: the control port does not report the input'], ['fail', 'CLOSED: dark on stage'], ['fail', 'ON · Crosshatch'], ['reading', 'Control port (commands unproven on a rig)']]);
  assert.deepEqual([got('D-input'), got('D-shutter'), got('D-pattern')], [['fail', 'SDI 1, expected HDMI 1'], ['cannot', 'Not reported'], ['cannot', 'Not reported']]);
  assert.deepEqual(got('displays'), ['fail', '3 outputs for 4 lanes · 4 displays · 1 main: 2560 x 1440 @ 60.00Hz · 2: 1920 x 1200 @ 60.00Hz · 3: 1920 x 1200 @ 60.00Hz · 4: 1920 x 1200 @ 60.00Hz']);
  assert.deepEqual(got('listener'), ['fail', 'Listener stopped. Last heard 3m ago']);
  assert.deepEqual(got('midi-interface'), ['cannot', 'The relay did not answer this check']);
  assert.equal(result.lines.some(item => item.id.startsWith('P5') || item.group.includes('P5')), false);

  const blind = setupCheck({ lanes: views(allUp()), relay: up, displays: { status: 'ok', data: { scope: 'relay-computer', state: 'simulation', displays: [] } }, feed: noFeed, hostChecks: { status: 'absent' }, lock: true, now: NOW });
  assert.deepEqual([line(blind, 'displays').state, line(blind, 'displays').reading, line(blind, 'listener').state, line(blind, 'lock').reading], ['cannot', 'Reader is off in simulation', 'cannot', 'On']);
  const noPreference = allUp(); noPreference.projectors[0].inputPreference = { available: false, value: null, label: 'HDMI' };
  assert.deepEqual(setupCheck({ lanes: views(noPreference), relay: up, displays: displayReport(5), feed: feedOf(), hostChecks: host, lock: false, now: NOW }).lines.find(item => item.id === 'A-input').state, 'cannot');
  assert.equal(setupCheck({ lanes: views(allUp(), lost), relay: lost, displays: displayReport(5), feed: feedOf(), hostChecks: host, lock: null, now: NOW }).lines[0].state, 'fail');

  assert.equal(setupBlocked({ relay: up, lock: false }), '');
  assert.equal(setupBlocked({ relay: up, lock: true }), 'Show Lock is on. The setup check is locked.');
  assert.equal(setupBlocked({ relay: up, lock: null }), 'Show Lock not read.');
  assert.equal(setupBlocked({ relay: lost, lock: false }), 'Relay not answering.');
});

test('the MIDI test passes only on cue 999 heard after the start, then waits for the clear cue', () => {
  assert.deepEqual(MIDI_TEST, { cue: '999', clear: '999.5', goMs: 30000, clearMs: 60000 });
  const context = feed => ({ feed, relay: up, lock: false, now: NOW });
  // A cue 999 that arrived before the tap must never count.
  const before = feedOf({ seq: 5, recent: [cue(5, '999', { at: NOW - 4000 })], lastCue: cue(5, '999', { at: NOW - 4000 }) });
  let run = midiTestStart(before, NOW);
  assert.deepEqual([run.phase, run.afterSeq, run.feedId, midiTestRunning(run)], ['waiting-go', 5, 'feed-1', true]);
  assert.equal(midiTestStep(run, before, NOW + 5000), run, 'the old cue is ignored');
  let view = midiTestView(run, { ...context(before), now: NOW + 5000 });
  assert.deepEqual([view.state, view.running, view.count, view.title, view.steps.map(step => [step.state, step.detail])], ['eye', true, 25, 'Fire cue 999 on the console now', [['wait', '25 s left'], ['idle', '']]]);

  // Other cues and other commands do not pass it.
  const noise = feedOf({ seq: 7, recent: [cue(5, '999', { at: NOW - 4000 }), cue(6, '12', { at: NOW + 6000 }), cue(7, '999', { at: NOW + 7000, command: 'stop' })] }, NOW + 8000);
  assert.equal(midiTestStep(run, noise, NOW + 8000), run);

  // The cue arrives: pass, with its time and source.
  const hit = feedOf({ seq: 8, recent: [...noise.data.recent, cue(8, '999', { at: NOW + 9000, source: 'Console A' })] }, NOW + 9500);
  run = midiTestStep(run, hit, NOW + 9500);
  assert.deepEqual([run.phase, run.go, run.goSeenAt], ['waiting-clear', { seq: 8, at: new Date(NOW + 9000).toISOString(), source: 'Console A' }, NOW + 9500]);
  view = midiTestView(run, { ...context(hit), now: NOW + 10500 });
  assert.deepEqual([view.state, view.title, view.count], ['ok', 'Pass: the cue arrived', 59]);
  assert.match(view.text, /^Cue 999 arrived at 2:00:09 PM from Console A\. Now fire the clear cue 999\.5\. Waiting 59 s\.$/);
  assert.match(view.hint, /An arrival is not a picture\..*check the playback app\.$/);
  assert.deepEqual(view.steps.map(step => [step.state, step.detail]), [['pass', '2:00:09 PM · from Console A'], ['wait', '59 s left']]);

  // The clear cue arrives.
  const cleared = feedOf({ seq: 9, recent: [...hit.data.recent, cue(9, '999.5', { at: NOW + 20000 })] }, NOW + 20500);
  const done = midiTestStep(run, cleared, NOW + 20500);
  assert.deepEqual([done.phase, done.clear.seq, midiTestRunning(done)], ['cleared', 9, false]);
  assert.deepEqual([midiTestView(done, context(cleared)).state, midiTestView(done, context(cleared)).title], ['ok', 'Pass: cue and clear both arrived']);
  assert.equal(midiTestStep(done, cleared, NOW + 99000), done, 'a finished test does not change');
  // The clear cue never comes.
  const late = midiTestStep(run, hit, NOW + 9500 + 60000);
  assert.deepEqual([late.phase, midiTestView(late, context(hit)).state], ['clear-missing', 'attention']);
  assert.match(midiTestView(late, context(hit)).text, /Clear cue 999\.5 was not seen in 60 s\. The test picture may still be up/);
});

test('a MIDI test that hears nothing says which side to check, and never blames a stopped listener on the console', () => {
  const quiet = feedOf({ seq: 2 });
  const run = midiTestStart(quiet, NOW);
  assert.equal(midiTestStep(run, feedOf({ seq: 2 }, NOW + 29000), NOW + 29999), run);
  const timeout = midiTestStep(run, feedOf({ seq: 2, lastRowAt: new Date(NOW + 29000).toISOString() }, NOW + 30000), NOW + 30000);
  assert.equal(timeout.phase, 'timeout');
  let view = midiTestView(timeout, { feed: quiet, relay: up, lock: false, now: NOW + 30000 });
  assert.deepEqual([view.state, view.title, view.steps[0].state], ['attention', 'Timed out: cue 999 did not arrive', 'fail']);
  assert.match(view.text, /Check the console side: the cue on the console, the cable, and the MIDI interface\.$/);
  assert.equal(view.hint, 'The playback app is not the cause when nothing arrives.');
  // A cue that lands in the same reading as the deadline still counts.
  const justInTime = feedOf({ seq: 3, recent: [cue(3, '999', { at: NOW + 29900 })] }, NOW + 30000);
  assert.equal(midiTestStep(run, justInTime, NOW + 31000).phase, 'waiting-clear');

  // The listener stops during the wait: no result, not a failed cue.
  const stopped = midiTestStep(run, feedOf({ seq: 2, state: 'stopped', lastRowAt: ago(100000) }, NOW + 30000), NOW + 30000);
  assert.equal(stopped.phase, 'stopped');
  view = midiTestView(stopped, { feed: quiet, relay: up, lock: false, now: NOW + 30000 });
  assert.deepEqual([view.state, view.title, view.steps[0].state], ['eye', 'No result: the listener stopped', 'cannot']);
  assert.match(view.text, /This is not a failed cue\.$/);
  // The page's own copy of the feed going old is treated the same way.
  assert.equal(midiTestStep(run, feedOf({ seq: 2 }, NOW - 60000), NOW + 30000).phase, 'stopped');
  // A relay restart gives the feed a new identity, so sequence numbers no longer compare.
  assert.equal(midiTestStep(run, feedOf({ feedId: 'feed-2', seq: 1, recent: [cue(1, '999', { at: NOW + 1000 })] }, NOW + 2000), NOW + 2000).phase, 'interrupted');

  const idle = (feed, lock = false, relay = up) => midiTestBlocked({ relay, lock, feed, now: NOW });
  assert.equal(idle(feedOf()), '');
  assert.equal(idle(feedOf(), true), 'Show Lock is on. The MIDI test is locked.');
  assert.equal(idle(feedOf(), null), 'Show Lock not read.');
  assert.equal(idle(noFeed), 'No cue feed is connected, so a cue cannot be seen arriving.');
  assert.equal(idle({ status: 'absent' }), 'No cue feed is connected, so a cue cannot be seen arriving.');
  assert.equal(idle(feedOf({ state: 'stopped' })), 'The listener has stopped, so a cue cannot be seen arriving.');
  assert.equal(idle(feedOf(), false, lost), 'Relay not answering.');
  assert.deepEqual([midiTestView(null, { feed: noFeed, relay: up, lock: false, now: NOW }).title, midiTestView(null, { feed: noFeed, relay: up, lock: false, now: NOW }).text], ['Not run yet', 'No cue feed is connected, so a cue cannot be seen arriving.']);
  assert.match(midiTestView(null, { feed: feedOf(), relay: up, lock: false, now: NOW }).text, /^Tap Start, then fire cue 999 on the console inside 30 seconds\.$/);
  assert.equal(midiTestView({ ...run, phase: 'cancelled', endedAt: NOW }, { feed: quiet, relay: up, lock: false, now: NOW }).text, 'Stopped before a cue arrived. No result.');
});

test('a document is shown as text: markdown headings become headings and nothing becomes markup', () => {
  assert.deepEqual(textBlocks('# Title\n\nFirst line\nsecond line\n\n## Part\n1. step <b>one</b>\n\n<script>alert(1)</script>', 'md'),
    [{ kind: 'h1', text: 'Title' }, { kind: 'p', text: 'First line\nsecond line' }, { kind: 'h2', text: 'Part' }, { kind: 'p', text: '1. step <b>one</b>' }, { kind: 'p', text: '<script>alert(1)</script>' }]);
  assert.deepEqual(textBlocks('# not a heading here\n{"a":1}', 'json'), [{ kind: 'pre', text: '# not a heading here\n{"a":1}' }]);
  assert.deepEqual(textBlocks('line', 'txt'), [{ kind: 'pre', text: 'line' }]);
});

const PAGE_FILES = ['show.html', 'show.js', 'show-model.js', 'show-know.js', 'show.css', 'projector-control.js', 'projector-control-model.js', 'projector-control.css'];
test('the page source holds no address, number, name or contact, writes one route and sends no MIDI', async () => {
  const source = {};
  for (const name of PAGE_FILES) source[name] = await readFile(new URL(`../public/${name}`, import.meta.url), 'utf8');
  for (const [name, text] of Object.entries(source)) {
    assert.doesNotMatch(text, /\b(?:192\.168\.\d{1,3}|10\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}|100\.\d{1,3}\.\d{1,3})\.(?:\d{1,3}|x)\b/, `${name} hard-codes a private address`);
    assert.doesNotMatch(text, /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/, `${name} holds a phone number`);
    assert.doesNotMatch(text, /\.ts\.net|\.local\b/, `${name} names a host`);
    assert.doesNotMatch(text, /sms:|tel:|mailto:|call for help|snapshot for a text/i, `${name} still carries the help or contact control`);
    assert.doesNotMatch(text, /requestMIDIAccess|MIDIOutput|\.send\(\s*\[/, `${name} can send MIDI`);
  }
  const scripts = ['show.js', 'show-know.js', 'projector-control.js', 'projector-control-model.js', 'show-model.js'].map(name => source[name]).join('\n');
  const routes = [...scripts.matchAll(/(?:fetch|readJson|get)\((?:`|')(api\/[a-z-]+(?:\/[a-z-]+)?)/g)].map(match => match[1]);
  assert.deepEqual([...new Set(routes)].sort(), ['api/command', 'api/crew-links', 'api/cue-feed', 'api/host-checks', 'api/host-displays', 'api/know', 'api/state'], 'relative relay routes only');
  assert.match(source['show-know.js'], /const fileUrl = file => `api\/know\/file\?f=\$\{encodeURIComponent\(file\)\}`/);
  assert.deepEqual([...scripts.matchAll(/method: '(\w+)'/g)].map(match => match[1]), ['POST'], 'one write, the command route');
  assert.match(source['show.js'], /fetch\('api\/command', \{ method: 'POST'/);
  assert.deepEqual([...new Set([...scripts.matchAll(/cmd: '(\w+)'/g)].map(match => match[1]))], ['power', 'shutter']);
  assert.doesNotMatch(scripts, /api\/(?:lock|preset|projector|power-schedules|discover|preferred-input|health-reports|logout|sim|picture)/);
  assert.doesNotMatch(scripts, /innerHTML|insertAdjacentHTML|outerHTML|document\.write|eval\(|new Function/, 'nothing is inserted as markup');
  const html = source['show.html'];
  assert.doesNotMatch(html, /\s(?:src|href)="\/(?!\/)/, 'relative URLs, so the page works behind a path prefix');
  assert.deepEqual([...html.matchAll(/https?:\/\/[^"'\s<]+/g)].map(match => match[0]).filter(url => !url.startsWith('http://localhost:8080/show.html')), [], 'no external host');
  assert.match(html, /Shared sign-in/);
  assert.match(html, /It does not record who sent it\./);
  assert.deepEqual([...html.matchAll(/role="tab" id="t-(\w+)"/g)].map(match => match[1]), ['control', 'setup', 'midi', 'know']);
});

test('the relay serves the page with a full head, and hides it behind the login when a passcode is set', async () => {
  const assets = [['show.js', /javascript/], ['show-model.js', /javascript/], ['show-know.js', /javascript/], ['projector-control.js', /javascript/], ['projector-control-model.js', /javascript/], ['show.css', /text\/css/], ['projector-control.css', /text\/css/]];
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
    for (const [asset, type] of assets) {
      const response = await fetch(`${relay.base}/${asset}`);
      assert.equal(response.status, 200, asset);
      assert.match(response.headers.get('content-type'), type, asset);
    }
  } finally { await relay.close(); }

  const locked = await startRelay({ PJ_PASSCODE: 'simulator-only-code' });
  try {
    for (const asset of ['show.html', ...assets.map(([name]) => name)]) {
      const response = await fetch(`${locked.base}/${asset}`, { redirect: 'manual' });
      assert.equal(response.status, 302, asset);
      assert.equal(response.headers.get('location'), `/login.html?next=${encodeURIComponent('/' + asset)}`);
    }
    for (const route of ['host-displays', 'cue-feed', 'host-checks', 'know', 'know/file?f=signal-flow.svg', 'crew-links']) assert.equal((await fetch(`${locked.base}/api/${route}`)).status, 401, route);
    assert.equal((await fetch(`${locked.base}/api/command`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slot: 'P2', cmd: 'shutter', arg: 1 }) })).status, 401);
  } finally { await locked.close(); }
});

test('the relay rules this page leans on: reviewed target, power off in two steps, Show Lock and an unreached lane', async () => {
  const relay = await startRelay();
  try {
    const of = async slot => (await relay.state()).projectors.find(p => p.slot === slot);
    const target = async slot => [{ slot, revision: (await of(slot)).controlRevision }];
    const send = async (slot, cmd, arg, extra = {}) => relay.api('command', { slot, cmd, arg, expectedTargets: await target(slot), ...extra });

    // Power on is one step at the relay; the page adds its own confirm.
    assert.equal((await send('P2', 'power', 1)).body.P2.result, 'OK');
    await until(async () => (await of('P2')).status.power === 'on', 15000);
    assert.equal((await send('P2', 'shutter', 0)).body.P2.result, 'OK');
    await until(async () => (await of('P2')).status.shutter === 'open');

    // Power off: the first request sends nothing and returns a one-use confirmation for the target.
    let reply = await send('P2', 'power', 0);
    assert.deepEqual([typeof reply.body.P2.confirm, reply.body.P2.targets, (await of('P2')).status.power], ['string', ['P2'], 'on']);
    const used = reply.body.P2.confirm;
    reply = await send('P2', 'power', 0, { confirm: used });
    assert.equal(reply.body.P2.result, 'OK');
    await until(async () => ['cooling', 'off'].includes((await of('P2')).status.power));
    // The confirmation cannot be used twice: a second use only returns a new one.
    await until(async () => (await of('P2')).status.power === 'off', 15000);
    await send('P2', 'power', 1);
    await until(async () => (await of('P2')).status.power === 'on', 15000);
    reply = await send('P2', 'power', 0, { confirm: used });
    assert.deepEqual([typeof reply.body.P2.confirm, reply.body.P2.result, (await of('P2')).status.power], ['string', undefined, 'on']);

    // Show Lock: the relay blocks power off and still allows the shutter and power on. The page is stricter about power on.
    assert.equal((await relay.api('lock', { lock: true })).body.lock, true);
    reply = await send('P2', 'power', 0);
    assert.deepEqual([reply.status, reply.body.error], [423, 'show lock is on']);
    assert.equal((await send('P2', 'shutter', 1)).body.P2.result, 'OK');
    await until(async () => (await of('P2')).status.shutter === 'closed');
    await relay.api('lock', { lock: false });

    // A target that changed since the page drew it is refused before anything is sent.
    reply = await relay.api('command', { slot: 'P2', cmd: 'shutter', arg: 0, expectedTargets: [{ slot: 'P2', revision: 'f'.repeat(64) }] });
    assert.equal(reply.status, 409);
    assert.equal((await of('P2')).status.shutter, 'closed');

    // A lane the relay cannot reach refuses every command, which is why the page blocks it first.
    await relay.api('sim', { slot: 'P2', offline: true });
    await until(async () => !(await of('P2')).status.online);
    for (const [cmd, arg] of [['shutter', 0], ['power', 1], ['power', 0]]) { reply = await send('P2', cmd, arg); assert.match(reply.body.P2?.error || reply.body.error, /offline/, `${cmd} ${arg}`); }
  } finally { await relay.close(); }
});

// The crew notes link is optional. Its address lives in a private file beside the rig, never in the source.
const NOTES = 'https://notes.example.test/crew';
test('the crew notes address is accepted only as a plain http or https link', () => {
  assert.equal(cleanLink(NOTES), NOTES);
  assert.equal(cleanLink('http://notes.example.test:8443'), 'http://notes.example.test:8443/');
  for (const bad of ['', null, 42, 'notes.example.test', 'javascript:alert(1)', 'data:text/html,x', 'file:///etc/hosts', 'https://user:secret@notes.example.test/',
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
});
