import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base = process.env.CALCULATOR_BASE || 'http://127.0.0.1:4173/';
const output = process.env.CALCULATOR_SCREENSHOT || '/tmp/av-calculator-field-sets.png';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(new URL('av-calculator.html', base).href);
    await page.waitForSelector('html[data-calculator-viewport="ready"]');
    await page.locator('#delayDistance').fill('90');
    if (viewport.width > 1000) await page.locator('#summaryCardTab').click();
    else await page.locator('#calculatorView').selectOption('6');
    await page.locator('#fieldSetsOpen').click();
    await page.locator('#fieldSetName').fill('Ballroom A');
    await page.locator('#fieldSetSave').click();
    assert.match(await page.locator('#fieldSetStatus').innerText(), /saved in this browser/);
    const saved = await page.evaluate(() => localStorage.getItem('avCalculator.fieldSets.v1'));
    assert.ok(saved?.includes('Ballroom A'));
    await page.locator('#fieldSetsClose').click();
    await page.reload();
    await page.waitForSelector('html[data-calculator-viewport="ready"]');
    assert.equal(await page.locator('#delayDistance').inputValue(), '90');
    if (viewport.width > 1000) await page.locator('#summaryCardTab').click();
    else await page.locator('#calculatorView').selectOption('6');
    await page.locator('#fieldSetsOpen').click();
    await page.locator('#fieldSetSelect').selectOption({ label: 'Ballroom A' });
    await page.locator('#fieldSetExport').click();
    const exported = await page.evaluate(() => JSON.parse(localStorage.getItem('avCalculator.fieldSets.v1')).sets[0]);
    const before = await page.evaluate(() => localStorage.getItem('avCalculator.v1'));
    await page.locator('#fieldSetImport').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{broken') });
    await page.getByText('Import failed: this is not a valid AV Calculator field set.', { exact: false }).waitFor();
    assert.match(await page.locator('#fieldSetStatus').innerText(), /Import failed/);
    assert.equal(await page.evaluate(() => localStorage.getItem('avCalculator.v1')), before);
    await page.locator('#fieldSetImport').setInputFiles({ name: 'good.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ schema: 'system-by-dave.av-calculator-field-set.v1', name: 'Imported A', values: exported.values })) });
    await page.getByText('Ready to add “Imported A”', { exact: false }).waitFor();
    assert.equal(await page.locator('#fieldSetPreview').isVisible(), true);
    await page.locator('#fieldSetApply').click();
    assert.equal(await page.locator('#fieldSetSelect option').count(), 3);
    await page.screenshot({ path: viewport.width === 375 ? output : output.replace(/\.png$/, '-desktop.png') });
    await page.locator('#fieldSetsClose').click();
    if (viewport.width > 1000) await page.locator('#audioCardTab').click();
    else await page.locator('#calculatorView').selectOption('0');
    await page.locator('#delayDistance').fill('120');
    if (viewport.width > 1000) await page.locator('#summaryCardTab').click();
    else await page.locator('#calculatorView').selectOption('6');
    await page.locator('#fieldSetsOpen').click();
    await page.locator('#fieldSetSelect').selectOption({ label: 'Ballroom A' });
    await page.locator('#fieldSetRecall').click();
    assert.equal(await page.locator('#delayDistance').inputValue(), '90');
    await page.reload();
    assert.equal(await page.locator('#delayDistance').inputValue(), '90');
    const overflow = await page.evaluate(() => ({ width: document.documentElement.scrollWidth - document.documentElement.clientWidth, height: document.documentElement.scrollHeight - document.documentElement.clientHeight }));
    assert.ok(overflow.width <= 0 && overflow.height <= 0, JSON.stringify(overflow));
    assert.deepEqual(errors, []);
    await context.close();
  }
  await fs.stat(output);
  console.log(`AV Calculator field sets: desktop and phone passed; screenshot ${output}`);
} finally {
  await browser.close();
}
