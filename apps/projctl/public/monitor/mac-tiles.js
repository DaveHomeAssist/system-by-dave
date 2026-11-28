// Show Mac tiles for the Rig page: one per Mac, green, red or stale, from the reports the Macs send.
// Pure model, no DOM: the page renders it and the unit tests check it. A tile is green only while the
// Mac's own latest report says ok and is fresh. Anything else is never shown as live.
import { MACS } from './monitor-data.js';

export const STALE_FALLBACK_MS = 3 * 60 * 1000;
const ZONE = 'America/New_York';
const clock = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });
export const reportTime = value => { const t = Date.parse(value); return Number.isFinite(t) ? clock.format(new Date(t)) : '—'; };
export const agoText = ms => ms < 5000 ? 'just now' : ms < 60000 ? `${Math.round(ms / 1000)} s ago` : ms < 3600000 ? `${Math.round(ms / 60000)} min ago` : 'over an hour ago';

const WORDS = { ok: 'OK', fault: 'Fault', stale: 'Stale', starting: 'Starting', none: 'No report', unknown: 'Unknown' };
const PHASE = { startup: 'startup checks', watch: 'watching' };
const failing = checks => (checks || []).filter(c => c.status === 'FAIL');
const noted = checks => (checks || []).filter(c => c.status === 'CHANGED' || c.status === 'WARN');

// view: the relay's /api/mac-status answer (or null); fetchedAt: when this page received it (ms);
// connected: whether the page has a live relay connection at all.
export function tileModels({ view, fetchedAt = 0, now = Date.now(), connected = true, attempted = true, specs = MACS } = {}) {
  const staleAfterMs = view?.staleAfterMs > 0 ? view.staleAfterMs : STALE_FALLBACK_MS;
  const byHost = new Map((view?.hosts || []).map(h => [h.host, h]));
  const known = new Set(specs.map(s => s.host));
  const extra = (view?.hosts || []).filter(h => !known.has(h.host)).map(h => ({ host: h.host, name: h.host, role: h.role || '', machine: h.hostName || '' }));
  return [...specs, ...extra].map(spec => {
    const title = spec.role ? `${spec.name} · ${spec.role}` : spec.name;
    const base = { host: spec.host, title, machine: spec.machine || '', state: 'unknown', word: WORDS.unknown, line: '', failing: null, notes: [], practice: false, lastKnown: '' };
    if (!connected) return { ...base, word: attempted ? 'Relay offline' : 'Connecting', line: attempted ? 'Reports come through the relay, which this page cannot reach.' : 'Waiting for the relay.' };
    if (!view) return { ...base, line: 'The reports could not be read just now.' };
    const h = byHost.get(spec.host);
    if (!h) return { ...base, state: 'none', word: WORDS.none, line: 'No report since this relay started. A Mac reports about once a minute while its checks app runs.' };
    const age = Math.max(0, h.ageMs + (now - fetchedAt));
    const stale = age > staleAfterMs;
    const fails = failing(h.checks), phase = PHASE[h.phase] || h.phase;
    const state = stale ? 'stale' : h.state === 'fault' ? 'fault' : h.state === 'running' ? 'starting' : 'ok';
    const skew = Math.abs(h.clockSkewMs || 0) > 120000 ? `This Mac's clock is ${Math.round(Math.abs(h.clockSkewMs) / 60000)} min ${h.clockSkewMs > 0 ? 'ahead' : 'behind'}.` : '';
    return {
      ...base, state, word: WORDS[state], practice: h.execution !== 'mac',
      line: `Last report ${reportTime(h.reportedAt)} · ${phase} · ${agoText(age)}`,
      failing: state === 'fault' && fails.length ? { label: fails[0].label, observed: fails[0].observed, more: fails.length - 1 } : null,
      notes: state === 'ok' || state === 'fault' ? [...noted(h.checks).map(c => `${c.label}: ${c.observed}`), ...(skew ? [skew] : [])] : skew ? [skew] : [],
      lastKnown: stale ? (h.state === 'fault' && fails.length ? `Last known: fault · ${fails[0].label}` : `Last known: ${h.state === 'running' ? 'starting' : h.state}`) : '',
    };
  });
}

export const tileSummary = models => {
  const count = state => models.filter(m => m.state === state).length;
  const parts = [];
  if (count('fault')) parts.push(`${count('fault')} fault`);
  if (count('stale') + count('none')) parts.push(`${count('stale') + count('none')} not reporting`);
  if (count('starting')) parts.push(`${count('starting')} starting`);
  if (count('ok')) parts.push(`${count('ok')} ok`);
  return parts.length ? parts.join(' · ') : 'Waiting for the relay';
};
