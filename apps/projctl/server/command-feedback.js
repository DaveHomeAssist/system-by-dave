import { pollIdentity } from './polling.js';

// Acknowledgement may precede movement. Follow it with bounded reads, never
// another control command, then leave the ordinary idle poller in charge.
export function createCommandFeedback({ target, status, refresh, changed = () => {}, now = Date.now,
  timer = setTimeout, cancelTimer = clearTimeout }) {
  const pending = new Map(), records = new Map();
  let closed = false;
  function cancel(slot) {
    const entry = pending.get(slot);
    if (entry) cancelTimer(entry.timer);
    pending.delete(slot);
  }
  function current(slot, entry) {
    return !closed && pending.get(slot) === entry &&
      pollIdentity(target(slot) || {}) === entry.identity;
  }
  function finish(slot, entry, phase) {
    cancel(slot);
    records.set(slot, { ...entry, phase, finishedAt: now() });
    changed(slot);
  }
  function schedule(slot, entry, delay) {
    entry.timer = timer(async () => {
      if (!current(slot, entry)) {
        if (pending.get(slot) === entry) cancel(slot);
        return;
      }
      if (now() >= entry.deadline) { finish(slot, entry, 'unconfirmed'); return; }
      let refreshed = false;
      try { await refresh(slot); refreshed = true; } catch { /* the ordinary poller reports failed reads */ }
      if (!current(slot, entry)) {
        if (pending.get(slot) === entry) cancel(slot);
        return;
      }
      const reading = status(slot);
      if (refreshed && reading?.online && !reading.stale?.includes(entry.field) && reading[entry.field] === entry.expected) {
        finish(slot, entry, 'confirmed');
        return;
      }
      if (now() >= entry.deadline) { finish(slot, entry, 'unconfirmed'); return; }
      schedule(slot, entry, Math.min(entry.interval, entry.deadline - now()));
    }, delay);
    entry.timer?.unref?.();
  }
  return {
    follow(slot, field, expected, identity = pollIdentity(target(slot) || {}), startedAt = now()) {
      if (!['power', 'shutter'].includes(field)) throw new Error('Unsupported feedback field');
      if (closed) return;
      cancel(slot);
      if (pollIdentity(target(slot) || {}) !== identity) return;
      const entry = { field, expected, identity, phase: 'waiting', startedAt, interval: field === 'power' ? 5000 : 1000,
        deadline: now() + (field === 'power' ? 420000 : 30000) };
      pending.set(slot, entry);
      records.set(slot, entry);
      changed(slot);
      schedule(slot, entry, 400);
    },
    get(slot) {
      const record = records.get(slot);
      if (!record || pollIdentity(target(slot) || {}) !== record.identity) return null;
      const { field, expected, phase, startedAt, finishedAt, deadline } = record;
      return { field, expected, phase, startedAt, finishedAt: finishedAt ?? null,
        deadlineAt: deadline, elapsedSeconds: Math.round(((finishedAt ?? now()) - startedAt) / 100) / 10 };
    },
    clear(slot) {
      cancel(slot);
      if (records.delete(slot)) changed(slot);
    },
    close() {
      closed = true;
      for (const slot of pending.keys()) cancel(slot);
      records.clear();
    },
  };
}
