#!/usr/bin/env node
// Regression probe for Cue Sheet cell editing. Committing a cell edit used to rebuild the
// whole table, which destroyed the control that was taking focus (the next cell on Tab, a
// clicked cell, or the status select between arrow keys). Focus fell to <body>, where the
// next keys fired the single-key shortcuts: typed words took cues live or marked them done,
// and Backspace deleted a cue. This checks that focus stays where the operator put it, that
// a cue edited out of the current search or filter stays until focus leaves its row, and
// that Ctrl/Cmd/Alt chords are never read as shortcuts.
//
// Usage: node scripts/probe_cue_sheet_editing.mjs [--no-sandbox]
//   CHROME_CHANNEL=chrome  use installed Chrome;  CHROME_BIN=<path>  use a specific binary
//   --cue-sheet-file=<path>  serve a different file at /cue-sheet.html (used to prove the
//   probe fails against the pre-fix page).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);
const argValue = (name) => (args.find((a) => a.startsWith(`--${name}=`)) || '').slice(name.length + 3);
const overrides = { '/cue-sheet.html': argValue('cue-sheet-file') };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://x').pathname);
    const file = overrides[pathname] ? resolve(overrides[pathname]) : normalize(join(ROOT, pathname === '/' ? 'index.html' : pathname));
    if (!overrides[pathname] && !file.startsWith(ROOT)) throw new Error('outside root');
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end('not found');
  }
});
await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
const BASE = `http://127.0.0.1:${server.address().port}`;

const launchOptions = { headless: true };
if (process.env.CHROME_CHANNEL) launchOptions.channel = process.env.CHROME_CHANNEL;
else if (process.env.CHROME_BIN) launchOptions.executablePath = process.env.CHROME_BIN;
if (args.includes('--no-sandbox')) launchOptions.args = ['--no-sandbox'];
const browser = await chromium.launch(launchOptions);

const failures = [];
let passed = 0;
async function check(name, fn) {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    // A new browser profile opens on the eight-cue sample sheet with cue 001 selected. The
    // table is the Edit view; search and the status filter are in the Edit tools view.
    await page.goto(`${BASE}/cue-sheet.html?taskView=editView`);
    await page.waitForSelector('[data-av-viewport=ready]');
    await page.waitForSelector('#cueBody tr[data-id]');
    await fn(page);
    assert(!errors.length, `page errors: ${errors.join(' | ')}`);
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.log(`  FAIL ${name}: ${error.message}`);
  } finally {
    await page.context().close();
  }
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const SAMPLE_STATUSES = 'Ready,Standby,Ready,Ready,Ready,Ready,Hold,Ready';
// Search and the status filter live in another view; set them there and return to the table.
async function narrow(page, apply) {
  await page.click('#editToolsViewTab');
  await apply();
  await page.click('#editViewTab');
  await page.waitForSelector('#editView:not([hidden])');
}
const cell = (page, rowIndex, field) => page.locator('#cueBody tr[data-id]').nth(rowIndex).locator(`[data-field="${field}"]`);
// Let the page finish any re-filter it queued behind the focus change.
const settle = (page) => page.waitForTimeout(120);
// The saved sheet plus where focus is, read in one call.
const snapshot = (page) => page.evaluate(() => {
  const saved = JSON.parse(localStorage.getItem('cueSheet.v1'));
  const active = document.activeElement;
  const row = active && active.closest ? active.closest('#cueBody tr[data-id]') : null;
  return {
    rows: saved.rows.length,
    numbers: saved.rows.map((item) => item.number),
    statuses: saved.rows.map((item) => item.status).join(','),
    liveLayers: Object.keys(saved.activeLayers || {}).length,
    selectedNumber: (saved.rows.find((item) => item.id === saved.selectedId) || {}).number || '',
    shown: [...document.querySelectorAll('#cueBody tr[data-id]')].map((element) => element.querySelector('[data-field="number"]').value),
    highlighted: [...document.querySelectorAll('#cueBody tr.selected')].map((element) => element.querySelector('[data-field="number"]').value),
    focusTag: active ? active.tagName : '',
    focusField: active && active.dataset ? active.dataset.field || (active.dataset.select ? 'grip' : '') : '',
    focusRowNumber: row ? row.querySelector('[data-field="number"]').value : '',
    focusValue: active && 'value' in active ? active.value : '',
    focusId: active ? active.id : '',
    emptyShown: !document.getElementById('emptyState').hidden
  };
});
const assertUntouched = (state, context) => {
  assert(state.rows === 8, `${context}: expected 8 cues, found ${state.rows}`);
  assert(state.statuses === SAMPLE_STATUSES, `${context}: cue statuses changed to ${state.statuses}`);
  assert(state.liveLayers === 0, `${context}: ${state.liveLayers} layer(s) went live`);
};

