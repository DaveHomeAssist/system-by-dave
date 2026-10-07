export const KEY = 'sbd.frontOffice.document.v1';
export const STAGES = ['Inquiry', 'Advance', 'Confirmed', 'Show', 'Closeout', 'Complete'];
export const emptyDocument = () => ({ version: 1, clients: [], venues: [], jobs: [] });
const text = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 500;
const optional = value => typeof value === 'string' && value.length <= 2000;
const unique = rows => new Set(rows.map(row => row.id)).size === rows.length;
export function validateDocument(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.clients) || !Array.isArray(value.venues) || !Array.isArray(value.jobs)) throw new Error('Unsupported or incomplete Front Office document.');
  if (![value.clients, value.venues, value.jobs].every(rows => rows.length <= 500 && unique(rows))) throw new Error('Duplicate or excessive records.');
  if (!value.clients.every(row => text(row.id) && text(row.name) && optional(row.contact) && optional(row.notes))) throw new Error('Invalid client record.');
  if (!value.venues.every(row => text(row.id) && text(row.name) && optional(row.location) && optional(row.notes))) throw new Error('Invalid venue record.');
  const clients = new Set(value.clients.map(row => row.id));
  const venues = new Set(value.venues.map(row => row.id));
  if (!value.jobs.every(row => text(row.id) && text(row.name) && clients.has(row.clientId) && venues.has(row.venueId) && STAGES.includes(row.stage) && optional(row.nextAction) && Array.isArray(row.updates) && row.updates.length <= 500 && row.updates.every(update => text(update.id) && text(update.body) && text(update.date)) && unique(row.updates))) throw new Error('Invalid job or broken client/venue reference.');
  return value;
}
export function parseDocument(raw) { return validateDocument(JSON.parse(raw)); }
export function addClient(doc, name, contact, notes) { return { ...doc, clients: [...doc.clients, { id: crypto.randomUUID(), name: name.trim(), contact: contact.trim(), notes: notes.trim() }] }; }
export function addVenue(doc, name, location, notes) { return { ...doc, venues: [...doc.venues, { id: crypto.randomUUID(), name: name.trim(), location: location.trim(), notes: notes.trim() }] }; }
export function addJob(doc, name, clientId, venueId, nextAction) { return { ...doc, jobs: [...doc.jobs, { id: crypto.randomUUID(), name: name.trim(), clientId, venueId, stage: 'Inquiry', nextAction: nextAction.trim(), updates: [] }] }; }
export function updateJob(doc, id, stage, nextAction, note, date) { return { ...doc, jobs: doc.jobs.map(job => job.id !== id ? job : { ...job, stage, nextAction: nextAction.trim(), updates: note.trim() ? [{ id: crypto.randomUUID(), date, body: note.trim() }, ...job.updates] : job.updates }) }; }
