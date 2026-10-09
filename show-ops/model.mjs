export const SCHEMA = 'system-by-dave.show-ops.v1';
export const KEY = 'sbd.showOps.document.v1';
export const ROOM_CHECK_SCHEMA = 'system-by-dave.room-check.v1';
export const ROOM_CHECK_KEY = 'room-check.v1';
export const MAX_ROOM_CHECK_BYTES = 500000;
export const TASK_BOARD_SCHEMA = 'system-by-dave.show-task-board.v1';
export const TASK_BOARD_KEY = 'show-task-board.v1';
export const MAX_TASK_BOARD_BYTES = 500000;
export const CREW_CALL_SCHEMA = 'system-by-dave.crew-call.v1';
export const CREW_CALL_KEY = 'crew-call.v1';
export const MAX_CREW_CALL_BYTES = 500000;
const MAX_SOURCE_BYTES = 2000000;
const kinds = ['rooms', 'crew', 'tasks'];
const statuses = { rooms: ['Needs check', 'Ready', 'Blocked'], crew: ['Called', 'On site', 'Released'], tasks: ['Open', 'In progress', 'Done'] };
const roomStatuses = ['pending', 'checked', 'ready', 'watch', 'issue', 'deferred', 'na'];
const roomAreas = ['room', 'audio', 'video', 'lighting', 'stage', 'network', 'talent', 'safety', 'house', 'other'];
const priorities = ['high', 'normal', 'low'];
const roomFields = ['area', 'check', 'owner', 'due', 'priority', 'status', 'blocker', 'notes'];
const taskFields = ['area', 'task', 'owner', 'priority', 'due', 'status', 'source', 'blocker', 'notes'];
const taskStatuses = ['queued', 'assigned', 'in-progress', 'blocked', 'waiting', 'done', 'deferred', 'canceled'];
const taskAreas = ['audio', 'video', 'lighting', 'stage', 'network', 'comms', 'records', 'client', 'crew', 'room', 'power', 'general'];
const taskMetaFields = ['showName', 'client', 'venue', 'room', 'showDate', 'boardLead', 'showCaller', 'shift', 'handoffTime'];
const crewFields = ['section', 'name', 'role', 'call', 'location', 'meal', 'release', 'phone', 'status', 'notes'];
const crewMetaFields = ['showName', 'client', 'venue', 'showDate', 'advanceLead', 'loadIn', 'handoffTo'];
const crewDepartments = ['audio', 'video', 'lighting', 'projection', 'camera', 'streaming', 'comms', 'stage', 'labor', 'producer', 'venue', 'other'];
const crewStatuses = ['scheduled', 'confirmed', 'checked-in', 'on-site', 'wrapped', 'problem'];
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value, max) => typeof value === 'string' && value.length <= max;
const byteLength = value => new TextEncoder().encode(value).length;
const sourceIdentity = meta => [meta.showName, meta.showDate, meta.venue, meta.room].map(value => value.trim().toLowerCase()).join('\u0000');
const sourceSnapshot = item => Object.fromEntries(roomFields.map(field => [field, item[field]]));
const taskSnapshot = item => Object.fromEntries(taskFields.map(field => [field, item[field]]));
const crewSnapshot = item => Object.fromEntries(crewFields.map(field => [field, item[field]]));
const crewIdentity = meta => sourceIdentity({ ...meta, room: '' });
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const onlyKeys = (value, allowed) => Object.keys(value).every(key => allowed.includes(key));
const activeTask = item => !['done', 'canceled', 'deferred'].includes(item.status);
const activeCrew = item => item.status !== 'wrapped';
export const empty = () => ({ schema: SCHEMA, show: '', date: '', notes: '', rooms: [], crew: [], tasks: [], roomCheckSources: [], taskBoardSources: [], crewCallSources: [] });

