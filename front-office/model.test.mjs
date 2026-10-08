import test from 'node:test';
import assert from 'node:assert/strict';
import { ADVANCE_SCHEMA, emptyDocument, parseDocument, parseShowAdvance, alreadyImportedAdvance, appendShowAdvance, validateDocument, addClient, addVenue, addJob, updateJob } from './model.mjs';
const advance = () => ({ schema: ADVANCE_SCHEMA, meta: { showName: 'Synthetic show', client: 'Client A', venue: 'Venue B', showDate: '2026-10-08', advanceLead: 'Producer' }, items: [{ id: 'ask-1', section: 'power', ask: 'Confirm shore power', owner: 'Venue', due: 'Tomorrow', priority: 'high', status: 'requested', details: 'Synthetic fixture', notes: 'No real contact data' }] });
test('client and venue lead to a durable job with update history', () => { let doc = addClient(emptyDocument(), 'Acme', 'Alex', ''); doc = addVenue(doc, 'Hall', 'NY', ''); doc = addJob(doc, 'Annual show', doc.clients[0].id, doc.venues[0].id, 'Confirm date'); doc = updateJob(doc, doc.jobs[0].id, 'Advance', 'Walk room', 'Date confirmed', '2026-10-07T12:00:00Z'); assert.deepEqual(parseDocument(JSON.stringify(doc)), doc); assert.equal(doc.jobs[0].updates[0].body, 'Date confirmed'); });
test('invalid import cannot replace data or break references', () => { const doc = emptyDocument(); assert.throws(() => parseDocument('{bad')); assert.throws(() => validateDocument({ ...doc, version: 2 })); assert.throws(() => validateDocument({ ...doc, jobs: [{ id: 'one', name: 'Show', clientId: 'missing', venueId: 'missing', stage: 'Inquiry', nextAction: '', updates: [] }] })); assert.deepEqual(doc, emptyDocument()); });

test('blank names and record limit reject without mutating the original', () => { const original = emptyDocument(); assert.throws(() => addClient(original, '   ', '', ''), /required/); assert.throws(() => addVenue(original, '  ', '', ''), /required/); assert.deepEqual(original, emptyDocument()); const full = { ...original, clients: Array.from({ length: 500 }, (_, i) => ({ id: `client-${i}`, name: `Client ${i}`, contact: '', notes: '' })) }; const extra = addClient(full, 'Extra', '', ''); assert.throws(() => validateDocument(extra), /excessive/); assert.equal(full.clients.length, 500); assert.equal(full.clients.some(row => row.name === 'Extra'), false); });

test('saved and exported Show Advance preserve exact source and share semantic identity', () => {
  const fixture = advance();
  const saved = JSON.stringify({ ...fixture, savedAt: '2026-10-08T10:00:00Z', selectedId: 'ask-1', filters: { status: 'all' } });
  const exported = JSON.stringify({ exportedAt: '2026-10-08T11:00:00Z', items: fixture.items, meta: fixture.meta, schema: ADVANCE_SCHEMA });
  const parsed = parseShowAdvance(saved);
  assert.equal(parsed.raw, saved);
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.statusCounts.requested, 1);
  assert.equal(parsed.signature, parseShowAdvance(exported).signature);
});

test('Show Advance import rejects ambiguous, malformed and overlarge source without modifying Front Office', () => {
  const original = emptyDocument();
  assert.throws(() => parseShowAdvance('{broken'), /could not be read/);
  assert.throws(() => parseShowAdvance(JSON.stringify({ ...advance(), schema: 'future' })), /Unsupported/);
  assert.throws(() => parseShowAdvance(JSON.stringify({ ...advance(), items: [{ id: 'same' }, { id: 'same' }] })), /duplicate/);
  assert.throws(() => parseShowAdvance(JSON.stringify({ ...advance(), items: [{ id: '  ' }] })), /Invalid/);
  assert.throws(() => parseShowAdvance(JSON.stringify({ ...advance(), items: [{ id: 'ask-1', notes: { nested: true } }] })), /Invalid/);
  assert.throws(() => parseShowAdvance(JSON.stringify({ ...advance(), items: Array.from({ length: 301 }, (_, index) => ({ id: `ask-${index}` })) })), /Unsupported/);
  assert.throws(() => parseShowAdvance(JSON.stringify({ ...advance(), extra: 'x'.repeat(1_000_000) })), /larger than 1 MB/);
  assert.deepEqual(original, emptyDocument());
});

