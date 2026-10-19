#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, stat, mkdir, writeFile} from 'node:fs/promises';
import {resolve, dirname, join, extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium, webkit} from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = `<!doctype html><style>
  .box{height:20px;width:100px}.contents{display:contents}
  #card{width:220px;height:180px}#items{height:100px;display:grid;grid-template-columns:1fr;gap:0}
  .unit{height:60px;box-sizing:border-box}.av-page-away{display:none!important}
  .av-page-window{width:200px;height:90px;overflow:hidden}
  .av-page-content{height:90px;columns:200px;column-gap:16px;column-fill:auto;transform:translateX(var(--av-page-offset,0px))}
  .av-page-content>div{height:60px;break-inside:avoid}
</style><div id="visible" class="box"></div><div id="hidden" hidden class="box"></div>
<div style="display:none"><div id="hiddenParent" class="box"></div></div>
<div id="visibility" class="box" style="visibility:hidden"></div>
<div id="opacity" class="box" style="opacity:0"></div>
<div id="contents" class="contents"><span>contents</span></div>
<div id="zero" style="width:0;height:0"></div><div id="fixed" class="box" style="position:fixed"></div>
<div id="skippedSelf" class="box" style="content-visibility:hidden"><div id="skippedChild" class="box"></div></div>
<section id="card"><div id="items"><label class="unit">One<input value="one"></label><label class="unit">Two<input value="two"></label><label class="unit">Three<input value="three"></label><label class="unit" hidden>Hidden<input value="hidden"></label></div></section>
<section id="workspace"><div><input value="first"></div><div><input value="second"></div><div><input value="third"></div></section>`;

const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

