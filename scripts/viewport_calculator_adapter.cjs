const { names, activate } = require('./calculator_console_adapter.cjs');
module.exports = {
  ready: page => page.locator('.console-shell').waitFor(),
  setTheme: async (page, theme) => {
    const compact = page.getByRole('button', {name:'Calculator controls',exact:true});
    if (await compact.isVisible()) await compact.click();
    if (await page.locator('html').getAttribute('data-av-theme') !== theme) await page.locator('#themeToggle').click();
    const back = page.getByRole('button',{name:'Back to panels',exact:true}); if(await back.isVisible())await back.click();
  },
  views: async page => {
    const views=[];
    for(const [id,name]of Object.entries(names)) {
      if(!await page.locator('.console-quick').getByRole('button',{name,exact:true}).count())continue;
      await activate(page,id); await page.waitForTimeout(50);
      const count=Number(await page.locator('#'+id).getAttribute('data-pages'));
      for(let i=0;i<count;i++)views.push({name:`${id} page ${i+1}`,activate:async p=>{
        await activate(p,id);const area=p.locator('#'+id),prev=area.getByRole('button',{name:'Previous',exact:true});
        for(let n=0;n<40&&await prev.isEnabled();n++)await prev.click();
        for(let n=0;n<i;n++)await area.getByRole('button',{name:'Next',exact:true}).click();
      }});
    }
    return views;
  }
};