export function parseRoomCheck(raw) {
  if (typeof raw !== 'string' || !raw || byteLength(raw) > MAX_ROOM_CHECK_BYTES) throw new Error('Room Check JSON is empty or exceeds 500 KB. Nothing was changed.');
  let value;
  try { value = JSON.parse(raw); } catch { throw new Error('Room Check JSON could not be parsed. Nothing was changed.'); }
  if (!isRecord(value) || value.schema !== ROOM_CHECK_SCHEMA || !isRecord(value.meta) || !Array.isArray(value.items) || !value.items.length || value.items.length > 300) throw new Error('Choose a Room Check v1 document with 1–300 checks. Nothing was changed.');
  const meta = value.meta;
  for (const key of ['showName', 'showDate', 'venue', 'room']) if (!text(meta[key], 500)) throw new Error(`Invalid Room Check ${key}. Nothing was changed.`);
  if (!meta.showName.trim() || meta.showName.trim() === 'Untitled Room Check') throw new Error('Name the show in Room Check before copying it. Nothing was changed.');
  if (!validDate(meta.showDate)) throw new Error('Room Check needs a valid show date. Nothing was changed.');
  const ids = new Set();
  for (const item of value.items) {
    if (!isRecord(item) || !text(item.id, 200) || !item.id.trim() || ids.has(item.id) || !roomAreas.includes(item.area) || !text(item.check, 450) || !item.check.trim() || !text(item.owner, 500) || !text(item.due, 500) || !priorities.includes(item.priority) || !roomStatuses.includes(item.status) || !text(item.blocker, 2000) || !text(item.notes, 5000)) throw new Error('Room Check has an invalid, unsupported or duplicate check. Nothing was changed.');
    ids.add(item.id);
  }
  return { raw, meta: { showName: meta.showName, showDate: meta.showDate, venue: meta.venue, room: meta.room }, items: value.items, identity: sourceIdentity(meta) };
}
export function parseTaskBoard(raw) {
  if (typeof raw !== 'string' || !raw || byteLength(raw) > MAX_TASK_BOARD_BYTES) throw new Error('Show Task Board JSON is empty or exceeds 500 KB. Nothing was changed.');
  let value;
  try { value = JSON.parse(raw); } catch { throw new Error('Show Task Board JSON could not be parsed. Nothing was changed.'); }
  const topKeys = ['schema', 'savedAt', 'exportedAt', 'meta', 'items', 'selectedId', 'filters'];
  if (!isRecord(value) || value.schema !== TASK_BOARD_SCHEMA || !onlyKeys(value, topKeys) || !isRecord(value.meta) || !Array.isArray(value.items) || !value.items.length || value.items.length > 300) throw new Error('Choose a Show Task Board v1 document with 1–300 tasks. Nothing was changed.');
  if (value.selectedId !== undefined && !text(value.selectedId, 200) || value.filters !== undefined && (!isRecord(value.filters) || !onlyKeys(value.filters, ['search', 'area', 'priority', 'status']) || Object.values(value.filters).some(field => !text(field, 500))) || value.savedAt !== undefined && !text(value.savedAt, 100) || value.exportedAt !== undefined && !text(value.exportedAt, 100)) throw new Error('Show Task Board has unsupported saved fields. Nothing was changed.');
  const meta = value.meta;
  if (!onlyKeys(meta, taskMetaFields) || taskMetaFields.some(key => !text(meta[key], 500)) || !meta.showName.trim() || meta.showName.trim() === 'Untitled Task Board' || !validDate(meta.showDate)) throw new Error('Show Task Board needs a named show and valid show date. Nothing was changed.');
  const ids = new Set();
  for (const item of value.items) {
    if (!isRecord(item) || !onlyKeys(item, ['id', ...taskFields]) || !text(item.id, 200) || !item.id.trim() || ids.has(item.id) || !taskAreas.includes(item.area) || !text(item.task, 500) || !item.task.trim() || !text(item.owner, 500) || ![...priorities, 'critical'].includes(item.priority) || !text(item.due, 100) || !taskStatuses.includes(item.status) || !text(item.source, 500) || !text(item.blocker, 2000) || !text(item.notes, 5000)) throw new Error('Show Task Board has an invalid, unsupported or duplicate task. Nothing was changed.');
    ids.add(item.id);
  }
  return { raw, meta: { showName: meta.showName, showDate: meta.showDate, venue: meta.venue, room: meta.room }, items: value.items, active: value.items.filter(activeTask), identity: sourceIdentity(meta) };
}
export function parseCrewCall(raw) {
  if (typeof raw !== 'string' || !raw || byteLength(raw) > MAX_CREW_CALL_BYTES) throw new Error('Crew Call JSON is empty or exceeds 500 KB. Nothing was changed.');
  let value;
  try { value = JSON.parse(raw); } catch { throw new Error('Crew Call JSON could not be parsed. Nothing was changed.'); }
  const topKeys = ['schema', 'savedAt', 'exportedAt', 'meta', 'items', 'selectedId', 'filters'];
  if (!isRecord(value) || value.schema !== CREW_CALL_SCHEMA || !onlyKeys(value, topKeys) || !isRecord(value.meta) || !Array.isArray(value.items) || !value.items.length || value.items.length > 300) throw new Error('Choose a Crew Call v1 document with 1–300 crew members. Nothing was changed.');
  if (value.selectedId !== undefined && !text(value.selectedId, 200) || value.filters !== undefined && (!isRecord(value.filters) || !onlyKeys(value.filters, ['search', 'section', 'status']) || Object.values(value.filters).some(field => !text(field, 500))) || value.savedAt !== undefined && !text(value.savedAt, 100) || value.exportedAt !== undefined && !text(value.exportedAt, 100)) throw new Error('Crew Call has unsupported saved fields. Nothing was changed.');
  const meta = value.meta;
  if (!onlyKeys(meta, crewMetaFields) || crewMetaFields.some(key => !text(meta[key], 500)) || !meta.showName.trim() || meta.showName.trim() === 'Untitled Crew Call' || !validDate(meta.showDate)) throw new Error('Crew Call needs a named show and valid show date. Nothing was changed.');
  const ids = new Set();
  for (const item of value.items) {
    if (!isRecord(item) || !onlyKeys(item, ['id', ...crewFields]) || !text(item.id, 200) || !item.id.trim() || ids.has(item.id) || !crewDepartments.includes(item.section) || !text(item.name, 500) || !item.name.trim() || ['role', 'call', 'location', 'meal', 'release', 'phone'].some(key => !text(item[key], 500)) || !crewStatuses.includes(item.status) || !text(item.notes, 5000)) throw new Error('Crew Call has an invalid, unsupported or duplicate crew member. Nothing was changed.');
    ids.add(item.id);
  }
  return { raw, meta: { showName: meta.showName, showDate: meta.showDate, venue: meta.venue }, items: value.items, active: value.items.filter(activeCrew), identity: crewIdentity(meta) };
}
export function validate(value) {
  if (!isRecord(value) || value.schema !== SCHEMA) throw new Error('This is not a Show Ops v1 backup. Nothing was changed.');
  const result = empty();
  for (const key of ['show', 'date', 'notes']) {
    if (!text(value[key], 10000)) throw new Error(`Invalid ${key} field. Nothing was changed.`);
    result[key] = value[key];
  }
  const sources = value.roomCheckSources === undefined ? [] : value.roomCheckSources;
  if (!Array.isArray(sources) || sources.length > 20) throw new Error('Invalid Room Check source history. Nothing was changed.');
  const bySource = new Map();
  let sourceBytes = 0;
  result.roomCheckSources = sources.map(source => {
    if (!isRecord(source) || !text(source.id, 200) || !source.id || bySource.has(source.id) || !['saved', 'file'].includes(source.origin) || !text(source.importedAt, 100) || !source.importedAt) throw new Error('Invalid Room Check source history. Nothing was changed.');
    const parsed = parseRoomCheck(source.raw);
    sourceBytes += byteLength(source.raw);
    if (sourceBytes > MAX_SOURCE_BYTES || source.identity !== parsed.identity) throw new Error('Invalid Room Check source history. Nothing was changed.');
    bySource.set(source.id, parsed);
    return { id: source.id, origin: source.origin, importedAt: source.importedAt, identity: parsed.identity, raw: source.raw };
  });
  const taskSources = value.taskBoardSources === undefined ? [] : value.taskBoardSources;
  if (!Array.isArray(taskSources) || taskSources.length > 20) throw new Error('Invalid Show Task Board source history. Nothing was changed.');
  const byTaskSource = new Map();
  result.taskBoardSources = taskSources.map(source => {
    if (!isRecord(source) || !text(source.id, 200) || !source.id || byTaskSource.has(source.id) || !['saved', 'file'].includes(source.origin) || !text(source.importedAt, 100) || !source.importedAt) throw new Error('Invalid Show Task Board source history. Nothing was changed.');
    const parsed = parseTaskBoard(source.raw);
    sourceBytes += byteLength(source.raw);
    if (sourceBytes > MAX_SOURCE_BYTES || source.identity !== parsed.identity) throw new Error('Invalid Show Task Board source history. Nothing was changed.');
    byTaskSource.set(source.id, parsed);
    return { id: source.id, origin: source.origin, importedAt: source.importedAt, identity: parsed.identity, raw: source.raw };
  });
  const crewSources = value.crewCallSources === undefined ? [] : value.crewCallSources;
  if (!Array.isArray(crewSources) || crewSources.length > 20) throw new Error('Invalid Crew Call source history. Nothing was changed.');
  const byCrewSource = new Map();
  result.crewCallSources = crewSources.map(source => {
    if (!isRecord(source) || !text(source.id, 200) || !source.id || byCrewSource.has(source.id) || !['saved', 'file'].includes(source.origin) || !text(source.importedAt, 100) || !source.importedAt) throw new Error('Invalid Crew Call source history. Nothing was changed.');
    const parsed = parseCrewCall(source.raw);
    sourceBytes += byteLength(source.raw);
    if (sourceBytes > MAX_SOURCE_BYTES || source.identity !== parsed.identity) throw new Error('Invalid Crew Call source history. Nothing was changed.');
    byCrewSource.set(source.id, parsed);
    return { id: source.id, origin: source.origin, importedAt: source.importedAt, identity: parsed.identity, raw: source.raw };
  });
  const copied = new Set();
  const copiedTasks = new Set();
  const copiedCrew = new Set();
  for (const kind of kinds) {
    if (!Array.isArray(value[kind]) || value[kind].length > 2000) throw new Error(`Invalid ${kind} records. Nothing was changed.`);
    const ids = new Set();
    result[kind] = value[kind].map(row => {
      if (!isRecord(row) || !text(row.id, 200) || !row.id || ids.has(row.id) || !text(row.name, 500) || !text(row.detail, 2000) || !statuses[kind].includes(row.status)) throw new Error(`Invalid ${kind} record. Nothing was changed.`);
      ids.add(row.id);
      const normalized = { id: row.id, name: row.name, detail: row.detail, status: row.status };
      if (row.source !== undefined) {
        if (kind !== 'rooms' || !isRecord(row.source) || !text(row.source.sourceId, 200) || !text(row.source.itemId, 200) || !bySource.has(row.source.sourceId)) throw new Error('Invalid Room Check provenance. Nothing was changed.');
        const parsed = bySource.get(row.source.sourceId);
        const original = parsed.items.find(item => item.id === row.source.itemId);
        const copyKey = `${parsed.identity}\u0000${row.source.itemId}`;
        if (!original || copied.has(copyKey)) throw new Error('Invalid or duplicate Room Check provenance. Nothing was changed.');
        copied.add(copyKey);
        normalized.source = { sourceId: row.source.sourceId, itemId: original.id, snapshot: sourceSnapshot(original) };
      }
      if (row.taskSource !== undefined) {
        if (kind !== 'tasks' || !isRecord(row.taskSource) || !text(row.taskSource.sourceId, 200) || !text(row.taskSource.itemId, 200) || !byTaskSource.has(row.taskSource.sourceId)) throw new Error('Invalid Show Task Board provenance. Nothing was changed.');
        const parsed = byTaskSource.get(row.taskSource.sourceId);
        const original = parsed.active.find(item => item.id === row.taskSource.itemId);
        const copyKey = `${parsed.identity}\u0000${row.taskSource.itemId}`;
        if (!original || copiedTasks.has(copyKey)) throw new Error('Invalid or duplicate Show Task Board provenance. Nothing was changed.');
        copiedTasks.add(copyKey);
        normalized.taskSource = { sourceId: row.taskSource.sourceId, itemId: original.id, snapshot: taskSnapshot(original) };
      }
      if (row.crewSource !== undefined) {
        if (kind !== 'crew' || !isRecord(row.crewSource) || !text(row.crewSource.sourceId, 200) || !text(row.crewSource.itemId, 200) || !byCrewSource.has(row.crewSource.sourceId)) throw new Error('Invalid Crew Call provenance. Nothing was changed.');
        const parsed = byCrewSource.get(row.crewSource.sourceId);
        const original = parsed.active.find(item => item.id === row.crewSource.itemId);
        const copyKey = `${parsed.identity}\u0000${row.crewSource.itemId}`;
        if (!original || copiedCrew.has(copyKey)) throw new Error('Invalid or duplicate Crew Call provenance. Nothing was changed.');
        copiedCrew.add(copyKey);
        normalized.crewSource = { sourceId: row.crewSource.sourceId, itemId: original.id, snapshot: crewSnapshot(original) };
      }
      return normalized;
    });
  }
  return result;
}

