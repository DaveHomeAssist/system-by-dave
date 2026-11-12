import { abortable, throwIfAborted, transportFailure } from './drivers/transport.js';

// One read-only temperature reader per projector, shared by health reports and the Thermal
// watch. Reads for a slot run one after another. Each attempt starts once that projector's
// status poll has finished, so the reading opens its connections in the gap between polls
// instead of on top of one. The PT-DW830U units close a connection that arrives while another
// is open ("connection closed before Panasonic reply"), which left 3 of 6 health reports on
// 12 Nov 2026 without their temperatures.
//
// A health report asks for several attempts. The Thermal watch takes one and tries again at
// its next sample. Only connection failures are retried; a refusal or a bad reply is not.
export function createTelemetryReader({ settled = () => Promise.resolve(), wait = sleep, retryDelayMs = 1500 } = {}) {
  const queue = new Map(); // slot -> tail of that projector's read chain

  async function attempt(slot, driver, signal) {
    await abortable(Promise.resolve().then(() => settled(slot)), signal);
    throwIfAborted(signal);
    return driver.healthReadings({ signal });
  }
  async function readWithRetry(slot, driver, { signal, attempts = 1 } = {}) {
    const tries = Math.max(1, Math.floor(Number(attempts)) || 1);
    for (let n = 1; ; n++) {
      try { return await attempt(slot, driver, signal); }
      catch (error) {
        if (n >= tries || signal?.aborted || !transportFailure(error)) {
          if (n > 1 && error && typeof error === 'object') error.attempts = n;
          throw error;
        }
        await wait(retryDelayMs, signal);
      }
    }
  }
  return {
    read(slot, driver, options = {}) {
      const run = () => readWithRetry(slot, driver, options);
      const read = (queue.get(slot) || Promise.resolve()).then(run, run);
      queue.set(slot, read.catch(() => {}));
      return read;
    },
  };
}

export function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason || new Error('Projector poll cancelled'));
    const onAbort = () => { clearTimeout(t); reject(signal.reason || new Error('Projector poll cancelled')); };
    const t = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve(); }, ms);
    t.unref?.();
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
