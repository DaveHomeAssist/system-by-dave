// HTTP ingress limits: bounded JSON bodies, trusted-proxy client identity and bounded login throttling.
import net from 'node:net';

export const JSON_BODY_BYTES = 64 * 1024;
export const LOGIN_BODY_BYTES = 4 * 1024;
export const BODY_TIMEOUT_MS = 10000;
export const DEFAULT_TRUSTED_PROXIES = '127.0.0.1,::1'; // tailscale serve forwards from loopback

const httpError = (status, message, extra = {}) => Object.assign(new Error(message), { status }, extra);
const utf8 = new TextDecoder('utf-8', { fatal: true });

export function normalizeIp(value) {
  if (typeof value !== 'string') return '';
  const ip = value.trim();
  return /^::ffff:/i.test(ip) && net.isIP(ip.slice(7)) === 4 ? ip.slice(7) : ip;
}

export function parseJsonObject(bytes) {
  let text;
  try { text = utf8.decode(bytes); } catch { throw httpError(400, 'request body must be UTF-8 JSON'); }
  if (!text.trim()) return {};
  let value;
  try { value = JSON.parse(text); } catch { throw httpError(400, 'request body is not valid JSON'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw httpError(400, 'request body must be a JSON object');
  return value;
}

// Oversize and stalled bodies close the connection so unread bytes cannot be reused as a next request.
export function readJsonBody(req, { maxBytes = JSON_BODY_BYTES, timeoutMs = BODY_TIMEOUT_MS } = {}) {
  const declared = req.headers['content-length'];
  if (declared !== undefined && Number(declared) > maxBytes) return Promise.reject(httpError(413, `request body exceeds ${maxBytes} bytes`, { closeConnection: true }));
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0, done = false;
    const finish = (error, value) => {
      if (done) return;
      done = true; clearTimeout(timer);
      req.off('data', onData); req.off('end', onEnd); req.off('error', onError); req.off('close', onClose);
      if (error) { req.resume(); reject(error); } else resolve(value); // drain the rest until the socket closes
    };
    const onData = (chunk) => {
      size += chunk.length;
      if (size > maxBytes) return finish(httpError(413, `request body exceeds ${maxBytes} bytes`, { closeConnection: true }));
      chunks.push(chunk);
    };
    const onEnd = () => { try { finish(null, parseJsonObject(Buffer.concat(chunks, size))); } catch (error) { finish(error); } };
    const onError = () => finish(httpError(400, 'request body could not be read', { closeConnection: true }));
    const onClose = () => finish(httpError(400, 'request closed before its body completed', { closeConnection: true }));
    const timer = setTimeout(() => finish(httpError(408, 'request body timed out', { closeConnection: true })), timeoutMs);
    req.on('data', onData); req.once('end', onEnd); req.once('error', onError); req.once('close', onClose);
  });
}

// Forwarding headers are honored only from listed proxy addresses (literal IPs, not hostnames or CIDR).
export function proxyPolicy(raw = process.env.PROJCTL_TRUSTED_PROXIES ?? DEFAULT_TRUSTED_PROXIES) {
  if (typeof raw !== 'string') throw new Error('PROJCTL_TRUSTED_PROXIES must be comma-separated IP addresses');
  const entries = raw.trim() ? raw.split(',').map(normalizeIp) : [];
  if (entries.length > 64 || entries.some((ip) => !net.isIP(ip))) throw new Error('PROJCTL_TRUSTED_PROXIES must be comma-separated IP addresses');
  const list = new net.BlockList();
  for (const ip of entries) list.addAddress(ip, net.isIP(ip) === 4 ? 'ipv4' : 'ipv6');
  const trusted = (address) => {
    const ip = normalizeIp(address), family = net.isIP(ip);
    return entries.length > 0 && family !== 0 && list.check(ip, family === 4 ? 'ipv4' : 'ipv6');
  };
  const header = (req, name) => {
    const value = req.headers?.[name];
    return typeof value === 'string' && value.length <= 2048 ? value.split(',').map((part) => part.trim()) : null;
  };
  return {
    trusted,
    clientAddress(req) {
      const peer = normalizeIp(req.socket?.remoteAddress) || 'unknown';
      if (!trusted(peer)) return peer;
      const hops = header(req, 'x-forwarded-for');
      if (!hops) return peer;
      // Walk back from the nearest hop; the first address that is not itself a trusted proxy is the client.
      for (let i = hops.length - 1; i >= 0; i--) {
        const hop = normalizeIp(hops[i]);
        if (!net.isIP(hop)) return peer; // malformed chain: attribute the request to the proxy itself
        if (!trusted(hop)) return hop;
      }
      return normalizeIp(hops[0]);
    },
    isHttps(req) {
      if (req.socket?.encrypted) return true;
      if (!trusted(req.socket?.remoteAddress)) return false;
      const proto = header(req, 'x-forwarded-proto');
      return !!proto && proto.at(-1).toLowerCase() === 'https';
    },
  };
}

// Failed logins back off exponentially per client. The table is bounded: expired records are
// forgotten, idle ones are evicted first, and active lockouts are never evicted. When every slot
// holds an active lockout, unknown clients share one overflow record instead of escaping the limit.
export function createLoginThrottle({ maxEntries = 1024, baseMs = 1000, maxMs = 60000, forgetMs = 15 * 60 * 1000, now = Date.now } = {}) {
  const records = new Map(); // key -> { failures, until, seenAt }, oldest activity first
  let overflow = null;
  const stale = (r, t) => r.until <= t && t - r.seenAt >= forgetMs;
  function lookup(key, t) {
    if (overflow && stale(overflow, t)) overflow = null;
    const r = records.get(key);
    if (r && stale(r, t)) { records.delete(key); return null; }
    return r || null;
  }
  function hasRoom(t, evict) {
    if (records.size < maxEntries) return true;
    for (const [key, r] of records) if (stale(r, t)) records.delete(key);
    if (records.size < maxEntries) return true;
    for (const [key, r] of records) if (r.until <= t) { if (evict) records.delete(key); return true; }
    return false;
  }
  return {
    retryAfterMs(key) {
      const t = now();
      const r = lookup(key, t) ?? (overflow && !hasRoom(t, false) ? overflow : null);
      return r && r.until > t ? r.until - t : 0;
    },
    fail(key) {
      const t = now();
      let r = lookup(key, t);
      if (r) records.delete(key);
      else if (hasRoom(t, true)) r = { failures: 0, until: 0, seenAt: t };
      else r = overflow ??= { failures: 0, until: 0, seenAt: t };
      r.failures = Math.min(r.failures + 1, 30);
      r.until = t + Math.min(maxMs, baseMs * 2 ** r.failures);
      r.seenAt = t;
      if (r !== overflow) records.set(key, r);
      return r.until - t;
    },
    succeed(key) { records.delete(key); },
    get size() { return records.size; },
  };
}

// headersTimeout and requestTimeout bound how long a client may take to send a request.
// They do not limit how long the relay spends answering (lens moves, polls).
export function applyServerLimits(server, { headersTimeoutMs = 15000, requestTimeoutMs = 30000 } = {}) {
  server.headersTimeout = headersTimeoutMs;
  server.requestTimeout = requestTimeoutMs;
  return server;
}
