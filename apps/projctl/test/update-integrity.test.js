import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { verifyUpdate } from '../scripts/verify-update.js';

test('update verification catches changed, missing, unlisted and unsafe source', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'projctl-integrity-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const files = { 'server/index.js': 'server fixture', 'public/release.js': 'release fixture' };
  for (const [name, bytes] of Object.entries(files)) { await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true }); await fs.writeFile(path.join(root, name), bytes); }
  const manifest = { version: 1, sourceCommit: 'a'.repeat(40), files: Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, createHash('sha256').update(bytes).digest('hex')])) };
  const save = () => fs.writeFile(path.join(root, 'DELIVERY.json'), JSON.stringify(manifest));
  await save(); assert.equal((await verifyUpdate(root)).files, 2);
  await fs.writeFile(path.join(root, 'server/index.js'), 'changed');
  await assert.rejects(verifyUpdate(root), /Checksum mismatch/);
  await fs.writeFile(path.join(root, 'server/index.js'), files['server/index.js']);
  await fs.writeFile(path.join(root, 'old.js'), 'stale code'); await assert.rejects(verifyUpdate(root), /Unlisted file/);
  await fs.unlink(path.join(root, 'old.js')); await fs.unlink(path.join(root, 'server/index.js'));
  await assert.rejects(verifyUpdate(root), /ENOENT/);
  await fs.symlink('../public/release.js', path.join(root, 'server/index.js'));
  await assert.rejects(verifyUpdate(root), /Unexpected file type/);
  await fs.unlink(path.join(root, 'server/index.js')); await fs.writeFile(path.join(root, 'server/index.js'), files['server/index.js']);
  manifest.files['../escape'] = 'b'.repeat(64); await save(); await assert.rejects(verifyUpdate(root), /Unsafe/);
});
