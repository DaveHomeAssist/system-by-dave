// Screenshot every window state by replaying recorded startup.py streams (not shipped).
// Usage inside the Playwright image: node capture.mjs <web-dir> <streams-dir> <out-dir>
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const [web, streams, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const load = name => readFileSync(`${streams}/${name}.jsonl`, 'utf8').trim().split('\n').map(line => JSON.parse(line));
const pass = load('pass'), fail = load('fail'), warm = load('warm'), ready = load('ready');
const watchOk = load('watch-ok'), watchNote = load('watch-note'), watchFault = load('watch-fault');
// The app reports the watch process itself; these stand in for what it sends when the process stops.
const stopped = [{ type: 'watch-state', state: 'stopped', message: 'The watch process ended (exit 1).' }];
const browser = await chromium.launch();

async function open(theme = 'light') {
  const context = await browser.newContext({ viewport: { width: 1280, height: 832 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.clock.install();
  await page.goto(pathToFileURL(`${web}/index.html`).href);
  if (theme === 'dark') await page.click('#theme');
  return page;
}
const feed = (page, events) => page.evaluate(list => list.forEach(e => window.frozenStartup.receive(e)), events);
async function shot(page, name, size) {
  if (size) await page.setViewportSize(size);
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log(name);
}
const running = pass.findIndex(e => e.type === 'check' && e.id === 'show' && e.status === 'RUNNING');

let page = await open(); await feed(page, pass.slice(0, running + 1)); await shot(page, '01-running');
page = await open(); await feed(page, pass); await shot(page, '02-pass');
page = await open(); await feed(page, fail); await shot(page, '03-fail-with-retry');
page = await open(); await feed(page, pass); await page.click('#next'); await page.fill('#operator', 'Crew operator');
for (const box of await page.$$('[data-crew]')) await box.check();
await shot(page, '04-crew-check');
page = await open(); await feed(page, [...warm, ...ready]); await shot(page, '05-ready-banner', { width: 780, height: 172 });
await page.setViewportSize({ width: 1280, height: 832 }); await page.click('#ready-details'); await shot(page, '06-ready-expanded');
page = await open(); await feed(page, [...warm, ...ready]); await page.clock.fastForward('16:00'); await shot(page, '07-expired');
page = await open('dark'); await feed(page, fail); await shot(page, '08-fail-dark');
page = await open(); await feed(page, fail); await shot(page, '09-fail-phone', { width: 390, height: 844 });
// Mid-show watch: all clear, with notes, a fault, and a stopped watcher; expanded and collapsed (the window after READY).
page = await open(); await feed(page, [...pass, ...watchOk]); await shot(page, '10-watch-ok-expanded');
page = await open(); await feed(page, [...pass, ...watchNote]); await shot(page, '11-watch-note-expanded');
page = await open(); await feed(page, [...pass, ...watchFault]); await shot(page, '12-watch-fault-expanded');
page = await open('dark'); await feed(page, [...pass, ...watchFault]); await shot(page, '13-watch-fault-dark');
page = await open(); await feed(page, [...warm, ...ready, ...watchOk]); await shot(page, '14-watch-ok-collapsed', { width: 780, height: 432 });
page = await open(); await feed(page, [...warm, ...ready, ...watchFault]); await shot(page, '15-watch-fault-collapsed', { width: 780, height: 432 });
page = await open('dark'); await feed(page, [...warm, ...ready, ...watchFault]); await shot(page, '16-watch-fault-collapsed-dark', { width: 780, height: 432 });
page = await open(); await feed(page, [...pass, ...watchOk, ...stopped]); await shot(page, '17-watch-stopped');
await browser.close();