export function previewRoomCheck(doc, raw) {
  const current = validate(doc);
  const source = parseRoomCheck(raw);
  if (current.show.trim() && current.show.trim() !== source.meta.showName.trim()) throw new Error('Room Check show differs from this Show Ops show. Nothing was changed.');
  if (current.date && current.date !== source.meta.showDate) throw new Error('Room Check date differs from this Show Ops date. Nothing was changed.');
  const copied = new Set(current.rooms.filter(row => row.source).map(row => {
    const entry = current.roomCheckSources.find(item => item.id === row.source.sourceId);
    return `${entry.identity}\u0000${row.source.itemId}`;
  }));
  const available = source.items.filter(item => !copied.has(`${source.identity}\u0000${item.id}`));
  if (!available.length) throw new Error('Every check in this Room Check source was already copied. Nothing was changed.');
  const existingSource = current.roomCheckSources.find(entry => entry.raw === raw);
  if (!existingSource && (current.roomCheckSources.length >= 20 || [...current.roomCheckSources, ...current.taskBoardSources, ...current.crewCallSources].reduce((size, entry) => size + byteLength(entry.raw), 0) + byteLength(raw) > MAX_SOURCE_BYTES)) throw new Error('This show cannot accept another distinct Room Check source. Nothing was changed.');
  return { ...source, available, alreadyCopied: source.items.length - available.length, existingSourceId: existingSource?.id || null };
}

