// Training memory shared by the FMP camera tools on housevideo.app: which
// exercises this device has tried and passed in Camera Shading Practice and the
// Camera Simulator, so each tool can suggest a next step. It is kept in one
// localStorage key (fmpTraining.v1) on this device only: nothing here reads the
// network, and the record holds exercise ids, scores and minute timestamps, never
// names or free text. Each tool's own saved session stays its source of truth.
// Shading practice loads this file as a script; the simulator bundles it.
// docs/camera-training-links.md describes the record.
(function (root, factory) {
  'use strict';
  const api = factory(root);
  // Always the global: the page loads this as a script, and the simulator's
  // bundler wraps it as CommonJS, where only the global reaches its code.
  // module.exports serves Node's tests.
  root.FmpTraining = api;
  if (typeof module === 'object' && module && module.exports) module.exports = api;
}(globalThis, function (root) {
  'use strict';

  const KEY = 'fmpTraining.v1';
  const SCHEMA = 'fmp.training.v1';
  const LEVELS = Object.freeze(['on', 'quiet', 'off']);
  const MAX_CHARS = 4096;
  const MAX_AGE_DAYS = 90;
  const DISMISS_DAYS = 14;
  const MAX_DISMISSED = 20;
  const MAX_COUNT = 9999;
  const DAY_MS = 86400000;

  // Every step either tool can record, in teaching order. The contract test
  // checks these ids and titles against Shading practice's scenarios and the
  // simulator's exercises.
  const STEPS = Object.freeze({
    practice: Object.freeze([
      Object.freeze({ id: 'match-cameras', title: 'Match two cameras' }),
      Object.freeze({ id: 'recover-highlights', title: 'Recover clipped highlights' }),
      Object.freeze({ id: 'set-black-level', title: 'Set black level' }),
      Object.freeze({ id: 'neutralize-cast', title: 'Neutralize a color cast' })
    ]),
    sim: Object.freeze([
      Object.freeze({ id: 'wide', title: 'Establish a wide shot' }),
      Object.freeze({ id: 'follow', title: 'Follow a performer' }),
      Object.freeze({ id: 'recall', title: 'Save and recall two shots' })
    ])
  });
  const TOOLS = Object.freeze(Object.keys(STEPS));
  const known = (tool, id) => Boolean(STEPS[tool]) && STEPS[tool].some(step => step.id === id);
  const MINUTE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/;
  const SUGGESTION_ID = /^[a-z][a-z0-9.-]{0,63}$/;

  let memory = null;
  const listeners = new Set();

  function minute(date) {
    const time = date instanceof Date ? date.getTime() : typeof date === 'number' ? date : Date.now();
    return new Date(time).toISOString().slice(0, 16) + 'Z';
  }

  const timeOf = at => Date.parse(at.replace('Z', ':00Z'));
  const count = value => (Number.isInteger(value) && value >= 1 ? Math.min(value, MAX_COUNT) : null);
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

  function empty(level = 'on') {
    return { schema: SCHEMA, prefs: { suggestions: level, dismissed: {} }, last: null, practice: {}, sim: {} };
  }

  function stamp(value) {
    return typeof value === 'string' && MINUTE.test(value) && Number.isFinite(timeOf(value)) ? value : null;
  }

  function readPractice(raw) {
    const at = stamp(raw && raw.at);
    const checks = count(raw && raw.checks);
    const best = raw && Number.isInteger(raw.best) && raw.best >= 0 && raw.best <= 100 ? raw.best : null;
    if (!at || checks === null || best === null || typeof raw.passed !== 'boolean') return null;
    return { passed: raw.passed, best, checks, at };
  }

  function readSim(raw) {
    const at = stamp(raw && raw.at);
    const tries = count(raw && raw.tries);
    if (!at || tries === null || typeof raw.passed !== 'boolean') return null;
    return { passed: raw.passed, tries, at };
  }

  const READERS = { practice: readPractice, sim: readSim };

  // Anything unreadable is dropped rather than repaired, and unknown steps are
  // dropped too, so a record can only ever hold what these tools write.
  function normalize(raw) {
    const record = empty();
    if (!isObject(raw) || raw.schema !== SCHEMA) return record;
    if (isObject(raw.prefs)) {
      if (LEVELS.includes(raw.prefs.suggestions)) record.prefs.suggestions = raw.prefs.suggestions;
      if (isObject(raw.prefs.dismissed)) {
        Object.entries(raw.prefs.dismissed).forEach(([id, at]) => {
          if (SUGGESTION_ID.test(id) && stamp(at)) record.prefs.dismissed[id] = at;
        });
      }
    }
    TOOLS.forEach(tool => {
      if (!isObject(raw[tool])) return;
      Object.entries(raw[tool]).forEach(([id, entry]) => {
        const value = known(tool, id) ? READERS[tool](entry) : null;
        if (value) record[tool][id] = value;
      });
    });
    if (isObject(raw.last) && known(raw.last.tool, raw.last.step) && stamp(raw.last.at)) {
      record.last = { tool: raw.last.tool, step: raw.last.step, at: raw.last.at };
    }
    if (record.prefs.suggestions === 'off') return empty('off');
    return record;
  }

  function parse(text) {
    if (typeof text !== 'string' || !text || text.length > MAX_CHARS * 4) return empty();
    try {
      return normalize(JSON.parse(text));
    } catch (error) {
      return empty();
    }
  }

  // Old entries go first, then the oldest steps until the record fits.
  function prune(record, now) {
    const next = normalize(record);
    const cutoff = now - MAX_AGE_DAYS * DAY_MS;
    TOOLS.forEach(tool => Object.keys(next[tool]).forEach(id => { if (timeOf(next[tool][id].at) < cutoff) delete next[tool][id]; }));
    if (next.last && timeOf(next.last.at) < cutoff) next.last = null;
    const dismissCutoff = now - DISMISS_DAYS * DAY_MS;
    Object.entries(next.prefs.dismissed)
      .filter(([, at]) => timeOf(at) >= dismissCutoff)
      .sort((a, b) => timeOf(b[1]) - timeOf(a[1]))
      .slice(MAX_DISMISSED)
      .forEach(([id]) => delete next.prefs.dismissed[id]);
    Object.entries(next.prefs.dismissed).forEach(([id, at]) => { if (timeOf(at) < dismissCutoff) delete next.prefs.dismissed[id]; });
    while (JSON.stringify(next).length > MAX_CHARS) {
      const oldest = TOOLS.flatMap(tool => Object.entries(next[tool]).map(([id, entry]) => ({ tool, id, at: timeOf(entry.at) })))
        .sort((a, b) => a.at - b.at)[0];
      if (!oldest) break;
      delete next[oldest.tool][oldest.id];
    }
    return next;
  }

  function defaultStorage() {
    try {
      return root.localStorage || null;
    } catch (error) {
      return null;
    }
  }

  // Blocked or full storage falls back to this page's memory, so the tools keep
  // working and simply forget on reload. Memory wins until a write succeeds.
  function read(storage = defaultStorage()) {
    if (memory) return normalize(memory);
    if (storage) {
      try {
        return parse(storage.getItem(KEY));
      } catch (error) {
        // Nothing readable: start empty.
      }
    }
    return empty();
  }

  function notify(record) {
    listeners.forEach(listener => {
      try { listener(record); } catch (error) { /* A listener's failure is its own. */ }
    });
  }

  function write(storage, record) {
    let saved = false;
    if (storage) {
      try {
        storage.setItem(KEY, JSON.stringify(record));
        memory = null;
        saved = true;
      } catch (error) {
        saved = false;
      }
    }
    if (!saved) memory = record;
    notify(normalize(record));
    return saved;
  }

  // Callers may pass undefined for the page's own localStorage.
  function update(storage = defaultStorage(), change, now = Date.now()) {
    const current = read(storage);
    const next = prune(change(normalize(current)) || current, now);
    write(storage, next);
    return next;
  }

  function level(record) {
    return record && record.prefs && LEVELS.includes(record.prefs.suggestions) ? record.prefs.suggestions : 'on';
  }

  // Recording stops while suggestions are off.
  function recordStep(storage, tool, id, result, now = Date.now()) {
    if (!known(tool, id)) return read(storage);
    return update(storage, record => {
      if (level(record) === 'off') return record;
      const at = minute(now);
      const previous = record[tool][id];
      if (tool === 'practice') {
        const score = Math.max(0, Math.min(100, Math.round(Number(result && result.score) || 0)));
        record.practice[id] = {
          passed: Boolean(previous && previous.passed) || Boolean(result && result.passed),
          best: Math.max(previous ? previous.best : 0, score),
          checks: Math.min((previous ? previous.checks : 0) + 1, MAX_COUNT),
          at
        };
      } else {
        record.sim[id] = {
          passed: Boolean(previous && previous.passed) || Boolean(result && result.passed),
          tries: Math.min((previous ? previous.tries : 0) + 1, MAX_COUNT),
          at
        };
      }
      record.last = { tool, step: id, at };
      return record;
    }, now);
  }

  // Off also forgets progress; turning suggestions back on starts clean.
  function setLevel(storage, value, now = Date.now()) {
    if (!LEVELS.includes(value)) return read(storage);
    return update(storage, record => (value === 'off' ? empty('off') : { ...record, prefs: { ...record.prefs, suggestions: value } }), now);
  }

  function dismiss(storage, id, now = Date.now()) {
    if (!SUGGESTION_ID.test(id)) return read(storage);
    return update(storage, record => {
      record.prefs.dismissed[id] = minute(now);
      return record;
    }, now);
  }

  function isDismissed(record, id, now = Date.now()) {
    const at = record && record.prefs && record.prefs.dismissed[id];
    return Boolean(at) && timeOf(at) >= now - DISMISS_DAYS * DAY_MS;
  }

  // Forget clears progress and dismissals. A Quiet or Off choice is kept, so
  // forgetting never turns suggestions back on by itself.
  function forget(storage = defaultStorage()) {
    const kept = level(read(storage));
    memory = null;
    if (storage) {
      try { storage.removeItem(KEY); } catch (error) { /* Memory is already clear. */ }
    }
    const record = empty(kept);
    if (kept !== 'on') write(storage, record);
    else notify(record);
    return record;
  }

  function title(tool, id) {
    const step = known(tool, id) ? STEPS[tool].find(item => item.id === id) : null;
    return step ? step.title : '';
  }

  // The first step of a tool that this device has not passed, in teaching order.
  function nextStep(record, tool) {
    if (!STEPS[tool]) return null;
    const step = STEPS[tool].find(item => !(record[tool][item.id] && record[tool][item.id].passed));
    return step ? step.id : null;
  }

  // Other tabs change the record through storage events; this tab through write().
  function subscribe(listener, storage = defaultStorage()) {
    listeners.add(listener);
    const onStorage = event => {
      if (event.key === KEY || event.key === null) listener(read(storage));
    };
    if (typeof root.addEventListener === 'function') root.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(listener);
      if (typeof root.removeEventListener === 'function') root.removeEventListener('storage', onStorage);
    };
  }

  return Object.freeze({
    KEY, SCHEMA, LEVELS, STEPS, MAX_CHARS, MAX_AGE_DAYS, DISMISS_DAYS,
    empty, parse, normalize, read, level, recordStep, setLevel, dismiss, isDismissed, forget, title, nextStep, subscribe, minute
  });
}));
