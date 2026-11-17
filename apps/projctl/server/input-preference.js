// Resolve a preferred source from reported/saved metadata, never model-wide numbers.
export function resolveInputPreference(inputs, preferred = 'HDMI') {
  const entries = Object.entries(inputs || {}).map(([value, label]) => ({ value, label: String(label) }));
  const normalize = value => String(value).trim().toUpperCase();
  const exact = entries.filter(entry => normalize(entry.label) === normalize(preferred));
  const candidates = exact.length ? exact : entries.filter(entry => /^HDMI(?:[ _-]*\d+)?$/i.test(entry.label.trim()));
  if (candidates.length === 1) return { label: candidates[0].label, value: candidates[0].value, available: true, reason: null };
  return { label: preferred, value: null, available: false, reason: candidates.length
    ? `Choose a specific HDMI source: ${candidates.map(entry => entry.label).join(', ')}.`
    : 'No supported HDMI source has been reported.' };
}