console.log('Cue Sheet editing regression probe');

await check('Tab after an edit keeps typing in the next cell, not in the shortcuts', async (page) => {
  await cell(page, 0, 'number').click();
  await page.keyboard.press('End');
  await page.keyboard.type('A');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Doors go live');
  await settle(page);
  const state = await snapshot(page);
  assert(state.focusField === 'time' && state.focusRowNumber === '001A', `focus should be the time cell of cue 001A, got <${state.focusTag}> field "${state.focusField}" in row "${state.focusRowNumber}"`);
  assert(state.focusValue.includes('Doors go live'), `typed text should be in the time cell, cell holds "${state.focusValue}"`);
  assertUntouched(state, 'after typing');
});

await check('Clicking another cell after an edit keeps Backspace inside that cell', async (page) => {
  await cell(page, 0, 'owner').click();
  await page.keyboard.press('End');
  await page.keyboard.type('X');
  await cell(page, 2, 'source').click();
  await page.keyboard.press('End');
  await page.keyboard.press('Backspace');
  await settle(page);
  const state = await snapshot(page);
  assertUntouched(state, 'after Backspace');
  assert(state.focusField === 'source' && state.focusRowNumber === '003', `focus should be the source cell of cue 003, got <${state.focusTag}> field "${state.focusField}" in row "${state.focusRowNumber}"`);
  assert(state.focusValue === 'Consol', `Backspace should remove one character from "Console", cell holds "${state.focusValue}"`);
  assert(state.selectedNumber === '003' && state.highlighted.join() === '003', `the clicked cue should be the only selected row, selected "${state.selectedNumber}", highlighted [${state.highlighted}]`);
});

await check('The status select keeps focus after each change', async (page) => {
  const status = cell(page, 0, 'status');
  await status.focus();
  await status.selectOption('Standby');
  let state = await snapshot(page);
  assert(state.focusField === 'status' && state.focusRowNumber === '001', `focus left the status select after one change: <${state.focusTag}> field "${state.focusField}"`);
  // No status starts with N or L, so these reach the page only if focus was dropped.
  await page.keyboard.press('n');
  await page.keyboard.press('l');
  await status.selectOption('Go');
  await settle(page);
  state = await snapshot(page);
  assert(state.rows === 8, `"n" added a cue: ${state.rows} cues`);
  assert(state.liveLayers === 0, '"l" took a cue live');
  assert(state.statuses === `Go,${SAMPLE_STATUSES.split(',').slice(1).join(',')}`, `only cue 001 should change, statuses are ${state.statuses}`);
  assert(state.focusField === 'status' && state.focusRowNumber === '001', `focus left the status select: <${state.focusTag}> field "${state.focusField}"`);
});

await check('Ctrl, Cmd and Alt chords are not shortcuts; plain keys still are', async (page) => {
  await page.locator('#cueBody tr[data-id]').nth(1).locator('.row-grip').click();
  for (const chord of ['Control+d', 'Control+g', 'Meta+l', 'Alt+n', 'Control+k', 'Meta+Backspace', 'Control+Delete']) await page.keyboard.press(chord);
  await settle(page);
  let state = await snapshot(page);
  assertUntouched(state, 'after modifier chords');
  assert(state.selectedNumber === '002', `the selection moved to "${state.selectedNumber}"`);
  await page.keyboard.press('d');
  await settle(page);
  state = await snapshot(page);
  assert(state.statuses === 'Ready,Done,Ready,Ready,Ready,Ready,Hold,Ready', `plain D should mark the selected cue done, statuses are ${state.statuses}`);
});

