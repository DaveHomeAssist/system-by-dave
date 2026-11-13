// One random token per login. Logout deletes that token; the process holds the
// set in memory, so a restart ends every session, as the old per-process secret did.
import { randomBytes } from 'node:crypto';

export function createSessions({ ttlMs = 90 * 24 * 60 * 60 * 1000, now = Date.now } = {}) {
  const tokens = new Map(); // token -> expires at
  function prune(t) {
    for (const [token, expires] of tokens) if (expires <= t) tokens.delete(token);
  }
  return {
    issue() {
      const t = now();
      prune(t);
      const token = randomBytes(32).toString('hex');
      tokens.set(token, t + ttlMs);
      return token;
    },
    valid(token) {
      if (typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token)) return false;
      const expires = tokens.get(token);
      if (!expires || expires <= now()) { tokens.delete(token); return false; }
      return true;
    },
    revoke(token) { tokens.delete(token); },
    revokeAll() { tokens.clear(); },
    get size() { return tokens.size; },
  };
}
