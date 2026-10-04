module.exports = {
  ready: page => page.waitForSelector('html[data-calculator-viewport="ready"]'),
  setTheme: async (page, theme) => {
    if (await page.locator('html').getAttribute('data-av-theme') !== theme) await page.locator('#themeToggle').click();
  },
  views: async page => {
    const ids = await page.locator('[role=tabpanel]').evaluateAll(nodes => nodes.map(node => node.id));
    const views = [];
    for (const id of ids) {
      await page.evaluate(id => { location.hash = id; }, id);
      await page.waitForFunction(id => !document.getElementById(id).hidden, id);
      await page.waitForTimeout(50);
      const count = Number(await page.locator(`#${id}`).getAttribute('data-pages'));
      for (let i = 0; i < count; i++) views.push({
        name: `${id} page ${i + 1}`,
        activate: async p => {
          await p.evaluate(id => { location.hash = id; }, id);
          await p.waitForFunction(id => !document.getElementById(id).hidden, id);
          const panel = p.locator(`#${id}`);
          const prev = panel.getByRole('button', { name: 'Previous', exact: true });
          while (await prev.isEnabled()) await prev.click();
          for (let n = 0; n < i; n++) await panel.getByRole('button', { name: 'Next', exact: true }).click();
        }
      });
    }
    return views;
  }
};
