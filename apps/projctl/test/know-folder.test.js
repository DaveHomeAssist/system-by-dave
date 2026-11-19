// Know tab: diagrams and documents served from a private folder on the relay computer. Only what
// the manifest names, only from inside the folder, only the allowed types. Invented fixtures.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, symlink, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readKnow, resolveKnowFile, cleanKnowFile, knowHeaders, knowType, KNOW_TYPES, KNOW_AUDIENCES, MAX_KNOW_FILE_BYTES } from '../server/know-folder.js';
import { startRelay } from './relay-helper.js';

const SAMPLES = fileURLToPath(new URL('../samples/know/', import.meta.url));
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><script>alert(1)</script><rect width="10" height="10"/></svg>';
async function folder(t, manifest, files = {}) {
  const outer = await mkdtemp(path.join(tmpdir(), 'projctl-know-')), dir = path.join(outer, 'docs');
  t.after(() => rm(outer, { recursive: true, force: true }));
  await mkdir(path.join(dir, 'diagrams'), { recursive: true });
  if (manifest !== undefined) await writeFile(path.join(dir, 'manifest.json'), typeof manifest === 'string' ? manifest : JSON.stringify(manifest));
  for (const [name, text] of Object.entries(files)) await writeFile(path.join(dir, name), text);
  return { outer, dir };
}
const entry = (file, extra = {}) => ({ title: `Title for ${file}`, file, kind: 'doc', audience: ['show-backup'], order: 5, ...extra });

test('a file name is a relative path of an allowed type and nothing else', () => {
  assert.deepEqual(Object.keys(KNOW_TYPES).sort(), ['json', 'md', 'pdf', 'png', 'svg', 'txt']);
  assert.deepEqual(KNOW_AUDIENCES, ['show-backup', 'designer', 'power']);
  for (const good of ['signal-flow.svg', 'diagrams/rack.PNG', 'a/b/c.md', 'cue list.txt', 'plan.pdf', 'map.json']) assert.equal(cleanKnowFile(good), good);
  for (const bad of ['', null, 7, '/etc/passwd.txt', '../secret.txt', 'a/../b.txt', 'a/./b.txt', '.hidden.txt', 'a/.git/config.txt', 'a\\b.txt', 'a//b.txt', 'a/b.txt/', 'notes.html', 'run.js', 'archive.zip', 'README', 'file.svg\n', ' a.txt', 'a /b.txt', `${'a'.repeat(200)}.txt`, 'a.txt\u0000.png'])
    assert.equal(cleanKnowFile(bad), null, JSON.stringify(bad));
  assert.deepEqual([knowType('a.SVG'), knowType('a.exe'), knowType('a')], ['svg', null, null]);
});

test('the manifest is validated, filtered by audience and put in order', async t => {
  const { dir } = await folder(t, [
    entry('late.md', { order: 9, title: 'Late' }), entry('early.svg', { order: 1, kind: 'diagram', title: 'Early', audience: ['designer', 'power'] }),
    entry('tie-b.txt', { order: 5, title: 'B tie' }), entry('tie-a.txt', { order: 5, title: 'A tie' }),
    entry('late.md', { title: 'Duplicate' }), entry('power.md', { audience: ['power'], title: 'Power only' }),
    entry('gone.md', { title: 'Listed but missing' }),
    entry('../outside.txt'), entry('page.html'), entry('x.md', { kind: 'video' }), entry('y.md', { audience: ['nobody'] }), entry('z.md', { title: '' }), entry('w.md', { audience: 'show-backup' }),
    'not an entry', null,
  ], { 'late.md': '# Late', 'early.svg': SVG, 'tie-a.txt': 'a', 'tie-b.txt': 'b', 'power.md': 'p' });
  const all = await readKnow(dir);
  assert.equal(all.state, 'configured');
  assert.deepEqual(all.items.map(item => item.title), ['Early', 'A tie', 'B tie', 'Listed but missing', 'Power only', 'Late'], 'by order, then by title');
  assert.deepEqual(all.items.find(item => item.file === 'early.svg'), { title: 'Early', file: 'early.svg', kind: 'diagram', type: 'svg', audience: ['designer', 'power'], order: 1, available: true, bytes: SVG.length });
  assert.deepEqual([all.items.find(item => item.file === 'gone.md').available, all.items.find(item => item.file === 'gone.md').bytes], [false, null]);
  const page = await readKnow(dir, { audience: ['show-backup', 'designer'] });
  assert.deepEqual(page.items.map(item => item.file), ['early.svg', 'tie-a.txt', 'tie-b.txt', 'gone.md', 'late.md'], 'power-only items are left out');
  assert.deepEqual((await readKnow(dir, { audience: ['power'] })).items.map(item => item.file), ['early.svg', 'power.md']);
});

