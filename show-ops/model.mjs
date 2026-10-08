export const SCHEMA = 'system-by-dave.show-ops.v1';
export const KEY = 'sbd.showOps.document.v1';
export const ROOM_CHECK_SCHEMA = 'system-by-dave.room-check.v1';
export const ROOM_CHECK_KEY = 'room-check.v1';
export const MAX_ROOM_CHECK_BYTES = 500000;
const MAX_SOURCE_BYTES = 2000000;
const kinds = ['rooms', 'crew', 'tasks'];
const statuses = { rooms: ['Needs check', 'Ready', 'Blocked'], crew: ['Called', 'On site', 'Released'], tasks: ['Open', 'In progress', 'Done'] };
const roomStatuses = ['pending', 'checked', 'ready', 'watch', 'issue', 'deferred', 'na'];
const roomAreas = ['room', 'audio', 'video', 'lighting', 'stage', 'network', 'talent', 'safety', 'house', 'other'];
const priorities = ['high', 'normal', 'low'];
const roomFields = ['area', 'check', 'owner', 'due', 'priority', 'status', 'blocker', 'notes'];
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value, max) => typeof value === 'string' && value.length <= max;
const byteLength = value => new TextEncoder().encode(value).length;
const sourceIdentity = meta => [meta.showName, meta.showDate, meta.venue, meta.room].map(value => value.trim().toLowerCase()).join('\u0000');
const sourceSnapshot = item => Object.fromEntries(roomFields.map(field => [field, item[field]]));
export const empty = () => ({ schema: SCHEMA, show: '', date: '', notes: '', rooms: [], crew: [], tasks: [], roomCheckSources: [] });

export function parseRoomCheck(raw) {
  if (typeof raw !== 'string' || !raw || byteLength(raw) > MAX_ROOM_CHECK_BYTES) throw new Error('Room Check JSON is empty or exceeds 500 KB. Nothing was changed.');
  let value;
  try { value = JSON.parse(raw); } catch { throw new Error('Room Check JSON could not be parsed. Nothing was changed.'); }
  if (!isRecord(value) || value.schema !== ROOM_CHECK_SCHEMA || !isRecord(value.meta) || !Array.isArray(value.items) || !value.items.length || value.items.length > 300) throw new Error('Choose a Room Check v1 document with 1–300 checks. Nothing was changed.');
  const meta = value.meta;
  for (const key of ['showName', 'showDate', 'venue', 'room']) if (!text(meta[key], 500)) throw new Error(`Invalid Room Check ${key}. Nothing was changed.`);
  if (!meta.showName.trim() || meta.showName.trim() === 'Untitled Room Check') throw new Error('Name the show in Room Check before copying it. Nothing was changed.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.showDate) || Number.isNaN(Date.parse(`${meta.showDate}T00:00:00Z`)) || new Date(`${meta.showDate}T00:00:00Z`).toISOString().slice(0, 10) !== meta.showDate) throw new Error('Room Check needs a valid show date. Nothing was changed.');
  const ids = new Set();
  for (const item of value.items) {
    if (!isRecord(item) || !text(item.id, 200) || !item.id.trim() || ids.has(item.id) || !roomAreas.includes(item.area) || !text(item.check, 450) || !item.check.trim() || !text(item.owner, 500) || !text(item.due, 500) || !priorities.includes(item.priority) || !roomStatuses.includes(item.status) || !text(item.blocker, 2000) || !text(item.notes, 5000)) throw new Error('Room Check has an invalid, unsupported or duplicate check. Nothing was changed.');
    ids.add(item.id);
  }
  return { raw, meta: { showName: meta.showName, showDate: meta.showDate, venue: meta.venue, room: meta.room }, items: value.items, identity: sourceIdentity(meta) };
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
  const copied = new Set();
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
  if (!existingSource && (current.roomCheckSources.length >= 20 || current.roomCheckSources.reduce((size, entry) => size + byteLength(entry.raw), 0) + byteLength(raw) > MAX_SOURCE_BYTES)) throw new Error('This show cannot accept another distinct Room Check source. Nothing was changed.');
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
