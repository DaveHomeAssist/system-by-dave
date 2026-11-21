// Show Mac status reports. Each show Mac's checks app sends a small JSON report here; the relay keeps
// the latest one per Mac in memory and the Rig page shows it. Nothing here sends a command: accepting
// a report only stores it. See docs/mac-status.md.
import { timingSafeEqual } from 'node:crypto';

export const REPORT_SCHEMA = 'frozen-startup.status-report.v1';
export const VIEW_SCHEMA = 'projctl.mac-status.v1';
export const REPORT_MAX_BYTES = 16 * 1024;
export const STALE_AFTER_MS = 3 * 60 * 1000;
export const MAX_HOSTS = 8;
export const MIN_TOKEN_LENGTH = 24;

const PHASES = ['startup', 'watch'];
const STATES = ['running', 'ok', 'fault'];
const EXECUTIONS = ['mac', 'offline fixture'];
const STATUSES = ['PASS', 'FAIL', 'CHANGED', 'WARN', 'NOT CONFIGURED', 'NOT RUN', 'RUNNING'];
const KEYS = ['schema', 'host', 'hostName', 'role', 'phase', 'state', 'reportedAt', 'execution', 'runID', 'cycle', 'intervalSeconds', 'checks', 'message'];
const CHECK_KEYS = ['id', 'label', 'status', 'observed'];
const CONTROL = /[\u0000-\u001f\u007f]/;

const reject = (message, status = 400) => Object.assign(new Error(message), { status });
const text = (value, field, { min = 0, max }) => {
  if (typeof value !== 'string' || value.length < min || value.length > max || CONTROL.test(value)) throw reject(`${field} must be ${min ? 'a' : 'a short'} string of ${min} to ${max} characters without control characters`);
  return value;
};
const whole = (value, field, min, max) => {
  if (!Number.isInteger(value) || value < min || value > max) throw reject(`${field} must be a whole number from ${min} to ${max}`);
  return value;
};
const oneOf = (value, field, list) => {
  if (!list.includes(value)) throw reject(`${field} must be one of ${list.join(', ')}`);
  return value;
};

// Strict: only the documented fields, with documented types and limits. What is stored is exactly what was checked.
export function validateReport(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw reject('report must be a JSON object');
  for (const key of Object.keys(value)) if (!KEYS.includes(key)) throw reject(`unknown field "${key.slice(0, 40).replace(CONTROL, '?')}"`);
  if (value.schema !== REPORT_SCHEMA) throw reject(`schema must be ${REPORT_SCHEMA}`);
  const host = text(value.host, 'host', { min: 1, max: 32 });
  if (!/^[a-z0-9][a-z0-9-]*$/.test(host)) throw reject('host must be a short lowercase label such as m5');
  const report = { schema: REPORT_SCHEMA, host };
  if (value.hostName !== undefined) report.hostName = text(value.hostName, 'hostName', { min: 1, max: 80 });
  if (value.role !== undefined) {
    report.role = text(value.role, 'role', { min: 1, max: 24 });
    if (!/^[a-z][a-z-]*$/.test(report.role)) throw reject('role must be lowercase letters and hyphens');
  }
  report.phase = oneOf(value.phase, 'phase', PHASES);
  report.state = oneOf(value.state, 'state', STATES);
  report.execution = oneOf(value.execution, 'execution', EXECUTIONS);
  const at = text(value.reportedAt, 'reportedAt', { min: 10, max: 40 });
  if (!Number.isFinite(Date.parse(at))) throw reject('reportedAt must be an ISO 8601 time');
  report.reportedAt = new Date(at).toISOString();
  if (value.runID !== undefined) {
    report.runID = text(value.runID, 'runID', { min: 1, max: 64 });
    if (!/^[A-Za-z0-9-]+$/.test(report.runID)) throw reject('runID must be letters, digits and hyphens');
  }
  if (value.cycle !== undefined) report.cycle = whole(value.cycle, 'cycle', 0, 1e9);
  if (value.intervalSeconds !== undefined) report.intervalSeconds = whole(value.intervalSeconds, 'intervalSeconds', 10, 600);
  if (value.message !== undefined) report.message = text(value.message, 'message', { max: 240 });
  if (!Array.isArray(value.checks) || !value.checks.length || value.checks.length > 24) throw reject('checks must list between 1 and 24 checks');
  const seen = new Set();
  report.checks = value.checks.map((check, index) => {
    if (!check || typeof check !== 'object' || Array.isArray(check)) throw reject(`checks[${index}] must be an object`);
    for (const key of Object.keys(check)) if (!CHECK_KEYS.includes(key)) throw reject(`checks[${index}] has an unknown field`);
    const id = text(check.id, `checks[${index}].id`, { min: 1, max: 32 });
    if (!/^[a-z][a-z0-9-]*$/.test(id) || seen.has(id)) throw reject(`checks[${index}].id must be a unique lowercase label`);
    seen.add(id);
    return { id, label: text(check.label, `checks[${index}].label`, { min: 1, max: 60 }), status: oneOf(check.status, `checks[${index}].status`, STATUSES),
      observed: text(check.observed, `checks[${index}].observed`, { max: 240 }) };
  });
  // A report cannot say ok while a check failed, or fault with nothing failing: the tile must never contradict its own list.
  const failing = report.checks.some(c => c.status === 'FAIL');
  if (report.state === 'ok' && failing) throw reject('state ok cannot include a failing check');
  if (report.state === 'fault' && !failing) throw reject('state fault must name a failing check');
  return report;
}