test('no folder, a missing folder and a bad manifest each say what is wrong', async t => {
  assert.deepEqual(await readKnow(null), { state: 'not-configured', sample: false, items: [] });
  const { dir, outer } = await folder(t);
  assert.equal((await readKnow(dir)).state, 'missing', 'no manifest yet');
  assert.equal((await readKnow(path.join(outer, 'nowhere'))).state, 'missing');
  await writeFile(path.join(dir, 'manifest.json'), 'not json');
  assert.equal((await readKnow(dir)).state, 'invalid');
  await writeFile(path.join(dir, 'manifest.json'), '{"items":[]}');
  assert.equal((await readKnow(dir)).state, 'invalid', 'the manifest is a list');
  await writeFile(path.join(dir, 'manifest.json'), JSON.stringify(Array.from({ length: 5000 }, (_, i) => entry(`f${i}.md`))));
  assert.equal((await readKnow(dir)).state, 'invalid', 'too large to be a manifest');
  await writeFile(path.join(dir, 'file.txt'), 'x');
  assert.equal((await readKnow(path.join(dir, 'file.txt'))).state, 'missing', 'a file is not a folder');
});

test('only files named in the manifest are served, and never from outside the folder', async t => {
  const { dir, outer } = await folder(t, [entry('ok.md'), entry('diagrams/flow.svg', { kind: 'diagram' }), entry('link.txt'), entry('inside-link.txt'), entry('big.pdf'), entry('folder.txt')],
    { 'ok.md': '# OK', 'unlisted.md': 'secret', 'diagrams/flow.svg': SVG, 'real.txt': 'inside' });
  await writeFile(path.join(outer, 'outside.txt'), 'outside the folder');
  await symlink(path.join(outer, 'outside.txt'), path.join(dir, 'link.txt'));
  await symlink(path.join(dir, 'real.txt'), path.join(dir, 'inside-link.txt'));
  await mkdir(path.join(dir, 'folder.txt'));
  await writeFile(path.join(dir, 'big.pdf'), '');
  await truncate(path.join(dir, 'big.pdf'), MAX_KNOW_FILE_BYTES + 1);

  const ok = await resolveKnowFile(dir, 'ok.md');
  assert.deepEqual([path.basename(ok.path), ok.type, ok.mime, ok.bytes, ok.name], ['ok.md', 'md', 'text/plain; charset=utf-8', 4, 'ok.md']);
  assert.equal((await resolveKnowFile(dir, 'diagrams/flow.svg')).mime, 'image/svg+xml');
  assert.equal(path.basename((await resolveKnowFile(dir, 'inside-link.txt')).path), 'real.txt', 'a link that stays inside the folder is followed');
  for (const refused of ['unlisted.md', 'manifest.json', 'link.txt', 'big.pdf', 'folder.txt', '../outside.txt', '/etc/hosts', 'ok.md/../unlisted.md', 'OK.MD', '', null, 'diagrams', 'diagrams/'])
    assert.equal(await resolveKnowFile(dir, refused), null, JSON.stringify(refused));
  assert.equal(await resolveKnowFile(null, 'ok.md'), null);
  const listed = await readKnow(dir);
  assert.deepEqual(listed.items.map(item => [item.file, item.available]), [['big.pdf', false], ['diagrams/flow.svg', true], ['folder.txt', false], ['inside-link.txt', true], ['link.txt', false], ['ok.md', true]]);
});

