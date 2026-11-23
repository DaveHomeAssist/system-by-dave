// Cue feed reader: a listen-only observer appends JSON lines to a file and the relay tails it.
// Fixtures only. Nothing here sends MIDI or touches a console.
import test from 'node:test';
import assert from 'node:assert/strict';
import { appendFile, mkdir, mkdtemp, rename, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createCueFeed, parseShowControl, hexBytes, cueKey, LISTENER_STALE_MS } from '../server/cue-feed.js';
import { readHostPaths, cleanPath } from '../server/host-paths.js';
import { startRelay } from './relay-helper.js';

const T0 = Date.parse('2026-11-18T23:00:00Z');
const hex = bytes => bytes.map(byte => byte.toString(16).padStart(2, '0')).join('');
const ascii = text => [...text].map(char => char.charCodeAt(0));
// f0 7f <device> 02 <format> <command> <cue> 00 <list> f7
const msc = (cue, { list = '1', command = 1, device = 3 } = {}) => [0xf0, 0x7f, device, 0x02, 0x01, command, ...ascii(cue), 0x00, ...ascii(list), 0xf7];
const row = (bytes, at, extra = {}) => JSON.stringify({ type: 'midi', hex: hex(bytes), length: bytes.length, direction: 'incoming', name: 'Console A', endpoint: 2666519, unixSeconds: at / 1000, utc: new Date(at).toISOString(), ...extra });
// The observer writes one message as several rows.
const fragments = (bytes, at, extra, sizes = [3, 3, 4]) => { const rows = []; let i = 0, n = 0; while (i < bytes.length) { const size = sizes[n++] ?? 4; rows.push(row(bytes.slice(i, i + size), at, extra)); i += size; } return rows; };
const heartbeat = (at, sources = 2) => JSON.stringify({ type: 'heartbeat', unixSeconds: at / 1000, sources, destinations: 2 });
const lines = (...rows) => rows.flat(Infinity).map(item => `${item}\n`).join('');
async function folder(t) { const dir = await mkdtemp(path.join(tmpdir(), 'projctl-cue-feed-')); t.after(() => rm(dir, { recursive: true, force: true })); return dir; }

test('a Show Control message is read as command, cue and list; anything else is not a cue', () => {
  assert.deepEqual(parseShowControl(msc('999')), { device: 3, format: 1, commandCode: 1, command: 'go', cue: '999', list: '1', path: null });
  assert.deepEqual(parseShowControl(msc('999.5', { list: '2', device: 127 })), { device: 127, format: 1, commandCode: 1, command: 'go', cue: '999.5', list: '2', path: null });
  assert.equal(parseShowControl(msc('12', { command: 2 })).command, 'stop');
  assert.equal(parseShowControl([0xf0, 0x7f, 3, 0x02, 0x01, 0x01, 0xf7]).cue, null, 'GO with no cue number');
  assert.equal(parseShowControl([0xf0, 0x7f, 3, 0x02, 0x01, 0x01, ...ascii('7'), 0xf7]).list, null);
  for (const other of [[0xf0, 0x7e, 3, 0x02, 0x01, 0x01, 0x31, 0xf7], [0xf0, 0x7f, 3, 0x06, 0x02, 0xf7, 0xf7], [0x90, 0x3c, 0x7f], [0xf0, 0x7f, 3, 0x02, 0x01, 0x01, 0x31], [], null]) assert.equal(parseShowControl(other), null);
  assert.deepEqual([cueKey('0999'), cueKey('999.0'), cueKey('999.50'), cueKey(' 12 '), cueKey('A1')], ['999', '999', '999.50', '12', 'A1']);
  assert.deepEqual(hexBytes('f0 7f 03'), [0xf0, 0x7f, 3]);
  for (const bad of ['', 'f0f', 'zz', null, 12, 'f0'.repeat(600)]) assert.equal(hexBytes(bad), null);
});

