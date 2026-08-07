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

  function el(tag, className, text){
    var node = document.createElement(tag);
    if(className) node.className = className;
    if(text != null) node.textContent = text;
    return node;
  }

  function render(){
    if(isHome()) return;
    if(document.querySelector('.sbd-public-nav, .sbd-site-header, .sbd-site-return, .sbd-nav')) return;
    var nav = el('nav', 'sbd-public-nav');
    nav.setAttribute('aria-label', 'Page escape navigation');

    var home = el('a', '', 'Home');
    home.href = '/';
    home.setAttribute('aria-label', 'Return to the System by Dave home page');

    var tools = el('a', '', 'Tools');
    tools.href = '/tools.html';
    tools.setAttribute('aria-label', 'Browse the System by Dave tools directory');

    nav.appendChild(home);
    nav.appendChild(tools);
    document.body.appendChild(nav);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', render);
  }else{
    render();
  }
})();
