const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const registry = require('../js/sbd-registry.js').SBD_REGISTRY;
const base = process.env.VIEWPORT_BASE || 'http://localhost:4173/';
const baseline = execFileSync('git', ['show', 'd40e8a5:js/sbd-nav.js'], { encoding: 'utf8' });
(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const results = [];
  for (const tool of registry.tools) for (const width of [375, 1440]) {
    const captures = [];
    for (const old of [true, false]) {
      const context = await browser.newContext({ viewport: { width, height: width === 375 ? 812 : 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
      const page = await context.newPage(); const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      if (old) await page.route('**/js/sbd-nav.js', route => route.fulfill({ contentType: 'application/javascript', body: baseline }));
      await page.goto(`${base}${tool.href}?sbdShow=Navigation%20fixture&sbdPhase=prep`, { waitUntil: 'load' });
      await page.waitForTimeout(400);
      if (tool.id === 'av-calculator') await page.waitForSelector('[data-calculator-viewport=ready]');
      captures.push(await page.evaluate(errors => ({
        links: [...document.querySelectorAll('.sbd-nav a')].map(a => ({ label: a.textContent, href: a.getAttribute('href') })),
        guards: !!Storage.prototype.setItem.sbdSaveGuard,
        errors,
        root: { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight }
      }), errors));
      await context.close();
    }
    fs.writeFileSync('/tmp/viewport-nav-last.json', JSON.stringify({ tool: tool.id, width, captures }, null, 2));
    if (tool.id !== 'av-calculator') {
      assert.deepEqual(captures[1].links, captures[0].links, `${tool.id} ${width}: navigation changed`);
      assert.deepEqual(captures[1].errors, captures[0].errors, `${tool.id} ${width}: new runtime errors`);
      assert.equal(captures[1].guards, captures[0].guards, `${tool.id}: save guards changed`);
    } else {
      assert.deepEqual(captures[1].links.map(link => link.label), ['Home', 'Toolbox']);
      assert.equal(captures[1].guards, true);
    }
    results.push({ tool: tool.id, width, baseline: captures[0], current: captures[1] });
    console.log('PASS navigation contract', tool.id, width);
  }
  fs.writeFileSync(process.env.VIEWPORT_NAV_REPORT || '/tmp/viewport-navigation.json', JSON.stringify(results, null, 2));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
