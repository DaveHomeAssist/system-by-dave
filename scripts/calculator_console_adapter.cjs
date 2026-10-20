const names = { audioCard: 'Audio Delay', projectionCard: 'Projection', storageCard: 'Record Storage', powerCard: 'Power Load', voltageDropCard: 'Voltage Drop', splCard: 'SPL Distance', summaryCard: 'Operator Summary', showContextCard: 'Show context' };
async function activate(page, id) {
  await page.locator('.console-shell').waitFor();
  await page.locator('.console-quick').getByRole('button', { name: names[id], exact: true }).click();
  await page.locator(`.console-panel[data-panel="${id}"]`).waitFor();
}
async function reveal(page, selector) {
  const control = page.locator(selector);
  const id = await control.evaluate(el => el.closest('.calculator-content')?.id);
  if (!id) return control;
  await activate(page, id);
  const area = page.locator(`#${id}`), prev = area.getByRole('button', { name: 'Previous', exact: true }), next = area.getByRole('button', { name: 'Next', exact: true });
  for (let i = 0; i < 40 && await prev.isEnabled(); i++) await prev.click();
  for (let i = 0; i < 40 && !await control.isVisible() && await next.isEnabled(); i++) await next.click();
  await control.waitFor({ state: 'visible' }); return control;
}
async function fieldSets(page) {
  const compact = page.getByRole('button', { name: 'Calculator controls', exact: true });
  if (await compact.isVisible()) await compact.click();
  await page.locator('.calculator-header').getByRole('button', { name: 'Field sets', exact: true }).click();
}
module.exports = { names, activate, reveal, fieldSets };
