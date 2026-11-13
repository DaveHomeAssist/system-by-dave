import { hdmiSource, patternIsOff, supportsPatterns } from './output-recovery.js';

export function nextOperatorAction(projector, connection, lock) {
  if (!projector) return null;
  const status = projector.status || {};
  if (!connection.current) return { id: 'connection', action: 'details', text: 'Open Details to check the connection.' };
  if (Object.values(status.errors || {}).some(value => value > 0)) return { id: 'fault', action: 'details', text: 'Open Details to review the reported fault or warning.' };
  if (lock || projector.busy || status.power !== 'on') return null;
  const stale = new Set(status.stale || []);
  if (stale.has('power')) return null;
  if (supportsPatterns(projector) && status.pattern != null && !stale.has('pattern') && !patternIsOff(status.pattern)) {
    return { id: 'pattern', action: 'clear', text: 'Clear the active test pattern when you are ready for video.' };
  }
  const hdmi = hdmiSource(projector);
  if (hdmi != null && status.input != null && !stale.has('input') && String(status.input) !== hdmi) {
    return { id: 'input', action: 'reset', text: 'Reset to HDMI when you are ready for the video feed.' };
  }
  return null;
}
