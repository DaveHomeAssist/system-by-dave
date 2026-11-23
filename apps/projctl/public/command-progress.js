export function commandProgress(projector, connection, now = Date.now()) {
  const record = projector?.commandFeedback;
  if (!record || !['power', 'shutter'].includes(record.field) ||
      !['waiting', 'confirmed', 'unconfirmed'].includes(record.phase)) return null;
  const label = `${record.field === 'power' ? 'Power' : 'Shutter'} ${String(record.expected).toUpperCase()}`;
  const seconds = record.phase === 'waiting' ? Math.max(0, Math.floor((now - record.startedAt) / 1000)) : record.elapsedSeconds;
  if (!connection.current) return record.phase === 'waiting'
    ? { phase: 'waiting', text: `${label} requested. Connection lost; confirmation unavailable.` } : null;
  if (record.phase === 'confirmed') {
    if (projector.status?.[record.field] !== record.expected || projector.status?.stale?.includes(record.field)) return null;
    return { phase: 'confirmed', text: `${label} confirmed by projector in ${seconds} s.` };
  }
  if (record.phase === 'unconfirmed') return { phase: 'unconfirmed', text: `${label} not confirmed after ${seconds} s. Check projector before retrying.` };
  const transitional = record.field === 'power' && ['warming', 'cooling'].includes(projector.status?.power);
  const action = transitional ? (projector.status.power === 'warming' ? 'Warming up' : 'Cooling down') : `Waiting for ${label}`;
  return { phase: 'waiting', text: `${action} · ${seconds} s since request. Checking feedback.` };
}

export function samePendingCommand(projector, field, expected) {
  const r = projector?.commandFeedback;
  return r?.phase === 'waiting' && r.field === field && r.expected === expected;
}
