import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const write = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
};

test('media phase preserves the live catalog and manifests while extending the media allowlist', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wst-review-integrator-'));
  try {
    const managed = path.join(root, 'managed');
    const data = path.join(root, 'data');
    const viewer = path.join(root, 'viewer.html');
    const previousCatalog = {
      version: 1,
      release: 'old',
      defaultSession: 'old-b',
      sessions: [
        { id: 'old-a', title: 'Old A', manifest: '/run-review/releases/old/old-a.json' },
        { id: 'old-b', title: 'Old B', manifest: '/run-review/releases/old/old-b.json' },
      ],
    };
    const previousManifests = Object.fromEntries(previousCatalog.sessions.map(session => [session.manifest, { version: 1, release: 'old', sessionId: session.id, files: {}, images: {} }]));
    const targetSessions = [...previousCatalog.sessions.map(session => ({ ...session, release: 'old' })),
      { id: 'new-a', title: 'New A', manifest: '/run-review/releases/new/new-a.json', release: 'new' }];
    const targetCatalog = { version: 1, release: 'new', defaultSession: 'old-b', sessions: targetSessions };
    write(path.join(managed, '.openai/hosting.json'), { project_id: 'appgprj_6aed67f5df688191acf3e2641138818a', r2: 'REVIEW_PHOTOS', d1: 'DB' });
    write(path.join(managed, 'worker/index.js'), "export default {async fetch(request,env){ const url=new URL(request.url),path=url.pathname;return new Response(path);}};\n");
    write(path.join(managed, 'worker/review-release.js'), `export default ${JSON.stringify({ active: true, catalog: previousCatalog, media: { '/old.jpg': { sha256: 'a' } }, manifests: previousManifests })};\n`);
    write(path.join(managed, 'scripts/build.sh'), '#!/bin/sh\n');
    write(viewer, '<!doctype html><title>Review</title>');
    write(path.join(data, 'catalog.json'), targetCatalog);
    write(path.join(data, 'media.json'), { '/old.jpg': { sha256: 'a' }, '/new.jpg': { sha256: 'b' } });
    for (const session of targetSessions) write(path.join(data, `${session.id}.json`), { version: 1, release: session.release || targetCatalog.release, sessionId: session.id, files: {}, images: {} });

    const result = spawnSync(process.execPath, [new URL('./integrate-review.mjs', import.meta.url).pathname, managed, viewer, data, 'media'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const installedSource = fs.readFileSync(path.join(managed, 'worker/review-release.js'), 'utf8').trim();
    const installed = JSON.parse(installedSource.slice('export default '.length, -1));
    assert.equal(installed.active, true);
    assert.deepEqual(installed.catalog, previousCatalog);
    assert.deepEqual(installed.manifests, previousManifests);
    assert.deepEqual(Object.keys(installed.media).sort(), ['/new.jpg', '/old.jpg']);
    const receipt = JSON.parse(fs.readFileSync(path.join(managed, 'REVIEW_RELEASE.json')));
    assert.deepEqual(receipt.activeSessions, ['old-a', 'old-b']);
    assert.equal(receipt.mediaRoutes, 2);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
