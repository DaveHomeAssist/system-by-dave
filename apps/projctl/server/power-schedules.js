import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const TIME_ZONE = 'America/New_York';
const MAX_GAP_MS = 3000;
const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
function localParts(ms) { return Object.fromEntries(formatter.formatToParts(new Date(ms)).filter(p => p.type !== 'literal').map(p => [p.type, p.value])); }
function localInstant(year, month, day, hour, minute) {
  const nominal = Date.UTC(year, month - 1, day, hour, minute), offsets = new Set();
  for (const delta of [-36, 0, 36]) {
    const sample = nominal + delta * 3600000, p = localParts(sample);
    offsets.add(Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - sample);
  }
  const candidates = [...offsets].map(offset => nominal - offset).filter(ms => {
    const p = localParts(ms); return +p.year === year && +p.month === month && +p.day === day && +p.hour === hour && +p.minute === minute;
  }).sort((a, b) => a - b);
  return candidates[0] ?? null; // Spring gap: skip. Fall repeat: first occurrence only.
}
export function nextOccurrence(schedule, after) {
  const p = localParts(after), [hour, minute] = schedule.time.split(':').map(Number);
  for (let offset = 0; offset < 9; offset++) {
    const date = new Date(Date.UTC(+p.year, +p.month - 1, +p.day + offset));
    if (!schedule.days.includes(date.getUTCDay())) continue;
    const ms = localInstant(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), hour, minute);
    if (ms !== null && ms > after) return ms;
  }
  return null;
}
const iso = ms => new Date(ms).toISOString();
const failure = message => Object.assign(new Error(message), { status: 400 });
function atomicWrite(file, value) {
  const temporary = file + '.tmp', fd = fs.openSync(temporary, 'w', 0o600);
  try { fs.writeFileSync(fd, JSON.stringify(value, null, 2) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(temporary, file);
}
export function scheduledPowerGuard({ assigned, online, lastReplyAt, busy, lock, power }, action, at = Date.now(), maxAgeMs = 15000) {
  if (!assigned) return 'Projector is unassigned.';
  const reply = Date.parse(lastReplyAt || '');
  if (!online || !Number.isFinite(reply) || at - reply > maxAgeMs || reply > at + 1000) return 'No fresh online projector feedback.';
  if (busy) return 'Projector is busy.';
  if (lock && action === 'off') return 'Show lock is on; power off skipped.';
  if (action === 'on' && power === 'cooling') return 'Projector is cooling.';
  return null;
}
export function createPowerSchedules({ file, targets, dispatch, guard, now = Date.now, changed = () => {}, maxGapMs = MAX_GAP_MS }) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const claims = file + '.claims'; fs.mkdirSync(claims, { recursive: true, mode: 0o700 });
  let state;
  try { state = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw new Error('Saved power schedules are unreadable; scheduling was not started.'); state = { version: 1, schedules: [], audit: [], lastEvaluatedAt: iso(now()) }; }
  if (state.version !== 1 || !Array.isArray(state.schedules) || !Array.isArray(state.audit) || !Number.isFinite(Date.parse(state.lastEvaluatedAt))) throw new Error('Saved power schedules have an invalid shape; scheduling was not started.');
  for (const s of state.schedules) {
    if (typeof s.id !== 'string' || typeof s.name !== 'string' || typeof s.enabled !== 'boolean' || !['on','off'].includes(s.action) || s.timeZone !== TIME_ZONE || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s.time || '') || !Array.isArray(s.days) || !s.days.length || s.days.some(d => !Number.isInteger(d) || d < 0 || d > 6) || !Array.isArray(s.targets) || !s.targets.length || s.targets.some(t => typeof t.slot !== 'string' || typeof t.identity !== 'string') || !Number.isFinite(Date.parse(s.updatedAt))) throw new Error('Saved power schedules have an invalid shape; scheduling was not started.');
  }
  let inFlight = false, timer, closed = false, engineError = null, lastPersistedAt = now();
  const persist = () => { atomicWrite(file, state); lastPersistedAt = now(); };
  function audit(schedule, status, detail = {}) {
    const entry = { id: randomUUID(), scheduleId: schedule.id, name: schedule.name, at: iso(now()), status, ...detail };
    state.audit.push(entry); if (state.audit.length > 300) state.audit.splice(0, state.audit.length - 300);
    return entry;
  }
  function missed(from, to, reason) {
    for (const s of state.schedules.filter(s => s.enabled)) {
      const due = nextOccurrence(s, from);
      if (due !== null && due <= to) audit(s, 'skipped', { dueAt: iso(due), throughAt: iso(to), reason });
    }
  }
  // Startup never executes an elapsed occurrence, including the current minute.
  const boot = now(), previous = Date.parse(state.lastEvaluatedAt);
  if (boot >= previous) { missed(previous, boot, 'Relay stopped or restarted; missed occurrences are not replayed.'); state.lastEvaluatedAt = iso(boot); }
  for (const entry of state.audit) if (entry.status === 'claimed') { entry.status = 'interrupted'; entry.reason = 'Relay stopped after claiming this occurrence; it will not replay.'; }
  persist();
  const identities = slots => slots.map(slot => {
    const target = targets().find(p => p.slot === slot);
    if (!target?.assigned) throw failure(`${slot}: choose an assigned projector before scheduling.`);
    return { slot, identity: target.identity };
  });
  function validate(input) {
    if (!input || typeof input.name !== 'string' || !input.name.trim() || input.name.length > 80) throw failure('Name the schedule (80 characters maximum).');
    if (!['on', 'off'].includes(input.action)) throw failure('Choose power on or power off.');
    if (input.timeZone !== TIME_ZONE) throw failure(`Use ${TIME_ZONE}.`);
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.time || '')) throw failure('Choose an explicit time in HH:mm format.');
    if (!Array.isArray(input.days) || !input.days.length || input.days.some(d => !Number.isInteger(d) || d < 0 || d > 6)) throw failure('Choose at least one day (Sunday=0 through Saturday=6).');
    if (!Array.isArray(input.slots) || !input.slots.length || input.slots.length > 16 || input.slots.some(s => typeof s !== 'string')) throw failure('Choose explicit projector targets.');
    if (input.enabled === true) throw failure('Save first, then explicitly enable the schedule.');
    return { name: input.name.trim(), action: input.action, timeZone: TIME_ZONE, time: input.time, days: [...new Set(input.days)].sort(), targets: identities([...new Set(input.slots)]) };
  }
  function view() {
    const at = now(), planningAnchor = Math.max(at, Date.parse(state.lastEvaluatedAt));
    return { engine: { state: engineError ? 'stopped' : timer ? 'running' : 'ready', reason: engineError }, timeZone: TIME_ZONE, maxLatenessMs: maxGapMs, schedules: state.schedules.map(s => {
      const planned = nextOccurrence(s, planningAnchor), lastRun = [...state.audit].reverse().find(e => e.scheduleId === s.id && ['claimed','acknowledged','skipped','partial','failed','interrupted'].includes(e.status)) || null;
      const targetChanged = s.targets.some(t => { const current = targets().find(p => p.slot === t.slot); return !current?.assigned || current.identity !== t.identity; });
      return { id: s.id, name: s.name, slots: s.targets.map(t => t.slot), action: s.action, days: s.days, time: s.time, timeZone: s.timeZone, enabled: s.enabled, nextRunAt: s.enabled && planned !== null ? iso(planned) : null, nextPlannedAt: planned === null ? null : iso(planned), targetChanged, lastRun, createdAt: s.createdAt, updatedAt: s.updatedAt };
    }), audit: state.audit.slice(-100), clockPausedUntil: at < Date.parse(state.lastEvaluatedAt) ? state.lastEvaluatedAt : null };
  }
  function notify() { changed(view()); }
  function save(input) {
    const fields = validate(input), existing = input.id ? state.schedules.find(s => s.id === input.id) : null;
    if (input.id && !existing) throw failure('Schedule not found.');
    if (!existing && state.schedules.length >= 64) throw failure('Schedule limit reached (64).');
    const item = { id: existing?.id || randomUUID(), revision: (existing?.revision || 0) + 1, createdAt: existing?.createdAt || iso(now()), ...fields, enabled: false, updatedAt: iso(now()) };
    if (existing) Object.assign(existing, item); else state.schedules.push(item);
    audit(item, 'saved', { reason: 'Saved disabled. Explicit enable is required; no power command sent.' }); persist(); notify(); return view();
  }
  function enable(id, enabled) {
    if (typeof enabled !== 'boolean') throw failure('Choose an explicit enabled state.');
    const s = state.schedules.find(s => s.id === id); if (!s) throw failure('Schedule not found.');
    if (enabled && s.targets.some(t => { const current = targets().find(p => p.slot === t.slot); return !current?.assigned || current.identity !== t.identity; })) throw failure('Projector configuration changed; review and save the targets again.');
    if (enabled && state.schedules.some(other => other.id !== id && other.enabled && other.time === s.time && other.days.some(day => s.days.includes(day)) && other.targets.some(target => s.targets.some(t => t.slot === target.slot)))) throw failure('Another enabled schedule targets the same projector at that day/time; resolve the overlap first.');
    s.enabled = enabled; s.revision = (s.revision || 0) + 1; s.enabledAt = iso(now()); s.updatedAt = iso(now());
    audit(s, enabled ? 'enabled' : 'disabled', { reason: 'No power command sent.' }); persist(); notify(); return view();
  }
  function remove(id) {
    const s = state.schedules.find(s => s.id === id); if (!s) throw failure('Schedule not found.');
    state.schedules = state.schedules.filter(s => s.id !== id); audit(s, 'deleted'); persist(); notify(); return view();
  }
  function claim(s, due) {
    const date = localParts(due), key = `${s.id}:${date.year}-${date.month}-${date.day}`;
    const file = path.join(claims, createHash('sha256').update(key).digest('hex') + '.json');
    let fd;
    try { fd = fs.openSync(file, 'wx', 0o600); }
    catch (error) { if (error.code === 'EEXIST') return null; throw error; }
    try { fs.writeFileSync(fd, JSON.stringify({ occurrence: key, dueAt: iso(due), claimedAt: iso(now()) }) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    return audit(s, 'claimed', { occurrence: key, dueAt: iso(due), targets: {} });
  }
  async function tick() {
    if (closed || inFlight) return;
    inFlight = true;
    try {
      const at = now(), from = Date.parse(state.lastEvaluatedAt);
      if (at < from) return; // Backward clock: pause until the last observed time.
      if (at - from > maxGapMs) { missed(from, at, 'Scheduler was delayed or the computer slept; missed occurrences are not replayed.'); state.lastEvaluatedAt = iso(at); persist(); notify(); return; }
      const work = [];
      for (const s of state.schedules.filter(s => s.enabled)) {
        const due = nextOccurrence(s, Math.max(from, Date.parse(s.enabledAt || s.updatedAt)));
        if (due === null || due > at) continue;
        const entry = claim(s, due);
        if (entry) work.push({ s: structuredClone(s), due, entry }); else audit(s, 'skipped', { dueAt: iso(due), reason: 'Occurrence already claimed; no duplicate firing.' });
      }
      state.lastEvaluatedAt = iso(at); if (work.length || at - lastPersistedAt >= 30000) persist(); // Claims/checkpoint are durable before dispatch; idle writes are bounded.
      await Promise.all(work.map(async ({ s, due, entry }) => {
        await Promise.all(s.targets.map(async target => {
          const assertSafe = () => {
            const currentSchedule = state.schedules.find(item => item.id === s.id);
            const reason = closed ? 'Scheduling stopped before dispatch.' : !currentSchedule?.enabled || currentSchedule.revision !== s.revision ? 'Schedule changed, disabled or deleted before dispatch.' : now() - due > maxGapMs ? 'Occurrence is now overdue; skipped without replay.' : !targets().some(p => p.slot === target.slot && p.assigned && p.identity === target.identity) ? 'Projector configuration changed.' : guard(target.slot, s.action);
            if (reason) throw Object.assign(new Error(reason), { scheduleSkip: true });
          };
          try { assertSafe(); await dispatch(target.slot, s.action, assertSafe); entry.targets[target.slot] = { status: 'acknowledged' }; }
          catch (error) { entry.targets[target.slot] = { status: error.scheduleSkip ? 'skipped' : 'failed', reason: String(error.message || 'Command failed').slice(0, 240) }; }
          persist(); notify();
        }));
        const outcomes = Object.values(entry.targets).map(t => t.status);
        entry.status = outcomes.every(s => s === 'acknowledged') ? 'acknowledged' : outcomes.every(s => s === 'skipped') ? 'skipped' : outcomes.every(s => s === 'failed') ? 'failed' : 'partial';
        entry.completedAt = iso(now()); persist(); notify();
      }));
    } finally { inFlight = false; }
  }
  return { view, save, enable, remove, tick, start() { if (!timer) timer = setInterval(() => tick().catch(() => { clearInterval(timer); timer = null; closed = true; engineError = 'Power scheduling stopped after a storage or execution error. No automatic retry.'; changed(view()); }), 1000).unref(); }, close() { if (closed) return; closed = true; clearInterval(timer); timer = null; try { persist(); } catch { /* Claims are already durable; startup never catches up missed runs. */ } } };
}