test('fragments join per endpoint into one cue, with its time and source', async t => {
  const dir = await folder(t), file = path.join(dir, 'observer.jsonl');
  const feed = createCueFeed({ now: () => T0 + 5000 });
  await writeFile(file, lines(heartbeat(T0), JSON.stringify({ type: 'source_added', name: 'Console A', unixSeconds: T0 / 1000 }), fragments(msc('12'), T0 + 1000), fragments(msc('999'), T0 + 2000)));
  const view = await feed.read(file);
  assert.equal(view.state, 'listening');
  assert.deepEqual([view.sources, view.destinations, view.sourceNames], [2, 2, ['Console A']]);
  assert.deepEqual(view.recent.map(m => [m.seq, m.cue, m.command, m.list, m.source, m.at]), [[1, '12', 'go', '1', 'Console A', new Date(T0 + 1000).toISOString()], [2, '999', 'go', '1', 'Console A', new Date(T0 + 2000).toISOString()]]);
  assert.deepEqual([view.lastCue.cue, view.lastCue.seq, view.seq], ['999', 2, 2]);
  assert.equal(view.heartbeatAt, new Date(T0).toISOString());
  assert.equal(view.lastRowAt, new Date(T0 + 2000).toISOString());
  assert.equal(typeof view.feedId, 'string');
  assert.equal(view.staleAfterMs, LISTENER_STALE_MS);
});

test('two endpoints interleave without mixing, and an abandoned fragment never becomes a cue', async t => {
  const dir = await folder(t), file = path.join(dir, 'observer.jsonl');
  const feed = createCueFeed({ now: () => T0 + 5000 });
  const a = fragments(msc('1'), T0, { endpoint: 1, name: 'Console A' }), b = fragments(msc('2'), T0 + 10, { endpoint: 2, name: 'Console B' });
  const mixed = []; for (let i = 0; i < Math.max(a.length, b.length); i++) { if (a[i]) mixed.push(a[i]); if (b[i]) mixed.push(b[i]); }
  await writeFile(file, lines(mixed,
    row(msc('50').slice(0, 5), T0 + 100),                    // starts, then never finishes
    fragments(msc('51'), T0 + 200),                          // a new f0 abandons it
    row([0xf0, 0x7f, 3, 0x02, 0x01, 0x01, 0x36, 0x90, 0x3c, 0x7f, 0xf7], T0 + 300), // another status byte inside ends it unfinished
    row([0xf0, 0x7f, 3, 0xf8, 0x02, 0x01, 0x01, 0x37, 0xf7], T0 + 400),             // a realtime byte inside is skipped
    row([0x90, 0x3c, 0x7f], T0 + 500),                       // a note is not a cue
    row([0xf0, 0x7e, 0x7f, 0x06, 0x01, 0xf7], T0 + 600),     // some other system exclusive message
    row(msc('99'), T0 + 700, { direction: 'outgoing' })));   // not something the console sent in
  const view = await feed.read(file);
  assert.deepEqual(view.recent.map(m => [m.cue, m.source]), [['1', 'Console A'], ['2', 'Console B'], ['51', 'Console A'], ['7', 'Console A']]);
  assert.equal(view.skippedLines, 0);
});

test('a truncated last line is held and finished by the next read; a bad line is counted and skipped', async t => {
  const dir = await folder(t), file = path.join(dir, 'observer.jsonl');
  const feed = createCueFeed({ now: () => T0 + 5000 });
  const whole = row(msc('7'), T0);
  await writeFile(file, lines(heartbeat(T0), 'this is not json', '{"type":"midi","hex":"zz","unixSeconds":' + T0 / 1000 + '}', '{"type":"midi"}') + whole.slice(0, 40));
  let view = await feed.read(file);
  assert.deepEqual([view.recent.length, view.skippedLines, view.state], [0, 3, 'listening'], 'half a line is not a row yet');
  await appendFile(file, whole.slice(40, 70));
  assert.equal((await feed.read(file)).recent.length, 0);
  await appendFile(file, `${whole.slice(70)}\n`);
  view = await feed.read(file);
  assert.deepEqual(view.recent.map(m => m.cue), ['7']);
  assert.equal(view.skippedLines, 3);
  assert.deepEqual((await feed.read(file)).recent.map(m => m.seq), [1], 'a second read adds nothing');
});

