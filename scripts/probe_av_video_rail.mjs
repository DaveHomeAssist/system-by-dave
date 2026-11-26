import { probeFamily } from './av-family-probe.mjs';
// Detailed retained-host regressions remain available through test:av-retained-browser.
if (!process.env.AV_RETAINED_HOST) {
  await probeFamily('video', process.env.AV_VIDEO_BASE);
  process.exit(0);
}

import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2'
};
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://rail-probe').pathname);
  let file = join(ROOT, pathname);
  if (!file.startsWith(ROOT)) return response.writeHead(403).end();
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    response.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
  }
});
await new Promise(resolveReady => server.listen(0, '127.0.0.1', resolveReady));

const BASE = process.env.AV_VIDEO_BASE || `http://127.0.0.1:${server.address().port}`;
const args = process.argv.slice(2);
const channel = process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL }
  : process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {};
const browser = await chromium.launch({ headless: true, ...channel, args: args.includes('--no-sandbox') ? ['--no-sandbox'] : [] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));

const railKey = 'sbd.rail.v1';
const url = `${BASE}/av-video/?sbdShow=Gala&sbdVenue=Hall&sbdDate=2026-10-07&sbdOperator=Dave&sbdPhase=show&private=drop#source`;
const button = name => page.getByRole('button', { name, exact: true });
const allAppsDialog = () => page.locator('#sbdRailAllApps');
const customizeDialog = () => page.locator('#sbdRailCustomize');
const openAllApps = async () => {
  const launcher = page.locator('.sbd-rail-launcher');
  if (await launcher.isVisible()) await launcher.click();
  else await page.locator('.sbd-rail__all').click();
  await expectOpen(allAppsDialog());
};
const expectOpen = async locator => {
  await locator.waitFor({ state: 'visible' });
  assert.equal(await locator.getAttribute('open') !== null, true);
};
const expectedMode = width => width < 720 ? 'phone' : width < 1100 ? 'tablet' : 'desktop';

async function assertFixture(width, height) {
  await page.setViewportSize({ width, height });
  await page.waitForFunction(mode => document.querySelector('.console-shell')?.classList.contains(`mode-${mode}`), expectedMode(width));
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight
  }));
  assert.ok(metrics.scrollWidth <= metrics.clientWidth + 1, `horizontal document overflow at ${width}x${height}`);
  assert.ok(metrics.scrollHeight <= metrics.clientHeight + 1, `vertical document overflow at ${width}x${height}`);

  const rail = page.locator('.sbd-rail');
  const launcher = page.locator('.sbd-rail-launcher');
  assert.equal(await rail.isVisible(), width >= 720, `Rail visibility at ${width}px`);
  assert.equal(await launcher.isVisible(), width < 720, `Apps visibility at ${width}px`);
  if (width >= 720) {
    const box = await rail.boundingBox();
    assert.ok(box, `Rail box at ${width}px`);
    assert.equal(Math.round(box.width), width >= 1440 ? 224 : 56);
    const labelPosition = await page.locator('.sbd-rail__entry[data-rail-ref="console:audio"] .sbd-rail__label').evaluate(element => getComputedStyle(element).position);
    assert.equal(labelPosition, width >= 1440 ? 'static' : 'absolute');
  }

  const controls = page.locator('.sbd-rail-launcher:visible, .sbd-rail a:visible, .sbd-rail button:visible, .sbd-rail .sbd-rail__entry:visible');
  for (let index = 0; index < await controls.count(); index += 1) {
    const box = await controls.nth(index).boundingBox();
    assert.ok(box && box.width >= 44 && box.height >= 44, `Rail target ${index} is smaller than 44px at ${width}x${height}`);
  }
}

