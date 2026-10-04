const prepared = new WeakSet();
module.exports = {
 ready: async page => {
  await page.waitForSelector('[data-av-viewport=ready]');
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  if(prepared.has(page))return;
  if(process.env.WEB2_LIVE){await page.evaluate(()=>{const u=new URL(location.href);u.searchParams.set('taskView','operateView');history.replaceState(null,'',u);dispatchEvent(new PopStateEvent('popstate'));});await page.locator('#goLiveBtn').click();}
  if (!process.env.WEB2_SAMPLE) return;
  prepared.add(page);
  const sample = page.locator('#loadSampleBtn, #sampleBtn');
  const view = await sample.evaluate(node => node.closest('.av-view').id);
  await page.evaluate(view => { const u=new URL(location.href);u.searchParams.set('taskView',view);history.replaceState(null,'',u);dispatchEvent(new PopStateEvent('popstate')); }, view);
  const card=page.locator('#'+view);
  for(let i=0;i<30&&!await sample.isVisible();i++)await card.locator(':scope > .av-pages').getByRole('button',{name:'Next',exact:true}).click();
  page.on('dialog', dialog => dialog.accept());await sample.click();await page.waitForTimeout(100);
 },
 setTheme: async (page, theme) => { if (await page.locator('html').getAttribute('data-av-theme') !== theme) await page.locator('#viewportTheme').click(); },
 views: async page => {
  const ids = await page.locator('.av-view').evaluateAll(nodes => nodes.map(node => node.id));
  const views = [];
  const select = async (p,id) => { await p.evaluate(id => {const u=new URL(location.href);u.searchParams.set('taskView',id);history.replaceState(null,'',u);dispatchEvent(new PopStateEvent('popstate'));},id); await p.waitForFunction(id => !document.getElementById(id).hidden,id); };
  for(const id of ids){await select(page,id);await page.waitForTimeout(50);const count=Number(await page.locator('#'+id).getAttribute('data-pages'))||1;for(let index=0;index<count;index++){views.push({name:`${id} page ${index+1}`,activate:async p=>{await select(p,id);const card=p.locator('#'+id);if(id==='operateView')return;const prev=card.locator(':scope > .av-pages').getByRole('button',{name:'Previous',exact:true});while(await prev.isEnabled())await prev.click();for(let n=0;n<index;n++)await card.locator(':scope > .av-pages').getByRole('button',{name:'Next',exact:true}).click();}});}}
  return views;
 }
};
