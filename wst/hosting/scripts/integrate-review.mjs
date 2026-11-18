import {withReviewCsp} from './review-csp.mjs';
// Install a pinned viewer and verified release into the current managed WST source.
// Preserve every unrelated live asset and all D1/R2 bindings. No production writes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const [managed, viewer, data, phase = 'active', shellRoot = fileURLToPath(new URL('../../', import.meta.url))] = process.argv.slice(2);
assert(managed && viewer && data && ['media', 'active'].includes(phase), 'Usage: integrate-review.mjs managed-source viewer.html verified-release-dir [media|active]');
const read = file => JSON.parse(fs.readFileSync(path.join(data, file), 'utf8'));
const catalog = read('catalog.json'), media = read('media.json'), manifests = {};
assert(catalog.sessions.length >= 2);
assert.equal(new Set(catalog.sessions.map(session => session.id)).size, catalog.sessions.length, 'Review session IDs must be unique');
for (const s of catalog.sessions) {
  const m = read(s.id + '.json');
  assert.equal(m.sessionId, s.id);
  assert.equal(m.release, s.release || catalog.release);
  manifests[s.manifest] = m;
}
const hosting = JSON.parse(fs.readFileSync(path.join(managed, '.openai/hosting.json')));
assert.equal(hosting.project_id, 'appgprj_6aed67f5df688191acf3e2641138818a');
assert.equal(hosting.r2, 'REVIEW_PHOTOS'); assert.equal(hosting.d1, 'DB');
const workerPath = path.join(managed, 'worker/index.js');
let source = fs.readFileSync(workerPath, 'utf8');
const marker = ' const url=new URL(request.url),path=url.pathname;';
assert(source.includes(marker), 'Unrecognized Worker boundary; preserve and inspect');
if (!source.includes("import {handleHostedReview}")) source = "import {handleHostedReview} from './review-hosted.js';\n" + source;
if (!source.includes('const hostedReview=')) source = source.replace(marker, marker + '\n const hostedReview=await handleHostedReview(request,env);if(hostedReview)return hostedReview;');
fs.copyFileSync(new URL('../review/handler.mjs', import.meta.url), path.join(managed, 'worker/review-handler.mjs'));
const releasePath = path.join(managed, 'worker/review-release.js');
let installed = { active: true, catalog, media, manifests };
if (phase === 'media') {
  const previousSource = fs.readFileSync(releasePath, 'utf8').trim();
  assert(previousSource.startsWith('export default ') && previousSource.endsWith(';'), 'Existing review release is not a recognized managed export');
  const previous = JSON.parse(previousSource.slice('export default '.length, -1));
  assert(previous.active && previous.catalog && previous.manifests && previous.media, 'Existing live review release is incomplete');
  for (const session of previous.catalog.sessions) assert(previous.manifests[session.manifest], `Existing live manifest is missing for ${session.id}`);
  installed = { active: true, catalog: previous.catalog, media, manifests: previous.manifests };
}
fs.writeFileSync(releasePath, 'export default ' + JSON.stringify(installed) + ';\n');
fs.writeFileSync(path.join(managed, 'worker/review-hosted.js'), "import {reviewHandler} from './review-handler.mjs';\nimport release from './review-release.js';\nexport const handleHostedReview=reviewHandler(release);\n");
if (phase === 'active') {
  let html = fs.readFileSync(viewer, 'utf8');
  html = withReviewCsp(html);
  fs.writeFileSync(path.join(managed, 'review.html'), html);
  // Existing Home/Planning assets remain the release baseline, not an older checkout.
  const start = source.indexOf('const ASSETS'); const jsonStart = source.indexOf('{', start);
  const end = source.indexOf(';\nconst BINARY', jsonStart);
  assert(start >= 0 && end > start, 'Unrecognized assets boundary');
  const assets = JSON.parse(source.slice(jsonStart, end));
  // Older managed releases override Home after the generated map. Preserve that
  // current page as the input, then fold it back into the map exactly once.
  const homeOverride = source.match(/^ASSETS\['\/'\]=(.*);$/m);
  if (homeOverride) assets['/'] = JSON.parse(homeOverride[1]);
  const shell = fs.readFileSync(path.join(shellRoot, 'index.html'), 'utf8');
  const card = shell.match(/<a class="home-choice"[^>]*>[\s\S]*?<\/a>/)?.[0];
  const planning = shell.match(/<a class="planning-link"[^>]*>[\s\S]*?<\/a>/)?.[0];
  assert(card && planning, 'Canonical review navigation is missing');
  for (const url of ['/', '/index.html']) {
    let home = assets[url]; assert(home, 'Missing WST home');
    home = home.replace(/<a href="\/run-review\/" style="[^"]*">Review November 15 run · 417 cues<\/a>/, '');
    if (!home.includes('class="home-choice"')) {
      const start = home.indexOf('<div class="home-choices">');
      const end = home.indexOf('</div>', start);
      assert(start >= 0 && end > start, 'Missing Home choices boundary');
      home = home.slice(0, end) + card + '\n' + home.slice(end);
    }
    if (!home.includes('class="planning-link"')) home = home.replace('<button type="button" data-route="documents">Documents</button></nav>', '<button type="button" data-route="documents">Documents</button>' + planning + '</nav>');
    assert(home.includes(card) && home.includes(planning), 'Review navigation did not attach');
    assets[url] = home;
  }
  for (const name of ['workspace.css', 'snow-splash.css', 'snow-splash.js']) assets['/' + name] = fs.readFileSync(path.join(shellRoot, name), 'utf8');
  source = source.slice(0, jsonStart) + JSON.stringify(assets) + source.slice(end);
  source = source.replace(/^ASSETS\['\/'\]=.*;\n/m, '');
}
fs.writeFileSync(workerPath, source);
const buildPath = path.join(managed, 'scripts/build.sh'); let build = fs.readFileSync(buildPath, 'utf8');
if (!build.includes('review-handler.mjs')) build += '\ncp "$project_root/worker/review-hosted.js" "$project_root/worker/review-handler.mjs" "$project_root/worker/review-release.js" "$dist_root/server/"\n';
fs.writeFileSync(buildPath, build);
fs.writeFileSync(path.join(managed, 'REVIEW_RELEASE.json'), JSON.stringify({ release: catalog.release, phase, viewerSha256: createHash('sha256').update(fs.readFileSync(viewer)).digest('hex'), sessions: catalog.sessions.map(s => s.id), activeSessions: installed.catalog.sessions.map(s => s.id), mediaRoutes: Object.keys(media).length }, null, 2));
console.log(`Integrated ${catalog.release}: ${phase}; unrelated live assets and storage bindings retained`);