await check('A cue filtered out by its own edit stays until focus leaves its row', async (page) => {
  await narrow(page, () => page.selectOption('#statusFilter', 'Ready'));
  let state = await snapshot(page);
  assert(state.shown.join() === '001,003,004,005,006,008', `filter should show the six Ready cues, shows [${state.shown}]`);
  const status = cell(page, 0, 'status');
  await status.focus();
  await status.selectOption('Done');
  await settle(page);
  state = await snapshot(page);
  assert(state.shown[0] === '001' && state.shown.length === 6, `cue 001 should stay while it has focus, table shows [${state.shown}]`);
  assert(state.focusField === 'status' && state.focusRowNumber === '001', `focus left the status select: <${state.focusTag}> field "${state.focusField}"`);
  // The window losing focus fires focusout without moving focus inside the page.
  await page.evaluate(() => document.activeElement.dispatchEvent(new FocusEvent('focusout', { bubbles: true })));
  await settle(page);
  state = await snapshot(page);
  assert(state.shown[0] === '001' && state.focusField === 'status', `cue 001 should survive a window blur, table shows [${state.shown}], focus field "${state.focusField}"`);
  await page.keyboard.press('Tab');
  await page.keyboard.type('checked');
  await settle(page);
  state = await snapshot(page);
  assert(state.shown[0] === '001' && state.focusField === 'notes' && state.focusValue.includes('checked'), `typing should land in the notes cell of cue 001, table shows [${state.shown}], focus field "${state.focusField}" holds "${state.focusValue}"`);
  await page.keyboard.press('Tab');
  await settle(page);
  state = await snapshot(page);
  assert(state.shown.join() === '003,004,005,006,008', `cue 001 should leave once focus leaves its row, table shows [${state.shown}]`);
  assert(state.focusField === 'grip' && state.focusRowNumber === '003', `focus should be the grip of cue 003, got <${state.focusTag}> field "${state.focusField}" in row "${state.focusRowNumber}"`);
  assert(state.rows === 8 && state.liveLayers === 0 && state.statuses === `Done,${SAMPLE_STATUSES.split(',').slice(1).join(',')}`, `only cue 001 should change: ${state.rows} cues, statuses ${state.statuses}`);
});

await check('Clicking into another row re-filters without losing the click or the caret', async (page) => {
  await narrow(page, () => page.selectOption('#statusFilter', 'Ready'));
  const status = cell(page, 0, 'status');
  await status.focus();
  await status.selectOption('Done');
  // Cue 003 is the second visible row until cue 001 leaves.
  await cell(page, 1, 'source').click();
  await settle(page);
  await page.keyboard.press('End');
  await page.keyboard.press('Backspace');
  await settle(page);
  const state = await snapshot(page);
  assert(state.shown.join() === '003,004,005,006,008', `cue 001 should leave the Ready filter, table shows [${state.shown}]`);
  assert(state.focusField === 'source' && state.focusRowNumber === '003' && state.focusValue === 'Consol', `focus should stay in the clicked source cell of cue 003 holding "Consol", got field "${state.focusField}" in row "${state.focusRowNumber}" holding "${state.focusValue}"`);
  assert(state.selectedNumber === '003' && state.highlighted.join() === '003', `the clicked cue should be selected, selected "${state.selectedNumber}", highlighted [${state.highlighted}]`);
  assert(state.rows === 8 && state.liveLayers === 0, `no cue should be deleted or taken live: ${state.rows} cues, ${state.liveLayers} live layer(s)`);
});

await check('A cue edited out of a search stays until focus leaves its row', async (page) => {
  await narrow(page, () => page.fill('#searchInput', 'stinger'));
  let state = await snapshot(page);
  assert(state.shown.join() === '002', `search should show cue 002 only, shows [${state.shown}]`);
  const action = cell(page, 0, 'action');
  await action.focus();
  await action.fill('Opening sting to screens');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Deck go');
  await settle(page);
  state = await snapshot(page);
  assert(state.shown.join() === '002' && state.focusField === 'source' && state.focusValue.includes('Deck go'), `typing should land in the source cell of cue 002, table shows [${state.shown}], focus field "${state.focusField}" holds "${state.focusValue}"`);
  assertUntouched(state, 'after typing');
  await page.click('#editToolsViewTab');
  await settle(page);
  state = await snapshot(page);
  assert(state.shown.length === 0 && state.emptyShown, `cue 002 should leave the search once focus leaves the table, shows [${state.shown}]`);
  assert(state.focusId === 'editToolsViewTab', `focus should be the Edit tools tab, got <${state.focusTag}> id "${state.focusId}"`);
});

await browser.close();
server.close();
console.log(failures.length ? `\n${failures.length} failed, ${passed} passed` : `\nall ${passed} passed`);
process.exit(failures.length ? 1 : 0);
