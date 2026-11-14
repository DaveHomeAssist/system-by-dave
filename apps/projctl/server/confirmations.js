import { randomUUID } from 'node:crypto';

// A confirmation authorizes one action over the exact targets shown on the first tap.
export function confirmations({ now = Date.now, ttlMs = 3000 } = {}) {
  const pending = new Map();
  function prune() {
    for (const [token, entry] of pending) if (entry.expires <= now()) pending.delete(token);
  }
  return {
    issue(key, targets) {
      prune();
      if (pending.size >= 256) pending.delete(pending.keys().next().value);
      const token = randomUUID();
      pending.set(token, { key, targets, expires: now() + ttlMs });
      return token;
    },
    take(key, token) {
      prune();
      const entry = pending.get(token);
      if (!entry || entry.key !== key) return null;
      pending.delete(token);
      return entry.targets;
    },
    clear() { pending.clear(); },
  };
}
