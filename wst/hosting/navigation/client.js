(() => {
  const embedded = parent !== window && new URLSearchParams(location.search).has('embed');
  if (embedded) document.documentElement.classList.add('wst-embedded');
  const start = () => {
    const header = document.querySelector('[data-wst-header]');
    if (!header) return;
    const root = header.hasAttribute('data-workspace-root');
    const shortcut=header.querySelector('kbd');
    if(shortcut)shortcut.textContent=/Mac|iPhone|iPad/.test(navigator.platform)?'⌘K':'Ctrl K';
    const links = [...header.querySelectorAll('[data-nav-key]')];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let transition;
    function active(route) {
      const key = route || (root ? location.hash.slice(1).split('/')[0] || 'home' : header.dataset.current);
      for (const link of links) {
        if (link.dataset.navKey === key) link.setAttribute('aria-current','page');
        else link.removeAttribute('aria-current');
      }
      const selected = links.find(link=>link.dataset.navKey===key);
      if (selected) header.querySelector('[data-nav-location]').textContent=selected.textContent;
    }
    active();
    addEventListener('hashchange',()=>{if(root)active();});
    addEventListener('frozen:navigate',event=>{
      active(event.detail.route);
      transition?.kill();
      const panel=document.getElementById(event.detail.panelId);
      if(panel && event.detail.route!=='home' && !reduced.matches && window.gsap) {
        transition=gsap.fromTo(panel,{y:9,opacity:.55},{y:0,opacity:1,duration:.32,ease:'power2.out',clearProps:'transform,opacity',overwrite:'auto'});
      }
    });
    reduced.addEventListener('change',()=>{transition?.progress(1).kill();});
    if (!root) {
      const clock=header.querySelector('#clock');
      const paintClock=()=>{clock.textContent=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date());};
      paintClock();
      let timer=setInterval(paintClock,30000);
      const dialog=document.createElement('dialog');
      dialog.className='wst-page-finder';
      dialog.innerHTML='<label for="wst-find-query">Find a workspace page</label><input id="wst-find-query" type="search" autocomplete="off" placeholder="Calendar, rig, notes…"><div class="wst-finder-results"></div><button type="button" class="wst-finder-close">Close</button>';
      document.body.append(dialog);
      const query=dialog.querySelector('input'), results=dialog.querySelector('.wst-finder-results');
      const render=()=>{
        results.replaceChildren();
        for(const source of links) if(source.textContent.toLowerCase().includes(query.value.toLowerCase().trim())) {
          const link=source.cloneNode(true);link.removeAttribute('aria-current');results.append(link);
        }
        if(!results.children.length) results.textContent='No matching pages.';
      };
      const open=()=>{query.value='';render();if(!dialog.open)dialog.showModal();query.focus();};
      header.querySelector('#find-page').addEventListener('click',open);
      query.addEventListener('input',render);
      dialog.querySelector('button').onclick=()=>dialog.close();
      dialog.addEventListener('close',()=>header.querySelector('#find-page').focus());
      dialog.addEventListener('keydown',event=>{
        const items=[...results.querySelectorAll('a')], index=items.indexOf(document.activeElement);
        if(event.key==='Enter' && document.activeElement===query && items.length){event.preventDefault();items[0].click();}
        if(['ArrowDown','ArrowUp'].includes(event.key) && items.length){event.preventDefault();items[index<0?(event.key==='ArrowDown'?0:items.length-1):(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length].focus();}
      });
      document.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&!event.altKey&&!event.shiftKey&&event.key.toLowerCase()==='k'){event.preventDefault();open();}});
      addEventListener('pagehide',()=>{clearInterval(timer);timer=null;});
      addEventListener('pageshow',()=>{paintClock();clearInterval(timer);timer=setInterval(paintClock,30000);});
    }
    addEventListener('pagehide',()=>transition?.kill(),{once:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