test('a stale file means the listener stopped, which is not the same as no cue', async t => {
  const dir = await folder(t), file = path.join(dir, 'observer.jsonl');
  let now = T0 + 1000;
  const feed = createCueFeed({ now: () => now });
  await writeFile(file, lines(heartbeat(T0), fragments(msc('12'), T0 + 500)));
  assert.equal((await feed.read(file)).state, 'listening');
  now = T0 + 500 + LISTENER_STALE_MS;
  assert.equal((await feed.read(file)).state, 'listening', 'exactly at the limit still counts');
  now += 1;
  let view = await feed.read(file);
  assert.deepEqual([view.state, view.reason, view.lastCue.cue], ['stopped', 'No row from the listener inside the limit.', '12'], 'the last cue is still shown');
  await appendFile(file, lines(heartbeat(now - 1000)));
  assert.equal((await feed.read(file)).state, 'listening', 'a new heartbeat brings it back');

  const empty = path.join(dir, 'empty.jsonl');
  await writeFile(empty, '');
  view = await createCueFeed({ now: () => now }).read(empty);
  assert.deepEqual([view.state, view.reason], ['stopped', 'The observer file has no rows yet.']);
  await writeFile(empty, lines(heartbeat(now + 60000)));
  assert.equal((await createCueFeed({ now: () => now }).read(empty)).reason, 'The observer file is dated in the future.');
});

test('a folder follows its newest feed file, and a replaced file is read again from its start', async t => {
  const dir = await folder(t), logs = path.join(dir, 'observer');
  await mkdir(logs);
  const feed = createCueFeed({ now: () => T0 + 60000 });
  assert.deepEqual([(await feed.read(logs)).state, (await feed.read(logs)).reason], ['missing', 'The observer folder has no feed file yet.']);
  const first = path.join(logs, 'midi-1.jsonl'), second = path.join(logs, 'midi-2.jsonl');
  await writeFile(path.join(logs, 'notes.txt'), 'not a feed file');
  await writeFile(first, lines(heartbeat(T0), fragments(msc('1'), T0 + 1000)) + row(msc('2'), T0 + 2000).slice(0, 30)); // ends mid-line
  await utimes(first, new Date(T0), new Date(T0));
  assert.deepEqual((await feed.read(logs)).recent.map(m => m.cue), ['1']);

  // The observer rotates: a new path. The half line left in the old file is dropped, not glued on.
  await writeFile(second, lines(heartbeat(T0 + 30000), fragments(msc('3'), T0 + 31000)));
  await utimes(second, new Date(T0 + 31000), new Date(T0 + 31000));
  let view = await feed.read(logs);
  assert.deepEqual(view.recent.map(m => [m.seq, m.cue]), [[1, '1'], [2, '3']], 'earlier cues stay listed and the count carries on');
  assert.equal(view.lastCue.cue, '3');

  // The same path replaced by a new file (a rename and a fresh one) is read from its start.
  await rename(second, path.join(logs, 'midi-2.old'));
  await writeFile(second, lines(heartbeat(T0 + 40000), fragments(msc('4'), T0 + 41000)));
  await utimes(second, new Date(T0 + 41000), new Date(T0 + 41000));
  view = await feed.read(logs);
  assert.deepEqual(view.recent.map(m => m.cue), ['1', '3', '4']);

  // One file named directly works the same way, and shrinking it restarts the read.
  const single = createCueFeed({ now: () => T0 + 60000 });
  assert.deepEqual((await single.read(second)).recent.map(m => m.cue), ['4']);
  await writeFile(second, lines(fragments(msc('5'), T0 + 50000)));
  assert.deepEqual((await single.read(second)).recent.map(m => m.cue), ['4', '5']);
});

test('only the tail of a long file is read on first sight, starting at a whole line', async t => {
  const dir = await folder(t), file = path.join(dir, 'observer.jsonl');
  const old = Array.from({ length: 200 }, (_, i) => fragments(msc(String(i + 1)), T0 + i * 10));
  await writeFile(file, lines(old, heartbeat(T0 + 5000), fragments(msc('999'), T0 + 6000)));
  const view = await createCueFeed({ now: () => T0 + 7000, firstReadBytes: 2000 }).read(file);
  assert.equal(view.lastCue.cue, '999');
  assert.ok(view.recent.length < 20, 'the old part of the file was not read');
  assert.equal(view.skippedLines, 0, 'the cut landed on a line boundary, so nothing was misread');
});

