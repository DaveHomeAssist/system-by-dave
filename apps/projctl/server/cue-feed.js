import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { StringDecoder } from 'node:string_decoder';

// Listen-only cue feed. A separate observer on the relay computer appends JSON lines to a file;
// this reader tails that file and reports what arrived. It never sends MIDI and never writes.
//
//   {"type":"midi","hex":"f07f03","length":3,"direction":"incoming","name":"<source>","endpoint":1,"unixSeconds":1795049476.12}
//   {"type":"heartbeat","unixSeconds":1795049480,"sources":2,"destinations":2}
//   {"type":"source_added","name":"<source>","unixSeconds":1795049400}
//
// One Show Control message arrives as consecutive midi rows whose hex fragments join into
//   f0 7f <device> 02 <format> <command> <cue ascii> 00 <list ascii> f7      (command 01 is GO)
export const LISTENER_STALE_MS = 90000;
export const FIRST_READ_BYTES = 256 * 1024;
const READ_CHUNK_BYTES = 256 * 1024;
const MAX_READ_BYTES = 4 * 1024 * 1024; // per call; a longer backlog is finished by the next call
const MAX_LINE_CHARS = 64 * 1024;
const MAX_MESSAGE_BYTES = 512;
const MAX_RECENT = 40;
const MAX_ENDPOINTS = 16;
const MAX_SOURCES = 16;
const FEED_FILE = /\.(?:jsonl|ndjson|log)$/i;
const COMMANDS = Object.freeze({ 1: 'go', 2: 'stop', 3: 'resume', 4: 'timed-go', 5: 'load', 6: 'set', 7: 'fire', 8: 'all-off', 9: 'restore', 10: 'reset', 11: 'go-off' });

const label = value => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80) : '';

// "f0 7f 03" or "f07f03" -> [240, 127, 3]. Anything else is not a fragment.
export function hexBytes(value) {
  if (typeof value !== 'string') return null;
  const hex = value.replace(/[\s:,-]/g, '');
  if (!hex || hex.length % 2 || hex.length > MAX_MESSAGE_BYTES * 2 || /[^0-9a-f]/i.test(hex)) return null;
  const out = [];
  for (let i = 0; i < hex.length; i += 2) out.push(Number.parseInt(hex.slice(i, i + 2), 16));
  return out;
}

// Cue numbers compare by value: "0999", "999" and "999.0" are the same cue.
export function cueKey(value) {
  const text = String(value ?? '').trim();
  if (!/^\d+(?:\.\d+)*$/.test(text)) return text;
  return text.split('.').map(part => String(Number(part))).join('.').replace(/(?:\.0)+$/, '');
}

// A complete MIDI Show Control message, or null for any other system exclusive message.
export function parseShowControl(bytes) {
  if (!Array.isArray(bytes) || bytes.length < 7 || bytes[0] !== 0xf0 || bytes[1] !== 0x7f || bytes[3] !== 0x02 || bytes.at(-1) !== 0xf7) return null;
  const parts = [[]];
  for (const byte of bytes.slice(6, -1)) {
    if (byte === 0) parts.push([]);
    else if (byte >= 0x20 && byte < 0x7f) parts.at(-1).push(String.fromCharCode(byte));
    else return null;
  }
  const [cue = '', list = '', cuePath = ''] = parts.map(part => part.join('').slice(0, 40));
  return { device: bytes[2], format: bytes[4], commandCode: bytes[5], command: COMMANDS[bytes[5]] || `command-${bytes[5]}`, cue: cue ? cueKey(cue) : null, list: list || null, path: cuePath || null };
}

// The configured path may be one file or a folder of rotated files. A folder follows its newest feed file.
async function resolveFile(target) {
  const stat = await fs.stat(target);
  if (stat.isFile()) return { file: target, stat };
  if (!stat.isDirectory()) return null;
  let best = null;
  for (const name of (await fs.readdir(target)).filter(entry => FEED_FILE.test(entry) && !entry.startsWith('.')).slice(0, 500)) {
    const file = path.join(target, name);
    const entry = await fs.stat(file).catch(() => null);
    if (!entry?.isFile()) continue;
    if (!best || entry.mtimeMs > best.stat.mtimeMs || (entry.mtimeMs === best.stat.mtimeMs && name > path.basename(best.file))) best = { file, stat: entry };
  }
  return best;
}

