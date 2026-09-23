(function(){
  'use strict';
  var root=document.documentElement;
  var themeButton=document.getElementById('themeToggle');
  var resumeLink=document.getElementById('resumeLink');
  var resumeText=document.getElementById('resumeText');
  var offlineStatus=document.getElementById('offlineStatus');
  var mode='light';
  try{if(localStorage.getItem('av-theme-mode.v1')==='dark') mode='dark';}catch(e){}
  function paintTheme(){
    root.setAttribute('data-av-theme',mode);
    document.querySelector('[data-av-theme-color="light"]').setAttribute('media',mode==='light'?'all':'not all');
    document.querySelector('[data-av-theme-color="dark"]').setAttribute('media',mode==='dark'?'all':'not all');
    themeButton.setAttribute('aria-pressed',String(mode==='dark'));
    themeButton.setAttribute('aria-label',mode==='dark'?'Use light mode':'Use dark mode');
    themeButton.textContent=mode==='dark'?'Light mode':'Dark mode';
  }
  paintTheme();
  themeButton.addEventListener('click',function(){
    mode=mode==='dark'?'light':'dark';
    try{localStorage.setItem('av-theme-mode.v1',mode);}catch(e){}
    paintTheme();
  });

  try{
    var saved=JSON.parse(localStorage.getItem('av-suite-dashboard.v1')||'null');
    var name=saved&&typeof saved.showName==='string'?saved.showName.trim():'';
    if(name&&name!=='AV by Dave'){
      var phaseLabels={advance:'Advance',prep:'Prep',loadin:'Load In',show:'Show',strike:'Strike',closeout:'Closeout'};
      var phase=phaseLabels[saved.phase]||'';
      resumeText.textContent='Resume: '+name+(phase?' · '+phase:'');
      resumeLink.hidden=false;
    }
  }catch(e){}

  if(!window.isSecureContext||!('serviceWorker' in navigator)||!('caches' in window)){
    offlineStatus.textContent='Offline access unavailable in this browser.';
    return;
  }
  navigator.serviceWorker.register('av-suite-worker.js',{scope:'./'}).then(function(){
    return navigator.serviceWorker.ready;
  }).then(function(){
    return caches.match(new URL('av-suite-landing.html',location.href).href);
  }).then(function(cached){
    offlineStatus.textContent=cached?'Landing saved for offline use.':'Offline access is preparing.';
  }).catch(function(){
    offlineStatus.textContent='Offline access unavailable. Reconnect and reload.';
  });
})();
