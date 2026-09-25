// The link contract between the FMP camera training tools (docs/camera-training-links.md).
// The Camera Simulator, Camera Shading Practice and the shading reference link into each other
// and into the managed FMP explorers by part id; a renamed part, demo, scenario or exercise would
// leave a link that opens the wrong place or nowhere. This test reads every link target from the
// source that renders it and checks it against the catalog that owns it.
//
// Usage: node --test scripts/camera_training_links.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const require = createRequire(import.meta.url);

const doc = read('docs/camera-training-links.md');
const simLinks = read('apps/fmp-camera-sim/src/app/links.ts');
const practiceApp = read('shader/practice-app.js');
const practiceHtml = read('shader/practice.html');
const shaderIndex = read('shader/index.html');
const Practice = require(join(ROOT, 'shader/shading-practice-state.js'));
const { catalog: rigCatalog } = await import(pathToFileURL(join(ROOT, 'fmp/rig/fmp-guide-data.js')).href);
const componentIds = (path) => new Set(JSON.parse(read(path)).components.map((component) => component.component_id));
const ccu4Parts = componentIds('fmp/models/assets/ccu4-catalog.json');
const p240Parts = componentIds('fmp/models/assets/p240-catalog.json');

/** The file a root path is served from, e.g. /fmp/rig/?part=x → fmp/rig/index.html. */
function servedFile(path) {
  const bare = path.split(/[?#]/)[0].replace(/^\//, '');
  return bare === '' || bare.endsWith('/') ? `${bare}index.html` : bare;
}

function simSuiteLinks() {
  const block = simLinks.match(/export const SUITE_LINKS = \{([\s\S]*?)\} as const;/)?.[1] ?? '';
  return [...block.matchAll(/(\w+): "([^"]+)"/g)].map(([, name, path]) => ({ name, path }));
}

function practiceKit() {
  const block = practiceApp.match(/const KIT = Object\.freeze\(\{([\s\S]*?)\n {2}\}\);/)?.[1] ?? '';
  return [...block.matchAll(/(\w+): Object\.freeze\(\{ panel: '([\w-]+)',[^}]*?camera: (null|'([\w-]+)')/g)].map(([, control, panel, , camera]) => ({ control, panel, camera: camera ?? null }));
}

function checkTarget(path) {
  assert.ok(existsSync(join(ROOT, servedFile(path))), `${path}: ${servedFile(path)} is not in this repository`);
  const rigPart = path.startsWith('/fmp/rig/') ? new URLSearchParams(path.split('?')[1] ?? '').get('part') : null;
  if (rigPart) assert.ok(rigCatalog[rigPart], `${path}: the rig explorer has no part "${rigPart}"`);
  const hashPart = new URLSearchParams(path.split('#')[1] ?? '').get('part');
  if (hashPart && path.startsWith('/fmp/models/ccu4.html')) assert.ok(ccu4Parts.has(hashPart), `${path}: the shader panel explorer has no part "${hashPart}"`);
  if (hashPart && path.startsWith('/fmp/models/p240.html')) assert.ok(p240Parts.has(hashPart), `${path}: the P240 explorer has no part "${hashPart}"`);
  if (path.startsWith('/shader/practice.html')) {
    const params = new URLSearchParams(path.split(/[?#]/)[1] ?? '');
    if (params.has('demo')) assert.ok(Practice.DEMO_SWEEPS[params.get('demo')], `${path}: Shading practice has no ?demo=${params.get('demo')} sweep`);
    if (params.has('scenario')) assert.ok(Practice.SCENARIOS[params.get('scenario')], `${path}: Shading practice has no ?scenario=${params.get('scenario')}`);
  }
  const anchor = path.startsWith('/shader/#') ? path.slice('/shader/#'.length) : null;
  if (anchor) assert.ok(shaderIndex.includes(`id="${anchor}"`), `${path}: the shading reference has no #${anchor}`);
}

test('every link the simulator renders exists and is listed in the contract', () => {
  const links = simSuiteLinks();
  assert.ok(links.length >= 6, 'SUITE_LINKS was not found in apps/fmp-camera-sim/src/app/links.ts');
  for (const { name, path } of links) {
    checkTarget(path);
    assert.ok(doc.includes(`\`${path}\``), `docs/camera-training-links.md does not list the simulator's ${name} link ${path}`);
  }
});

test('the simulator accepts exactly the exercise links the contract lists', () => {
  const ids = JSON.parse(read('apps/fmp-camera-sim/src/domain/session.ts').match(/EXERCISE_IDS: readonly ExerciseId\[\] = (\[[^\]]*\])/)?.[1] ?? 'null');
  assert.deepEqual(ids, ['wide', 'follow', 'recall']);
  for (const id of ids) assert.ok(doc.includes(`/camera-sim/?exercise=${id}`), `docs/camera-training-links.md does not list ?exercise=${id}`);
});

test('every shading control names a shader panel part, and a camera part where the body has one', () => {
  const kit = practiceKit();
  assert.deepEqual(kit.map((entry) => entry.control).sort(), Object.keys(Practice.CONTROL_LIMITS).sort(), 'the kit map must cover every practice control');
  for (const { control, panel, camera } of kit) {
    checkTarget(`/fmp/models/ccu4.html#part=ccu4.ch1.${panel}`);
    assert.ok(doc.includes(`ccu4.ch1.${panel}`), `docs/camera-training-links.md does not list the ${control} panel part ccu4.ch1.${panel}`);
    if (camera) {
      checkTarget(`/fmp/rig/?equipment=rig&part=${camera}`);
      assert.ok(doc.includes(`part=${camera}`), `docs/camera-training-links.md does not list the ${control} camera part ${camera}`);
    }
  }
  assert.ok(practiceApp.includes("const KIT_PANEL_URL = '/fmp/models/ccu4.html#part=ccu4.ch1.';"), 'the shader panel link base moved');
  assert.ok(practiceApp.includes("const KIT_CAMERA_URL = '/fmp/rig/?equipment=rig&part=';"), 'the camera link base moved');
});

test('the static links on the shading pages exist', () => {
  const hrefs = [...`${practiceHtml}\n${shaderIndex}`.matchAll(/href="(\/(?:fmp|camera-sim|shader)[^"]*)"/g)].map(([, href]) => href.replaceAll('&amp;', '&'));
  for (const required of ['/camera-sim/', '/fmp/models/ccu4.html#part=ccu4.ch1.joystick', '/fmp/rig/?equipment=rig&part=iris-mode']) {
    assert.ok(hrefs.includes(required), `shader pages no longer link ${required}`);
  }
  for (const href of hrefs) checkTarget(href);
});

test('the incoming links other tools may use resolve', () => {
  for (const control of ['iris', 'pedestal', 'gain', 'whiteBalance']) {
    assert.ok(Practice.DEMO_SWEEPS[control], `Shading practice has no ?demo=${control} sweep`);
    assert.ok(doc.includes(`?demo=${control}`), `docs/camera-training-links.md does not list ?demo=${control}`);
  }
  const scenarios = Practice.scenarioList().map((scenario) => scenario.id);
  assert.ok(scenarios.includes('match-cameras'), 'the match-cameras scenario the preshow checklist names is gone');
  assert.ok(doc.includes('?scenario=match-cameras'), 'docs/camera-training-links.md does not list ?scenario=match-cameras');
});

// The FMP pages are a managed export from fmp-suite; these read the exported bytes.
test('the rig explorer links each practised control to a target that exists', () => {
  const linked = Object.entries(rigCatalog).filter(([, item]) => item.practice);
  assert.deepEqual(linked.map(([id]) => id).sort(), ['body-auto-wb', 'body-gain', 'body-wb', 'door-iris', 'fiber-camera-controls', 'iris', 'iris-mode', 'nd-filter', 'push-auto']);
  for (const [id, item] of linked) {
    checkTarget(item.practice);
    assert.ok(item.practiceLabel, `rig part ${id} links ${item.practice} without a label`);
    assert.ok(doc.includes(`\`${id}\``), `docs/camera-training-links.md does not list rig part ${id}`);
  }
  assert.ok(read('fmp/rig/index.html').includes('data-practice-row'), 'the rig explorer lost its practice link');
});

test('the shader panel and P240 explorers link their practised controls', () => {
  const ccu4 = read('fmp/models/assets/ccu4-0.js');
  const table = ccu4.match(/const PRACTICE=\{([^}]*)\};/)?.[1];
  assert.ok(table, 'fmp/models/assets/ccu4-0.js has no PRACTICE table');
  const entries = [...table.matchAll(/([\w-]+):\['(\w+)'/g)].map(([, part, demo]) => ({ part, demo }));
  assert.deepEqual(entries.map(({ part }) => part).sort(), ['flare', 'gain', 'joystick', 'wb']);
  for (const { part, demo } of entries) {
    for (const channel of [1, 2, 3]) assert.ok(ccu4Parts.has(`ccu4.ch${channel}.${part}`), `the shader panel explorer has no ccu4.ch${channel}.${part}`);
    checkTarget(`/shader/practice.html?demo=${demo}`);
    assert.ok(doc.includes(`?demo=${demo}`), `docs/camera-training-links.md does not list ?demo=${demo}`);
  }
  // Channel 4 is labelled 4 PTZ but drives the P240, so the pattern must stop at channel 3.
  assert.ok(ccu4.includes('/^ccu4\\.ch[123]\\.([\\w-]+)$/'), 'the shader panel explorer may link channel 4 to Shading practice');
  assert.ok(ccu4.includes("/shader/practice.html?scenario=match-cameras"), 'the shader panel overview no longer links the match-cameras exercise');
  const p240 = read('fmp/models/assets/p240-0.js');
  const parts = JSON.parse((p240.match(/practice\(E,c\)\{return !c\|\|(\[[^\]]*\])/)?.[1] ?? 'null').replaceAll("'", '"'));
  assert.deepEqual(parts, ['p240.lens', 'p240.pan-axis', 'p240.tilt-axis']);
  for (const part of parts) assert.ok(p240Parts.has(part), `the P240 explorer has no part ${part}`);
  assert.ok(p240.includes("href:'/camera-sim/'"), 'the P240 explorer no longer links the Camera Simulator');
  for (const page of ['fmp/models/ccu4.html', 'fmp/models/p240.html']) assert.ok(read(page).includes('data-practice'), `${page} lost its practice link`);
});

test('the FMP hub and bowl camera guide link Shading practice', () => {
  const hrefs = [...`${read('fmp/index.html')}\n${read('fmp/guide/index.html')}`.matchAll(/href="(\/(?:shader|camera-sim)[^"]*)"/g)].map(([, href]) => href.replaceAll('&amp;', '&'));
  for (const required of ['/shader/practice.html', '/shader/practice.html?scenario=match-cameras', '/shader/']) assert.ok(hrefs.includes(required), `the FMP pages no longer link ${required}`);
  for (const href of hrefs) checkTarget(href);
});

// Suggestions link each tool to the other's next step by the ids in the shared
// training record (shader/fmp-training.js), so those ids must be the tools' own.
test('the training record names each tool\'s exercises by its own ids and titles', () => {
  const Training = require(join(ROOT, 'shader/fmp-training.js'));
  const session = read('apps/fmp-camera-sim/src/domain/session.ts');
  const types = read('apps/fmp-camera-sim/src/exercises/types.ts');
  const simIds = JSON.parse(session.match(/EXERCISE_IDS: readonly ExerciseId\[\] = (\[[^\]]*\])/)?.[1] ?? 'null');
  const titles = Object.fromEntries([...(types.match(/EXERCISE_TITLES[^{]*\{([^}]*)\}/)?.[1] ?? '').matchAll(/(\w+):\s*"([^"]+)"/g)].map((match) => [match[1], match[2]]));
  assert.deepEqual(Training.STEPS.sim.map((step) => step.id), simIds);
  for (const step of Training.STEPS.sim) assert.equal(step.title, titles[step.id], `the simulator calls ${step.id} "${titles[step.id]}"`);
  assert.deepEqual(Training.STEPS.practice.map(({ id, title }) => ({ id, title })), Practice.scenarioList().map(({ id, title }) => ({ id, title })));
  assert.ok(Training.KEY.startsWith('fmp'), 'the housevideo.app transfer only carries fmp-prefixed keys');
  assert.ok(doc.includes(`\`${Training.KEY}\``), `docs/camera-training-links.md does not describe ${Training.KEY}`);
  // The suggestion links are built from these ids: the simulator's exercise links and Shading practice's scenario links.
  for (const id of Training.STEPS.practice.map((step) => step.id)) assert.ok(Practice.SCENARIOS[id], `Shading practice has no ?scenario=${id}`);
  assert.ok(doc.includes('/shader/practice.html?scenario=<id>'), 'docs/camera-training-links.md does not list the Next: Shading practice link');
  assert.ok(simLinks.includes('shadingPractice: "/shader/practice.html"'), 'the simulator builds its Shading practice links from SUITE_LINKS.shadingPractice');
});
