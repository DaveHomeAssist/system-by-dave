async function openDisclosure(page, selector) {
  const details = page.locator(selector);
  if (!await details.evaluate(node => node.open)) await details.locator(':scope > summary').click();
}
async function selectSlot(page, slot, panel = 'controls') {
  if (await page.locator('#tab-btn-rig').getAttribute('aria-selected') !== 'true') await page.locator('#tab-btn-rig').click();
  if (await page.locator('.pj-rig-all').evaluate(node => node.open)) await page.locator('.pj-rig-all > summary').click();
  await page.locator(`#grid > .pj-summary-tile[data-slot="${slot}"] [data-open-projector]`).click();
  if (panel === 'controls') await openDisclosure(page, '#projector-more-controls');
  if (panel === 'info') await openDisclosure(page, '#projector-info-panel');
  return page.locator(`#projector-controls [data-slot="${slot}"]`);
}
async function openLegacy(page, slot, panel) {
  const controls = await selectSlot(page, slot);
  await controls.locator(`[data-adj="${panel}"]`).click();
}
async function openBulk(page) {
  if (await page.locator('#tab-btn-rig').getAttribute('aria-selected') !== 'true') await page.locator('#tab-btn-rig').click();
  await openDisclosure(page, '.pj-rig-all');
}
module.exports = { openDisclosure, selectSlot, openLegacy, openBulk };