test('served files carry headers that keep them inert', () => {
  const svg = knowHeaders({ mime: 'image/svg+xml', bytes: 120, type: 'svg', name: 'signal "flow".svg' });
  assert.equal(svg['x-content-type-options'], 'nosniff');
  assert.equal(svg['content-security-policy'], "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; sandbox");
  assert.equal(svg['content-disposition'], 'inline; filename="signal _flow_.svg"');
  assert.deepEqual([svg['content-length'], svg['cache-control'], svg['cross-origin-resource-policy']], ['120', 'private, no-store', 'same-origin']);
  assert.equal(knowHeaders({ mime: 'application/pdf', bytes: 1, type: 'pdf', name: 'a.pdf' })['content-security-policy'], undefined, 'the browser PDF viewer does not run in a sandbox');
});

test('the sample set is complete, invented and inside the allowed types', async () => {
  const sample = await readKnow(SAMPLES, { sample: true });
  assert.deepEqual([sample.state, sample.sample, sample.items.length], ['configured', true, 5]);
  assert.ok(sample.items.every(item => item.available && /^Sample /.test(item.title)), 'every sample is present and labelled as a sample');
  assert.deepEqual(sample.items.map(item => item.type), ['svg', 'md', 'txt', 'json', 'md']);
  const svg = await readFile(path.join(SAMPLES, 'signal-flow.svg'), 'utf8');
  assert.doesNotMatch(svg, /<script|href=|https?:\/\/(?!www\.w3\.org\/2000\/svg)/, 'no script and no outside reference');
  for (const item of sample.items) assert.doesNotMatch(await readFile(path.join(SAMPLES, item.file), 'utf8'), /\b(?:\d{1,3}\.){3}\d{1,3}\b|@[a-z0-9-]+\.[a-z]{2,}|\(\d{3}\)\s?\d{3}/i, `${item.file} holds no address, mail or phone number`);
});

test('the relay serves the list and the files behind the sign-in; simulation shows the samples', async t => {
  const sim = await startRelay();
  try {
    const list = await sim.api('know?audience=show-backup,designer');
    assert.deepEqual([list.status, list.body.state, list.body.sample, list.body.items.map(item => item.file)], [200, 'configured', true, ['signal-flow.svg', 'recovery.md', 'cue-notes.txt', 'output-map.json']]);
    const svg = await fetch(`${sim.base}/api/know/file?f=signal-flow.svg`);
    assert.deepEqual([svg.status, svg.headers.get('content-type'), svg.headers.get('x-content-type-options')], [200, 'image/svg+xml', 'nosniff']);
    assert.match(svg.headers.get('content-security-policy'), /sandbox/);
    assert.match(await svg.text(), /Sample signal flow/);
    const doc = await fetch(`${sim.base}/api/know/file?f=recovery.md`);
    assert.deepEqual([doc.status, doc.headers.get('content-type')], [200, 'text/plain; charset=utf-8']);
    for (const refused of ['manifest.json', '../know/manifest.json', '..%2F..%2Fpackage.json', '/etc/hosts', 'nothing.md', '']) {
      const reply = await fetch(`${sim.base}/api/know/file?f=${refused}`);
      assert.equal(reply.status, 404, refused);
      assert.deepEqual(await reply.json(), { error: 'not in the documents folder' });
    }
    assert.equal((await fetch(`${sim.base}/api/know/file`)).status, 404);
    assert.equal((await fetch(`${sim.base}/api/know`, { method: 'POST' })).status, 405, 'read only');
  } finally { await sim.close(); }

  const { dir } = await folder(t, [entry('ours.md', { title: 'Ours', audience: ['show-backup', 'designer'] })], { 'ours.md': '# Ours' });
  const relay = await startRelay({}, { files: { 'host-paths.json': JSON.stringify({ knowFolder: dir }) } });
  try {
    const list = await relay.api('know');
    assert.deepEqual([list.body.state, list.body.sample, list.body.items.map(item => item.title)], ['configured', false, ['Ours']]);
    assert.equal(await (await fetch(`${relay.base}/api/know/file?f=ours.md`)).text(), '# Ours');
    assert.equal((await fetch(`${relay.base}/api/know/file?f=signal-flow.svg`)).status, 404, 'the samples are not served once a folder is set');
  } finally { await relay.close(); }

  const locked = await startRelay({ PJ_PASSCODE: 'simulator-only-code' });
  try {
    assert.equal((await fetch(`${locked.base}/api/know`)).status, 401);
    assert.equal((await fetch(`${locked.base}/api/know/file?f=signal-flow.svg`)).status, 401);
  } finally { await locked.close(); }
});
