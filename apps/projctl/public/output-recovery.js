// Resolve the device's own source names. An ambiguous input stays unavailable.
export function hdmiSource(projector) {
  const preference = projector.inputPreference;
  if (preference?.available && preference.value != null && /^(?:L\d+\s+)?HDMI(?:[ _-]*\d+)?$/i.test(preference.label || projector.inputs?.[preference.value] || '')) return String(preference.value);
  const entries = Object.entries(projector.inputs || {});
  const exact = entries.filter(([, label]) => String(label).trim().toUpperCase() === 'HDMI');
  const matches = exact.length ? exact : entries.filter(([, label]) => /^(?:L\d+\s+)?HDMI(?:[ _-]*\d+)?$/i.test(String(label).trim()));
  return matches.length === 1 ? matches[0][0] : null;
}

export const supportsPatterns = p => !!p && (!!p.patterns && Object.keys(p.patterns).length > 0 || ['panasonic', 'pulse', 'simulator'].includes(p.driver));

export const patternIsOff = value => ['00', 'off', '0'].includes(String(value).toLowerCase());
const identity = p => JSON.stringify([p.slot, p.driver, p.ip, p.mac]);

export async function recoverOutput({ projector, reset, send, read, progress, timeoutMs = 15000, intervalMs = 500 }) {
  const target = identity(projector);
  const hasPatterns = supportsPatterns(projector);
  if (!reset && !hasPatterns) throw new Error('Internal pattern control is not supported by this driver.');
  const input = reset ? hdmiSource(projector) : null;
  if (reset && input == null) throw new Error('HDMI source is missing or ambiguous. Check the input list in Details.');
  const checkTarget = snapshot => {
    const current = snapshot.projectors.find(p => p.slot === projector.slot);
    if (!current || identity(current) !== target) throw new Error('Projector assignment changed. Select the projector again.');
    if (snapshot.lock) throw new Error('Show lock is on.');
    return current;
  };
  checkTarget(await read());
  let requestStarted = Date.now();
  if (hasPatterns) {
    progress('Clearing test pattern...');
    if (!await send('pattern', '00')) throw new Error('Clear pattern was not acknowledged. Check the projector status.');
  }
  if (reset) {
    const current = checkTarget(await read());
    if (hdmiSource(current) !== input) throw new Error('HDMI source changed before reset. Select the projector again.');
    progress(hasPatterns ? 'Pattern clear sent. Selecting HDMI...' : 'Selecting HDMI...');
    requestStarted = Date.now();
    if (!await send('input', input)) throw new Error(`${hasPatterns ? 'Pattern clear sent. ' : ''}HDMI was not acknowledged. Check the input status.`);
  }
  progress(reset ? hasPatterns ? 'HDMI sent. Waiting for fresh input and pattern feedback...' : 'HDMI sent. Waiting for fresh input feedback...' : 'Clear sent. Waiting for fresh pattern feedback...');
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const current = checkTarget(await read());
    const s = current.status || {};
    const reportedAt = new Date(s.connection?.lastSuccessAt || s.updatedAt || NaN).getTime();
    const fresh = reportedAt >= requestStarted && s.online && (!hasPatterns || !s.stale?.includes('pattern')) && s.connection?.state === 'online' && s.connection?.fresh !== false;
    if (fresh && (!hasPatterns || patternIsOff(s.pattern)) && (!reset || (!s.stale?.includes('input') && String(s.input) === input))) {
      return reset ? hasPatterns ? 'HDMI restored. Test pattern is off.' : 'HDMI restored. This driver does not provide internal pattern control.' : 'Test pattern cleared.';
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  throw new Error(reset ? hasPatterns ? 'Commands sent. HDMI and pattern-off feedback could not both be confirmed.' : 'HDMI sent. Fresh input feedback could not be confirmed.' : 'Clear sent. Pattern-off feedback could not be confirmed.');
}
