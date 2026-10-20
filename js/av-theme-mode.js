(function(){
  'use strict';

  var root = document.documentElement;
  if(!root.hasAttribute('data-av-theme')) return;

  var locked = root.getAttribute('data-av-theme-lock');
  var hasLock = locked === 'dark' || locked === 'light';
  /* Stage Slate (dark) is the first-use default (docs/av-console.md, 2026-10-05). */
  var mode = hasLock ? locked : 'dark';
  if(!hasLock){
    try{
      var stored = localStorage.getItem('av-theme-mode.v1');
      if(stored === 'dark' || stored === 'light' || stored === 'white' || stored === 'black' || stored === 'system') mode = stored;
    }catch(e){}
  }

  root.setAttribute('data-av-theme', mode);

  var colors = Array.prototype.slice.call(document.querySelectorAll('meta[name="theme-color"][data-av-theme-color]'));
  var lightColor = colors.find(function(meta){return meta.getAttribute('data-av-theme-color') === 'light';});
  var darkColor = colors.find(function(meta){return meta.getAttribute('data-av-theme-color') === 'dark';});
  if(!lightColor || !darkColor) return;

  if(mode === 'system'){
    lightColor.setAttribute('media', '(prefers-color-scheme: light)');
    darkColor.setAttribute('media', '(prefers-color-scheme: dark)');
    colors.forEach(function(meta){if(meta !== lightColor && meta !== darkColor) meta.setAttribute('media', 'not all');});
    return;
  }

  colors.forEach(function(meta){meta.setAttribute('media', meta.getAttribute('data-av-theme-color') === mode ? 'all' : 'not all');});
})();
