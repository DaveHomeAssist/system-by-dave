// Display freshness and recovery only; never changes targets or starts a retry.
const eastern = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });
const timestamp = value => typeof value === 'number' ? (Number.isFinite(value) && Math.abs(value) <= 8.64e15 ? value : NaN) : typeof value === 'string' ? Date.parse(value) : NaN;
const time = value => Number.isFinite(timestamp(value)) ? eastern.format(new Date(timestamp(value))) : null;
export function createConnectionMonitor() {
  const history = new Map();
  return (projector, relayConnected, pollIntervalMs = 5000, now = Date.now()) => {
    const s = projector?.status || {}, c = s.connection || {};
    const lastSuccessAt = c.lastSuccessAt ?? (s.online ? s.updatedAt : null);
    const age = now - timestamp(lastSuccessAt);
    const fresh = Number.isFinite(age) && age >= -1000 && age <= Math.max(15000, pollIntervalMs * 3);
    const current = !!(projector && relayConnected && s.online && fresh && (!c.state || c.state === 'online'));
    const key = projector ? JSON.stringify([projector.slot, projector.driver, projector.ip, projector.mac]) : null;
    let record = history.get(key);
    if (key && !record) { record = {}; history.set(key, record); if (history.size > 64) history.delete(history.keys().next().value); }
    // A relay/browser disconnect alone is not evidence of projector recovery.
    if (record && relayConnected && !current && lastSuccessAt) record.lostAt = timestamp(lastSuccessAt);
    if (record && current && record.lostAt != null && timestamp(lastSuccessAt) > record.lostAt) { record.recoveredUntil = now + 10000; delete record.lostAt; }
    const recovered = current && record?.recoveredUntil > now;
    const unassigned = !projector || c.state === 'unassigned' || !projector.ip;
    const state = unassigned ? 'unassigned' : !relayConnected ? 'disconnected' : current ? 'online' : c.state === 'checking' ? 'checking' : s.online ? 'stale' : 'reconnecting';
    const label = state === 'unassigned' ? 'Unassigned' : state === 'disconnected' ? 'Relay disconnected' : state === 'online' ? recovered ? 'Reply recovered' : 'Reply received' : state === 'checking' ? 'Checking saved IP' : state === 'stale' ? 'Stale reply' : 'Reconnecting';
    const retry = state === 'reconnecting' ? c.nextRetryAt && time(c.nextRetryAt) ? `Next retry ${time(c.nextRetryAt)}` : 'Retry in progress' : '';
    const missed = c.state === 'online' && c.consecutiveFailures > 0 ? `. ${c.consecutiveFailures} poll missed; commands still accepted` : '';
    return { current, state, recovered, label, lastSuccessAt, lastReply: time(lastSuccessAt) || 'No successful reply yet', retry,
      detail: `${label}${['checking','reconnecting'].includes(state) ? ` to saved IP ${projector.ip}` : ''}${missed}` };
  };
}
