async function settle(page){await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});}
async function pageContaining(page,root,selector){await settle(page);const card=page.locator(root),previous=card.getByRole('button',{name:'Previous',exact:true});while(await previous.isEnabled()){await previous.click();await settle(page);}for(let n=0;n<50&&!await page.locator(selector).isVisible();n++)await card.getByRole('button',{name:'Next',exact:true}).click();}
module.exports={
 ready:async page=>{await page.waitForSelector('[data-av-viewport=ready]');await settle(page);},
 setTheme:async(page,theme)=>{if(await page.locator('html').getAttribute('data-av-theme')!==theme)await page.locator('#viewportTheme').click();},
 views:async page=>{
  if(process.env.BOARD_POPULATED){
   for(const [id,value] of [['s_name','Viewport operation fixture'],['s_venue','Test venue'],['s_rooms','Main | Floor 1\nBreakout | Floor 2']]){await pageContaining(page,'#setup','#'+id);await page.locator('#'+id).fill(value);}
   await pageContaining(page,'#setup','#s_create');await page.locator('#s_create').click();await page.waitForFunction(()=>!document.body.classList.contains('setup'));
   const fixture=await page.evaluate(()=>{const index=JSON.parse(localStorage.getItem('sbd.showboard.index'));const show=JSON.parse(localStorage.getItem('sbd.showboard.show.'+index.active));show.days[0].rooms[0].sessions=[{s:'09:00',e:'10:00',id:'101',dead:false},{s:'10:15',e:'11:30',id:'102',dead:false}];show.days[0].rooms[1].sessions=[{s:'09:30',e:'10:00',id:'201',dead:false}];return show;});
   await page.locator('#s_file').setInputFiles({name:'sessions.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});await page.waitForFunction(()=>document.querySelectorAll('.blk').length===3);
  }
  const ids=process.env.BOARD_POPULATED?await page.locator('#app>.av-board-view').evaluateAll(n=>n.map(v=>v.id)):['setup'];const views=[];
  const activate=async(p,id)=>{if(id==='setup')return;await p.evaluate(id=>{const u=new URL(location.href);u.searchParams.set('taskView',id);history.replaceState(null,'',u);dispatchEvent(new PopStateEvent('popstate'));},id);};
  for(const id of ids){await activate(page,id);await page.waitForTimeout(40);const count=Number(await page.locator('#'+id).getAttribute('data-pages'));for(let i=0;i<count;i++)views.push({name:`${id} page ${i+1}`,activate:async p=>{await activate(p,id);const card=p.locator('#'+id),prev=card.getByRole('button',{name:'Previous',exact:true});while(await prev.isEnabled())await prev.click();for(let j=0;j<i;j++)await card.getByRole('button',{name:'Next',exact:true}).click();}});}
  if(process.env.BOARD_DIALOGS){
   async function open(p,button){
    await p.keyboard.press('Escape');await activate(p,'controlsView');await pageContaining(p,'#controlsView','#'+button);await p.locator('#'+button).click();await p.waitForSelector('#sheet.open .av-items');await p.waitForTimeout(30);
   }
   for(const button of ['settingsbtn','showsbtn','backupsbtn','pastebtn']){
    await open(page,button);const count=Number(await page.locator('#sheet').getAttribute('data-pages'));
    for(let i=0;i<count;i++)views.push({name:`${button} dialog page ${i+1}`,activate:async p=>{await open(p,button);const card=p.locator('#sheet');for(let n=0;n<i;n++)await card.getByRole('button',{name:'Next',exact:true}).click();}});
   }
   await page.keyboard.press('Escape');
  }
  return views;
 }
};
