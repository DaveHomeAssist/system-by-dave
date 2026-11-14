// Cancellation applies to read-only polling, never replays a projector command.
export function throwIfAborted(signal) {
  if (signal?.aborted) throw signal.reason || new Error('Projector poll cancelled');
}

export function abortable(promise, signal) {
  if (!signal) return promise;
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason || new Error('Projector poll cancelled'));
    if (signal.aborted) { promise.catch(() => {}); abort(); return; }
    signal.addEventListener('abort', abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

export function transportFailure(error) {
  return /^(?:E(?:CONN|HOST|NET|PIPE|TIMEDOUT|AI_|NOTFOUND)|POLL_)/.test(error?.code || '') ||
    /^(?:timeout|connection closed|Projector poll)/i.test(error?.message || '');
}
