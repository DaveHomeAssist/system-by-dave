import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createServer } from 'vite';

// GHSA-8g5g-mxqh-grgj: queries must not bypass the dev server's file deny list.
// Use disposable synthetic content, loopback only, and an OS-assigned port.
test('Vite denies protected files with raw and import queries', { timeout: 15000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'sbd-vite-deny-'));
  const marker = 'synthetic-denied-file-marker';
  let server;
  try {
    await writeFile(join(root, 'index.html'), '<!doctype html><title>Allowed fixture</title>');
    await writeFile(join(root, 'private.crt'), marker);
    await writeFile(join(root, 'allowed.ts'), 'export const allowed: string = "allowed-module";');
    server = await createServer({
      configFile: false,
      root,
      logLevel: 'silent',
      server: {
        host: '127.0.0.1',
        port: 0,
        fs: { strict: true, allow: [root], deny: ['**/private.crt'] }
      }
    });
    await server.listen();
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    const allowed = await fetch(`${origin}/`, { signal: AbortSignal.timeout(3000) });
    assert.equal(allowed.status, 200);
    assert.match(await allowed.text(), /Allowed fixture/);
    const module = await fetch(`${origin}/allowed.ts`, { signal: AbortSignal.timeout(3000) });
    assert.equal(module.status, 200);
    const transformed = await module.text();
    assert.match(transformed, /allowed-module/);
    assert.ok(!transformed.includes(': string'), 'Allowed TypeScript is still transformed');
    for (const query of ['', '?raw', '?import&raw', '?import&url&inline']) {
      const response = await fetch(`${origin}/private.crt${query}`, { signal: AbortSignal.timeout(3000) });
      const body = await response.text();
      assert.ok(!body.includes(marker), `Denied content leaked for ${query || 'plain request'}`);
      assert.equal(response.status, 403, `Expected denial for ${query || 'plain request'}`);
    }
  } finally {
    await server?.close();
    await rm(root, { recursive: true, force: true });
  }
});
