const KEY = 'projctl.ui.v1';
const VIEWS = ['rig', 'all', 'health', 'presets', 'stage', 'info'];
const defaults = () => ({ version: 1, theme: 'light', lastLane: 'A', lastView: 'rig', favoritePatterns: {}, presetNameTemplate: 'Preshow', showSuggestions: true, dismissedSuggestions: [] });

export function normalizePreferences(value) {
  const clean = defaults();
  if (!value || value.version !== 1) return clean;
  if (['light', 'dark'].includes(value.theme)) clean.theme = value.theme;
  if (/^[A-D]$/.test(value.lastLane)) clean.lastLane = value.lastLane;
  if (VIEWS.includes(value.lastView)) clean.lastView = value.lastView;
  if (typeof value.presetNameTemplate === 'string') clean.presetNameTemplate = value.presetNameTemplate.trim().slice(0, 64);
  if (typeof value.showSuggestions === 'boolean') clean.showSuggestions = value.showSuggestions;
  if (Array.isArray(value.dismissedSuggestions)) clean.dismissedSuggestions = [...new Set(value.dismissedSuggestions.filter(x => ['pattern', 'input', 'fault', 'connection'].includes(x)))].slice(0, 4);
  if (/^[A-D]$/.test(value.comparisonLane)) clean.comparisonLane = value.comparisonLane;
  if (value.favoritePatterns && typeof value.favoritePatterns === 'object') {
    for (const [model, codes] of Object.entries(value.favoritePatterns).slice(0, 16)) {
      if (model.length <= 128 && !['__proto__', 'constructor', 'prototype'].includes(model) && Array.isArray(codes)) {
        clean.favoritePatterns[model] = [...new Set(codes.filter(code => typeof code === 'string' && code.length <= 80))].slice(0, 4);
      }
    }
  }
  return clean;
}

export function createOperatorPreferences(getStorage = () => localStorage) {
  let value = defaults(), storage;
  try {
    storage = getStorage();
    const saved = storage.getItem(KEY);
    value = normalizePreferences(saved ? JSON.parse(saved) : { version: 1, theme: storage.getItem('theme') });
  } catch { /* Preferences remain usable for this session. */ }
  const persist = () => {
    try { storage ||= getStorage(); storage.setItem(KEY, JSON.stringify(value)); return true; }
    catch { return false; }
  };
  return {
    get value() { return value; },
    update(patch) { value = normalizePreferences({ ...value, ...patch, version: 1 }); return persist(); },
    reset() { value = defaults(); return persist(); },
  };
}

export const patternPreferenceKey = projector => `${projector.driver}:${projector.model}`;
