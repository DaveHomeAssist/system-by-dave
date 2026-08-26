(function(){
  'use strict';

  var root = document.documentElement;
  if(!root.hasAttribute('data-av-theme')) return;

  var locked = root.getAttribute('data-av-theme-lock');
  var hasLock = locked === 'dark' || locked === 'light';
  var mode = hasLock ? locked : 'dark';
  if(!hasLock){
    try{
      var stored = localStorage.getItem('av-theme-mode.v1');
      if(stored === 'dark' || stored === 'light' || stored === 'system') mode = stored;
    }catch(e){}
  }

  root.setAttribute('data-av-theme', mode);

  var lightColor = document.querySelector('meta[name="theme-color"][data-av-theme-color="light"]');
  var darkColor = document.querySelector('meta[name="theme-color"][data-av-theme-color="dark"]');
  if(!lightColor || !darkColor) return;

  if(mode === 'system'){
    lightColor.setAttribute('media', '(prefers-color-scheme: light)');
    darkColor.setAttribute('media', '(prefers-color-scheme: dark)');
    return;
  }

  lightColor.setAttribute('media', mode === 'light' ? 'all' : 'not all');
  darkColor.setAttribute('media', mode === 'dark' ? 'all' : 'not all');
})();
