// A successful poll does not mean every optional field was reported.
// Consumers can show a cached value, but must label it separately from current state.
export function fieldFeedback(projector, field, connection) {
  const status = projector?.status || {};
  const value = status[field];
  const present = value != null && value !== '' && value !== 'unknown';
  const current = present && !!connection?.current && !status.stale?.includes(field);
  return { value, present, current, lastKnown: present && !current };
}

export function feedbackAge(ageMs) {
  if (!Number.isFinite(ageMs) || ageMs < -1000) return 'Time unavailable';
  const seconds = Math.max(0, Math.floor(ageMs / 1000));
  if (seconds < 2) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
