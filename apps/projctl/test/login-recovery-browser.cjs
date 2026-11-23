const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const { startRelay, until } = await import('./relay-helper.js');
  const relay = await startRelay({ PJ_PASSCODE: 'fixture-only-passcode' });
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await page.goto(relay.base + '/login.html?next=https%3A%2F%2Fexample.invalid%2F');
    const submit = page.locator('button[type=submit]');
    let held, attempts = 0;
    await page.route('**/api/login', route => { attempts++; held = route; });
    await page.locator('#code').fill('wrong'); await submit.click();
    await until(() => !!held);
    assert.equal(await submit.isDisabled(), true);
    await page.locator('#f').evaluate(form => form.dispatchEvent(new Event('submit', { cancelable: true })));
    assert.equal(attempts, 1, 'repeat submit while waiting cannot send a second password attempt');
    await held.fulfill({ status: 401, json: { error: 'Wrong password. Try again.' } });
    await page.locator('#err').filter({ hasText: 'Wrong password' }).waitFor();
    await until(async () => !await submit.isDisabled());
    await page.unroute('**/api/login');
    await page.locator('#code').fill('fixture-only-passcode'); await submit.click();
    await page.waitForURL(relay.base + '/');
    assert.equal(new URL(page.url()).origin, relay.base, 'login return cannot leave the controller');
    await page.reload(); await page.locator('#conn-word').filter({ hasText: 'Relay connected' }).waitFor();
    const fresh = await browser.newPage();
    await fresh.route('**/api/login', route => route.abort());
    await fresh.goto(relay.base + '/login.html');
    await fresh.locator('#code').fill('fixture-only-passcode'); await fresh.locator('button[type=submit]').click();
    await fresh.locator('#err').filter({ hasText: 'Check the connection' }).waitFor();
    assert.equal(await fresh.locator('button[type=submit]').isDisabled(), false);
    console.log('Login recovery passed: duplicate submit, incorrect password, network loss, safe return and session reload');
  } finally { await browser.close(); await relay.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