export async function verifyVisibilityCompatibility(browser, base, output) {
  const results = [];
  let expected;
  for (const missing of [false, true]) {
    const context = await browser.newContext({viewport: {width: 1440, height: 900}, serviceWorkers: 'block'});
    try {
      if (missing) await context.addInitScript(() => Object.defineProperty(Element.prototype, 'checkVisibility', {value: undefined, configurable: true}));
      await context.route('**/avv06-fixture.html', route => route.fulfill({contentType: 'text/html', body: fixture}));
      const page = await context.newPage();
      await page.goto(new URL('avv06-fixture.html', base).href);
      await page.addScriptTag({url: new URL('js/av-viewport.js', base).href});
      await page.addScriptTag({url: new URL('js/av-workspace.js', base).href});
      const state = await page.evaluate(() => {
        const ids = ['visible', 'hidden', 'hiddenParent', 'visibility', 'opacity', 'contents', 'zero', 'fixed', 'skippedSelf', 'skippedChild'];
        const nodes = ids.map(id => [id, document.getElementById(id)]);
        nodes.push(['disconnected', document.createElement('div')]);
        const matrix = Object.fromEntries(nodes.map(([id, node]) => [id, {
          native: typeof node.checkVisibility === 'function' ? node.checkVisibility() : null,
          viewport: AVViewport.isVisible(node), workspace: AVWorkspace.isVisible(node)
        }]));
        const items = document.getElementById('items');
        const pager = AVViewport.paginate(document.getElementById('card'), items, {units: [...items.children], label: 'Fixture'});
        pager.refresh();
        const focused = items.querySelectorAll('input')[2];
        pager.reveal(focused); focused.focus({preventScroll: true}); pager.refresh();
        const viewportFocusPreserved = document.activeElement === focused;
        const viewportPage = document.getElementById('card').dataset.page;
        const viewportPages = document.getElementById('card').dataset.pages;
        const workspace = document.getElementById('workspace');
        const legacy = AVWorkspace.paginate(workspace, {label: 'Fixture'});
        const legacyFocused = workspace.querySelectorAll('input')[2];
        legacy.refresh(); legacy.reveal(legacyFocused); legacyFocused.focus({preventScroll: true}); legacy.refresh();
        const workspaceFocusPreserved = document.activeElement === legacyFocused;
        const values = [...document.querySelectorAll('input')].map(input => input.value);
        let delegated = null;
        if (typeof Element.prototype.checkVisibility === 'function') {
          const calls = [];
          const node = document.getElementById('visible');
          node.checkVisibility = function(...args) {calls.push(args.length); return false;};
          delegated = {viewport: AVViewport.isVisible(node), workspace: AVWorkspace.isVisible(node), calls};
        }
        return {matrix, viewportPage, viewportPages, viewportFocusPreserved, workspaceFocusPreserved, workspacePage: workspace.dataset.page, workspacePages: workspace.dataset.pages, values, delegated};
      });
      if (!missing) expected = Object.fromEntries(Object.entries(state.matrix).map(([id, value]) => [id, value.native]));
      for (const [id, value] of Object.entries(state.matrix)) {
        assert.equal(value.viewport, expected[id], `viewport visibility: ${id}, missing=${missing}`);
        assert.equal(value.workspace, expected[id], `workspace visibility: ${id}, missing=${missing}`);
      }
      assert.equal(state.viewportPage, '3'); assert.equal(state.viewportPages, '3');
      assert.equal(state.workspacePage, '3'); assert.equal(state.workspacePages, '3');
      assert.equal(state.viewportFocusPreserved, true); assert.equal(state.workspaceFocusPreserved, true);
      assert.deepEqual(state.values, ['one', 'two', 'three', 'hidden', 'first', 'second', 'third']);
      if (!missing) assert.deepEqual(state.delegated, {viewport: false, workspace: false, calls: [0, 0]});
      results.push({fixture: true, missing, ...state});
    } finally {await context.close();}
  }
  for (const missing of [false, true]) {
    for (const route of ['av-calculator.html', 'led-wall-calculator.html', 'cue-sheet.html', 'stage-plot.html', 'av/']) {
      const context = await browser.newContext({viewport: route === 'av/' ? {width: 1440, height: 900} : {width: 375, height: 812}, serviceWorkers: 'block', reducedMotion: 'reduce'});
      let page; const errors = [];
      try {
        if (missing) await context.addInitScript(() => Object.defineProperty(Element.prototype, 'checkVisibility', {value: undefined, configurable: true}));
        page = await context.newPage();
        page.setDefaultTimeout(10000); page.on('pageerror', error => errors.push(error.message));
        await page.goto(new URL(route, base).href, {waitUntil: 'networkidle'});
        if (route === 'av/') {
          await page.locator('.sbd-rail__entry[data-rail-ref="console:av-calculator"]').click();
          await page.locator('.console-panel #delayDistance').waitFor({state: 'visible'});
          await page.setViewportSize({width: 375, height: 812});
        } else if (route === 'av-calculator.html') {
          await page.getByRole('tab', {name: 'Power', exact: true}).click();
        } else if (route === 'cue-sheet.html' || route === 'stage-plot.html') {
          await page.locator('html[data-av-viewport="ready"]').waitFor({state: 'attached'});
          if (route === 'stage-plot.html') {
            await page.getByRole('combobox', {name: 'StagePlotter view', exact: true}).selectOption({label: 'Tools'});
            await page.getByRole('combobox', {name: 'StagePlotter view', exact: true}).selectOption({label: 'Canvas'});
            await page.getByRole('button', {name: 'Zoom in', exact: true}).click();
          }
        } else {
          await page.evaluate(() => AVWorkspace.refresh());
        }
        await settle(page);
        assert.deepEqual(errors, [], `${route}: missing=${missing}`);
        const state = await page.evaluate(() => ({
          method: typeof Element.prototype.checkVisibility,
          pagers: document.querySelectorAll('nav[aria-label$=" pages"]').length,
          measured: document.querySelectorAll('[data-pages]').length,
          ready: document.documentElement.dataset.avViewport || null
        }));
        assert.ok(state.pagers > 0, `${route} has reachable pagers`);
        assert.ok(state.measured > 0, `${route} pagers completed measurement`);
        if (output && missing && ['av-calculator.html', 'led-wall-calculator.html'].includes(route)) await page.screenshot({path: join(output, route.replace('.html', '') + '-fallback.png')});
        results.push({route, missing, errors, ...state});
      } catch (error) {
        const failure = {route, missing, error: error.message, pageErrors: errors};
        if (output) await writeFile(join(output, 'visibility-failure.json'), JSON.stringify({failure, completed: results}, null, 2));
        console.error(JSON.stringify(failure));
        throw error;
      } finally {await context.close();}
    }
  }
  if (output) await writeFile(join(output, 'visibility-results.json'), JSON.stringify(results, null, 2));
  console.log('PASS visibility compatibility: 11 box states for both helpers, native delegation, pagination/value preservation and 10 current-route cases');
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const engine = process.env.AV_WORKSPACE_BROWSER || 'chromium';
  assert.ok(['chromium', 'webkit'].includes(engine));
  const output = process.env.AV_VISIBILITY_EVIDENCE;
  if (output) await mkdir(output, {recursive: true});
  const mime = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'};
  const server = createServer(async (req, res) => {
    try {
      let path = join(ROOT, new URL(req.url, 'http://local').pathname);
      if ((await stat(path)).isDirectory()) path = join(path, 'index.html');
      res.writeHead(200, {'content-type': mime[extname(path)] || 'application/octet-stream'}); res.end(await readFile(path));
    } catch {res.writeHead(404).end();}
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = engine === 'webkit' ? await webkit.launch({headless: true}) : await chromium.launch({headless: true, args: ['--enable-unsafe-swiftshader']});
    await verifyVisibilityCompatibility(browser, process.env.AV_WORKSPACE_BASE || `http://127.0.0.1:${server.address().port}/`, output);
  } finally {
    try {await browser?.close();} finally {await new Promise(resolve => server.close(resolve));}
  }
}
