const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const { startRelay, until } = await import('./relay-helper.js');
  const relay = await startRelay();
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.clock.install();
    const errors = [], task = { id: 'fixture', text: 'Check the cue sheet', done: false, revision: 1 };
    page.on('pageerror', error => errors.push(error.message));
    let additions = 0, failEdit = true, releaseAdd;
    const addGate = new Promise(resolve => { releaseAdd = resolve; });
    await page.route('https://wst.housevideo.app/api/tasks**', async route => {
      const request = route.request();
      if (request.method() === 'GET') return route.fulfill({ json: { tasks: [task] } });
      if (new URL(request.url()).pathname.endsWith('/fixture')) {
        if (failEdit) return route.fulfill({ status: 409, json: { error: 'Another person changed this task. Review the latest version.' } });
        task.done = request.postDataJSON().done; task.revision++;
        return route.fulfill({ json: task });
      }
      additions++; await addGate;
      return route.fulfill({ status: 503, json: { error: 'Could not save this task. Please try again.' } });
    });
    await page.goto(relay.base + '/monitor/notes.html');
    const box = page.locator('[data-task=fixture]'), feedback = page.locator('#fm-task-feedback');
    await box.waitFor();
    await box.check();
    await until(async () => /Another person/.test(await feedback.innerText()));
    assert.equal(await box.isChecked(), false, 'a rejected change restores the server value');
    await page.clock.fastForward(11000);
    assert.match(await feedback.innerText(), /Another person/, 'automatic refresh must retain the failure');
    failEdit = false;
    await box.check();
    await until(async () => (await feedback.innerText()) === 'Tasks up to date.');
    assert.equal(task.done, true);
    await page.locator('#fm-task-text').fill('Retain this draft');
    await page.locator('#fm-task-add').evaluate(form => { form.requestSubmit(); form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); });
    await until(() => additions === 1);
    assert.equal(await page.locator('#fm-task-add [type=submit]').isDisabled(), true);
    releaseAdd();
    await until(async () => /Could not save/.test(await feedback.innerText()));
    assert.equal(additions, 1, 'rapid submissions create one request');
    assert.equal(await page.locator('#fm-task-text').inputValue(), 'Retain this draft');
    assert.equal(await page.locator('#fm-task-add [type=submit]').isDisabled(), false);
    await page.locator('#fm-notes-text').fill('Local notes still work');
    await page.reload();
    assert.equal(await page.locator('#fm-notes-text').inputValue(), 'Local notes still work');
    assert.deepEqual(errors, []);
    console.log('Monitor notes: rejected edits, retained failures, successful retry, duplicate-submit guard, draft preservation and notes reload passed');
  } finally { await browser.close(); await relay.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