try {
  await page.goto(url);
  await page.getByRole('heading', { name: 'AV Video', exact: true }).waitFor();
  assert.equal(await page.locator('[data-sbd-rail-host]').getAttribute('data-rail-state'), 'ready');
  assert.equal(await page.evaluate(key => localStorage.getItem(key), railKey), null, 'opening the Rail must not write preferences');

  await page.keyboard.press('Tab');
  assert.equal((await page.locator(':focus').textContent()).trim(), 'Skip to video workspace');

  const videoHref = new URL(await page.locator('.sbd-rail__entry[data-rail-ref="console:av-video"]').getAttribute('href'));
  assert.equal(videoHref.pathname, '/av-video/');
  assert.equal(videoHref.searchParams.get('sbdShow'), 'Gala');
  assert.equal(videoHref.searchParams.get('sbdVenue'), 'Hall');
  assert.equal(videoHref.searchParams.has('private'), false);
  assert.equal(videoHref.hash, '');
  const toolboxHref = new URL(await page.locator('.sbd-rail__toolbox').getAttribute('href'));
  assert.equal(toolboxHref.pathname, '/av/', 'the Rail Workspace entry opens the console');
  assert.equal(toolboxHref.searchParams.has('sbdShow'), false);

  await page.setViewportSize({ width: 375, height: 667 });
  await openAllApps();
  assert.equal(await allAppsDialog().locator('[data-entry-type="Console"], [data-entry-type="Planned console"]').count(), 10);
  assert.equal(await allAppsDialog().locator('[data-entry-type="Planned console"]').count(), 0);
  assert.equal(await allAppsDialog().locator('[data-entry-type="Console"][href]').count(), 10);
  const audioRailHref = new URL(await allAppsDialog().locator('[data-rail-ref="console:audio"]').getAttribute('href'));
  assert.equal(audioRailHref.pathname, '/av-audio/');
  assert.equal(audioRailHref.searchParams.get('sbdShow'), 'Gala');
  assert.equal(audioRailHref.searchParams.get('sbdPhase'), 'show');
  assert.equal(audioRailHref.searchParams.has('private'), false);
  assert.equal(await page.getByRole('navigation', { name: 'Panels' }).isVisible(), true, 'phone panel switcher remains distinct from Apps');
  await allAppsDialog().getByRole('button', { name: 'Customize rail', exact: true }).click();
  await expectOpen(customizeDialog());
  assert.equal(await allAppsDialog().isVisible(), false);
  assert.equal(await page.evaluate(key => localStorage.getItem(key), railKey), null, 'opening phone customization must not write preferences');
  await customizeDialog().locator('[data-rail-ref="console:audio"][data-action="unpin"]').click();
  assert.equal(await page.locator('.sbd-rail__entry[data-rail-ref="console:audio"]').count(), 0);
  await page.getByRole('button', { name: 'Close Customize rail', exact: true }).click();
  await page.waitForFunction(() => document.activeElement?.classList.contains('sbd-rail-launcher'));
  assert.equal(await page.locator('.sbd-rail-launcher').evaluate(element => element === document.activeElement), true);
  await openAllApps();
  await allAppsDialog().getByRole('button', { name: 'Customize rail', exact: true }).click();
  await customizeDialog().locator('[data-rail-ref="console:audio"][data-action="pin"]').click();
  await page.getByRole('button', { name: 'Close Customize rail', exact: true }).click();
  await page.waitForFunction(() => document.activeElement?.classList.contains('sbd-rail-launcher'));
  await openAllApps();
  await page.keyboard.press('Escape');
  assert.equal(await allAppsDialog().isVisible(), false);
  assert.equal(await page.locator('.sbd-rail-launcher').evaluate(element => element === document.activeElement), true);
  const focusOutline = await page.locator('.sbd-rail-launcher').evaluate(element => getComputedStyle(element).outlineStyle);
  assert.notEqual(focusOutline, 'none');

  for (const [width, height] of [
    [375, 667], [667, 375], [680, 700], [681, 700], [719, 700], [720, 700],
    [1099, 600], [1100, 600], [1439, 700], [1440, 700], [3440, 1440]
  ]) await assertFixture(width, height);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await assertFixture(375, 667);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
  assert.equal(await page.locator('.sbd-rail-launcher').isVisible(), true);
  assert.equal(await page.getByRole('navigation', { name: 'Panels' }).isVisible(), true);
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  await page.setViewportSize({ width: 1440, height: 900 });
  await button('Try a sample plan').click();
  await button('Edit route').click();
  await page.getByLabel('Source', { exact: true }).fill('Rail preserved camera');
  await button('Patch').click();
  assert.match(await page.locator('.route-card').first().textContent(), /Rail preserved camera/);
  await openAllApps();
  await page.setViewportSize({ width: 375, height: 667 });
  await page.getByRole('button', { name: 'Close All apps', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await button('Edit route').click();
  assert.equal(await page.getByLabel('Source', { exact: true }).inputValue(), 'Rail preserved camera');
  await button(/^Save/).click();

  await page.locator('.sbd-rail__customize').click();
  await expectOpen(customizeDialog());
  await customizeDialog().locator('[data-rail-ref="console:audio"][data-action="unpin"]').click();
  assert.equal(await page.locator('.sbd-rail__entry[data-rail-ref="console:audio"]').count(), 0);
  await page.getByRole('button', { name: 'Close Customize rail', exact: true }).click();
  await page.waitForFunction(() => document.activeElement?.classList.contains('sbd-rail__customize'));
  assert.equal(await page.locator('.sbd-rail__customize').evaluate(element => element === document.activeElement), true);
  await page.reload();
  await page.getByRole('heading', { name: 'AV Video', exact: true }).waitFor();
  assert.equal(await page.locator('.sbd-rail__entry[data-rail-ref="console:audio"]').count(), 0, 'unpin persists after reload');
  await page.locator('.sbd-rail__customize').click();
  await customizeDialog().locator('[data-rail-ref="console:audio"][data-action="pin"]').click();
  await customizeDialog().locator('[data-rail-ref="console:audio"][data-action="move-up"]').click();
  const changed = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), railKey);
  assert.equal(changed.pinned.at(-2), 'console:audio');
  await customizeDialog().locator('[data-rail-ref="defaults"][data-action="reset"]').click();
  await page.getByRole('button', { name: 'Close Customize rail', exact: true }).click();
  const railRefs = await page.locator('.sbd-rail__entry').evaluateAll(entries => entries.map(entry => entry.getAttribute('data-rail-ref')));
  assert.deepEqual(railRefs, [
    'tool:throwline', 'tool:led-wall-calculator', 'panel:video:flow', 'guide:console-spec', 'console:av-calculator',
    'console:av-video', 'console:audio', 'console:show-control', 'console:show-ops', 'console:front-office', 'console:shop', 'console:infrastructure', 'console:lighting',
    'tool:teleprompter', 'tool:show-timer', 'tool:cue-sheet', 'tool:pixelforge', 'tool:stageplotter', 'external:rehearsal-capture',
    'console:equipment-lab', 'tool:gear-reference',
    'guide:frame-sync', 'guide:fault-finding', 'guide:field-kit'
  ], 'the rail is Featured, Departments, Show tools, Reference and Learn');
  assert.deepEqual(await page.locator('.sbd-rail__heading').allTextContents(), ['Featured', 'Departments', 'Show tools', 'Reference', 'Learn']);
  assert.equal(await page.locator('.sbd-rail__search-input').count(), 1);
  assert.equal(await page.locator('.sbd-rail__toolbox').count(), 1);
  assert.equal(await page.locator('.sbd-rail__all').count(), 1);
  assert.equal(await page.locator('.sbd-rail__customize').count(), 1);

  async function railIconReport() {
    return page.locator('.sbd-rail__entry').evaluateAll(entries => entries.map(entry => ({
      ref: entry.getAttribute('data-rail-ref'),
      paths: Array.from(entry.querySelectorAll('.sbd-rail__icon path')).map(path => path.getAttribute('d')).join('|')
    })));
  }
  function assertUniqueRailIcons(signatures) {
    const seen = new Map();
    for (const item of signatures) {
      assert.ok(item.paths, `${item.ref} has an icon`);
      assert.equal(seen.has(item.paths), false, `${item.ref} shares an icon with ${seen.get(item.paths)}`);
      seen.set(item.paths, item.ref);
    }
  }
  assertUniqueRailIcons(await railIconReport());

  await page.setViewportSize({ width: 1280, height: 1400 });
  const collapsed = await page.evaluate(() => {
    const rail = document.querySelector('.sbd-rail').getBoundingClientRect();
    const badges = Array.from(document.querySelectorAll('.sbd-rail__badge')).map(badge => {
      const box = badge.getBoundingClientRect();
      const tile = badge.closest('.sbd-rail__entry').getBoundingClientRect();
      const style = getComputedStyle(badge);
      return {
        text: badge.textContent,
        clip: style.clipPath,
        position: style.position,
        insideTile: box.left >= tile.left - 1 && box.right <= tile.right + 1 && box.top >= tile.top - 1 && box.bottom <= tile.bottom + 1,
        insideRail: box.left >= rail.left - 1 && box.right <= rail.right + 1,
        readable: box.width > 8 || box.height > 8
      };
    });
    const sections = Array.from(document.querySelectorAll('.sbd-rail__section')).map(section => getComputedStyle(section).borderTopWidth);
    return { badges, sections, railWidth: rail.width, headingsVisible: Array.from(document.querySelectorAll('.sbd-rail__heading')).some(heading => getComputedStyle(heading).display !== 'none') };
  });
  assert.ok(collapsed.railWidth <= 57, 'collapsed rail stays within the icon column');
  assert.equal(collapsed.headingsVisible, false);
  assert.ok(collapsed.badges.some(badge => badge.text === 'GUIDE'));
  assert.ok(collapsed.badges.some(badge => badge.text === '$12'));
  for (const badge of collapsed.badges) {
    assert.equal(badge.position, 'absolute', badge.text);
    assert.notEqual(badge.clip, 'none', badge.text);
    assert.equal(badge.readable, false, `${badge.text} stays clipped`);
    assert.equal(badge.insideTile, true, `${badge.text} stays inside its tile`);
    assert.equal(badge.insideRail, true, `${badge.text} stays inside the rail`);
  }
  assert.equal(collapsed.sections[0], '0px');
  assert.ok(collapsed.sections.slice(1).every(width => width === '1px'), 'collapsed sections are separated');
  assertUniqueRailIcons(await railIconReport());

  await page.setViewportSize({ width: 1600, height: 1400 });
  const expanded = await page.evaluate(() => {
    const badges = Array.from(document.querySelectorAll('.sbd-rail__badge')).map(badge => ({
      text: badge.textContent,
      clip: getComputedStyle(badge).clipPath,
      position: getComputedStyle(badge).position,
      width: badge.getBoundingClientRect().width
    }));
    const sections = Array.from(document.querySelectorAll('.sbd-rail__section')).map(section => getComputedStyle(section).borderTopWidth);
    return {
      badges,
      sections,
      railWidth: document.querySelector('.sbd-rail').getBoundingClientRect().width,
      headings: Array.from(document.querySelectorAll('.sbd-rail__heading')).map(heading => heading.textContent)
    };
  });
  assert.ok(expanded.railWidth >= 224, 'wide rail shows labels');
  assert.deepEqual(expanded.headings, ['Featured', 'Departments', 'Show tools', 'Reference', 'Learn']);
  assert.ok(expanded.badges.some(badge => badge.text === 'GUIDE' && badge.width > 8 && badge.clip === 'none'));
  assert.ok(expanded.badges.some(badge => badge.text === '$12' && badge.width > 8 && badge.clip === 'none'));
  assert.ok(expanded.sections.every(width => width === '0px'), 'wide rail does not add collapsed dividers');
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.evaluate(key => localStorage.setItem(key, '{broken'), railKey);
  await page.reload();
  await page.getByRole('heading', { name: 'AV Video', exact: true }).waitFor();
  assert.equal(await page.evaluate(key => localStorage.getItem(key), railKey), '{broken', 'invalid preferences must remain untouched');
  await page.getByRole('button', { name: 'Reset rail', exact: true }).click();
  const reset = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), railKey);
  assert.equal(reset.pinned.length, 10);
  assert.deepEqual(errors, []);
  console.log(`AV Video Rail browser verification passed: RAIL-1B slots, RAIL-2A breakpoints, typed routing, state preservation, local customization, focus return, zoom/reduced-motion smoke checks, and ${11} viewport fixtures (${BASE}).`);
} finally {
  await context.close();
  await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
