// Follow the public topic/submenu interaction rather than bypassing hidden controls.
export async function closeTopics(page) {
  for (const dialog of await page.locator('dialog.topic-menu[open]').all()) await dialog.getByRole('button', { name: /^Close / }).click();
}
export async function suiteTopic(page, topic) {
  await closeTopics(page);
  await page.locator('.suite-header').getByRole('button', { name: /^Menu/ }).click();
  await page.locator('dialog.topic-menu[open]').getByRole('button', { name: new RegExp(`^${topic}`) }).click();
}
export async function workspaceTopic(page, topic) {
  await closeTopics(page);
  await page.locator('.console-strip > button[aria-haspopup="dialog"]').click();
  await page.locator('dialog.topic-menu[open]').getByRole('button', { name: new RegExp(`^${topic}`) }).click();
}
export async function viewNames(page) {
  await workspaceTopic(page, 'Views');
  const names = await page.getByRole('tab').allTextContents();
  await closeTopics(page);
  return names;
}
export async function selectView(page, name) {
  await workspaceTopic(page, 'Views');
  await page.getByRole('tab', { name, exact: typeof name === 'string' }).click();
}
export async function recallPanel(page, name) {
  await closeTopics(page);
  await page.waitForFunction(() => document.querySelector('.console-shell')?.classList.contains(innerWidth < 720 ? 'mode-phone' : innerWidth < 1100 ? 'mode-tablet' : 'mode-desktop'));
  if (await page.locator('.console-shell.mode-phone').count()) {
    await page.locator('.console-shell > .console-quick').getByRole('button', { name, exact: true }).click();
  } else {
    await workspaceTopic(page, 'Panels');
    await page.locator('dialog.topic-menu[open] .console-quick').getByRole('button', { name, exact: true }).click();
  }
}
export async function savePack(page) {
  await suiteTopic(page, 'Project');
  await page.locator('.suite-actions button.primary').click();
  await closeTopics(page);
}
