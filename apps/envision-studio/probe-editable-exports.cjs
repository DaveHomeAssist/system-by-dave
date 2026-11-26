/* Exercise the private editor with new imports of the real shows. Archive only those imports. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { chromium } = require('playwright');

const origin = process.env.ENVISION_ORIGIN;
const evidence = process.env.ENVISION_EVIDENCE;
const saveMessage = 'Save your layer and event edits before exporting.';
const cases = [
  { name: 'Signal Assembly Fire', layer: 'Campaign headline', text: 'Registration is now open',
    edit: '#wording', save: '#save-layer', download: '#native', suffix: '.envision.zip' },
  { name: 'AfterJinx', layer: 'Walking directions', text: '5 MIN WALK FROM THE CONVENTION CENTER',
    edit: '#fields [data-key="slot10"]', save: '#save-fields', download: '#legacy', suffix: '.flyer.json' },
];

async function main() {
  assert(origin, 'Set ENVISION_ORIGIN to the private studio URL.');
  const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const api = page.request;
  const existing = new Set();
  const created = new Set();
  const editableRequests = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname.endsWith('/editable')) editableRequests.push(request.url());
  });

  async function openFile(name, buffer) {
    await page.getByRole('button', { name: 'Projects', exact: true }).click();
    const imported = page.waitForResponse(r =>
      r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/v1/imports');
    await page.locator('#import-project').setInputFiles({ name, mimeType: 'application/octet-stream', buffer });
    const response = await imported;
    assert.equal(response.status(), 201, 'Studio import failed for ' + name);
    const project = await response.json();
    assert(!existing.has(project.id) && !created.has(project.id), 'Import must create a fresh project');
    created.add(project.id);
    await page.waitForURL('**/#project/' + project.id + '/layout');
    return project;
  }

  async function proof() {
    const image = page.locator('#art');
    await image.evaluate(img => img.decode());
    return image.screenshot();
  }

  try {
    await page.goto(origin);
    await page.locator('#project-grid button').first().waitFor();
    const state = await api.get(origin + '/api/v1/state');
    assert(state.ok());
    const projects = (await state.json()).projects;
    for (const project of projects) existing.add(project.id);
    for (const trial of cases) {
      const original = projects.find(p => p.name === trial.name && !p.archived);
      assert(original, 'Missing private fixture ' + trial.name);
      const source = await api.get(origin + '/api/v1/projects/' + original.id + '/editable?revision=' + original.revision);
      assert(source.ok());
      const working = await openFile(trial.name + '.envision.zip', await source.body());
      await page.locator('#layer').selectOption({ label: trial.layer });
      const wording = page.locator('#wording');
      const previous = await wording.inputValue();
      assert.notEqual(previous, trial.text);
      const originalProof = await proof();
      if (trial.save === '#save-fields') await page.getByText('Event fields', { exact: true }).click();
      await page.locator(trial.edit).fill(trial.text);

      const requestsBefore = editableRequests.length;
      for (const button of ['#native', '#legacy']) {
        await page.locator(button).click();
        await page.locator('#message').filter({ hasText: saveMessage }).waitFor({ timeout: 5000 });
      }
      assert.equal(editableRequests.length, requestsBefore, 'Pending edits must block the download request');
      assert.equal(await page.locator(trial.edit).inputValue(), trial.text);

      await page.locator(trial.save).click();
      await page.waitForFunction(revision =>
        new URL(document.getElementById('art').src).searchParams.get('revision') === String(revision),
        working.revision + 1);
      assert.equal(await wording.inputValue(), trial.text);
      const savedProof = await proof();
      assert(!originalProof.equals(savedProof), 'The wording change must appear on the proof');
      const pending = page.waitForEvent('download');
      await page.locator(trial.download).click();
      const download = await pending;
      const name = download.suggestedFilename();
      assert.equal(name, trial.name + trial.suffix);
      assert.equal(await download.failure(), null);
      const bytes = await fs.readFile(await download.path());
      await openFile(name, bytes);
      await page.locator('#layer').selectOption({ label: trial.layer });
      assert.equal(await wording.inputValue(), trial.text, 'Reopened wording in ' + name);
      const reopenedProof = await proof();
      assert(savedProof.equals(reopenedProof), 'Reopened proof differs from the saved proof in ' + name);
      if (evidence) {
        await fs.mkdir(evidence, { recursive: true });
        await fs.writeFile(path.join(evidence, name), bytes);
        await fs.writeFile(path.join(evidence, trial.name + ' reopened.png'), reopenedProof);
      }
      console.log(JSON.stringify({ name, layer: trial.layer, previous, reopened: trial.text,
        matchingProof: true, fileSha256: createHash('sha256').update(bytes).digest('hex') }));
    }
  } finally {
    try {
      for (const id of created) {
        const url = origin + '/api/v1/projects/' + id;
        const project = await (await api.get(url)).json();
        project.data.archived = true;
        const archived = await api.patch(url, {
          headers: { 'X-Envision': 'studio', Origin: origin },
          data: { data: project.data, revision: project.revision },
        });
        assert(archived.ok(), 'Archive the verification import ' + id);
      }
    } finally {
      await browser.close();
    }
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
