import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

/* AV Suite shell (docs/av-suite-shell.md): one console at /av/. Every Rail
   identity recalls its views in place, standalone tools are not panel choices,
   views mix applications, each application saves only its own key,
   and the page never scrolls at any size in either palette. */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://suite-probe').pathname);
  let file = join(ROOT, pathname);
  if (!file.startsWith(ROOT)) return response.writeHead(403).end();
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    response.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(await readFile(file));
  } catch { response.writeHead(404, { 'content-type': 'text/plain' }).end('not found'); }
});
await new Promise(ready => server.listen(0, '127.0.0.1', ready));
const BASE = process.env.AV_SUITE_BASE || `http://127.0.0.1:${server.address().port}`;
const args = process.argv.slice(2);
const channel = process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {};
const browser = await chromium.launch({ headless: true, ...channel, args: args.includes('--no-sandbox') ? ['--no-sandbox'] : [] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));

const url = `${BASE}/av/?sbdShow=Gala&sbdVenue=Hall&sbdDate=2026-10-13&sbdOperator=Dave&sbdPhase=show&private=drop`;
const heading = () => page.locator('.suite-header h1');
const rail = ref => page.locator(`.sbd-rail__entry[data-rail-ref="${ref}"]`);
const tabs = () => page.getByRole('tab');
const button = name => page.getByRole('button', { name, exact: true });
const storage = key => page.evaluate(k => localStorage.getItem(k), key);
const IDENTITIES = [
  ['console:audio', 'Audio', 'Channels'],
  ['console:show-control', 'Show Control', 'Calling'],
  ['console:show-ops', 'Show Ops', 'Operations'],
  ['console:front-office', 'Front Office', 'Desk'],
  ['console:shop', 'The Shop', 'Work'],
  ['console:infrastructure', 'Infrastructure', 'Systems'],
  ['console:lighting', 'Lighting', 'Patch'],
  ['console:av-video', 'AV Video', 'Routing'],
  ['console:av-calculator', 'AV Calculator', 'Audio'],
];
const expectedMode = width => width < 720 ? 'phone' : width < 1100 ? 'tablet' : 'desktop';
async function assertNoOverflow(width, height, label) {
  await page.setViewportSize({ width, height });
  await page.waitForFunction(mode => document.querySelector('.console-shell')?.classList.contains(`mode-${mode}`), expectedMode(width));
  const metrics = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sh: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight }));
  assert.ok(metrics.sw <= metrics.cw + 1, `horizontal overflow at ${width}x${height} (${label})`);
  assert.ok(metrics.sh <= metrics.ch + 1, `vertical overflow at ${width}x${height} (${label})`);
  assert.equal(await page.locator('.console-strip').count(), 1, `one view strip at ${width}x${height}`);
}

