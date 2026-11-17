// Navigation contract for the Frozen workspace shell (wst/index.html).
// Rule: one label per view and one view per label, across all four menus.
// Brief and open decisions: apps/projctl/docs/navigation-cohesion.md
import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const html = read('./index.html');

// The four menus a visitor can use to move around the shell.
const MENUS = {
  Workspace: ['<nav class="workspace-utilities"', '</nav>'],
  'Main menu': ['<nav id="primary-navigation"', '</nav>'],
  'Home cards': ['<div class="home-choices">', '</div>'],
  'Planning views': ['<nav class="planning-views"', '</nav>'],
};

// Collisions that wait on a recorded decision. Each names the decision that settles it.
// When a decision lands, fix the menu and delete its lines here: a stale entry fails the test.
const OPEN = [
  'NAV-2 | one label, several views | Handoff -> page:handoff.html, view:handoff',
  'NAV-2 | one view, several labels | view:handoff <- Handoff, House handoff',
  'NAV-2 | separate page without the cue | Workspace: Handoff -> page:handoff.html',
];
const decisionFor = problem => (/handoff/i.test(problem) ? 'NAV-2' : 'UNRECORDED');

function slice(source, [open, close]) {
  const start = source.indexOf(open);
  assert.notEqual(start, -1, 'menu container is present: ' + open);
  return source.slice(start, source.indexOf(close, start));
}

function attribute(attributes, name) {
  const match = attributes.match(new RegExp('\\b' + name + '(?:="([^"]*)")?(?=\\s|$)'));
  return match ? (match[1] ?? true) : null;
}

function labelOf(inner) {
  const title = inner.match(/<strong>([\s\S]*?)<\/strong>/);
  return (title ? title[1] : inner)
    .replace(/<svg[\s\S]*?<\/svg>/g, '')
    .replace(/<span[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/span>/g, '')
    .replace(/<span[^>]*class="sr-only"[^>]*>[\s\S]*?<\/span>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function destinationOf(attributes) {
  const route = attribute(attributes, 'data-route');
  const href = attribute(attributes, 'href');
  // A section entry names the section and opens its default view.
  if (attribute(attributes, 'data-planning-entry')) return 'section:planning';
  if (route) return 'view:' + route + (attribute(attributes, 'data-open-controls') ? '/controls' : '');
  if (href) return 'page:' + href;
  return null;
}

export function readMenus(source) {
  const entries = [];
  for (const [menu, bounds] of Object.entries(MENUS)) {
    for (const [, , attributes, inner] of slice(source, bounds).matchAll(/<(button|a)\b([^>]*)>([\s\S]*?)<\/\1>/g)) {
      const destination = destinationOf(attributes);
      if (!destination) continue;
      entries.push({ menu, label: labelOf(inner), destination, separatePage: destination.startsWith('page:'), inner });
    }
  }
  return entries;
}

export function findProblems(entries) {
  const byLabel = new Map(), byDestination = new Map(), problems = [];
  const add = (map, key, value) => map.set(key, (map.get(key) || new Set()).add(value));
  for (const { label, destination } of entries) { add(byLabel, label, destination); add(byDestination, destination, label); }
  for (const [label, destinations] of byLabel) if (destinations.size > 1) problems.push('one label, several views | ' + label + ' -> ' + [...destinations].sort().join(', '));
  for (const [destination, labels] of byDestination) if (labels.size > 1) problems.push('one view, several labels | ' + destination + ' <- ' + [...labels].sort().join(', '));
  for (const { menu, label, destination, separatePage, inner } of entries) {
    const cued = /class="leaves-shell" aria-hidden="true"> ↗<\/span><span class="sr-only"> \(separate page\)<\/span>/.test(inner);
    if (separatePage && !cued) problems.push('separate page without the cue | ' + menu + ': ' + label + ' -> ' + destination);
    if (!separatePage && cued) problems.push('in-shell view marked as a separate page | ' + menu + ': ' + label);
  }
  return problems.map(problem => decisionFor(problem) + ' | ' + problem).sort();
}

const entries = readMenus(html);

test('the four menus are read in full', () => {
  const count = menu => entries.filter(entry => entry.menu === menu).length;
  assert.deepEqual(Object.fromEntries(Object.keys(MENUS).map(menu => [menu, count(menu)])), { Workspace: 3, 'Main menu': 8, 'Home cards': 6, 'Planning views': 6 });
  for (const { menu, label } of entries) assert.notEqual(label, '', menu + ' has an entry without a visible label');
});

test('one label per view and one view per label, except the collisions waiting on a decision', () => {
  assert.deepEqual(findProblems(entries), [...OPEN].sort(),
    'Give each view one label, or record the decision in apps/projctl/docs/navigation-cohesion.md and list it in OPEN.');
});

test('the checker catches a second name for a view, a reused label and an unmarked page', () => {
  const sample = '<nav class="workspace-utilities"><button data-route="home">Home</button><a href="other.html">Home</a></nav>'
    + '<nav id="primary-navigation"><button data-route="rig" data-open-controls>Live controls</button></nav>'
    + '<div class="home-choices"><button data-route="rig" data-open-controls><strong>Operator controls</strong><span>Power</span></button></div>'
    + '<nav class="planning-views"><button data-route="schedule" data-planning-entry>Planning</button><button data-route="schedule">Calendar</button></nav>';
  assert.deepEqual(findProblems(readMenus(sample)), [
    'UNRECORDED | one label, several views | Home -> page:other.html, view:home',
    'UNRECORDED | one view, several labels | view:rig/controls <- Live controls, Operator controls',
    'UNRECORDED | separate page without the cue | Workspace: Home -> page:other.html',
  ]);
});

test('every menu entry opens a view the router serves', () => {
  const table = read('./workspace.js').match(/const ROUTES=\{([\s\S]*?)\};/);
  assert.ok(table, 'route table is present in workspace.js');
  const served = new Set([...table[1].matchAll(/(?:^|,)(\w+):\{/g)].map(match => match[1]));
  for (const { menu, label, destination } of entries) {
    if (!destination.startsWith('view:')) continue;
    const route = destination.slice(5).split('/')[0];
    assert.ok(served.has(route), menu + ' › ' + label + ' opens "' + route + '", which the router does not serve');
  }
});

test('the local Projctl workspace shows the same menus as the published one', () => {
  for (const file of ['index.html', 'snow-splash.css', 'workspace.css', 'workspace.js']) {
    assert.equal(read('../apps/projctl/public/workspace/' + file), read('./' + file),
      'apps/projctl/public/workspace/' + file + ' differs from wst/' + file + '; run node wst/embed-hosted-assets.mjs');
  }
});
