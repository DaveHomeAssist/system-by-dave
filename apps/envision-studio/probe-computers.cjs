const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const origin = process.env.ENVISION_ORIGIN;
if (!origin) throw Error('Set ENVISION_ORIGIN to a disposable Envision coordinator.');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage'] });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: { 'Tailscale-User-Login': 'owner@test' },
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (entry) => { if (entry.type() === 'error') errors.push(entry.text()); });

  async function contained(width, height) {
    await page.setViewportSize({ width, height });
    const metrics = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      height: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
    }));
    assert(metrics.width <= metrics.clientWidth, JSON.stringify(metrics));
    assert(metrics.height <= metrics.clientHeight, JSON.stringify(metrics));
  }

  try {
    await page.goto(origin);
    await page.locator('#project-grid').waitFor();
    assert.equal(await page.locator('#worker').textContent(), 'Walter offline');
    await page.locator('#computers').click();
    await page.getByRole('heading', { name: 'Computers' }).waitFor();
    assert.equal(await page.locator('#computer-local-state').textContent(), 'Connected to the private Studio');
    assert.equal(await page.locator('#computer-dominic-state').textContent(), 'Project source online');
    assert.equal(await page.locator('#computer-walter-state').textContent(), 'Walter offline');
    await contained(1440, 900);
    await contained(375, 812);
    await page.locator('#computers-close').focus();
    assert(await page.locator('#computers-close').evaluate((node) => node === document.activeElement));
    await page.locator('#computers-close').press('Enter');
    await page.locator('#computers-dialog').waitFor({ state: 'hidden' });
    assert.deepEqual(errors, []);
    console.log('PASS computers panel, authority copy, keyboard close and viewport containment at 1440 × 900 and 375 × 812.');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