test('explicit new identity binding appends one unsaved Advance job and backups keep full source bytes', () => {
  const raw = JSON.stringify(advance());
  const source = parseShowAdvance(raw);
  const original = emptyDocument();
  const imported = appendShowAdvance(original, source, { clientId: '', clientName: 'Client A', venueId: '', venueName: 'Venue B', jobName: 'Synthetic show' }, '2026-10-08T12:00:00Z');
  assert.deepEqual(original, emptyDocument());
  assert.equal(imported.clients.length, 1);
  assert.equal(imported.venues.length, 1);
  assert.equal(imported.jobs.length, 1);
  assert.equal(imported.jobs[0].stage, 'Advance');
  assert.equal(imported.jobs[0].nextAction, '');
  assert.equal(imported.jobs[0].sourceAdvance.raw, raw);
  assert.equal(alreadyImportedAdvance(imported, parseShowAdvance(JSON.stringify({ ...advance(), exportedAt: 'later' }))), true);
  assert.deepEqual(parseDocument(JSON.stringify(imported)), imported);
  assert.equal(updateJob(imported, imported.jobs[0].id, 'Show', '', '', '2026-10-09T12:00:00Z').jobs[0].sourceAdvance.raw, raw);
  assert.throws(() => appendShowAdvance(imported, source, { clientId: imported.clients[0].id, venueId: imported.venues[0].id, jobName: 'Repeat' }), /already copied/);
});

test('existing identity binding is explicit; changed source becomes a separate copy', () => {
  let doc = addClient(emptyDocument(), 'Existing client', '', '');
  doc = addVenue(doc, 'Existing venue', '', '');
  const original = JSON.stringify(doc);
  const source = parseShowAdvance(JSON.stringify(advance()));
  const binding = { clientId: doc.clients[0].id, venueId: doc.venues[0].id, jobName: 'Advance copy' };
  const first = appendShowAdvance(doc, source, binding);
  assert.equal(first.clients.length, 1);
  assert.equal(first.venues.length, 1);
  assert.equal(first.jobs[0].clientId, binding.clientId);
  assert.equal(JSON.stringify(doc), original);
  assert.throws(() => appendShowAdvance(doc, source, { ...binding, clientId: 'missing' }), /existing client/);
  assert.throws(() => appendShowAdvance(doc, source, { ...binding, venueId: 'missing' }), /existing venue/);
  const changed = advance(); changed.items[0].status = 'confirmed';
  assert.equal(alreadyImportedAdvance(first, parseShowAdvance(JSON.stringify(changed))), false);
  assert.equal(appendShowAdvance(first, parseShowAdvance(JSON.stringify(changed)), binding).jobs.length, 2);
});

test('blank source identities need deliberate names and invalid provenance backup is rejected', () => {
  const sourceData = advance(); sourceData.meta.client = ''; sourceData.meta.venue = '';
  const source = parseShowAdvance(JSON.stringify(sourceData));
  assert.throws(() => appendShowAdvance(emptyDocument(), source, { clientId: '', clientName: '', venueId: '', venueName: '', jobName: 'Show' }), /Client name is required/);
  const imported = appendShowAdvance(emptyDocument(), source, { clientId: '', clientName: 'Chosen client', venueId: '', venueName: 'Chosen venue', jobName: 'Show' });
  imported.jobs[0].sourceAdvance.raw = '{bad';
  assert.throws(() => parseDocument(JSON.stringify(imported)), /could not be read/);
});
