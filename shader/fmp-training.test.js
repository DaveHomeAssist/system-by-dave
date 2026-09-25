'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Training = require('./fmp-training.js');
const Practice = require('./shading-practice-state.js');

const T0 = Date.UTC(2026, 8, 25, 6, 5);
const DAY = 86400000;

function memoryStorage(initial) {
  const map = new Map(initial ? [[Training.KEY, initial]] : []);
  return {
    map,
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: key => { map.delete(key); }
  };
}

const stored = storage => JSON.parse(storage.map.get(Training.KEY));

test('an absent, unreadable or foreign record reads as empty with suggestions on', () => {
  for (const text of [null, '', 'not json', '[]', JSON.stringify({ schema: 'other', practice: { 'match-cameras': {} } })]) {
    const record = Training.read(memoryStorage(text));
    assert.deepEqual(record, Training.empty());
    assert.equal(Training.level(record), 'on');
  }
});

test('a practice check records the best score, the check count and a sticky pass', () => {
  const storage = memoryStorage();
  Training.recordStep(storage, 'practice', 'recover-highlights', { passed: false, score: 72.4 }, T0);
  Training.recordStep(storage, 'practice', 'recover-highlights', { passed: true, score: 93 }, T0 + 60000);
  const record = Training.recordStep(storage, 'practice', 'recover-highlights', { passed: false, score: 40 }, T0 + 120000);
  assert.deepEqual(record.practice['recover-highlights'], { passed: true, best: 93, checks: 3, at: '2026-09-25T06:07Z' });
  assert.deepEqual(record.last, { tool: 'practice', step: 'recover-highlights', at: '2026-09-25T06:07Z' });
  assert.deepEqual(stored(storage), record);
});

test('a simulator result counts tries and keeps a pass', () => {
  const storage = memoryStorage();
  Training.recordStep(storage, 'sim', 'follow', { passed: false }, T0);
  const record = Training.recordStep(storage, 'sim', 'follow', { passed: true }, T0);
  assert.deepEqual(record.sim.follow, { passed: true, tries: 2, at: '2026-09-25T06:05Z' });
  assert.equal(Training.nextStep(record, 'sim'), 'wide');
  assert.equal(Training.nextStep(record, 'practice'), 'match-cameras');
});

test('unknown steps and tools are never recorded', () => {
  const storage = memoryStorage();
  Training.recordStep(storage, 'practice', 'invented', { passed: true, score: 100 }, T0);
  Training.recordStep(storage, 'rig', 'wide', { passed: true }, T0);
  assert.deepEqual(Training.read(storage), Training.empty());
});

test('a record keeps only known fields, so names or notes written into it are dropped', () => {
  const raw = {
    schema: Training.SCHEMA,
    operator: 'Somebody',
    prefs: { suggestions: 'quiet', dismissed: { 'practice.next.set-black-level': '2026-09-25T06:00Z', 'Bad Id': '2026-09-25T06:00Z' }, email: 'x@example.com' },
    last: { tool: 'sim', step: 'recall', at: '2026-09-25T06:00Z', note: 'free text' },
    practice: {
      'match-cameras': { passed: true, best: 91, checks: 2, at: '2026-09-25T06:00Z', name: 'Somebody' },
      'set-black-level': { passed: 'yes', best: 91, checks: 2, at: '2026-09-25T06:00Z' },
      invented: { passed: true, best: 91, checks: 2, at: '2026-09-25T06:00Z' }
    },
    sim: { recall: { passed: false, tries: 0, at: '2026-09-25T06:00Z' }, wide: { passed: true, tries: 1, at: 'yesterday' } }
  };
  const record = Training.normalize(raw);
  assert.deepEqual(record, {
    schema: Training.SCHEMA,
    prefs: { suggestions: 'quiet', dismissed: { 'practice.next.set-black-level': '2026-09-25T06:00Z' } },
    last: { tool: 'sim', step: 'recall', at: '2026-09-25T06:00Z' },
    practice: { 'match-cameras': { passed: true, best: 91, checks: 2, at: '2026-09-25T06:00Z' } },
    sim: {}
  });
});

test('Off forgets progress and stops recording; turning it back on starts clean', () => {
  const storage = memoryStorage();
  Training.recordStep(storage, 'practice', 'match-cameras', { passed: true, score: 95 }, T0);
  let record = Training.setLevel(storage, 'off', T0);
  assert.deepEqual(record, Training.empty('off'));
  record = Training.recordStep(storage, 'sim', 'wide', { passed: true }, T0);
  assert.deepEqual(record, Training.empty('off'));
  assert.deepEqual(stored(storage), Training.empty('off'));
  record = Training.setLevel(storage, 'on', T0);
  assert.deepEqual(record, Training.empty('on'));
});

test('Quiet keeps recording and keeps what was recorded', () => {
  const storage = memoryStorage();
  Training.recordStep(storage, 'practice', 'match-cameras', { passed: true, score: 95 }, T0);
  let record = Training.setLevel(storage, 'quiet', T0);
  assert.equal(record.practice['match-cameras'].passed, true);
  record = Training.recordStep(storage, 'sim', 'wide', { passed: false }, T0);
  assert.equal(record.sim.wide.tries, 1);
  assert.equal(Training.level(record), 'quiet');
  assert.equal(Training.setLevel(storage, 'loud', T0).prefs.suggestions, 'quiet');
});