export function createCueFeed({ now = Date.now, firstReadBytes = FIRST_READ_BYTES } = {}) {
  const feedId = randomUUID();
  let target = null, current = null, pending = new Map(), seq = 0, inflight = null;
  let feed = fresh();
  function fresh() { return { lastRowAt: null, heartbeatAt: null, sources: null, destinations: null, names: [], recent: [], lastCue: null, skippedLines: 0, rotations: 0 }; }

  function complete(bytes, at, source) {
    const message = parseShowControl(bytes);
    if (!message) return; // some other system exclusive message
    const record = { seq: ++seq, at: new Date(at).toISOString(), source, ...message };
    feed.recent.push(record);
    if (feed.recent.length > MAX_RECENT) feed.recent.shift();
    if (record.command === 'go' && record.cue) feed.lastCue = record;
  }

  function midi(row, at) {
    if (row.direction != null && row.direction !== 'incoming') return;
    const bytes = hexBytes(row.hex);
    if (!bytes) { feed.skippedLines++; return; }
    const source = label(row.name), key = `${row.endpoint ?? ''}|${source}`;
    let open = pending.get(key) || null;
    for (const byte of bytes) {
      if (byte === 0xf0) open = { bytes: [byte], at };          // a new message abandons an unfinished one
      else if (!open || byte >= 0xf8) continue;                  // channel data, or a realtime byte inside a message
      else if (byte === 0xf7) { open.bytes.push(byte); complete(open.bytes, open.at, source); open = null; }
      else if (byte >= 0x80) open = null;                        // another status byte ends the message unfinished
      else { open.bytes.push(byte); if (open.bytes.length > MAX_MESSAGE_BYTES) open = null; }
    }
    if (open) { pending.delete(key); pending.set(key, open); if (pending.size > MAX_ENDPOINTS) pending.delete(pending.keys().next().value); }
    else pending.delete(key);
  }

  function ingest(line) {
    let row;
    try { row = JSON.parse(line); } catch { feed.skippedLines++; return; }
    const at = Number(row?.unixSeconds) * 1000;
    if (!row || typeof row !== 'object' || !Number.isFinite(at) || at <= 0 || at > 8.64e15) { feed.skippedLines++; return; }
    if (feed.lastRowAt == null || at > feed.lastRowAt) feed.lastRowAt = at;
    if (row.type === 'heartbeat') {
      feed.heartbeatAt = at;
      feed.sources = Number.isInteger(row.sources) && row.sources >= 0 ? row.sources : null;
      feed.destinations = Number.isInteger(row.destinations) && row.destinations >= 0 ? row.destinations : null;
    } else if (row.type === 'source_added' || row.type === 'source_removed') {
      const name = label(row.name);
      feed.names = feed.names.filter(item => item !== name);
      if (name && row.type === 'source_added') { feed.names.push(name); if (feed.names.length > MAX_SOURCES) feed.names.shift(); }
    } else if (row.type === 'midi') midi(row, at);
  }

  async function tail(resolved) {
    const { file, stat } = resolved;
    if (!current || current.file !== file || current.ino !== stat.ino || current.dev !== stat.dev || stat.size < current.offset) {
      if (current) feed.rotations++;
      const offset = Math.max(0, stat.size - firstReadBytes);
      // Starting inside a file: the first piece is the tail of a line, not a row.
      current = { file, ino: stat.ino, dev: stat.dev, offset, partial: '', skipFirst: offset > 0, decoder: new StringDecoder('utf8') };
      pending = new Map();
    }
    if (stat.size <= current.offset) return;
    const handle = await fs.open(file, 'r');
    try {
      const end = Math.min(stat.size, current.offset + MAX_READ_BYTES), buffer = Buffer.alloc(READ_CHUNK_BYTES);
      while (current.offset < end) {
        const { bytesRead } = await handle.read(buffer, 0, Math.min(buffer.length, end - current.offset), current.offset);
        if (!bytesRead) break;
        current.offset += bytesRead;
        const lines = (current.partial + current.decoder.write(buffer.subarray(0, bytesRead))).split('\n');
        // The last piece has no newline yet. It is held and finished by a later read.
        current.partial = lines.pop();
        if (current.partial.length > MAX_LINE_CHARS) { current.partial = ''; current.skipFirst = true; feed.skippedLines++; }
        for (const raw of lines) {
          if (current.skipFirst) { current.skipFirst = false; continue; }
          const line = raw.trim();
          if (line) ingest(line);
        }
      }
    } finally { await handle.close(); }
  }

  function view(state, reason) {
    const at = now(), age = feed.lastRowAt == null ? null : at - feed.lastRowAt;
    const iso = value => value == null ? null : new Date(value).toISOString();
    const base = { feedId, now: new Date(at).toISOString(), staleAfterMs: LISTENER_STALE_MS, seq };
    if (state) return { ...base, state, reason, lastRowAt: null, heartbeatAt: null, sources: null, destinations: null, sourceNames: [], lastCue: null, recent: [], skippedLines: 0 };
    const listening = age != null && age <= LISTENER_STALE_MS && age >= -5000;
    return { ...base, state: listening ? 'listening' : 'stopped',
      reason: listening ? null : age == null ? 'The observer file has no rows yet.' : age < -5000 ? 'The observer file is dated in the future.' : 'No row from the listener inside the limit.',
      lastRowAt: iso(feed.lastRowAt), heartbeatAt: iso(feed.heartbeatAt), sources: feed.sources, destinations: feed.destinations,
      sourceNames: [...feed.names], lastCue: feed.lastCue, recent: [...feed.recent], skippedLines: feed.skippedLines };
  }

  async function read(configured) {
    if (!configured) { target = null; current = null; pending = new Map(); feed = fresh(); return view('not-configured', 'No observer file is set in the relay\'s private settings.'); }
    if (configured !== target) { target = configured; current = null; pending = new Map(); feed = fresh(); }
    let resolved;
    try { resolved = await resolveFile(target); }
    catch (error) { return error.code === 'ENOENT' ? view('missing', 'The observer file is not there.') : view('unreadable', 'The observer file could not be read.'); }
    if (!resolved) return view('missing', 'The observer folder has no feed file yet.');
    try { await tail(resolved); } catch { return view('unreadable', 'The observer file could not be read.'); }
    return view();
  }

  // One read at a time: two pages asking together share the same pass over the file.
  return { read: configured => (inflight ??= read(configured).finally(() => { inflight = null; })) };
}