try {
  await page.goto(url);
  await heading().waitFor();
  // The console opens on an empty Workspace: no application, no panels, one Add panel.
  assert.equal(await heading().textContent(), 'AV by Dave');
  assert.equal(await page.locator('[data-sbd-rail-host]').getAttribute('data-rail-state'), 'ready');
  assert.equal(await page.locator('.console-strip').count(), 1, 'exactly one console strip');
  assert.equal(await page.locator('.console-empty').count(), 1, 'the Workspace view starts empty');
  assert.equal(await page.locator('.console-panel').count(), 0);
  assert.equal(await page.locator('.sbd-rail__toolbox').getAttribute('aria-current'), 'page', 'Workspace is current on the Rail');
  assert.equal(new URL(await page.locator('.sbd-rail__toolbox').getAttribute('href'), BASE).pathname, '/av/');
  assert.equal(await page.locator('iframe').count(), 0, 'no application iframes on the empty view');
  assert.equal(await storage('sbd.avSuite.workspace.v1'), null, 'opening the shell writes no views');

  // 1. Every Rail identity recalls in place: same URL, its own views, one set of controls.
  for (const [ref, label, firstView] of IDENTITIES) {
    await rail(ref).click();
    await page.waitForFunction(text => document.querySelector('.suite-header h1')?.textContent === text, label);
    assert.equal(new URL(page.url()).pathname, '/av/', `${label} stays on /av/`);
    assert.equal(await rail(ref).getAttribute('aria-current'), 'page', `${label} is current on the Rail`);
    assert.equal(await page.locator('.sbd-rail__entry[aria-current="page"]').count(), 1);
    assert.equal((await tabs().allTextContents())[0].replace(/\s+$/, ''), firstView, `${label} shows its own views`);
    assert.equal(await page.getByRole('button', { name: /Add panel/ }).count(), 1, `${label}: one Add panel`);
    assert.equal(await page.locator('.console-panel iframe').count(), 0, `${label} panels are native`);
    assert.ok(await page.locator('.console-panel').count() >= 1, `${label} renders panels`);
  }
  await rail('console:av-calculator').click();
  await page.waitForFunction(() => document.querySelector('.suite-header h1')?.textContent === 'AV Calculator');
  await page.locator('.console-panel #delayDistance').fill('123');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('avCalculator.v1')).delayDistance === 123);
  assert.equal(await page.locator('.console-panel iframe').count(), 0, 'Calculator controls are native panels');
  assert.equal(await page.locator('.console-panel[data-app="AV Calculator"]').count(), 3);
  const calculatorValues = await storage('avCalculator.v1');
  assert.equal(new URL(await page.locator('#summaryCard a').evaluate(link => link.href)).pathname, '/led-wall-calculator.html', 'Calculator tool links still resolve from the shared /av/ route');
  await page.locator('.console-panel[data-panel="audioCard"]').getByRole('button', { name: 'Field sets', exact: true }).click();
  await page.locator('#fieldSetName').fill('Mixed workspace inputs');
  await page.locator('#fieldSetSave').click();
  await page.waitForFunction(() => document.querySelector('#fieldSetStatus')?.textContent.includes('saved in this browser'));
  const fieldSetExport = page.waitForEvent('download');
  await page.locator('#fieldSetExport').click();
  const fieldSetFile = await fieldSetExport;
  const exportedSet = JSON.parse(await readFile(await fieldSetFile.path(), 'utf8'));
  assert.equal(exportedSet.schema, 'system-by-dave.av-calculator-field-set.v1');
  assert.equal(exportedSet.values.delayDistance, 123);
  await page.locator('#fieldSetsClose').click();
  await page.locator('.console-panel #delayDistance').fill('99');
  await page.locator('.console-panel[data-panel="audioCard"]').getByRole('button', { name: 'Field sets', exact: true }).click();
  await page.locator('#fieldSetRecall').click();
  assert.equal(await page.locator('.console-panel #delayDistance').inputValue(), '123', 'field sets recall into the native panel');
  const summaryExport = page.waitForEvent('download');
  await page.locator('.suite-actions').getByRole('button', { name: 'Export', exact: true }).click();
  assert.match(await readFile(await (await summaryExport).path(), 'utf8'), /123/, 'existing summary export retains current inputs');

  // 1b. The Rail's Workspace entry recalls the empty view in place.
  await page.locator('.sbd-rail__toolbox').click();
  await page.waitForFunction(() => document.querySelector('.suite-header h1')?.textContent === 'AV by Dave');
  assert.equal(new URL(page.url()).pathname, '/av/', 'Workspace stays on /av/');
  assert.equal(await page.locator('.console-empty').count(), 1);
  assert.equal(await page.locator('.sbd-rail__toolbox').getAttribute('aria-current'), 'page');
  assert.equal(await page.locator('.sbd-rail__entry[aria-current="page"]').count(), 0);

  // 2. Specialist tools remain links, never whole applications in tiles.
  await page.locator('.sbd-rail__all').click();
  const allApps = page.locator('#sbdRailAllApps');
  await allApps.waitFor({ state: 'visible' });
  const specialistLink = allApps.locator('[data-rail-ref="tool:throwline"]');
  assert.equal(new URL(await specialistLink.getAttribute('href'), BASE).pathname, '/ProjectorThrow/');
  await specialistLink.click();
  await page.waitForURL('**/ProjectorThrow/**');
  assert.equal(new URL(page.url()).searchParams.has('sbdEmbed'), false);
  await page.goto(url);
  await heading().waitFor();

  // 3. A mixed view: Lighting fixtures next to Video routing, stored by the shell and restored after reload.
  await rail('console:av-video').click();
  await page.waitForFunction(() => document.querySelector('.suite-header h1')?.textContent === 'AV Video');
  await page.getByRole('button', { name: 'Inspector options' }).click();
  await page.getByRole('menuitem', { name: 'Change panel…' }).click();
  const chooser = page.getByRole('dialog', { name: 'Add panel' });
  assert.deepEqual((await chooser.getByRole('group', { name: 'Panel categories' }).locator('button').allTextContents()).slice(0, 3), ['AV Video', 'Audio', 'Show Control'], 'chooser groups panels by application');
  assert.equal(await chooser.getByRole('group', { name: 'Panel categories' }).locator('button').count(), 9, 'only the nine native departments are offered');
  assert.equal(await chooser.getByRole('button', { name: 'Tools', exact: true }).count(), 0, 'no whole-app choices');
  await chooser.getByRole('button', { name: 'Lighting', exact: true }).click();
  await chooser.locator('.console-choices button').filter({ hasText: 'Fixtures' }).click();
  assert.equal(await page.locator('.console-panel[data-app="Lighting"][data-panel="fixtures"]').count(), 1);
  assert.equal(await page.locator('.console-panel[data-app="AV Video"][data-panel="flow"]').count(), 1);
  await page.getByRole('button', { name: 'View options' }).click();
  await page.getByRole('menuitem', { name: 'Store as new view' }).click();
  const stored = JSON.parse(await storage('sbd.avSuite.workspace.v1'));
  assert.equal(stored.version, 1);
  const mixed = stored.views.find(view => view.panels.some(panel => panel.type === 'lighting:fixtures') && view.panels.some(panel => panel.type === 'video:flow'));
  assert.ok(mixed, 'mixed view stored by the shell');
  assert.equal(await storage('sbd.avVideo.v1'), null, 'storing a view writes no application document');
  assert.equal(await storage('sbd.avLighting.v1'), null);
  await page.reload();
  await heading().waitFor();
  await page.waitForSelector('.console-panel[data-app="Lighting"][data-panel="fixtures"]');
  assert.equal(await page.locator('.console-panel[data-app="AV Video"][data-panel="flow"]').count(), 1, 'mixed view restored after reload');

  // Any department, any view: replace Video Patch with Calculator Audio Delay.
  await page.getByRole('button', { name: 'Patch options', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Change panel…' }).click();
  await chooser.getByRole('button', { name: 'AV Calculator', exact: true }).click();
  assert.equal(await chooser.locator('.console-choices button').count(), 7, 'all seven individual calculation panels are available');
  await chooser.locator('.console-choices button').filter({ hasText: 'Audio Delay' }).click();
  assert.equal(await page.locator('.console-panel #delayDistance').inputValue(), '123', 'same Calculator state survives department swaps');
  assert.equal(await storage('avCalculator.v1'), calculatorValues);
  assert.equal(await page.locator('.console-panel iframe').count(), 0, 'mixed panels contain no application frames');
  await page.getByRole('button', { name: 'View options' }).click();
  await page.getByRole('menuitem', { name: /^Update “/ }).click();
  await page.reload();
  await page.locator('.console-panel #delayDistance').waitFor();

  assert.equal(await page.locator('.console-panel #delayDistance').inputValue(), '123');
  assert.equal(await page.locator('.console-panel[data-app="Lighting"]').count(), 1);
  assert.equal(await page.locator('.console-panel[data-app="AV Video"]').count(), 1);
  if (process.env.AV_SUITE_EVIDENCE) {
    await mkdir(process.env.AV_SUITE_EVIDENCE, { recursive: true });
    await page.screenshot({ path: join(process.env.AV_SUITE_EVIDENCE, 'mixed.png') });
  }

  // 4. Save writes only the active application's key; Lighting edits stay in the Lighting document.
  await page.locator('.console-panel[data-app="Lighting"] button', { hasText: 'Add fixture' }).click();
  await rail('console:lighting').click();
  await page.waitForFunction(() => document.querySelector('.suite-header h1')?.textContent === 'Lighting');
  assert.match(await page.locator('.suite-plan').textContent(), /Unsaved/);
  await page.locator('.suite-actions button.primary').click();
  await page.waitForFunction(() => /Saved/.test(document.querySelector('.suite-plan')?.textContent || ''));
  assert.equal(JSON.parse(await storage('sbd.avLighting.v1')).items.length, 1, 'Lighting saved one fixture');
  assert.equal(await storage('sbd.avVideo.v1'), null, 'Lighting Save never writes the Video plan');
  assert.equal(await storage('sbd.avAudio.v1'), null);

  // Disabled Video modules remain selectable without mutating their flags.
  await rail('console:av-video').click();
  await page.getByRole('tab', { name: 'Project', exact: true }).click();
  const moduleToggles = page.locator('.console-panel input[type="checkbox"]');
  assert.ok(await moduleToggles.count() >= 5);
  for (const checkbox of await moduleToggles.all()) if (await checkbox.isChecked()) await checkbox.uncheck();
  await page.locator('.suite-actions button.primary').click();
  const videoBefore = await storage('sbd.avVideo.v1');
  await page.getByRole('button', { name: 'Project options', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Change panel…' }).click();
  await chooser.getByRole('button', { name: 'AV Video', exact: true }).click();
  assert.equal(await chooser.locator('.console-choices button').count(), 10, 'all Video panels remain in the chooser with modules disabled');
  await chooser.locator('.console-choices button').filter({ hasText: 'Cameras' }).click();
  await page.locator('.console-panel[data-panel="cameras"]').waitFor();
  assert.equal(await storage('sbd.avVideo.v1'), videoBefore, 'choosing a panel does not enable or rewrite modules');
  await rail('console:av-calculator').click();
  await page.locator('.console-panel #delayDistance').waitFor();

  // The same Add menu builds a four-department workspace from empty space.
  await page.locator('.sbd-rail__toolbox').click();
  for (const [group, name, splitPanel] of [['AV Calculator', 'Audio Delay'], ['Audio', 'Inputs', 'Audio Delay'], ['AV Video', 'Signal Flow'], ['Lighting', 'Fixtures', 'Signal Flow']]) {
    if (splitPanel) {
      await page.getByRole('button', { name: `${splitPanel} options`, exact: true }).click();
      await page.getByRole('menuitem', { name: 'Split top and bottom', exact: true }).click();
    } else await page.getByRole('button', { name: /Add panel/ }).click();
    await chooser.getByRole('button', { name: group, exact: true }).click();
    await chooser.locator('.console-choices button').filter({ hasText: name }).click();
  }
  assert.equal(await page.locator('.console-panel').count(), 4);
  assert.deepEqual(new Set(await page.locator('.console-panel').evaluateAll(nodes => nodes.map(node => node.dataset.app))), new Set(['AV Calculator', 'Audio', 'AV Video', 'Lighting']));
  assert.equal(await page.locator('iframe').count(), 0);
  await page.getByRole('button', { name: 'View options' }).click();
  await page.getByRole('menuitem', { name: 'Store as new view' }).click();
  await page.reload();
  await page.locator('.console-panel #delayDistance').waitFor();
  assert.equal(await page.locator('.console-panel').count(), 4, 'four native departments reload in the same workspace');
  if (process.env.AV_SUITE_EVIDENCE) await page.screenshot({ path: join(process.env.AV_SUITE_EVIDENCE, 'four-departments.png') });
  // On a full mixed phone workspace, the menu must bring an existing department forward.
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole('navigation', { name: 'Panels' }).getByRole('button', { name: 'Audio Delay', exact: true }).click();
  await page.locator('.console-tools').getByRole('button', { name: /Add panel/ }).click();
  await chooser.getByRole('button', { name: 'Replace the focused panel', exact: true }).click();
  await chooser.getByRole('button', { name: 'Audio', exact: true }).click();
  await chooser.locator('.console-choices button').filter({ hasText: 'Inputs' }).click();
  assert.equal(await page.locator('.console-panel').getAttribute('data-app'), 'Audio', 'phone selection supersedes the previous department quick-bar choice');
  assert.equal(await page.locator('iframe').count(), 0);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('.console-shell.mode-desktop').waitFor();
  assert.equal(await page.locator('.console-panel').count(), 4, 'phone selection preserves all four mixed panels');
  await page.locator('.console-panel[data-app="Audio"]').getByRole('button', { name: 'Add channel', exact: true }).click();
  await rail('console:audio').click();
  await page.locator('.suite-actions button.primary').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('sbd.avAudio.v1'))?.channels.length === 1);
  assert.equal(await storage('avCalculator.v1'), calculatorValues, 'Audio save leaves Calculator inputs untouched');
  assert.equal(await storage('sbd.avVideo.v1'), videoBefore, 'Audio save leaves Video unchanged');
  await rail('console:av-calculator').click();
  await page.locator('.console-panel #delayDistance').waitFor();

  // 5. No page scrolling or inaccessible Calculator controls in either palette.
  for (const theme of ['dark', 'light']) {
    await page.evaluate(value => { document.documentElement.dataset.avTheme = value; }, theme);
    for (const [width, height] of [[375, 812], [667, 375], [680, 700], [1024, 690], [1100, 600], [1366, 650], [1440, 900], [3440, 1440]]) {
      await assertNoOverflow(width, height, theme);
      await page.getByRole('navigation', { name: 'Panels' }).getByRole('button', { name: 'Audio Delay', exact: true }).click();
      await page.locator('.console-panel #audioCard').waitFor();
      const controls = await page.locator('.console-panel .calculator-content button:visible, .console-panel .calculator-content input:visible, .console-panel .calculator-content select:visible').evaluateAll(nodes => nodes.map(node => {
        const b = node.getBoundingClientRect(), panel = node.closest('.console-panel').getBoundingClientRect();
        const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
        return { id: node.id || node.textContent, w: b.width, h: b.height, inside: b.left >= panel.left && b.right <= panel.right + 1 && b.top >= panel.top && b.bottom <= panel.bottom + 1, hit: node === hit || node.contains(hit) };
      }));
      assert.ok(controls.length, `native calculator has reachable controls at ${width}x${height}`);
      assert.deepEqual(controls.filter(c => c.w < 43.5 || c.h < 43.5 || !c.inside || !c.hit), [], `native controls touch targets and containment: ${width}x${height} ${theme}`);
      if (process.env.AV_SUITE_EVIDENCE && [375, 667, 1440].includes(width)) await page.screenshot({ path: join(process.env.AV_SUITE_EVIDENCE, `calculator-${width}-${theme}.png`) });
    }
  }
  await page.setViewportSize({ width: 375, height: 667 });
  assert.equal(await page.getByRole('navigation', { name: 'Panels' }).isVisible(), true, 'phone panel switcher');
  assert.equal(await page.locator('.sbd-rail-launcher').isVisible(), true, 'phone Apps launcher');
  await page.setViewportSize({ width: 1440, height: 900 });
  assert.deepEqual(errors, []);
  // Legacy shell Calculator tiles display natively, without a storage migration.
  const legacyView = { id: 'tool:av-calculator', name: 'My saved calculator', panels: [{ id: 'old-calc', type: 'tool:av-calculator', x: 0, y: 0, w: 12, h: 8 }] };
  const legacyViews = JSON.stringify({ version: 1, views: [legacyView] });
  const legacyLayout = JSON.stringify({ v: 1, viewId: legacyView.id, locked: false, live: { [legacyView.id]: legacyView.panels } });
  await page.evaluate(({ views, layout }) => {
    localStorage.setItem('sbd.avSuite.workspace.v1', views);
    localStorage.setItem('sbd.avSuite.layout.v1', layout);
  }, { views: legacyViews, layout: legacyLayout });
  await page.goto(`${BASE}/av/`);
  await page.locator('.console-panel #delayDistance').waitFor();
  assert.equal(await page.locator('.console-panel #delayDistance').inputValue(), '123');
  assert.equal(await page.locator('.console-panel iframe').count(), 0);
  assert.equal(await page.locator('.console-panel').count(), 3);
  assert.equal(await storage('sbd.avSuite.workspace.v1'), legacyViews, 'opening preserves legacy stored view bytes');
  assert.equal(await storage('sbd.avSuite.layout.v1'), legacyLayout, 'opening preserves legacy device layout bytes');
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  assert.ok(await page.locator('.calculator-native .av-print-text').count(), 'Calculator print values are created in its own controls');
  assert.equal(await page.locator('.suite-header .av-print-text').count(), 0, 'Calculator print preparation leaves the shell controls alone');
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  assert.equal(await page.locator('.av-print-text').count(), 0, 'temporary print values are cleaned up');
  await page.evaluate(layout => localStorage.setItem('sbd.avSuite.layout.v1', JSON.stringify({ ...JSON.parse(layout), viewId: 'suite:workspace' })), legacyLayout);
  await page.goto(`${BASE}/av/`);
  await rail('console:av-calculator').click();
  assert.equal(await page.getByRole('tab', { name: 'My saved calculator', exact: true }).getAttribute('aria-selected'), 'true', 'Rail recalls the legacy Calculator view instead of a new default');
  assert.equal(await storage('sbd.avSuite.workspace.v1'), legacyViews, 'Rail recall does not rewrite saved views');
  await page.waitForFunction(() => document.documentElement.dataset.workspaceOffline === 'ready');
  await context.setOffline(true);
  try {
    await page.reload();
    await page.locator('.console-panel #delayDistance').fill('124');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('avCalculator.v1'))?.delayDistance === 124);
    assert.equal(await page.locator('.console-panel iframe').count(), 0, 'native Calculator works after prepared offline reload');
  } finally { await context.setOffline(false); }
  // Previous specialist slots and their data are retained, never embedded or silently rewritten.
  const specialistView = { id: 'tool:throwline', name: 'Saved projector workspace', panels: [{ id: 'old-projector', type: 'tool:throwline', x: 0, y: 0, w: 12, h: 8 }] };
  const specialistViews = JSON.stringify({ version: 1, views: [specialistView] });
  const specialistLayout = JSON.stringify({ v: 1, viewId: specialistView.id, locked: false, live: { [specialistView.id]: specialistView.panels } });
  await page.evaluate(({ views, layout }) => {
    localStorage.setItem('sbd.avSuite.workspace.v1', views);
    localStorage.setItem('sbd.avSuite.layout.v1', layout);
  }, { views: specialistViews, layout: specialistLayout });
  await page.goto(`${BASE}/av/`);
  await page.getByRole('link', { name: 'Open Throwline separately' }).waitFor();
  assert.equal(await page.locator('iframe').count(), 0);
  assert.equal(await storage('sbd.avSuite.workspace.v1'), specialistViews);
  assert.equal(await storage('sbd.avSuite.layout.v1'), specialistLayout);
  assert.equal(await storage('avCalculator.v1'), JSON.stringify({ ...JSON.parse(calculatorValues), delayDistance: 124 }));
  await page.locator('.console-tools').getByRole('button', { name: /Add panel/ }).click();
  await chooser.getByRole('button', { name: 'Audio', exact: true }).click();
  await chooser.locator('.console-choices button').filter({ hasText: 'Inputs' }).click();
  assert.equal(await page.locator('.console-panel[data-app="Audio"]').count(), 1, 'hidden legacy app geometry does not block adding a native panel');
  assert.equal(await storage('sbd.avSuite.workspace.v1'), specialistViews, 'editing the live arrangement leaves the saved legacy view intact');
  await page.reload();
  await page.locator('.console-panel[data-app="Audio"]').waitFor();
  assert.equal(await page.locator('iframe').count(), 0);

  // Exercise every menu entry as a replacement in one workspace, not just sample departments.
  const menuContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  let panelCount = 0;
  try {
    const menuPage = await menuContext.newPage();
    menuPage.on('pageerror', error => errors.push(error.message));
    await menuPage.goto(`${BASE}/av/`);
    const menu = menuPage.getByRole('dialog', { name: 'Add panel' });
    const openMenu = async () => {
      if (await menuPage.locator('.console-panel').count()) {
        await menuPage.locator('.console-panel .console-bar-actions button[aria-haspopup="menu"]').click();
        await menuPage.getByRole('menuitem', { name: 'Change panel…' }).click();
      } else await menuPage.locator('.console-tools').getByRole('button', { name: /Add panel/ }).click();
    };
    await openMenu();
    const groups = await menu.getByRole('group', { name: 'Panel categories' }).locator('button').allTextContents();
    assert.equal(groups.length, 9);
    for (const group of groups) {
      await menu.getByRole('button', { name: group, exact: true }).click();
      const count = await menu.locator('.console-choices button').count();
      for (let index = 0; index < count; index++) {
        if (index) { await openMenu(); await menu.getByRole('button', { name: group, exact: true }).click(); }
        await menu.locator('.console-choices button').nth(index).click();
        assert.equal(await menuPage.locator('.console-panel').count(), 1, `${group}: replacement stays in the same slot`);
        assert.equal(await menuPage.locator('.console-panel').getAttribute('data-app'), group);
        assert.equal(await menuPage.locator('iframe').count(), 0, `${group}: every choice renders natively`);
        assert.equal(await menuPage.locator('.console-panel .console-body').isVisible(), true);
        panelCount++;
      }
      console.log(`Native chooser: ${group}, ${count} panels passed.`);
      await openMenu();
    }
    await menuPage.keyboard.press('Escape');
    for (const [width, height] of [[375, 812], [667, 375], [680, 700], [1024, 690], [1440, 900], [3440, 1440]]) {
      await menuPage.setViewportSize({ width, height });
      await menuPage.locator(`.console-shell.mode-${expectedMode(width)}`).waitFor();
      await openMenu();
      await menu.getByRole('button', { name: 'AV Video', exact: true }).click();
      await menu.locator('.console-choices button').last().click();
      assert.equal(await menuPage.locator('.console-panel').getAttribute('data-app'), 'AV Video', `last menu item reachable at ${width}x${height}`);
      assert.equal(await menuPage.evaluate(() => document.documentElement.scrollHeight <= document.documentElement.clientHeight && document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
    }
  } finally { await menuContext.close(); }
  const blockedContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  try {
    await blockedContext.addInitScript(() => { Storage.prototype.setItem = function () { throw new DOMException('Storage blocked', 'QuotaExceededError'); }; });
    const blockedPage = await blockedContext.newPage();
    blockedPage.on('pageerror', error => errors.push(error.message));
    await blockedPage.goto(`${BASE}/av/?app=calculator`);
    await blockedPage.locator('.console-panel #delayDistance').fill('88');
    await blockedPage.waitForFunction(() => /storage.*unavailable|values were not saved/i.test(document.querySelector('.suite-app > .message')?.textContent || ''));
    assert.equal(await blockedPage.locator('.suite-app > .message.error').count(), 1, 'failed autosave is visible in the shared status line');
    assert.equal(await blockedPage.evaluate(() => localStorage.getItem('avCalculator.v1')), null, 'failed autosave is not reported as persisted');
  } finally { await blockedContext.close(); }
  assert.deepEqual(errors, []);
  console.log(`AV Suite shell verification passed: all ${panelCount} individual menu choices across nine native departments, mixed panels and reloads, full Video menu with modules disabled, legacy layout bytes preserved, isolated saves, no whole-app tiles, and both palettes at eight sizes.`);
} catch (error) {
  if (process.env.AV_SUITE_EVIDENCE) {
    await mkdir(process.env.AV_SUITE_EVIDENCE, { recursive: true });
    await page.screenshot({ path: join(process.env.AV_SUITE_EVIDENCE, 'failure.png') });
  }
  console.error('Layout at failure:', await page.evaluate(() => Object.fromEntries(['.suite-header', '.suite-bar', '.console-strip', '.console-grid', '.console-panel', '.console-body', '.calculator-leaf', '.calculator-content', '.console-quick', '.message'].map(selector => {
    const element = document.querySelector(selector), box = element?.getBoundingClientRect();
    return [selector, box && { x: box.x, y: box.y, w: box.width, h: box.height }];
  }))));
  throw error;
} finally {
  await context.close();
  await browser.close();
  await new Promise(done => server.close(done));
}
