// Report whether each window state fits without scrolling (not shipped).
// The native window is 1280 x 860 including a 28 px title bar, so the page viewport is 1280 x 832.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const [web, streams, width = '1280', height = '832'] = process.argv.slice(2);
const load = name => readFileSync(`${streams}/${name}.jsonl`, 'utf8').trim().split('\n').map(line => JSON.parse(line));
const states = { running: load('pass').slice(0, 8), pass: load('pass'), fail: load('fail') };
const browser = await chromium.launch();
let worst = 0;
for (const [name, events] of Object.entries(states)) {
  const page = await browser.newPage({ viewport: { width: +width, height: +height } });
  await page.goto(pathToFileURL(`${web}/index.html`).href);
  await page.evaluate(list => list.forEach(e => window.frozenStartup.receive(e)), events);
  const m = await page.evaluate(() => { const l = document.querySelector('.layout'); return { overflow: l.scrollHeight - l.clientHeight, page: document.documentElement.scrollHeight - innerHeight }; });
  worst = Math.max(worst, m.overflow, m.page);
  console.log(`${name} ${width}x${height}: layout overflow ${m.overflow}px, page overflow ${m.page}px`);
}
await browser.close();
process.exit(worst > 0 ? 1 : 0);
