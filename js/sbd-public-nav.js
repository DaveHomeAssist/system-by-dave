(function(){
  'use strict';

  if(document.documentElement.getAttribute('data-sbd-public-nav') === 'off') return;

  function pathName(){
    return window.location.pathname.replace(/\/+$/, '/') || '/';
  }

  function isHome(){
    var path = pathName();
    return path === '/' || path === '/index.html';
  }

  function sameOriginReferrer(){
    try{
      return document.referrer && new URL(document.referrer).origin === window.location.origin;
    }catch(e){
      return false;
    }
  }

  function goBack(){
    if(sameOriginReferrer() && window.history.length > 1){
      window.history.back();
      return;
    }
    window.location.href = '/';
  }

  function el(tag, className, text){
    var node = document.createElement(tag);
    if(className) node.className = className;
    if(text != null) node.textContent = text;
    return node;
  }

  function render(){
    if(isHome()) return;
    if(document.querySelector('.sbd-public-nav')) return;
    var nav = el('nav', 'sbd-public-nav');
    nav.setAttribute('aria-label', 'Page escape navigation');
    if(document.querySelector('.sbd-suite-dock, .sbd-nav')) nav.setAttribute('data-shift', 'up');

    var back = el('button', '', 'Back');
    back.type = 'button';
    back.setAttribute('aria-label', 'Go back to the previous page, or home if no previous page is available');
    back.addEventListener('click', goBack);

    var home = el('a', '', 'Home');
    home.href = '/';
    home.setAttribute('aria-label', 'Return to the System by Dave home page');

    nav.appendChild(back);
    nav.appendChild(home);
    document.body.appendChild(nav);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', render);
  }else{
    render();
  }
})();
