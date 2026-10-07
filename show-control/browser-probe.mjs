import { chromium } from '../node_modules/playwright/index.mjs';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
let server;
let url = process.env.SHOW_CONTROL_URL || 'http://127.0.0.1:8765/show-control/';
if (process.env.SHOW_CONTROL_ROOT) {
  const root = process.env.SHOW_CONTROL_ROOT;
  server = createServer(async (request, response) => {
    const files = { '/show-control/': 'show-control/index.html', '/show-control/style.css': 'show-control/style.css', '/show-control/app.mjs': 'show-control/app.mjs', '/show-control/model.mjs': 'show-control/model.mjs', '/css/av-theme.css': 'css/av-theme.css', '/js/av-theme-mode.js': 'js/av-theme-mode.js' };
    const file = files[request.url?.split('?')[0]];
    if (!file) { response.writeHead(404); response.end(); return; }
    try { response.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : file.endsWith('.html') ? 'text/html' : 'text/javascript'); response.end(await readFile(path.join(root, file))); }
    catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${server.address().port}/show-control/`;
}
const screenshotDir = process.env.SCREENSHOT_DIR || '/out';
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'msedge' }), args: ['--no-sandbox'] });
function luminance(hex) { const channels = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4); return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722; }
function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
function cssHex(value) { const channels = value.match(/^rgb\((\d+), (\d+), (\d+)\)$/); assert.ok(channels, `Expected opaque RGB color: ${value}`); return `#${channels.slice(1).map(channel => Number(channel).toString(16).padStart(2, '0')).join('')}`; }
async function checkTheme(page, expected) {
  const actual = await page.evaluate(() => {
    const css = getComputedStyle(document.documentElement);
    const value = key => css.getPropertyValue(key).trim().toLowerCase();
    return { tool: document.documentElement.dataset.avTool, mode: document.documentElement.dataset.avTheme, bg: value('--av-bg'), surface: value('--av-surface'), text: value('--av-text'), muted: value('--av-muted'), accent: value('--av-accent'), primary: value('--av-primary-ink'), focus: value('--av-focus'), saved: localStorage.getItem('av-theme-mode.v1') };
  });
  assert.equal(actual.tool, 'show-control'); assert.equal(actual.mode, expected); assert.equal(actual.saved, expected);
  assert.equal(actual.bg, expected === 'light' ? '#eee8df' : '#0c1016');
  assert.ok(contrast(actual.text, actual.bg) >= 4.5);
  assert.ok(contrast(actual.muted, actual.surface) >= 4.5);
  assert.ok(contrast(actual.accent, actual.surface) >= 4.5);
  assert.ok(contrast(actual.primary, actual.accent) >= 4.5);
  assert.ok(contrast(actual.focus, actual.surface) >= 3);
}
async function checkVisibleControls(page) {
  const controls = await page.evaluate(() => Object.fromEntries(['#theme', '#save', '#go', '[data-tab="run"]', '[data-tab="setup"]'].map(selector => { const style = getComputedStyle(document.querySelector(selector)); return [selector, { color: style.color, background: style.backgroundColor }]; })));
  for (const [selector, style] of Object.entries(controls)) assert.ok(contrast(cssHex(style.color), cssHex(style.background)) >= 4.5, `${selector} has insufficient visible contrast: ${JSON.stringify(style)}`);
}
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
    const failedContext = await browser.newContext({ viewport });
    const failedPage = await failedContext.newPage();
    await failedPage.route('**/show-control/app.mjs', route => route.abort());
    await failedPage.goto(url);
    assert.equal(await failedPage.getByRole('button', { name: 'Save run' }).isDisabled(), true);
    assert.equal(await failedPage.locator('#go').isDisabled(), true);
    assert.match(await failedPage.locator('#message').innerText(), /controls stay disabled/);
    await failedContext.close();

    const recoveryContext = await browser.newContext({ viewport, acceptDownloads: true });
    const recoveryPage = await recoveryContext.newPage();
    await recoveryPage.goto(url);
    const unreadable = '{"version":99,"original":"keep these exact characters"';
    await recoveryPage.evaluate(raw => localStorage.setItem('sbd.showControl.v1', raw), unreadable);
    await recoveryPage.reload();
    assert.equal(await recoveryPage.getByRole('button', { name: 'Save run' }).isDisabled(), true);
    assert.equal(await recoveryPage.getByRole('button', { name: 'Replace damaged saved run' }).isDisabled(), true);
    assert.equal(await recoveryPage.evaluate(() => localStorage.getItem('sbd.showControl.v1')), unreadable);
    const [rawDownload] = await Promise.all([recoveryPage.waitForEvent('download'), recoveryPage.getByRole('button', { name: 'Download unreadable saved data' }).click()]);
    assert.equal(await readFile(await rawDownload.path(), 'utf8'), unreadable);
    recoveryPage.on('dialog', dialog => dialog.accept());
    await recoveryPage.evaluate(() => localStorage.setItem('sbd.showControl.v1', 'changed-in-another-tab'));
    await recoveryPage.getByRole('button', { name: 'Replace damaged saved run' }).click();
    assert.match(await recoveryPage.locator('#message').innerText(), /another tab changed/i);
    assert.equal(await recoveryPage.evaluate(() => localStorage.getItem('sbd.showControl.v1')), 'changed-in-another-tab');
    await recoveryPage.evaluate(raw => localStorage.setItem('sbd.showControl.v1', raw), unreadable);
    await recoveryPage.getByRole('button', { name: 'Replace damaged saved run' }).click();
    assert.equal(await recoveryPage.evaluate(() => localStorage.getItem('sbd.showControl.v1')), null);
    assert.equal(await recoveryPage.getByRole('button', { name: 'Save run' }).isEnabled(), true);
    await recoveryPage.locator('#cue-number').fill('R1');
    await recoveryPage.locator('#cue-action').fill('Recovered run');
    await recoveryPage.getByRole('button', { name: 'Add to run' }).click();
    await recoveryPage.getByRole('button', { name: 'Save run' }).click();
    await recoveryPage.reload();
    assert.match(await recoveryPage.locator('#summary').innerText(), /1 cues/);
    await recoveryContext.close();

    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.goto(url);
    await page.evaluate(() => localStorage.setItem('av-theme-mode.v1', 'light'));
    await page.reload();
    await checkTheme(page, 'light');
    await page.getByRole('button', { name: 'Switch to Stage Slate dark theme' }).click();
    await checkTheme(page, 'dark');
    await checkVisibleControls(page);
    await page.reload();
    await checkTheme(page, 'dark');
    await page.screenshot({ path: path.join(screenshotDir, `show-control-dark-${viewport.width}.png`) });
    await page.getByRole('button', { name: 'Switch to Warm Paper light theme' }).click();
    await checkTheme(page, 'light');
    await checkVisibleControls(page);
    await page.getByRole('tab', { name: 'Run' }).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.getByRole('tab', { name: 'Setup' }).getAttribute('aria-selected'), 'true');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.getByRole('tab', { name: 'Run' }).getAttribute('aria-selected'), 'true');
    await page.evaluate(() => localStorage.setItem('cueSheet.v1', JSON.stringify({ title:'Source show', rows:[{id:'original', number:'A1', action:'Opening', custom:{ preserved:true }}] })));
    await page.getByRole('tab', { name: 'Setup' }).click();
    await page.locator('#cue-number').fill('001');
    await page.locator('#cue-action').fill('Doors');
    await page.getByRole('button', { name: 'Add to run' }).click();
    await page.getByRole('button', { name: 'Save run' }).click();
    await page.reload();
    await page.getByRole('tab', { name: 'Run' }).click();
    assert.match(await page.locator('#summary').innerText(), /1 cues/);
    if (viewport.width < 720) await page.getByRole('button', { name: 'On deck' }).click();
    await page.getByRole('button', { name: 'Log Hold', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Log Go →' }).isDisabled(), true);
    await page.getByRole('button', { name: 'Log Resume' }).click();
    await page.getByRole('button', { name: 'Log Go →' }).click();
    await page.getByRole('button', { name: 'Save run' }).click();
    await page.reload();
    assert.match(await page.locator('#count').innerText(), /1 \/ 1 called/);
    await page.getByRole('tab', { name: 'Setup' }).click();
    await page.locator('#import-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"schema":"bad"}') });
    await page.locator('#message').getByText(/current run was kept/i).waitFor();
    assert.match(await page.locator('#summary').innerText(), /1 cues/);
    await page.getByRole('button', { name: 'Preview local Cue Sheet' }).click();
    assert.match(await page.locator('#preview').innerText(), /Source show · 1 cues/);
    await page.locator('#cue-file').setInputFiles({ name: 'other.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ title: 'Other show', rows: [{ id: 'other', number: 'B1', action: 'Other' }] })) });
    await page.locator('#cue-file-preview').getByRole('button', { name: 'Copy imported cues' }).waitFor();
    await page.getByRole('button', { name: 'Copy cues into this run' }).click();
    assert.match(await page.locator('#summary').innerText(), /Source show/);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('cueSheet.v1')).rows[0].custom.preserved), true);
    const cueForgeSource = { version: 7, name: 'CueForge show', modifiedAt: '2026-10-07T12:00:00Z', settings: { sharedSecret: 'private-fixture' }, cueLists: [{ id: 'main', name: 'Main', cues: [{ id: 'cf-1', number: '1.5', name: 'Opening', type: 'video', notes: 'Standby', properties: { filePath: '/private/fixture.mp4' } }] }] };
    await page.locator('#cueforge-file').setInputFiles({ name: 'show.cueforge', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(cueForgeSource)) });
    await page.getByRole('button', { name: 'Copy selected cue list' }).click();
    assert.match(await page.locator('#summary').innerText(), /CueForge reference only/);
    await page.getByRole('button', { name: 'Save run' }).click();
    const saved = await page.evaluate(() => localStorage.getItem('sbd.showControl.v1'));
    assert.equal(saved.includes('private-fixture'), false);
    assert.equal(saved.includes('/private/fixture.mp4'), false);
    await page.reload();
    assert.match(await page.locator('#summary').innerText(), /CueForge reference only/);
    const size = await page.evaluate(() => ({ width: document.documentElement.scrollWidth <= document.documentElement.clientWidth, height: document.documentElement.scrollHeight <= document.documentElement.clientHeight }));
    assert.deepEqual(size, { width: true, height: true });
    await page.getByRole('tab', { name: 'Run' }).click();
    await page.getByRole('button', { name: 'Switch to Stage Slate dark theme' }).click();
    await checkTheme(page, 'dark');
    await page.screenshot({ path: path.join(screenshotDir, `show-control-dark-filled-${viewport.width}.png`) });
    await page.getByRole('button', { name: 'Switch to Warm Paper light theme' }).click();
    await checkTheme(page, 'light');
    await page.screenshot({ path: path.join(screenshotDir, `show-control-light-${viewport.width}.png`) });
    await context.close();
  }
  console.log('Show Control browser probe passed: theme tokens/contrast, save/reload, hold/go, failed import, viewport scroll.');
} finally { await browser.close(); if (server) await new Promise(resolve => server.close(resolve)); }