export function copyRoomCheck(doc, source, selectedIds, origin, importedAt, nextId = () => crypto.randomUUID()) {
  const current = validate(doc);
  const preview = previewRoomCheck(current, source.raw);
  if (!['saved', 'file'].includes(origin) || !Array.isArray(selectedIds) || !selectedIds.length || new Set(selectedIds).size !== selectedIds.length) throw new Error('Select one or more distinct Room Check checks. Nothing was changed.');
  const available = new Map(preview.available.map(item => [item.id, item]));
  if (selectedIds.some(id => !available.has(id)) || current.rooms.length + selectedIds.length > 2000) throw new Error('Selected Room Check checks are unavailable or exceed Show Ops capacity. Nothing was changed.');
  const sourceId = preview.existingSourceId || nextId();
  const rows = selectedIds.map(itemId => {
    const item = available.get(itemId);
    return { id: nextId(), name: `${item.area} · ${item.check}`, detail: '', status: 'Needs check', source: { sourceId, itemId, snapshot: sourceSnapshot(item) } };
  });
  const roomCheckSources = preview.existingSourceId ? current.roomCheckSources : [...current.roomCheckSources, { id: sourceId, origin, importedAt, identity: preview.identity, raw: source.raw }];
  return validate({ ...current, show: current.show || preview.meta.showName, date: current.date || preview.meta.showDate, rooms: [...current.rooms, ...rows], roomCheckSources });
}
export function previewTaskBoard(doc, raw) {
  const current = validate(doc);
  const source = parseTaskBoard(raw);
  if (current.show.trim() && current.show.trim() !== source.meta.showName.trim()) throw new Error('Show Task Board show differs from this Show Ops show. Nothing was changed.');
  if (current.date && current.date !== source.meta.showDate) throw new Error('Show Task Board date differs from this Show Ops date. Nothing was changed.');
  const copied = new Set(current.tasks.filter(row => row.taskSource).map(row => {
    const entry = current.taskBoardSources.find(item => item.id === row.taskSource.sourceId);
    return `${entry.identity}\u0000${row.taskSource.itemId}`;
  }));
  const available = source.active.filter(item => !copied.has(`${source.identity}\u0000${item.id}`));
  if (!available.length) throw new Error('No new active Show Task Board tasks are available. Nothing was changed.');
  const existingSource = current.taskBoardSources.find(entry => entry.raw === raw);
  if (!existingSource && (current.taskBoardSources.length >= 20 || [...current.roomCheckSources, ...current.taskBoardSources, ...current.crewCallSources].reduce((size, entry) => size + byteLength(entry.raw), 0) + byteLength(raw) > MAX_SOURCE_BYTES)) throw new Error('This show cannot accept another distinct Show Task Board source. Nothing was changed.');
  return { ...source, available, alreadyCopied: source.active.length - available.length, excluded: source.items.length - source.active.length, existingSourceId: existingSource?.id || null };
}
export function copyTaskBoard(doc, source, selectedIds, origin, importedAt, nextId = () => crypto.randomUUID()) {
  const current = validate(doc);
  const preview = previewTaskBoard(current, source.raw);
  if (!['saved', 'file'].includes(origin) || !Array.isArray(selectedIds) || !selectedIds.length || new Set(selectedIds).size !== selectedIds.length) throw new Error('Select one or more distinct active tasks. Nothing was changed.');
  const available = new Map(preview.available.map(item => [item.id, item]));
  if (selectedIds.some(id => !available.has(id)) || current.tasks.length + selectedIds.length > 2000) throw new Error('Selected Show Task Board tasks are unavailable or exceed Show Ops capacity. Nothing was changed.');
  const sourceId = preview.existingSourceId || nextId();
  const rows = selectedIds.map(itemId => {
    const item = available.get(itemId);
    const detail = [item.owner && `Owner: ${item.owner}`, item.due && `Due: ${item.due}`, item.blocker && `Blocker: ${item.blocker}`].filter(Boolean).join(' · ').slice(0, 2000);
    return { id: nextId(), name: item.task, detail, status: 'Open', taskSource: { sourceId, itemId, snapshot: taskSnapshot(item) } };
  });
  const taskBoardSources = preview.existingSourceId ? current.taskBoardSources : [...current.taskBoardSources, { id: sourceId, origin, importedAt, identity: preview.identity, raw: source.raw }];
  return validate({ ...current, show: current.show || preview.meta.showName, date: current.date || preview.meta.showDate, tasks: [...current.tasks, ...rows], taskBoardSources });
}
export function previewCrewCall(doc, raw) {
  const current = validate(doc);
  const source = parseCrewCall(raw);
  if (current.show.trim() && current.show.trim() !== source.meta.showName.trim()) throw new Error('Crew Call show differs from this Show Ops show. Nothing was changed.');
  if (current.date && current.date !== source.meta.showDate) throw new Error('Crew Call date differs from this Show Ops date. Nothing was changed.');
  const copied = new Set(current.crew.filter(row => row.crewSource).map(row => {
    const entry = current.crewCallSources.find(item => item.id === row.crewSource.sourceId);
    return `${entry.identity}\u0000${row.crewSource.itemId}`;
  }));
  const available = source.active.filter(item => !copied.has(`${source.identity}\u0000${item.id}`));
  if (!available.length) throw new Error('No new active Crew Call members are available. Nothing was changed.');
  const existingSource = current.crewCallSources.find(entry => entry.raw === raw);
  if (!existingSource && (current.crewCallSources.length >= 20 || [...current.roomCheckSources, ...current.taskBoardSources, ...current.crewCallSources].reduce((size, entry) => size + byteLength(entry.raw), 0) + byteLength(raw) > MAX_SOURCE_BYTES)) throw new Error('This show cannot accept another distinct Crew Call source. Nothing was changed.');
  return { ...source, available, alreadyCopied: source.active.length - available.length, excluded: source.items.length - source.active.length, existingSourceId: existingSource?.id || null };
}
export function copyCrewCall(doc, source, selectedIds, origin, importedAt, nextId = () => crypto.randomUUID()) {
  const current = validate(doc);
  const preview = previewCrewCall(current, source.raw);
  if (!['saved', 'file'].includes(origin) || !Array.isArray(selectedIds) || !selectedIds.length || new Set(selectedIds).size !== selectedIds.length) throw new Error('Select one or more distinct active Crew Call members. Nothing was changed.');
  const available = new Map(preview.available.map(item => [item.id, item]));
  if (selectedIds.some(id => !available.has(id)) || current.crew.length + selectedIds.length > 2000) throw new Error('Selected Crew Call members are unavailable or exceed Show Ops capacity. Nothing was changed.');
  const sourceId = preview.existingSourceId || nextId();
  const rows = selectedIds.map(itemId => {
    const item = available.get(itemId);
    const detail = [item.role, item.call && `Call: ${item.call}`, item.location && `Location: ${item.location}`].filter(Boolean).join(' · ').slice(0, 2000);
    return { id: nextId(), name: item.name, detail, status: 'Called', crewSource: { sourceId, itemId, snapshot: crewSnapshot(item) } };
  });
  const crewCallSources = preview.existingSourceId ? current.crewCallSources : [...current.crewCallSources, { id: sourceId, origin, importedAt, identity: preview.identity, raw: source.raw }];
  return validate({ ...current, show: current.show || preview.meta.showName, date: current.date || preview.meta.showDate, crew: [...current.crew, ...rows], crewCallSources });
}
export function addRecord(doc, kind, name, detail = '') {
  if (!kinds.includes(kind) || !name.trim()) return doc;
  return { ...doc, [kind]: [...doc[kind], { id: crypto.randomUUID(), name: name.trim(), detail: detail.trim(), status: statuses[kind][0] }] };
}
export function updateRecord(doc, kind, id, field, value) {
  if (!kinds.includes(kind) || !['name', 'detail', 'status'].includes(field)) return doc;
  if (field === 'status' && !statuses[kind].includes(value)) return doc;
  return { ...doc, [kind]: doc[kind].map(row => row.id === id ? { ...row, [field]: value } : row) };
}
export function handoff(doc) {
  return { rooms: doc.rooms.filter(row => row.status !== 'Ready'), crew: doc.crew.filter(row => row.status !== 'Released'), tasks: doc.tasks.filter(row => row.status !== 'Done') };
}
export { statuses };
