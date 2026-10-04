#!/usr/bin/env node
// Render the AV tool navigation beside the show dock at representative widths.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
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
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
};
const server = createServer(async (request, response) => {
  let file = resolve(ROOT, '.' + decodeURIComponent(new URL(request.url, 'http://probe').pathname));
  if (!file.startsWith(ROOT + '/')) return response.writeHead(403).end();
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' }).end(body);
  } catch {
    response.writeHead(404).end('not found');
  }
});
await new Promise((ready) => server.listen(0, '127.0.0.1', ready));

const browserOptions = process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL }
  : process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {};
let browser;
try {
  browser = await chromium.launch({ headless: true, ...browserOptions,
    args: process.argv.includes('--no-sandbox') ? ['--no-sandbox'] : [] });
  const base = `http://127.0.0.1:${server.address().port}/cable-plan.html`;
  const show = `${base}?sbdShow=Winter%20Keynote&sbdVenue=Hall%20B`;

  async function revealViewport(page, selector) {
    if (!await page.locator('[data-av-viewport=ready]').count()) return;
    const target = page.locator(selector);
    const id = await target.evaluate(node => node.closest('.av-view')?.id);
    if (!id) return;
    const tab = page.locator('#' + id + 'Tab');
    if (await tab.isVisible()) await tab.click();
    else {
      const index = await tab.evaluate(node => [...node.parentElement.children].indexOf(node));
      await page.locator('#taskView').selectOption(String(index));
    }
    const pager = page.locator('#' + id + ' > .av-pages');
    const previous = pager.getByRole('button', { name: 'Previous', exact: true });
    while (await previous.isEnabled()) await previous.click();
    for (let n = 0; n < 30 && !await target.isVisible(); n++) {
      await pager.getByRole('button', { name: 'Next', exact: true }).click();
    }
  }

  async function checkLayout(page, label) {
    await page.waitForTimeout(100);
    const result = await page.evaluate(() => {
      const nav = document.querySelector('.sbd-nav');
      const dock = document.querySelector('[data-sbd-suite-dock]');
      if (!nav || !dock) return { missing: !nav ? 'tool navigation' : 'show dock' };
      const a = nav.getBoundingClientRect();
      const b = dock.getBoundingClientRect();
      const overlap = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
        * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      const blockedLink = Array.from(nav.querySelectorAll('a')).find((link) => {
        const box = link.getBoundingClientRect();
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        return !hit || !nav.contains(hit);
      });
      const shortestLink = Math.min(...Array.from(nav.querySelectorAll('a'),
        (link) => link.getBoundingClientRect().height));
      const fixedWorkspace = document.documentElement.classList.contains('led-workspace-ready');
      const appBottom = fixedWorkspace ? document.querySelector('.app').getBoundingClientRect().bottom : null;
      const embedded = nav.classList.contains('sbd-nav-embedded');
      const root = document.documentElement;
      const main = document.querySelector('main')?.getBoundingClientRect();
      return { embedded, overflowX: root.scrollWidth-root.clientWidth, overflowY: root.scrollHeight-root.clientHeight, mainTop: main?.top, overlap, navTop: a.top, navBottom: a.bottom, blockedLink: blockedLink?.textContent,
        shortestLink, fixedWorkspace, appBottom,
        clearance: parseFloat(getComputedStyle(document.body).paddingBottom) };
    });
    if (result.missing || result.overlap > 0.5 || result.navTop < -1
        || result.navBottom > page.viewportSize().height + 1 || result.blockedLink || result.shortestLink < 44
        || (result.embedded ? result.overflowX > 1 || result.overflowY > 1 || result.mainTop < result.navBottom
          : result.fixedWorkspace ? result.appBottom > result.navTop - 8
          : result.clearance < page.viewportSize().height - result.navTop - 1)) {
      throw new Error(`${label}: ${JSON.stringify(result)}`);
    }
    console.log(`ok - ${label}`);
  }

  const gearIndex = JSON.parse(await readFile(join(ROOT, 'data/gear/index.json'), 'utf8'));
  for (const [width, height] of [[375, 812], [680, 720], [1440, 900]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    const workspaceRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (/housevideo\.app|\/fmp\//i.test(request.url())) workspaceRequests.push(request.url());
    });
    // An obsolete venue hash or unbound query must not re-enable workspace content.
    await page.goto(base.replace('cable-plan.html', 'gear-reference.html') +
      '?gear=birddog-p240&workspace=fmp&sbdVenue=FMP#kept-with-fmp', { waitUntil: 'networkidle' });
    if (await page.getByRole('tab', { name: '01 Identification', exact: true }).getAttribute('aria-selected') !== 'true') throw new Error('Obsolete workspace hash did not fall back to Identification');
    for (const entry of gearIndex.entries) {
      await page.getByLabel('Choose gear reference', { exact: true }).selectOption(entry.id);
      await page.waitForFunction(id => new URL(location.href).searchParams.get('gear') === id &&
        document.querySelector('.panel.active'), entry.id);
      const result = await page.evaluate(() => {
        const main = document.querySelector('#reference-main');
        const sheet = document.querySelector('.gear-app');
        return {
          text: main.textContent,
          targets: Array.from(sheet.querySelectorAll('a[href],iframe[src]'), el => el.href || el.src),
          overflow: document.documentElement.scrollHeight > document.documentElement.clientHeight ||
            document.documentElement.scrollWidth > document.documentElement.clientWidth,
          active: main.querySelectorAll('.panel.active').length
        };
      });
      if (/\bfmp\b|housevideo|freedom mortgage|kept-with-fmp/i.test(result.text) ||
          result.targets.some(url => /housevideo|\/fmp\//i.test(url)) || result.overflow || result.active !== 1) {
        throw new Error(`Public gear boundary ${entry.id} ${width}: ${JSON.stringify(result)}`);
      }
    }
    if (errors.length || workspaceRequests.length) throw new Error(JSON.stringify({ errors, workspaceRequests }));
    await page.emulateMedia({ media: 'print' });
    if (/\bfmp\b|housevideo/i.test(await page.locator('#reference-main').textContent())) {
      throw new Error('Public gear print exposes workspace content');
    }
    console.log(`ok - nine public equipment sheets stay workspace-independent at ${width}x${height}`);
    await page.close();
  }

  const stalePage = await browser.newPage();
  const staleSheet = JSON.parse(await readFile(join(ROOT, 'data/gear/birddog-p240.json'), 'utf8'));
  staleSheet.summary = 'FMP installed camera: stale workspace data';
  await stalePage.route('**/data/gear/birddog-p240.json', route => route.fulfill({ json: staleSheet }));
  await stalePage.goto(base.replace('cable-plan.html', 'gear-reference.html') + '?gear=birddog-p240', { waitUntil: 'networkidle' });
  if (!(await stalePage.locator('#loadDetail').textContent()).includes('equipment-only update') ||
      (await stalePage.locator('#reference-stage').textContent()).includes('stale workspace data')) {
    throw new Error('Cached workspace sheet was not rejected');
  }
  console.log('ok - stale workspace sheet is rejected before rendering');
  await stalePage.close();

  for (const [width, height] of [[390, 844], [390, 667], [768, 844], [1200, 900]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(show.replace('cable-plan.html', 'led-wall-calculator.html'), { waitUntil: 'networkidle' });
    await checkLayout(page, `LED workspace ${width}x${height}`);
    const compact = await page.locator('[data-sbd-suite-dock]').getAttribute('data-sbd-suite-compact');
    if (compact !== String(width <= 680)) throw new Error(`LED default dock state: ${width} ${compact}`);
    const scroll = await page.locator('.led-suite').evaluate((suite) => {
      suite.scrollTop = suite.scrollHeight;
      return { viewport: suite.clientHeight, overflow: suite.scrollHeight - suite.clientHeight,
        reachedEnd: suite.scrollTop > 0 };
    });
    if (scroll.viewport < 120 || (scroll.overflow > 1 && !scroll.reachedEnd)) {
      throw new Error(`LED workspace cannot scroll: ${width}x${height} ${JSON.stringify(scroll)}`);
    }
    if (width === 390) {
      await page.locator('[data-sbd-suite-compact-toggle]').click();
      await checkLayout(page, `LED workspace ${width}x${height} expanded dock`);
      await page.reload({ waitUntil: 'networkidle' });
      const saved = await page.locator('[data-sbd-suite-dock]').getAttribute('data-sbd-suite-compact');
      if (saved !== 'false') throw new Error('explicit expanded preference was not preserved');
    }
    if (errors.length) throw new Error(`LED page errors: ${errors.join('; ')}`);
    console.log(`ok - LED workspace scroll ${width}x${height}`);
    await page.close();
  }

  for (const [width, height] of [[390, 844], [390, 667], [680, 720], [768, 844], [1200, 900], [1440, 900]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(show, { waitUntil: 'networkidle' });
    await revealViewport(page, '[data-sbd-suite-note-button]');
    await checkLayout(page, `${width}x${height} show context`);
    if (width === 390 && height === 844) {
      await page.locator('.sbd-nav a').first().focus();
      await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => ({ inNav: !!document.activeElement?.closest('.sbd-nav'),
        visible: document.activeElement?.matches(':focus-visible'),
        outline: getComputedStyle(document.activeElement).outlineWidth }));
      if (!focus.inNav || !focus.visible || focus.outline === '0px') {
        throw new Error(`keyboard focus is not visible: ${JSON.stringify(focus)}`);
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const motion = await page.locator('.sbd-nav a').first().evaluate((link) => getComputedStyle(link).transitionDuration);
      if (motion.split(',').some((duration) => parseFloat(duration) > 0.001)) {
        throw new Error(`reduced motion still transitions: ${motion}`);
      }
    }
    if (width === 390 || width === 768) {
      await page.locator('[data-sbd-suite-note-button]').click();
      await checkLayout(page, `${width}x${height} note editor`);
      await revealViewport(page, '[data-sbd-suite-compact-toggle]');
      await page.locator('[data-sbd-suite-compact-toggle]').click();
      await checkLayout(page, `${width}x${height} compact dock`);
    }
    const embedded = await page.locator('.sbd-nav-embedded').count();
    const links = embedded ? '[data-sbd-suite-return]' : '.sbd-nav a[href*="sbdShow="]';
    const showLink = await page.locator(links).count();
    if (embedded) {
      const destination = new URL(await page.locator(links).getAttribute('href'), page.url());
      if (destination.origin !== new URL(page.url()).origin || !destination.pathname.endsWith('/av-suite.html')
          || destination.searchParams.get('sbdShow') !== 'Winter Keynote'
          || destination.searchParams.get('sbdVenue') !== 'Hall B') throw new Error('Show return lost its context');
    }
    if (!showLink || errors.length) throw new Error(`${width}x${height}: context link=${showLink}, page errors=${errors.join('; ')}`);
    await page.close();
  }

  for (const [width, height] of [[375, 812], [390, 667], [680, 720], [1440, 900], [2560, 720]]) {
    for (const withShow of [false, true]) {
      const page = await browser.newPage({ viewport: { width, height } });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const gear = new URL(base.replace('cable-plan.html', 'gear-reference.html'));
      gear.searchParams.set('gear', 'birddog-p240');
      if (withShow) gear.searchParams.set('sbdShow', 'Clearance check');
      await page.goto(gear.href, { waitUntil: 'networkidle' });
      await page.locator('#nextSection:not(:disabled)').waitFor();
      if (withShow) {
        const compact = await page.locator('[data-sbd-suite-dock]').getAttribute('data-sbd-suite-compact');
        if (compact !== String(width <= 680)) throw new Error(`Gear default dock state: ${width} ${compact}`);
      }
      async function checkGear(label) {
        await page.waitForTimeout(100);
        const result = await page.evaluate(() => {
          const nav = document.querySelector('.sbd-nav').getBoundingClientRect();
          const app = document.querySelector('.gear-app').getBoundingClientRect();
          const root = document.documentElement;
          const blocked = ['previousSection', 'nextSection'].filter((id) => {
            const button = document.getElementById(id);
            const box = button.getBoundingClientRect();
            return box.height < 44 || box.width < 44
              || !button.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
          });
          return { blocked, appBottom: app.bottom, navTop: nav.top,
            panelHeight: document.getElementById('reference-stage').getBoundingClientRect().height,
            overflowX: root.scrollWidth - root.clientWidth,
            overflowY: root.scrollHeight - root.clientHeight };
        });
        if (result.blocked.length || result.appBottom > result.navTop - 8
            || result.panelHeight < 64 || result.overflowX > 1 || result.overflowY > 1 || errors.length) {
          throw new Error(`${label}: ${JSON.stringify(result)} errors=${errors.join('; ')}`);
        }
        console.log(`ok - ${label}`);
      }
      await checkGear(`Gear Reference ${width}x${height} show=${withShow}`);
      const firstSection = await page.locator('[role="tab"][aria-selected="true"]').textContent();
      await page.locator('#nextSection').click();
      const nextSection = await page.locator('[role="tab"][aria-selected="true"]').textContent();
      if (firstSection === nextSection) throw new Error('Gear Next did not change section');
      await page.locator('#previousSection').click();
      if (await page.locator('[role="tab"][aria-selected="true"]').textContent() !== firstSection) {
        throw new Error('Gear Previous did not restore section');
      }
      if (withShow && width <= 680) {
        await page.locator('[data-sbd-suite-compact-toggle]').click();
        await checkGear(`Gear Reference ${width}x${height} expanded show dock`);
        await page.locator('[data-sbd-suite-compact-toggle]').click();
        await checkGear(`Gear Reference ${width}x${height} compact show dock`);
      }
      if (!withShow && width === 1440) {
        await page.setViewportSize({ width: 375, height: 812 });
        await checkGear('Gear Reference resized from desktop to phone');
      }
      await page.close();
    }
  }

  for (const [route, previous, next] of [
    ['display-plan.html', 'AV Video', 'Projection Plan'],
    ['projection-plan.html', 'Display Plan', 'Throwline'],
  ]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(base.replace('cable-plan.html', route), { waitUntil: 'networkidle' });
    const group = await page.locator('.sbd-nav-dept').textContent();
    const steps = await page.locator('.sbd-nav-step').allTextContents();
    if (group !== 'Video' || steps[0] !== `Previous: ${previous}` || steps[1] !== `Next: ${next}`) {
      throw new Error(`${route} navigation: ${JSON.stringify({ group, steps })}`);
    }
    console.log(`ok - ${route} stays in Video navigation`);
    await page.close();
  }

  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(base, { waitUntil: 'networkidle' });
  const noShow = await page.evaluate(() => ({ nav: !!document.querySelector('.sbd-nav'),
    dock: !!document.querySelector('[data-sbd-suite-dock]'),
    embedded: document.querySelector('.sbd-nav')?.classList.contains('sbd-nav-embedded'),
    header: !!document.querySelector('.av-header .sbd-nav'),
    bottom: document.querySelector('.sbd-nav')?.getBoundingClientRect().bottom }));
  if (!noShow.nav || noShow.dock || (noShow.embedded ? !noShow.header || noShow.bottom > 60 : Math.abs(noShow.bottom - 834) > 1)) {
    throw new Error(`no-show navigation changed: ${JSON.stringify(noShow)}`);
  }
  console.log('ok - tool navigation without show context');
  await page.emulateMedia({ media: 'print' });
  await page.waitForTimeout(100);
  const printPadding = await page.evaluate(() => parseFloat(getComputedStyle(document.body).paddingBottom));
  if (printPadding >= page.viewportSize().height / 2) {
    throw new Error(`hidden navigation adds blank print space: ${printPadding}px`);
  }
  await page.emulateMedia({ media: 'screen' });
  await page.waitForTimeout(100);
  const restored = await page.evaluate(() => ({
    embedded: !!document.querySelector('.sbd-nav-embedded'),
    navHeight: document.querySelector('.sbd-nav').getBoundingClientRect().height,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    overflowY: document.documentElement.scrollHeight - document.documentElement.clientHeight,
    clearance: parseFloat(getComputedStyle(document.body).paddingBottom),
    required: innerHeight - document.querySelector('.sbd-nav').getBoundingClientRect().top,
  }));
  if (restored.embedded ? restored.navHeight < 44 || restored.overflowX > 1 || restored.overflowY > 1 : restored.clearance < restored.required) {
    throw new Error(`screen clearance not restored after print: ${JSON.stringify(restored)}`);
  }
  console.log('ok - hidden print navigation and restored screen clearance');
  await page.close();
} finally {
  if (browser) await browser.close();
  server.close();
}
