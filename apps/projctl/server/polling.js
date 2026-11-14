import { abortable } from './drivers/transport.js';

export const pollIdentity = (p) => JSON.stringify([p.slot, p.driver, p.ip, p.user, p.password, p.model, p.lane]);

// One bounded, disposable read per saved target. Cable recovery never scans,
// changes addresses, or replays the last control command.
export function createPoller({ target, read, started, succeeded, failed, defer,
  intervalMs = 5000, timeoutMs = 12000, maxRetryMs = 15000,
  now = Date.now, timer = setTimeout, cancelTimer = clearTimeout }) {
  const active = new Map(), scheduled = new Map(), identities = new Map(), failures = new Map();
  let closed = false;
  function schedule(slot, delay) {
    if (closed) return;
    const t = timer(() => { scheduled.delete(slot); poll(slot); }, delay);
    t?.unref?.(); scheduled.set(slot, t);
  }
  function poll(slot) {
    if (closed) return Promise.resolve();
    // A lens move owns the slot. Skip the status read instead of queueing it behind Stop.
    if (defer?.(slot)) { schedule(slot, Math.min(intervalMs, 500)); return Promise.resolve(); }
    const current = target(slot); if (!current) return Promise.resolve();
    const p = { ...current }, key = pollIdentity(p), previous = active.get(slot);
    if (previous?.key === key) return previous.work;
    if (previous) previous.controller.abort(Object.assign(new Error('Projector poll target changed'), { code: 'POLL_CHANGED' }));
    cancelTimer(scheduled.get(slot)); scheduled.delete(slot);
    const changed = identities.has(slot) && identities.get(slot) !== key;
    if (changed) failures.delete(slot);
    identities.set(slot, key);
    const controller = new AbortController(), entry = { key, controller };
    active.set(slot, entry);
    const isCurrent = () => !closed && active.get(slot) === entry && pollIdentity(target(slot) || {}) === key;
    started?.(p, { identityChanged: changed, at: now() });
    const deadline = timer(() => controller.abort(Object.assign(new Error('Projector poll timed out; retrying saved address'), { code: 'POLL_TIMEOUT' })), timeoutMs);
    deadline?.unref?.();
    entry.work = abortable(Promise.resolve().then(() => read(p, { signal: controller.signal })), controller.signal).then((value) => {
      if (!isCurrent()) return;
      failures.set(slot, 0);
      succeeded?.(p, value, { at: now() });
      schedule(slot, intervalMs);
    }, (error) => {
      if (!isCurrent()) return;
      const count = (failures.get(slot) || 0) + 1;
      failures.set(slot, count);
      const delay = Math.min(maxRetryMs, intervalMs * 2 ** Math.min(count - 1, 8));
      failed?.(p, error, { at: now(), consecutiveFailures: count, retryDelayMs: delay, nextRetryAt: now() + delay });
      schedule(slot, delay);
    }).finally(() => {
      cancelTimer(deadline);
      if (active.get(slot) === entry) active.delete(slot);
    });
    return entry.work;
  }
  return { poll,
    // Resolves when the slot has no status read in flight. Temperature reads wait for this so
    // they do not open connections to the projector in the middle of a poll.
    settled(slot) { return active.get(slot)?.work.then(() => {}, () => {}) ?? Promise.resolve(); },
    async refresh(slot) {
    // A command's verification must not reuse a read started before that command.
    const previous = active.get(slot)?.work;
    if (previous) await previous;
    return poll(slot);
  }, close() {
    closed = true;
    for (const t of scheduled.values()) cancelTimer(t);
    scheduled.clear();
    for (const e of active.values()) e.controller.abort(Object.assign(new Error('Projector poll stopped'), { code: 'POLL_STOPPED' }));
    active.clear();
  } };
}
