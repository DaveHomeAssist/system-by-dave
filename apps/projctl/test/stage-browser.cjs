const assert = require('node:assert/strict');

exports.checkStage = async (page, relay, offline, until) => {
  await page.locator('[data-tab="stage"]').click();
  await page.locator('#stage-workspace').waitFor();
  assert.equal(await page.locator('#stage-canvas script').count(), 0);
  assert.equal(await page.locator('#stage-status-kind').innerText(), 'Simulated status');
  await relay.api('command', { slot: 'P4', cmd: 'shutter', arg: 1 });
  await until(async () => (await page.locator('.pj-stage-card[data-lane="B"] .pj-stage-state').innerText()).includes('Shutter closed'));
  await relay.api('command', { slot: 'P4', cmd: 'shutter', arg: 0 });
  await until(async () => (await page.locator('.pj-stage-card[data-lane="B"] .pj-stage-state').innerText()).includes('Shutter open'));
  const writes = [];
  const onRequest = (req) => { if (req.method() === 'POST' && req.url().includes('/api/command')) writes.push(req.postDataJSON()); };
  page.on('request', onRequest);
  for (const view of ['front', 'plan']) {
    await page.locator(`[data-stage-view="${view}"]`).click();
    for (const [lane, slot] of Object.entries({ A: 'P2', B: 'P4', C: 'P1', D: 'P3' })) {
      const button = page.locator(`.pj-stage-marker[data-lane="${lane}"]`);
      assert.equal(await button.getAttribute('data-slot'), slot);
      if (offline && slot === 'P1') { assert.equal(await button.getAttribute('aria-disabled'), 'true'); continue; }
      await button.press('Enter');
      assert.match(await page.locator('#adj-sub').innerText(), new RegExp('^' + slot));
      await relay.api('lock', { lock: true });
      await until(async () => page.locator('#adj-patterns button').first().isDisabled());
      await page.keyboard.press('Escape');
      assert.equal(await button.evaluate((el) => document.activeElement === el), true);
      await relay.api('lock', { lock: false });
    }
    await page.locator('[data-coverage="A"]').click();
    assert.equal(await page.locator('.pj-stage-coverage[data-lane="A"]').isVisible(), view === 'plan');
  }
  assert.deepEqual(writes, [], 'selecting views, layers and projectors must not send commands');
  await page.locator('.pj-stage-card[data-lane="A"]').click();
  await page.getByRole('tab', { name: 'Pattern', exact: true }).click();
  await page.locator('[data-pattern="08"]').click();
  await until(() => writes.length === 1);
  assert.equal(writes[0].slot, 'P2'); assert.equal(writes[0].cmd, 'pattern');
  await page.keyboard.press('Escape');
  page.off('request', onRequest);
  await relay.api('projector', { slot: 'P2', lane: '' });
  await until(async () => (await page.locator('.pj-stage-card[data-lane="A"]').getAttribute('aria-disabled')) === 'true');
  await relay.api('projector', { slot: 'P3', lane: '' });
  await relay.api('projector', { slot: 'P3', lane: 'A' });
  await until(async () => (await page.locator('.pj-stage-card[data-lane="A"]').getAttribute('data-slot')) === 'P3');
  await page.locator('.pj-stage-card[data-lane="A"]').click();
  assert.match(await page.locator('#adj-sub').innerText(), /^P3/);
  await page.keyboard.press('Escape');
  await relay.api('projector', { slot: 'P3', lane: '' });
  await relay.api('projector', { slot: 'P3', lane: 'D' });
  await relay.api('projector', { slot: 'P2', lane: 'A' });
  await page.locator('[data-tab="rig"]').click();
};

exports.checkStageLayout = async (page, width, height, theme) => {
  for (const view of ['front', 'plan']) {
    await page.locator(`[data-stage-view="${view}"]`).click();
    const canvas = await page.locator('#stage-canvas').boundingBox();
    assert.ok(canvas.width > 100 && canvas.height > 60, `stage collapsed at ${width}x${height}`);
    const boxes = [];
    for (const marker of await page.locator('.pj-stage-marker').all()) {
      const box = await marker.boundingBox(); boxes.push(box);
      assert.ok(box.width >= 44 && box.height >= 44, 'stage target too small');
      assert.ok(box.x >= canvas.x - 1 && box.x + box.width <= canvas.x + canvas.width + 1, `stage target clipped at ${width} ${theme}`);
    }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      assert.ok(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y, `stage buttons overlap at ${width}x${height}`);
    }
  }
};
