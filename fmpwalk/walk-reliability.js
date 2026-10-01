// Shared, versioned lifecycle and recovery contracts. No storage or network side effects.
globalThis.FMPWalkReliability = (() => {
  'use strict';
  const SCHEMA = 'fmp-walk-backup', VERSION = 1;
  const clone = value => structuredClone(value);
  const object = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const idValid = value => typeof value === 'string' && /^[A-Za-z0-9-]{1,80}$/.test(value);
  function venueDate(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const get = type => parts.find(part => part.type === type).value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  }
  function identity(state, makeId = () => crypto.randomUUID()) {
    const next = clone(state);
    next.walkId = idValid(next.walkId) ? next.walkId : idValid(next.reportId) ? next.reportId : makeId();
    next.reportId = next.walkId;
    next.schemaVersion = 3;
    next.fobs ||= {};
    return next;
  }
  function newWalk(state, { clear = false, now = new Date(), makeId } = {}) {
    const meta = clone(state.meta);
    delete meta.photos;
    meta.rigVerified = false;
    if (!clear) { meta.show = ''; meta.date = venueDate(now); }
    return identity({ meta, res: {}, faults: [], fobs: {}, draft: null, idx: 0, tab: 'setup', startedAt: now.toISOString() }, makeId);
  }
  function validateDraft(input) {
    function safe(value, depth = 0) {
      if(depth > 40) throw new Error('Backup nesting is unsupported.');
      if(value && typeof value === 'object') for(const [key,item] of Object.entries(value)) {
        if(['__proto__','constructor','prototype'].includes(key)) throw new Error('Unsafe backup property.');
        safe(item,depth+1);
      }
    }
    safe(input);
    if (!object(input) || !object(input.meta) || !object(input.res) || !Array.isArray(input.faults)) throw new Error('Invalid walk: metadata, readings and faults are required.');
    for (const key of ['show', 'date', 'op']) if (typeof input.meta[key] !== 'string') throw new Error(`Invalid walk ${key}.`);
    if (!['summer', 'winter'].includes(input.meta.cfg)) throw new Error('Unsupported season.');
    if (input.meta.date && (!/^\d{4}-\d{2}-\d{2}$/.test(input.meta.date) || new Date(input.meta.date).toISOString().slice(0, 10) !== input.meta.date)) throw new Error('Invalid walk date.');
    if (input.meta.checks != null && (!object(input.meta.checks) || Object.values(input.meta.checks).some(value => typeof value !== 'boolean'))) throw new Error('Invalid route selection.');
    if (input.fobs != null && (!object(input.fobs) || Object.values(input.fobs).some(value => !['present', 'cleared', 'not_observed', 'not_reobserved'].includes(value)))) throw new Error('Invalid fault re-observation.');
    for (const reading of Object.values(input.res)) {
      if (!object(reading) || reading.status && !['pass', 'flag', 'skip'].includes(reading.status)) throw new Error('Invalid observation state.');
      if (reading.visual != null && (!object(reading.visual) || Object.values(reading.visual).some(value => typeof value !== 'boolean'))) throw new Error('Invalid checklist confirmation.');
      for (const key of ['count', 'bright', 'match', 'level', 'note']) if (reading[key] != null && typeof reading[key] !== 'string') throw new Error('Invalid reading.');
    }
    for (const fault of [...input.faults, ...(input.draft ? [input.draft] : [])]) {
      if (!object(fault) || typeof fault.id !== 'string' || !Array.isArray(fault.sym) || fault.sym.some(value => typeof value !== 'string') || !['crit', 'deg', 'cos'].includes(fault.sev)) throw new Error('Invalid fault record.');
      for (const key of ['pos', 'station', 'dev', 'route', 'notes']) if (fault[key] != null && typeof fault[key] !== 'string') throw new Error('Invalid fault field.');
    }
    if (input.idx != null && (!Number.isInteger(input.idx) || input.idx < 0)) throw new Error('Invalid route position.');
    if (input.walkId != null && !idValid(input.walkId)) throw new Error('Invalid walk ID.');
    if (input.reportId != null && (!idValid(input.reportId) || input.walkId && input.reportId !== input.walkId)) throw new Error('Invalid report ID.');
    if (input.schemaVersion != null && ![1, 2, 3].includes(input.schemaVersion)) throw new Error('Unsupported draft version.');
    if (input.meta.rigVerified != null && typeof input.meta.rigVerified !== 'boolean') throw new Error('Invalid rig verification.');
    return clone(input);
  }
  function migrateLegacy(input, core, makeId) {
    if (!object(input) || !object(input.meta) || !object(input.res) || !Array.isArray(input.faults)) throw new Error('The legacy draft is malformed. It has been left untouched.');
    const original = clone(input), meta = core.prepareMeta({ ...input.meta, op: input.meta.op || '', show: input.meta.show || '', date: input.meta.date || '', rigVerified: false });
    const all = core.availableStations(meta);
    for (const station of all) if (station.tier !== 2) meta.checks[station.id] = station.id === core.DRESSING.id ? !!input.meta.dressing : !input.meta.zonesOff?.[station.zone];
    // Resolve checklist definitions independently of this walk's season/exclusions.
    // knownStation is a membership predicate, not a station lookup.
    const definitions = new Map(core.availableStations({ ...meta, cfg: 'summer' }, true).map(station => [station.id, station]));
    const res = {};
    for (const [id, value] of Object.entries(input.res)) {
      if (!object(value)) throw new Error('Invalid legacy reading. The draft has been left untouched.');
      const reading = clone(value);
      if (reading.status === 'not_observed') reading.status = 'skip';
      if (Array.isArray(reading.checks) || object(reading.checks)) {
        const items = core.visualItems(definitions.get(id) || {});
        if (items.length) reading.visual = Object.fromEntries(items.map((item, index) => [item.key, reading.checks[index] === true]));
      }
      if (typeof reading.count === 'number') reading.count = String(reading.count);
      res[id] = reading;
    }
    // Prototype faults/photo names lack canonical evidence IDs. Retain them verbatim,
    // separately from current tickets, rather than inventing attachment associations.
    const fobs = clone(input.fobs || {});
    // The design export toggles a selected re-observation back to null.
    // Normalize only that legacy sentinel; retain strict canonical validation.
    if (object(fobs)) for (const id of Object.keys(fobs)) if (fobs[id] === null) fobs[id] = 'not_reobserved';
    const route = core.stations(meta);
    return identity(validateDraft({ meta, res, faults: [], fobs, draft: null, idx: Math.max(0, route.findIndex(station => station.id === input.curId)), tab: 'setup', legacyDraft: original,
      legacyEvidence: { faults: clone(input.faults), photos: clone(input.photos || []), rigVerified: !!input.meta.rigVerified } }), makeId);
  }
  function backup(state, photoFiles = [], now = new Date()) {
    const walk = validateDraft(state);
    if (!idValid(walk.walkId) || walk.reportId !== walk.walkId) throw new Error('Save a walk ID before exporting a backup.');
    return { schema: SCHEMA, version: VERSION, exportedAt: now.toISOString(), walk, photoFiles: clone(photoFiles) };
  }
  function parseBackup(text) {
    if (typeof text !== 'string' || text.length > 30 * 1024 * 1024) throw new Error('Backup exceeds the 30 MB limit.');
    let value;
    try { value = JSON.parse(text); } catch { throw new Error('Backup is not valid JSON.'); }
    if (!object(value) || value.schema !== SCHEMA || value.version !== VERSION) throw new Error('Unsupported backup. Report exports cannot be restored; choose a version 1 walk backup.');
    if (!Array.isArray(value.photoFiles) || value.photoFiles.length > 12) throw new Error('Invalid backup photos.');
    const walk = validateDraft(value.walk);
    if (!idValid(walk.walkId) || walk.reportId !== walk.walkId) throw new Error('Backup has no stable walk identity.');
    return { ...value, walk };
  }
  function gmailDraft(fields, subject, markdown, open) {
    if (!fields.to.length) throw new Error('Add at least one To address. No self-copy is added automatically.');
    const query = new URLSearchParams({ view: 'cm', fs: '1', to: fields.to.join(','), cc: fields.cc.join(','), bcc: fields.bcc.join(','), su: subject, body: markdown });
    const url = `https://mail.google.com/mail/?${query}`;
    if (url.length > 24000) throw new Error('This report is too long for a reliable compose link. Copy the report or download it and attach it in Gmail.');
    const popup = open(url, '_blank');
    if (!popup) throw new Error('Gmail popup was blocked. Allow popups and retry, or copy/download the report. Nothing was sent.');
    try { popup.opener = null; } catch { /* Browser isolation may already deny access. */ }
    return 'Gmail compose window opened. Review recipients and send in Gmail. No acceptance or delivery is confirmed. Photos and backups must be attached manually; no self-copy was added.';
  }
  return Object.freeze({ venueDate, identity, newWalk, validateDraft, migrateLegacy, backup, parseBackup, gmailDraft });
})();
