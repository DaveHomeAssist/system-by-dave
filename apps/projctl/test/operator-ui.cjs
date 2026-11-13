async function openDisclosure(page, selector) {
  const details = page.locator(selector);
  if (!await details.evaluate(node => node.open)) await details.locator(':scope > summary').click();
}
async function selectView(page, name) {
  if (await page.locator('#adjust[open]').count()) await page.locator('#adj-close').click();
  if (await page.locator('#tab-projector[open]').count()) await page.locator('#projector-back').click();
  const tab = page.locator(`[data-tab="${name}"]`);
  if (!await tab.isVisible()) await page.locator('#workspace-menu').click();
  await tab.click();
}
async function selectLane(page, lane) {
  await selectView(page, 'rig');
  const card = page.locator(`#grid > [data-lane="${lane}"]`);
  if (!await card.isVisible()) await page.locator(`[data-operator-lane="${lane}"]`).click();
  await card.locator('[data-open-projector]').click();
}
async function selectSlot(page, slot, panel = 'controls') {
  await selectView(page, 'rig');
  if (await page.locator('.pj-rig-all').evaluate(node => node.open)) await page.locator('.pj-rig-all > summary').click();
  const card = page.locator(`#grid > .pj-summary-tile[data-slot="${slot}"]`);
  await selectLane(page, await card.getAttribute('data-lane'));
  if (panel === 'controls') await openDisclosure(page, '#projector-more-controls');
  if (panel === 'info') await openDisclosure(page, '#projector-info-panel');
  return page.locator(`#projector-controls [data-slot="${slot}"]`);
}
async function openLegacy(page, slot, panel) {
  const controls = await selectSlot(page, slot);
  await controls.locator(`[data-adj="${panel}"]`).click();
}
async function openBulk(page) {
  await selectView(page, 'rig');
  await openDisclosure(page, '.pj-rig-all');
}
module.exports = { openDisclosure, selectView, selectLane, selectSlot, openLegacy, openBulk };
