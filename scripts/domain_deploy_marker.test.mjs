import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { deployMarker } from './stage_domain_sites.mjs';

test('the deploy marker records the digest staged for each destination, not their commits', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-marker-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const stage = (id, digest, files) => {
    const dir = path.join(root, id);
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'source.json'), JSON.stringify({ site: id, sourceCommit: 'c'.repeat(40), artifactSha256: digest, files }));
    return { site: { id, domain: `${id}.example.test` }, result: { dir, files: files + 1 } };
  };
  const marker = JSON.parse(deployMarker(
    [stage('alpha', 'a'.repeat(64), 10), stage('beta', 'b'.repeat(64), 3)],
    { commit: 'd'.repeat(40), config: { sourceRepository: 'example/source' } }
  ));
  assert.deepEqual(marker, {
    schema: 'system-by-dave.deploy.v1',
    sourceRepository: 'example/source',
    sourceCommit: 'd'.repeat(40),
    sites: {
      alpha: { domain: 'alpha.example.test', artifactSha256: 'a'.repeat(64), files: 10 },
      beta: { domain: 'beta.example.test', artifactSha256: 'b'.repeat(64), files: 3 }
    }
  });
});
