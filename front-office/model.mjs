export const KEY = 'sbd.frontOffice.document.v1';
export const ADVANCE_KEY = 'show-advance.v1';
export const ADVANCE_SCHEMA = 'system-by-dave.show-advance.v1';
export const STAGES = ['Inquiry', 'Advance', 'Confirmed', 'Show', 'Closeout', 'Complete'];
export const emptyDocument = () => ({ version: 1, clients: [], venues: [], jobs: [] });
const advanceStatuses = ['needed', 'requested', 'received', 'confirmed', 'issue', 'deferred'];
const advanceSections = ['contacts', 'venue', 'schedule', 'power', 'network', 'audio', 'video', 'labor', 'deliverables', 'risk', 'other'];
const advancePriorities = ['high', 'medium', 'low'];
const advanceFields = ['id', 'section', 'ask', 'owner', 'due', 'priority', 'status', 'details', 'notes'];
const maxAdvanceBytes = 1_000_000;
const maxBackupBytes = 2_000_000;
const text = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 500;
const optional = value => typeof value === 'string' && value.length <= 2000;
const unique = rows => new Set(rows.map(row => row.id)).size === rows.length;
const bytes = value => new TextEncoder().encode(value).length;
function nameValue(value, kind) { if (typeof value !== 'string' || !text(value)) throw new Error(`${kind} name is required.`); return value.trim(); }
function sourceSignature(value) {
  const ordered = row => Object.fromEntries(Object.keys(row).sort().map(key => [key, row[key]]));
  return JSON.stringify({ meta: ordered(value.meta), items: value.items.map(ordered) });
}
export function parseShowAdvance(raw) {
  if (typeof raw !== 'string' || !raw || bytes(raw) > maxAdvanceBytes) throw new Error('Show Advance source is empty or larger than 1 MB.');
  let value;
  try { value = JSON.parse(raw); } catch { throw new Error('Show Advance JSON could not be read.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.schema !== ADVANCE_SCHEMA || !value.meta || typeof value.meta !== 'object' || Array.isArray(value.meta) || !Array.isArray(value.items) || value.items.length > 300) throw new Error('Unsupported or incomplete Show Advance v1 source.');
  if (!['showName', 'client', 'venue', 'showDate'].every(key => typeof value.meta[key] === 'string') || Object.values(value.meta).some(field => typeof field !== 'string')) throw new Error('Invalid Show Advance metadata.');
  const ids = new Set();
  for (const row of value.items) {
    if (!row || typeof row !== 'object' || Array.isArray(row) || !advanceFields.every(key => typeof row[key] === 'string') || !row.id.trim() || row.id !== row.id.trim() || row.id.length > 500 || ids.has(row.id) || !advanceSections.includes(row.section) || !advancePriorities.includes(row.priority) || !row.status.trim() || Object.values(row).some(field => typeof field !== 'string')) throw new Error('Invalid or duplicate Show Advance request ID or field.');
    ids.add(row.id);
  }
  const statusCounts = Object.create(null);
  for (const row of value.items) {
    const status = row.status || 'unspecified';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  }
  return { raw, meta: value.meta, items: value.items, signature: sourceSignature(value), statusCounts, unsupportedStatuses: Object.keys(statusCounts).filter(status => !advanceStatuses.includes(status)) };
}
export function alreadyImportedAdvance(doc, source) {
  return doc.jobs.some(job => job.sourceAdvance && parseShowAdvance(job.sourceAdvance.raw).signature === source.signature);
}
export function validateDocument(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.clients) || !Array.isArray(value.venues) || !Array.isArray(value.jobs)) throw new Error('Unsupported or incomplete Front Office document.');
  if (![value.clients, value.venues, value.jobs].every(rows => rows.length <= 500 && unique(rows))) throw new Error('Duplicate or excessive records.');
  if (!value.clients.every(row => text(row.id) && text(row.name) && optional(row.contact) && optional(row.notes))) throw new Error('Invalid client record.');
  if (!value.venues.every(row => text(row.id) && text(row.name) && optional(row.location) && optional(row.notes))) throw new Error('Invalid venue record.');
  const clients = new Set(value.clients.map(row => row.id));
  const venues = new Set(value.venues.map(row => row.id));
  if (!value.jobs.every(row => text(row.id) && text(row.name) && clients.has(row.clientId) && venues.has(row.venueId) && STAGES.includes(row.stage) && optional(row.nextAction) && Array.isArray(row.updates) && row.updates.length <= 500 && row.updates.every(update => text(update.id) && text(update.body) && text(update.date)) && unique(row.updates))) throw new Error('Invalid job or broken client/venue reference.');
  for (const job of value.jobs) {
    if (job.sourceAdvance === undefined) continue;
    const source = job.sourceAdvance;
    if (!source || typeof source !== 'object' || source.schema !== ADVANCE_SCHEMA || typeof source.importedAt !== 'string' || !Number.isFinite(Date.parse(source.importedAt))) throw new Error('Invalid Show Advance provenance.');
    parseShowAdvance(source.raw);
  }
  return value;
}
export function parseDocument(raw) { return validateDocument(JSON.parse(raw)); }
export function addClient(doc, name, contact, notes) { return { ...doc, clients: [...doc.clients, { id: crypto.randomUUID(), name: nameValue(name, 'Client'), contact: contact.trim(), notes: notes.trim() }] }; }
export function addVenue(doc, name, location, notes) { return { ...doc, venues: [...doc.venues, { id: crypto.randomUUID(), name: nameValue(name, 'Venue'), location: location.trim(), notes: notes.trim() }] }; }
export function addJob(doc, name, clientId, venueId, nextAction) { return { ...doc, jobs: [...doc.jobs, { id: crypto.randomUUID(), name: nameValue(name, 'Job'), clientId, venueId, stage: 'Inquiry', nextAction: nextAction.trim(), updates: [] }] }; }
export function updateJob(doc, id, stage, nextAction, note, date) { return { ...doc, jobs: doc.jobs.map(job => job.id !== id ? job : { ...job, stage, nextAction: nextAction.trim(), updates: note.trim() ? [{ id: crypto.randomUUID(), date, body: note.trim() }, ...job.updates] : job.updates }) }; }
export function appendShowAdvance(doc, source, binding, importedAt = new Date().toISOString()) {
  validateDocument(doc);
  const candidate = parseShowAdvance(source.raw);
  if (alreadyImportedAdvance(doc, candidate)) throw new Error('This exact Show Advance is already copied into a job.');
  if (!binding || typeof binding !== 'object') throw new Error('Choose client, venue and job mapping.');
  if (typeof importedAt !== 'string' || !Number.isFinite(Date.parse(importedAt))) throw new Error('Invalid import time.');
  let next = doc;
  let clientId = binding.clientId;
  let venueId = binding.venueId;
  if (clientId) {
    if (!doc.clients.some(row => row.id === clientId)) throw new Error('Choose an existing client or create one.');
  } else {
    next = addClient(next, binding.clientName, '', '');
    clientId = next.clients.at(-1).id;
  }
  if (venueId) {
    if (!doc.venues.some(row => row.id === venueId)) throw new Error('Choose an existing venue or create one.');
  } else {
    next = addVenue(next, binding.venueName, '', '');
    venueId = next.venues.at(-1).id;
  }
  next = { ...next, jobs: [...next.jobs, { id: crypto.randomUUID(), name: nameValue(binding.jobName, 'Job'), clientId, venueId, stage: 'Advance', nextAction: '', updates: [], sourceAdvance: { schema: ADVANCE_SCHEMA, importedAt, raw: candidate.raw } }] };
  validateDocument(next);
  if (bytes(JSON.stringify(next)) > maxBackupBytes) throw new Error('Resulting Front Office backup is larger than 2 MB.');
  return next;
}
