export const STORE = 'sbd.showControl.v1';
export const SCHEMA = 'system-by-dave.show-control.v1';
export const CUE_KEY = 'cueSheet.v1';
const text = (value, max = 1200) => typeof value === 'string' ? value.slice(0, max) : '';
export function emptyRun() { return { schema: SCHEMA, version: 1, title: 'Untitled show', cues: [], current: 0, held: false, notes: '', events: [] }; }
export function cueForgeLists(raw) {
  const source = JSON.parse(raw);
  if (!source || source.version !== 7 || !Array.isArray(source.cueLists) || !source.cueLists.length) throw Error('Use a CueForge version 7 show file. The current run was kept.');
  if (source.cueLists.length > 100 || source.cueLists.some(list => !list || typeof list.id !== 'string' || typeof list.name !== 'string' || !Array.isArray(list.cues) || list.cues.length > 2000)) throw Error('CueForge cue lists are invalid or too large. The current run was kept.');
  return source;
}
export function fromCueForge(source, listId) {
  const list = source.cueLists.find(item => item.id === listId);
  if (!list) throw Error('Choose a CueForge cue list. The current run was kept.');
  const run = emptyRun();
  run.title = `${text(source.name, 140) || 'CueForge show'} · ${text(list.name, 80)}`;
  run.source = { product: 'CueForge', listId: text(list.id, 100), listName: text(list.name, 80), fileModifiedAt: text(source.modifiedAt, 40) };
  run.cues = list.cues.map((cue, index) => {
    if (!cue || typeof cue.id !== 'string' || typeof cue.number !== 'string' || typeof cue.name !== 'string' || typeof cue.type !== 'string') throw Error(`CueForge cue ${index + 1} is invalid. The current run was kept.`);
    // Keep a minimal calling snapshot; never persist patch, properties, trigger or credential fields.
    const sourceRow = { id: text(cue.id, 100), number: text(cue.number, 80), name: text(cue.name), type: text(cue.type, 80), notes: text(cue.notes) };
    return { id: `cue-${index + 1}`, number: sourceRow.number, time: '', action: sourceRow.name, owner: '', status: sourceRow.type, notes: sourceRow.notes, sourceRow };
  });
  return run;
}
export function validate(value) {
  if (!value || value.schema !== SCHEMA || value.version !== 1 || !Array.isArray(value.cues) || !Array.isArray(value.events)) throw Error('This is not a Show Control v1 backup. The current run was kept.');
  if (value.cues.length > 2000 || value.events.length > 10000) throw Error('Backup exceeds Show Control limits. The current run was kept.');
  const cues = value.cues.map((cue, index) => {
    if (!cue || typeof cue !== 'object' || !cue.sourceRow || typeof cue.sourceRow !== 'object') throw Error(`Cue ${index + 1} is invalid. The current run was kept.`);
    return { id: text(cue.id, 100) || `cue-${index + 1}`, number: text(cue.number, 80), time: text(cue.time, 80), action: text(cue.action), owner: text(cue.owner, 200), status: text(cue.status, 80), notes: text(cue.notes), sourceRow: structuredClone(cue.sourceRow) };
  });
  const current = Number(value.current);
  if (!Number.isInteger(current) || current < 0 || current > cues.length) throw Error('Invalid cue position. The current run was kept.');
  const result = { schema: SCHEMA, version: 1, title: text(value.title, 200) || 'Untitled show', cues, current, held: value.held === true, notes: text(value.notes, 5000), events: value.events.map(e => ({ at: text(e?.at, 40), action: text(e?.action, 100), cue: text(e?.cue, 100) })) };
  if (value.source?.product === 'CueForge') result.source = { product: 'CueForge', listId: text(value.source.listId, 100), listName: text(value.source.listName, 80), fileModifiedAt: text(value.source.fileModifiedAt, 40) };
  return result;
}
export function fromCueSheet(raw) {
  const source = JSON.parse(raw);
  if (!source || !Array.isArray(source.rows) || !source.rows.length) throw Error('Cue Sheet has no rows. The current run was kept.');
  if (source.rows.length > 2000) throw Error('Cue Sheet is too large. The current run was kept.');
  const run = emptyRun(); run.title = text(source.title, 200) || 'Imported cue sheet';
  run.cues = source.rows.map((row, i) => {
    if (!row || typeof row !== 'object') throw Error(`Cue Sheet row ${i + 1} is invalid. The current run was kept.`);
    return { id: `cue-${i + 1}`, number: text(row.number, 80), time: text(row.time, 80), action: text(row.action), owner: text(row.owner, 200), status: text(row.status, 80), notes: text(row.notes), sourceRow: structuredClone(row) };
  });
  return run;
}
export function logEvent(run, action, at = new Date().toISOString()) {
  const copy = structuredClone(run);
  copy.events.unshift({ at, action, cue: copy.cues[copy.current]?.number || '' });
  if (copy.events.length > 10000) copy.events.length = 10000;
  if (action === 'Go' && !copy.held && copy.current < copy.cues.length) copy.current++;
  if (action === 'Hold') copy.held = true;
  if (action === 'Resume') copy.held = false;
  return copy;
}
export function save(run, storage, baseline) {
  const current = storage.getItem(STORE);
  if (current !== baseline) throw Error('Another tab changed this run. Export your work, then reload before saving.');
  const raw = JSON.stringify(validate(run));
  storage.setItem(STORE, raw);
  if (storage.getItem(STORE) !== raw) throw Error('Save could not be verified. Export your work.');
  return raw;
}
