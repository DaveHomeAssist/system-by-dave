// A relay can send status replies faster than the page can draw them (the browser tests poll every 50 ms;
// a slow device or a busy relay does the same). The page must apply every reply to its state at once but
// draw only now and then. Drawing each reply as it arrives leaves a backlog of old replies, and the
// freshness check reads that delay as a stale projector: Picture values never load and commands are refused
// while the relay's own copy is a few milliseconds old.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { selectSlot } = require('./operator-ui.cjs');

const REPLIES = 1500;
// Handling 1500 replies without drawing each one takes tens of milliseconds. Drawing each one (grid, thermal,
// stage, overview and the open adjust sheet) takes seconds, even on a fast machine.
const BUDGET_MS = 1000;

(async () => {
  const { startRelay, until } = await import('./relay-helper.js');
  const relay = await startRelay();
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    // Keep the live socket so the page's own message handler can be fed directly and timed.
    await page.addInitScript(() => {
      const Native = window.WebSocket;
      window.WebSocket = class extends Native { constructor(...args) { super(...args); window.__relaySocket = this; } };
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(relay.base);
    await page.locator('#conn-word').filter({ hasText: 'Relay connected' }).waitFor();
    await selectSlot(page, 'P2');
    await page.locator('#projector-controls [data-adj=pattern]').click();
    await page.locator('#adj-patterns [data-pattern]').first().waitFor();

    const handledMs = await page.evaluate(async (count) => {
      const snapshot = await (await fetch('/api/state')).json();
      const p2 = snapshot.projectors.find((p) => p.slot === 'P2');
      const socket = window.__relaySocket;
      const started = performance.now();
      for (let i = 0; i < count; i++) {
        const now = new Date().toISOString();
        const status = { ...p2.status, updatedAt: now, pattern: '08', connection: { ...p2.status.connection, state: 'online', lastSuccessAt: now } };
        socket.onmessage({ data: JSON.stringify({ type: 'status', slot: 'P2', status }) });
      }
      return performance.now() - started;
    }, REPLIES);
    assert.ok(handledMs < BUDGET_MS, `${REPLIES} status replies took ${Math.round(handledMs)} ms to handle; the page is drawing each one (budget ${BUDGET_MS} ms)`);

    // Drawing is deferred, not dropped: P2 still counts as freshly answering and its controls are live.
    await until(async () => !(await page.locator('#adj-patterns [data-pattern]').first().isDisabled()));
    assert.deepEqual(errors, []);
    console.log(`Status burst: ${REPLIES} replies handled in ${Math.round(handledMs)} ms; P2 still current`);
  } finally {
    await browser.close();
    await relay.close();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