export function createMacStatus({ now = Date.now, staleAfterMs = STALE_AFTER_MS, maxHosts = MAX_HOSTS, simulation = false } = {}) {
  const latest = new Map(); // host -> { report, receivedAt }
  return {
    // Stores one report. The relay's own clock decides when it arrived, so a Mac with a wrong clock cannot look fresh.
    accept(value) {
      const report = validateReport(value);
      if (report.execution !== 'mac' && !simulation) throw reject('offline fixture reports are only accepted by a practice-mode relay');
      if (!latest.has(report.host) && latest.size >= maxHosts) throw reject(`this relay keeps reports for at most ${maxHosts} Macs`, 409);
      const receivedAt = now();
      latest.set(report.host, { report, receivedAt });
      return { ok: true, host: report.host, receivedAt: new Date(receivedAt).toISOString() };
    },
    view(at = now()) {
      const hosts = [...latest.values()].map(({ report, receivedAt }) => {
        const ageMs = Math.max(0, at - receivedAt);
        return { ...report, receivedAt: new Date(receivedAt).toISOString(), ageMs, stale: ageMs > staleAfterMs, clockSkewMs: Date.parse(report.reportedAt) - receivedAt };
      }).sort((a, b) => a.host.localeCompare(b.host));
      return { schema: VIEW_SCHEMA, at: new Date(at).toISOString(), staleAfterMs, simulation, hosts };
    },
    get size() { return latest.size; },
  };
}

// What a show Mac may read about the projectors: power, shutter and whether each one is replying. Read only,
// and nothing that identifies a device (no address, credentials or serial).
export function projectorSummary({ projectors, status, maxStatusAgeMs, now = Date.now }) {
  const at = now();
  return {
    ok: true, at: new Date(at).toISOString(),
    projectors: projectors().map(p => {
      const s = status(p.slot) || {}, last = s.connection?.lastSuccessAt || null, age = last ? at - Date.parse(last) : Infinity;
      return { slot: p.slot, lane: p.lane || null, online: !!s.online, current: !!s.online && s.connection?.state === 'online' && age >= -1000 && age <= maxStatusAgeMs,
        power: s.power || 'unknown', shutter: s.shutter || 'unknown', lastReplyAt: last };
    }),
  };
}

// The status token: a separate, write-only credential for the show Macs, so the controller passcode never has to
// be copied onto them. It opens exactly the routes in STATUS_ROUTES and nothing else.
export const STATUS_ROUTES = new Set(['POST /api/mac-status', 'GET /api/mac-status/projectors']);

export function statusToken(env = process.env) {
  const token = String(env.PROJCTL_STATUS_TOKEN || '').trim();
  if (!token) return '';
  if (token.length < MIN_TOKEN_LENGTH || /\s/.test(token)) throw new Error(`PROJCTL_STATUS_TOKEN must be at least ${MIN_TOKEN_LENGTH} characters with no spaces`);
  return token;
}

export function bearerToken(req) {
  const header = req.headers.authorization;
  return typeof header === 'string' && /^Bearer [^\s]{1,512}$/.test(header) ? header.slice(7) : '';
}

export function tokenMatches(presented, expected) {
  if (!expected || !presented) return false;
  const a = Buffer.from(presented), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
