/* Runtime XSS check: render the board/feed from a built dashboard and assert
 * that hostile candidate fields come out HTML-ESCAPED in the generated innerHTML
 * (the H1 sink), not as live tags.
 *
 * Unlike dashboard_smoke.js, this DOM returns a SINGLETON element per selector,
 * so innerHTML written by renderBoard()/renderFeed() can be read back and inspected.
 *
 * Usage:  node xss_render_check.js <path-to-built-index.html>
 * Exit:   0 = PASS (escaped), non-zero = FAIL (raw payload leaked).
 */
const fs = require('fs');

const file = process.argv[2];
const html = fs.readFileSync(file, 'utf8');
const main = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes('GENERATED_AT'));
if (!main) { console.log('FAIL: dashboard script not found'); process.exit(65); }

function mkEl() {
  return {
    _html: '', value: '', dataset: {}, style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {}, removeEventListener() {},
    querySelectorAll() { return []; }, querySelector() { return mkEl(); },
    closest() { return null; }, appendChild() {}, click() {},
    setAttribute() {}, getAttribute() { return null; },
    set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; },
    set textContent(v) { this._text = v; }, get textContent() { return this._text; },
  };
}
const byId = {};
function el(sel) { return (byId[sel] = byId[sel] || mkEl()); }
const document = {
  querySelector(sel) { return el(sel); },
  querySelectorAll() { return []; },
  createElement() { return mkEl(); },
  addEventListener() {},
  body: { addEventListener() {} },
};
const localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
const window = { addEventListener() {} };
const URL = { createObjectURL() { return 'blob:x'; } };
function Blob() {}
function confirm() { return false; }

try {
  // eslint-disable-next-line no-eval
  eval(main + '\n init();');
} catch (e) {
  console.log('FAIL: render threw -> ' + (e && e.message));
  process.exit(1);
}

const board = (byId['#boardBody'] && byId['#boardBody']._html) || '';
const feed = (byId['#feed'] && byId['#feed']._html) || '';
const rendered = board + '\n' + feed;

// Raw tag-openers that must NOT appear in the generated innerHTML. Once "<" is
// escaped to "&lt;" no tag can form, so leftover inert text like "onerror=" inside
// an escaped "&lt;img ...&gt;" is harmless — only a live "<tag" is the vulnerability.
const bad = ['<img', '<svg', '<script', '<iframe', '<body', 'javascript:'];
// Strip the LEGITIMATE build-controlled tags (avatar <img>, momentum <svg> sparkline)
// before scanning — these carry fixed classes and a build-trusted src, never data.
// An injected raw <img onerror=...>/<svg> from an unescaped field lacks these classes
// and so still trips the check.
const cleaned = rendered
  .replace(/<img class="avatarSm"[^>]*>/g, '')
  .replace(/<svg class="spark"[\s\S]*?<\/svg>/g, '');
const leaked = bad.filter((b) => cleaned.toLowerCase().includes(b));
if (leaked.length) {
  console.log('FAIL: unescaped payload in rendered innerHTML -> ' + leaked.join(', '));
  console.log('  board snippet: ' + board.slice(0, 200));
  process.exit(2);
}
if (!rendered.includes('&lt;')) {
  console.log('FAIL: expected escaped "&lt;" in rendered output but found none (did the payload render at all?)');
  process.exit(3);
}
console.log('PASS: hostile fields are HTML-escaped in rendered board/feed (&lt; present, no live tags)');
process.exit(0);
