/* View state only: existing form nodes and product calculation state remain authoritative. */
(function(global){
  'use strict';
  const root=document.documentElement;
  const pagers=new Set();
  let frame=0;
  function refresh(){
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(()=>pagers.forEach(pager=>pager.refresh()));
  }
  function viewport(){
    const visual=global.visualViewport;
    // Pinch zoom must continue to magnify the page, not reflow it under the finger.
    const height=visual&&visual.scale===1?visual.height:global.innerHeight;
    root.style.setProperty('--av-available-height',`${height}px`);
    const pane=parseFloat(getComputedStyle(root).getPropertyValue('--av-pane-min'))||320;
    root.dataset.workspaceShape=global.innerWidth>=pane*2?'wide':'stack';
    root.dataset.workspaceShort=String(height<pane*2);
    refresh();
  }
  function paginate(panel,{label='Controls'}={}){
    if(panel.avPager)return panel.avPager;
    const win=document.createElement('div');win.className='av-page-window';
    const content=document.createElement('div');content.className='av-page-content';
    while(panel.firstChild)content.append(panel.firstChild);
    win.append(content);
    const nav=document.createElement('nav');nav.className='av-page-nav';nav.setAttribute('aria-label',`${label} pages`);
    const back=document.createElement('button');back.type='button';back.textContent='Previous';back.setAttribute('aria-label',`Previous ${label.toLowerCase()} page`);
    const next=document.createElement('button');next.type='button';next.textContent='Next';next.setAttribute('aria-label',`Next ${label.toLowerCase()} page`);
    const count=document.createElement('output');count.setAttribute('aria-live','polite');
    nav.append(back,count,next);panel.append(win,nav);panel.classList.add('av-paged');
    let page=0,total=1,width=0,gap=16;
    function show(value){
      page=Math.max(0,Math.min(total-1,value));
      content.style.setProperty('--av-page-offset',`${-page*(width+gap)}px`);
      count.textContent=`${label} · ${page+1} / ${total}`;
      back.disabled=page===0;next.disabled=page===total-1;
      panel.dataset.page=String(page+1);panel.dataset.pages=String(total);
    }
    const api={
      refresh(){
        if(!panel.checkVisibility()||win.clientWidth===0||win.clientHeight===0)return;
        width=win.getBoundingClientRect().width;gap=parseFloat(getComputedStyle(root).getPropertyValue('--av-page-gap'))||16;
        content.style.setProperty('--av-page-width',`${width}px`);
        total=Math.max(1,Math.ceil((content.scrollWidth+gap)/(width+gap)));
        const active=document.activeElement;
        if(content.contains(active))api.reveal(active);else show(page);
      },
      reveal(element){
        const x=element.getBoundingClientRect().left-content.getBoundingClientRect().left;
        show(Math.floor((x+1)/(width+gap)));
      }
    };
    back.addEventListener('click',()=>show(page-1));next.addEventListener('click',()=>show(page+1));
    content.addEventListener('focusin',event=>api.reveal(event.target));
    content.addEventListener('toggle',refresh,true);
    new ResizeObserver(refresh).observe(win);
    new MutationObserver(refresh).observe(content,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','open']});
    panel.avPager=api;pagers.add(api);refresh();return api;
  }
  global.AVWorkspace={paginate,refresh};
  if(root.hasAttribute('data-av-workspace')){
    viewport();global.addEventListener('resize',viewport);global.visualViewport?.addEventListener('resize',viewport);
  }
})(window);
