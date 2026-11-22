(() => {
  const start=()=>{
    const card=document.querySelector('[data-opening-at]');
    if(!card)return;
    const target=Date.parse(card.dataset.openingAt);
    if(!Number.isFinite(target))return;
    let timer;
    const render=()=>{
      const total=Math.max(0,Math.ceil((target-Date.now())/1000));
      const values={days:Math.floor(total/86400),hours:Math.floor(total/3600)%24,minutes:Math.floor(total/60)%60,seconds:total%60};
      for(const [key,value] of Object.entries(values))card.querySelector(`[data-count="${key}"]`).textContent=String(value).padStart(2,'0');
      card.toggleAttribute('data-opened',total===0);
      card.querySelector('.opening-state').hidden=total!==0;
      if(total===0){clearInterval(timer);timer=null;}
    };
    const sync=()=>{clearInterval(timer);timer=null;if(!document.hidden&&!card.closest('[hidden]')){render();if(Date.now()<target)timer=setInterval(render,1000);}};
    render();sync();
    const observer=new MutationObserver(sync);
    const panel=card.closest('#home-panel');
    if(panel)observer.observe(panel,{attributes:true,attributeFilter:['hidden']});
    document.addEventListener('visibilitychange',sync);
    addEventListener('pageshow',()=>{if(panel)observer.observe(panel,{attributes:true,attributeFilter:['hidden']});sync();});
    addEventListener('pagehide',()=>{clearInterval(timer);observer.disconnect();},{once:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