test('a dismissed suggestion stays dismissed for 14 days, then is pruned', () => {
  const storage = memoryStorage();
  let record = Training.dismiss(storage, 'practice.next.set-black-level', T0);
  assert.ok(Training.isDismissed(record, 'practice.next.set-black-level', T0 + 13 * DAY));
  assert.ok(!Training.isDismissed(record, 'practice.next.set-black-level', T0 + 15 * DAY));
  assert.ok(!Training.isDismissed(record, 'sim.next.wide', T0));
  record = Training.recordStep(storage, 'sim', 'wide', { passed: true }, T0 + 15 * DAY);
  assert.deepEqual(record.prefs.dismissed, {});
  assert.deepEqual(Training.dismiss(storage, 'Not an id', T0).prefs.dismissed, {});
});

test('at most 20 dismissals are kept, newest first', () => {
  const storage = memoryStorage();
  let record;
  for (let i = 0; i < 25; i += 1) record = Training.dismiss(storage, `practice.next.n${i}`, T0 + i * 60000);
  const ids = Object.keys(record.prefs.dismissed);
  assert.equal(ids.length, 20);
  assert.ok(ids.includes('practice.next.n24'));
  assert.ok(!ids.includes('practice.next.n4'));
});

test('steps older than 90 days are pruned on the next write', () => {
  const storage = memoryStorage();
  Training.recordStep(storage, 'practice', 'match-cameras', { passed: true, score: 95 }, T0);
  const record = Training.recordStep(storage, 'sim', 'wide', { passed: true }, T0 + 91 * DAY);
  assert.deepEqual(Object.keys(record.practice), []);
  assert.equal(record.sim.wide.passed, true);
  assert.equal(record.last.tool, 'sim');
});

test('a full record stays within its size budget', () => {
  const storage = memoryStorage();
  for (const tool of Object.keys(Training.STEPS)) {
    for (const step of Training.STEPS[tool]) Training.recordStep(storage, tool, step.id, { passed: true, score: 100 }, T0);
  }
  for (let i = 0; i < 25; i += 1) Training.dismiss(storage, `practice.next.${'x'.repeat(40)}${i}`, T0);
  assert.ok(storage.map.get(Training.KEY).length <= Training.MAX_CHARS);
});

test('blocked storage falls back to memory for this page, and a working write clears it', () => {
  const blocked = {
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('QuotaExceededError'); },
    removeItem() { throw new Error('SecurityError'); }
  };
  assert.deepEqual(Training.read(blocked), Training.empty());
  Training.recordStep(blocked, 'sim', 'recall', { passed: true }, T0);
  assert.equal(Training.read(blocked).sim.recall.passed, true);
  const working = memoryStorage();
  assert.equal(Training.read(working).sim.recall.passed, true, 'memory wins until a write succeeds');
  Training.recordStep(working, 'sim', 'wide', { passed: false }, T0);
  assert.equal(stored(working).sim.recall.passed, true);
  assert.equal(Training.read(memoryStorage()).sim.recall, undefined);
  Training.forget(blocked);
});

test('Forget removes the record but keeps a Quiet or Off choice', () => {
  const storage = memoryStorage();
  Training.recordStep(storage, 'practice', 'match-cameras', { passed: true, score: 95 }, T0);
  assert.deepEqual(Training.forget(storage), Training.empty());
  assert.equal(storage.map.has(Training.KEY), false);
  Training.setLevel(storage, 'quiet', T0);
  Training.recordStep(storage, 'practice', 'match-cameras', { passed: true, score: 95 }, T0);
  assert.deepEqual(Training.forget(storage), Training.empty('quiet'));
  assert.deepEqual(stored(storage), Training.empty('quiet'));
});

test('listeners hear this page\'s writes until they unsubscribe', () => {
  const storage = memoryStorage();
  const heard = [];
  const stop = Training.subscribe(record => heard.push(record), storage);
  Training.recordStep(storage, 'sim', 'wide', { passed: true }, T0);
  Training.forget(storage);
  stop();
  Training.recordStep(storage, 'sim', 'follow', { passed: true }, T0);
  assert.equal(heard.length, 2);
  assert.equal(heard[0].sim.wide.passed, true);
  assert.deepEqual(heard[1], Training.empty());
});

test('with no storage passed, reads and writes both use the page\'s localStorage', () => {
  const page = memoryStorage();
  globalThis.localStorage = page;
  try {
    Training.recordStep(undefined, 'practice', 'set-black-level', { passed: false, score: 41 }, T0);
    Training.dismiss(undefined, 'practice.next.recover-highlights', T0);
    assert.equal(stored(page).practice['set-black-level'].best, 41);
    assert.ok(Training.isDismissed(Training.read(), 'practice.next.recover-highlights', T0));
    Training.setLevel(undefined, 'off', T0);
    assert.equal(stored(page).prefs.suggestions, 'off');
    Training.forget();
    assert.deepEqual(stored(page), Training.empty('off'));
  } finally {
    delete globalThis.localStorage;
  }
});

test('the key carries the fmp prefix, so the housevideo.app transfer moves it', () => {
  assert.ok(Training.KEY.startsWith('fmp'));
});

test('the practice steps are Shading practice\'s exercises, in its order and with its titles', () => {
  assert.deepEqual(Training.STEPS.practice.map(step => ({ ...step })), Practice.scenarioList().map(({ id, title }) => ({ id, title })));
  assert.equal(Training.title('practice', 'set-black-level'), 'Set black level');
  assert.equal(Training.title('practice', 'nope'), '');
});