test('with no path set the feed is "not configured"; a missing file says so; a new path starts clean', async t => {
  const dir = await folder(t), file = path.join(dir, 'observer.jsonl');
  const feed = createCueFeed({ now: () => T0 + 1000 });
  let view = await feed.read(null);
  assert.deepEqual([view.state, view.lastCue, view.recent, view.seq], ['not-configured', null, [], 0]);
  assert.deepEqual([(await feed.read(file)).state, (await feed.read(file)).reason], ['missing', 'The observer file is not there.']);
  await writeFile(file, lines(heartbeat(T0), fragments(msc('8'), T0)));
  assert.equal((await feed.read(file)).lastCue.cue, '8');
  const other = path.join(dir, 'other.jsonl');
  await writeFile(other, lines(heartbeat(T0)));
  view = await feed.read(other);
  assert.deepEqual([view.state, view.lastCue, view.recent], ['listening', null, []], 'cues from the old path are not shown for the new one');
  const [one, two] = await Promise.all([feed.read(other), feed.read(other)]);
  assert.deepEqual(one, two, 'two requests at once share one pass over the file');
});

test('private paths are read from host-paths.json beside the rig and must be absolute', async t => {
  const dir = await folder(t), file = path.join(dir, 'host-paths.json');
  const none = { cueObserver: null, knowFolder: null, hostChecks: null };
  assert.deepEqual(await readHostPaths(file), { ...none, state: 'not-configured' });
  await writeFile(file, JSON.stringify({ cueObserver: '/var/example/observer', knowFolder: 'relative/folder', hostChecks: 7, extra: '/x' }));
  assert.deepEqual(await readHostPaths(file), { cueObserver: '/var/example/observer', knowFolder: null, hostChecks: null, state: 'configured' });
  for (const text of ['not json', '[]', '"/var/example"', JSON.stringify({ cueObserver: '/x', pad: 'y'.repeat(9000) })]) { await writeFile(file, text); assert.deepEqual(await readHostPaths(file), { ...none, state: 'invalid' }, text.slice(0, 20)); }
  assert.deepEqual(await readHostPaths(dir), { ...none, state: 'invalid' });
  assert.equal(cleanPath('/var/example/../observer'), '/var/observer');
  for (const bad of ['', 'observer', './observer', '/var/exa\nmple', null, 5, `/${'a'.repeat(1100)}`]) assert.equal(cleanPath(bad), null);
});

test('the relay serves the cue feed behind the sign-in, from the path in its private settings', async t => {
  const dir = await folder(t), file = path.join(dir, 'observer.jsonl');
  const at = Date.now() - 2000;
  await writeFile(file, lines(heartbeat(at), fragments(msc('999'), at + 500)));
  const plain = await startRelay();
  try {
    const reply = await plain.api('cue-feed');
    assert.deepEqual([reply.status, reply.body.state, reply.body.lastCue], [200, 'not-configured', null]);
  } finally { await plain.close(); }
  const relay = await startRelay({}, { files: { 'host-paths.json': JSON.stringify({ cueObserver: file }) } });
  try {
    let reply = await relay.api('cue-feed');
    assert.deepEqual([reply.status, reply.body.state, reply.body.lastCue.cue, reply.body.lastCue.source, reply.body.sources], [200, 'listening', '999', 'Console A', 2]);
    await appendFile(file, lines(fragments(msc('999.5'), Date.now())));
    reply = await relay.api('cue-feed');
    assert.deepEqual(reply.body.recent.map(m => [m.seq, m.cue]), [[1, '999'], [2, '999.5']]);
    assert.equal((await fetch(`${relay.base}/api/cue-feed`, { method: 'POST' })).status, 405, 'read only');
  } finally { await relay.close(); }
  const locked = await startRelay({ PJ_PASSCODE: 'simulator-only-code' }, { files: { 'host-paths.json': JSON.stringify({ cueObserver: file }) } });
  try { assert.equal((await fetch(`${locked.base}/api/cue-feed`)).status, 401); } finally { await locked.close(); }
});
