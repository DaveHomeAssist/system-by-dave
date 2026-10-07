export const SCHEMA = 'system-by-dave.show-ops.v1';
export const KEY = 'sbd.showOps.document.v1';
const kinds = ['rooms', 'crew', 'tasks'];
const statuses = { rooms: ['Needs check', 'Ready', 'Blocked'], crew: ['Called', 'On site', 'Released'], tasks: ['Open', 'In progress', 'Done'] };
export const empty = () => ({ schema: SCHEMA, show: '', date: '', notes: '', rooms: [], crew: [], tasks: [] });
export function validate(value) {
  if (!value || typeof value !== 'object' || value.schema !== SCHEMA) throw new Error('This is not a Show Ops v1 backup. Nothing was changed.');
  const result = empty();
  for (const key of ['show', 'date', 'notes']) {
    if (typeof value[key] !== 'string' || value[key].length > 10000) throw new Error(`Invalid ${key} field. Nothing was changed.`);
    result[key] = value[key];
  }
  for (const kind of kinds) {
    if (!Array.isArray(value[kind]) || value[kind].length > 2000) throw new Error(`Invalid ${kind} records. Nothing was changed.`);
    const ids = new Set();
    result[kind] = value[kind].map(row => {
      if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !row.id || ids.has(row.id) || typeof row.name !== 'string' || row.name.length > 500 || typeof row.detail !== 'string' || row.detail.length > 2000 || !statuses[kind].includes(row.status)) throw new Error(`Invalid ${kind} record. Nothing was changed.`);
      ids.add(row.id);
      return { id: row.id, name: row.name, detail: row.detail, status: row.status };
    });
  }
  return result;
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
