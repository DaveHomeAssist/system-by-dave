/* Anticipatory-UX regression check: drives the dashboard's quick-filter +
 * movers logic in a headless DOM and asserts it behaves.
 *
 * Catches e.g. the "My adds" predicate over-matching real candidate ids that
 * start with "c" (cruz), and confirms the new render paths still escape.
 *
 * Usage:  node ux_check.js <path-to-built-index.html>   (exit 0 = PASS)
 */
const fs = require('fs');
const file = process.argv[2];
const html = fs.readFileSync(file, 'utf8');
const main = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes('GENERATED_AT'));
if (!main) { console.log('FAIL: dashboard script not found'); process.exit(65); }

const byId = {};
function mkEl() {
  return {
    _html: '', _text: '', value: '', dataset: {}, style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {}, querySelectorAll() { return []; }, querySelector() { return mkEl(); },
    closest() { return null; }, appendChild() {}, click() {}, focus() {},
    setAttribute() {}, getAttribute() { return null; }, offsetWidth: 0,
    set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; },
    set textContent(v) { this._text = v; }, get textContent() { return this._text; },
  };
}
function el(s) { return (byId[s] = byId[s] || mkEl()); }
const document = { querySelector: el, querySelectorAll() { return []; }, createElement() { return mkEl(); }, addEventListener() {}, body: { addEventListener() {} } };
const localStorage = { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
const window = { addEventListener() {}, innerWidth: 1200 };
const URL = { createObjectURL() { return 'blob:x'; } };
function Blob() {}
function confirm() { return true; }

let OUT;
try {
  // eslint-disable-next-line no-eval
  eval(main + `
    init();
    var T=records().length, R0=filtered().length;
    PREFS.quick='movers'; var RM=filtered().length, MC=records().filter(isMover).length;
    PREFS.quick='declared'; var RD=filtered().length, D5=records().filter(function(x){return x.tier===5;}).length;
    PREFS.quick=''; var RC=filtered().length;                       // clear restores all (before any push)
    PREFS.quick='myadds'; var seedAdds=filtered().length;
    DB.records.push({id:'c1718999',name:'Test Add',party:'Independent',role:'r',bucket:'considering',keys:['consideringQuote'],conf:'Medium',delta:0,lastSignal:'2026-06-13',headline:'h',why:'w',quote:'',tags:[]});
    var withAdd=filtered().length;
    PREFS.quick='';
    renderQuick(); renderStats();
    OUT={T:T,R0:R0,RM:RM,MC:MC,RD:RD,D5:D5,seedAdds:seedAdds,withAdd:withAdd,RC:RC,
      chips:(document.querySelector('#quickbar').innerHTML.match(/data-quick=/g)||[]).length,
      // strip the legitimate avatar <img> and momentum sparkline <svg> first, then
      // assert no OTHER tag leaked (an injected <img onerror=...>/<svg> from an
      // unescaped field lacks class="avatarSm"/class="spark").
      escaped:!/<(img|script|svg)/i.test(document.querySelector('#boardBody').innerHTML
        .replace(/<img class="avatarSm"[^>]*>/g,'')
        .replace(/<svg class="spark"[^]*?<\\/svg>/g,''))};
  `);
} catch (e) {
  console.log('FAIL: dashboard threw -> ' + (e && e.message));
  process.exit(1);
}

const o = OUT;
function fail(m) { console.log('FAIL: ' + m); process.exit(2); }
if (o.R0 !== o.T) fail('first visit does not show all rows (' + o.R0 + '/' + o.T + ')');
if (o.RM !== o.MC) fail('Movers filter (' + o.RM + ') != isMover count (' + o.MC + ')');
if (o.RD !== o.D5) fail('Declared filter (' + o.RD + ') != tier-5 count (' + o.D5 + ')');
if (o.seedAdds !== 0) fail('"My adds" matched real candidate ids on the clean seed (' + o.seedAdds + ') — predicate too greedy');
if (o.withAdd !== 1) fail('"My adds" did not match a user-added c<timestamp> id');
if (o.RC !== o.T) fail('clearing the quick filter did not restore all rows');
if (o.chips !== 3) fail('expected 3 quick-filter chips, got ' + o.chips);
if (!o.escaped) fail('raw tag leaked into the board render');
console.log('PASS ux: quick-filters + movers + escaping OK (movers=' + o.RM + ', declared=' + o.RD + ', chips=' + o.chips + ')');
process.exit(0);
