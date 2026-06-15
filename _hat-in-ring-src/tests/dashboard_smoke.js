/* Headless smoke test for the rendered dashboard.
 *
 * Loads a built dashboard HTML, stubs a minimal DOM + an EMPTY localStorage
 * (i.e. a brand-new visitor), runs the page's init(), and asserts the board
 * actually renders. Guards the class of bug where a JS throw during render
 * leaves the page blank below the stat cards.
 *
 * Usage:  node dashboard_smoke.js <path-to-built-index.html>
 * Exit:   0 = PASS, non-zero = FAIL (message on stdout).
 */
const fs = require('fs');

const file = process.argv[2];
if (!file) { console.log('FAIL: no HTML path given'); process.exit(64); }
const html = fs.readFileSync(file, 'utf8');

const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const main = scripts.find((s) => s.includes('GENERATED_AT'));
if (!main) { console.log('FAIL: could not find the dashboard script'); process.exit(65); }

// ---- minimal browser stubs ----
function mkEl() {
  return new Proxy(
    {
      _html: '', _text: '', value: '', dataset: {}, style: {},
      classList: { add() {}, remove() {}, toggle() {} },
      addEventListener() {}, removeEventListener() {},
      querySelectorAll() { return []; }, querySelector() { return mkEl(); },
      closest() { return null; }, appendChild() {}, click() {},
      setAttribute() {}, getAttribute() { return null; },
      set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; },
      set textContent(v) { this._text = v; }, get textContent() { return this._text; },
    },
    { get(t, p) { return p in t ? t[p] : undefined; }, set(t, p, v) { t[p] = v; return true; } },
  );
}
const document = {
  querySelector() { return mkEl(); },
  querySelectorAll() { return []; },
  createElement() { return mkEl(); },
  addEventListener() {},
  body: { addEventListener() {} },
};
const localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} }; // EMPTY = first visit
const window = { addEventListener() {} };
const URL = { createObjectURL() { return 'blob:x'; } };
function Blob() {}
function confirm() { return false; }

// ---- run it inside a function scope so the page's top-level const/let work ----
let _records, _filtered;
try {
  // eslint-disable-next-line no-eval
  eval(main + '\n init(); _records = records(); _filtered = filtered();');
} catch (e) {
  console.log('FAIL: render threw -> ' + (e && e.message));
  process.exit(1);
}

const nRec = _records.length;
const nBoard = _filtered.length;
if (nRec === 0) { console.log('FAIL: no records parsed from SEED'); process.exit(2); }
if (nBoard !== nRec) {
  console.log(`FAIL: board shows ${nBoard} rows but there are ${nRec} records (unexpected filtering on first visit)`);
  process.exit(3);
}
console.log(`PASS: first-visit render OK — board rows=${nBoard} == records=${nRec}`);
process.exit(0);
