'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { inspectFiles } = require('./verify_private_exposure');

test('rejects private files and local paths without disclosing values', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'public-exposure-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const sources = {
    'house/private.html': '<p>private fixture</p>',
    'cross-project-dashboard.json': '{}',
    'index.html': '<p>' + '/' + 'Users/example/private-project' + '</p>',
    'public.html': '<p>Public documentation</p>'
  };
  for (const [name, text] of Object.entries(sources)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), text);
  }
  const failures = inspectFiles(root, [...Object.keys(sources), 'deleted.html']);
  assert.equal(failures.length, 3);
  assert.ok(!failures.join('\n').includes('example'));
  assert.deepEqual(inspectFiles(root, ['public.html']), []);
});
