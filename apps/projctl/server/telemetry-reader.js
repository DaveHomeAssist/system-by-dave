import { abortable, throwIfAborted, transportFailure } from './drivers/transport.js';

// Status polls and report reads share a slot queue. Retry waits leave the queue
// available to polls, and different projectors can still be read concurrently.
export function createTelemetryReader({ wait = sleep, retryDelayMs = 4000 } = {}) {
  const queue = new Map();

  function enqueue(slot, read, signal) {
    const work = (queue.get(slot) || Promise.resolve()).then(() => {
      throwIfAborted(signal);
      return read();
    });
    const tail = work.catch(() => {}).finally(() => {
      if (queue.get(slot) === tail) queue.delete(slot);
    });
    queue.set(slot, tail);
    // A cancelled caller returns promptly. The queue retains ownership until
    // the driver settles, so a late response cannot overlap the next read.
    return abortable(work, signal);
  }

  return {
    poll(slot, read, { signal } = {}) { return enqueue(slot, read, signal); },
    async read(slot, driver, { signal, attempts = 1, onPartial } = {}) {
      const tries = Math.min(3, Math.max(1, Math.floor(Number(attempts)) || 1));
      for (let attempt = 1; ; attempt++) {
        try {
          return await enqueue(slot, () => driver.healthReadings({ signal, onPartial }), signal);
        } catch (error) {
          throwIfAborted(signal);
          if (attempt >= tries || !transportFailure(error)) {
            if (attempt > 1 && error && typeof error === 'object') error.attempts = attempt;
            throw error;
          }
          await abortable(Promise.resolve().then(() => wait(retryDelayMs, signal)), signal);
        }
      }
    },
  };
}

export function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    throwIfAborted(signal);
    const cleanup = () => signal?.removeEventListener('abort', abort);
    const abort = () => { clearTimeout(timer); cleanup(); reject(signal.reason || new Error('Telemetry read cancelled')); };
    const timer = setTimeout(() => { cleanup(); resolve(); }, ms);
    timer.unref?.();
    signal?.addEventListener('abort', abort, { once: true });
  });
}
