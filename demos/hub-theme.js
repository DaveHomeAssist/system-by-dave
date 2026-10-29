'use strict';
(() => {
  const button=document.getElementById('demoTheme');
  const apply=theme=>{document.documentElement.dataset.theme=theme;button.textContent=theme==='light'?'Dark':'Light';button.setAttribute('aria-label','Switch to '+(theme==='light'?'dark':'light')+' theme');try{localStorage.setItem('videoEngineeringTheme',theme);}catch{}};
  let theme='light';try{if(localStorage.getItem('videoEngineeringTheme')==='dark')theme='dark';}catch{}
  apply(theme);button.hidden=false;button.onclick=()=>apply(document.documentElement.dataset.theme==='light'?'dark':'light');
  const panels=[...document.querySelectorAll('[data-public-panel]')];
  const syncFocus=()=>panels.forEach(panel=>panel.tabIndex=panel.hasAttribute('hidden')?-1:0);
  new MutationObserver(syncFocus).observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden']});syncFocus();
})();
