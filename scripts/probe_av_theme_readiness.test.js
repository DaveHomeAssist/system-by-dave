'use strict';

const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { promisify } = require('node:util');
const test = require('node:test');

const execute = promisify(execFile);
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

async function probe(fixture) {
  assert.ok(process.env.CHROME_BIN, 'CHROME_BIN must select the qualified test browser');
  let delayed = 0;
  let redirects = 0;
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      const pathname = url.pathname;
      if (pathname === '/') {
        response.setHeader('Content-Type', 'text/html');
        response.end('<!doctype html><title>Theme probe fixture origin</title>');
        return;
      }
      if (fixture === 'redirect' && pathname === '/stage-plot.html' && !url.searchParams.has('arrived')) {
        redirects += 1;
        response.setHeader('Content-Type', 'text/html');
        response.end("<!doctype html><script>location.replace('stage-plot.html?arrived=1')</script>");
        return;
      }
      const css = pathname === '/css/av-theme.css';
      const bootstrap = pathname === '/js/av-suite-context.js';
      if (fixture === 'missing-css' && css) {
        response.writeHead(404);
        response.end('Deliberately missing theme stylesheet');
        return;
      }
      if (fixture === 'stalled-bootstrap' && bootstrap) {
        response.writeHead(200, { 'Content-Type': 'text/javascript' });
        response.write('/* Deliberately incomplete response. */');
        return;
      }
      if (fixture === 'delayed' && (css || bootstrap)) {
        delayed += 1;
        await new Promise(resolve => setTimeout(resolve, 900));
      }
      const file = path.resolve(root, '.' + decodeURIComponent(pathname));
      if (!file.startsWith(root + path.sep)) throw new Error('Outside fixture root');
      let body = await fs.readFile(file);
      if (fixture === 'wrong-theme' && bootstrap) {
        body = Buffer.concat([body, Buffer.from("\ndocument.documentElement.setAttribute('data-av-theme', 'black');\n")]);
      }
      response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
      response.end(body);
    } catch (error) {
      response.writeHead(404);
      response.end(error.code || error.message);
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}/`;
    try {
      const result = await execute(process.execPath, [path.join(root, 'scripts/probe_av_themes.js'), `--base=${base}`, '--target=stageplotter'], {
        cwd: root, timeout: 45000, maxBuffer: 4 * 1024 * 1024
      });
      return { ...result, code: 0, delayed, redirects };
    } catch (error) {
      assert.equal(error.signal, null, error.message);
      return { stdout: error.stdout, stderr: error.stderr, code: error.code, delayed };
    }
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}

test('theme probe waits for delayed CSS and bootstrap in both modes', { timeout: 45000 }, async () => {
  const result = await probe('delayed');
  assert.equal(result.code, 0, result.stderr);
  assert.ok(result.delayed >= 4, 'both modes exercise both delayed assets');
  assert.match(result.stdout, /AV theme browser probe passed \(1 surfaces × 2 preferences/);
});

test('theme probe still rejects a fully loaded wrong theme', { timeout: 45000 }, async () => {
  const result = await probe('wrong-theme');
  assert.equal(result.code, 1);
  assert.match(result.stderr, /stageplotter light: wrong theme identity \(stageplotter\/black\)/);
  assert.match(result.stderr, /stageplotter dark: wrong theme identity \(stageplotter\/black\)/);
});

test('theme probe follows a client redirect without accepting the previous document', { timeout: 45000 }, async () => {
  const result = await probe('redirect');
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.redirects, 2, 'both modes navigate through a new redirect document');
  assert.match(result.stdout, /AV theme browser probe passed \(1 surfaces × 2 preferences/);
});

test('theme probe still rejects a missing stylesheet', { timeout: 45000 }, async () => {
  const result = await probe('missing-css');
  assert.equal(result.code, 1);
  assert.match(result.stderr, /stageplotter light: --av-bg is , expected #eee8df/);
  assert.match(result.stderr, /contrast contract failed/);
});

test('theme probe bounds an unfinished load and reports its document state', { timeout: 45000 }, async () => {
  const result = await probe('stalled-bootstrap');
  assert.equal(result.code, 1);
  assert.match(result.stderr, /Navigation readiness failed for .*stage-plot\.html/);
  assert.match(result.stderr, /last document=.*"readyState":"loading"/);
  assert.match(result.stderr, /"stylesheets":\[/);
});
