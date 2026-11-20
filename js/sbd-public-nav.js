(function(){
  'use strict';

  /* Hosted as a panel inside the AV Suite shell: the host owns navigation. */
  try{
    if(window.parent!==window&&new URLSearchParams(window.location.search).get('sbdEmbed')==='panel') document.documentElement.setAttribute('data-sbd-embed','panel');
  }catch(e){}
  if(document.documentElement.getAttribute('data-sbd-embed')==='panel') return;
  if(document.documentElement.getAttribute('data-sbd-public-nav') === 'off') return;

  function pathName(){
    return window.location.pathname.replace(/\/+$/, '/') || '/';
  }

  function isHome(){
    var path = pathName();
    return path === '/' || path === '/index.html';
  }

  // AV by Dave and FMP pages are also served from avbydave.com and
  // housevideo.app, where Home and Tools must still reach systembydave.com.
  function siteUrl(path){
    var host = window.location.hostname;
    var local = host === 'localhost' || host === '127.0.0.1' || host === '';
    return local || /(^|\.)systembydave\.com$/.test(host) ? path : 'https://systembydave.com' + path;
  }

  function el(tag, className, text){
    var node = document.createElement(tag);
    if(className) node.className = className;
    if(text != null) node.textContent = text;
    return node;
  }

  // Global header: below 480px the five links fold behind a Menu button. Without
  // JavaScript the button stays hidden and the links stay visible.
  function enhanceHeaderMenu(){
    var header = document.querySelector('.sbd-site-header');
    var button = header && header.querySelector('.sbd-site-menu');
    var links = header && header.querySelector('#sbd-site-links');
    if(!button || !links) return;
    function setOpen(open){
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      if(open) header.setAttribute('data-menu-open', ''); else header.removeAttribute('data-menu-open');
    }
    button.hidden = false;
    header.setAttribute('data-menu', 'ready');
    button.addEventListener('click', function(){ setOpen(button.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function(event){
      if(event.key === 'Escape' && header.hasAttribute('data-menu-open')){ setOpen(false); button.focus(); }
    });
    document.addEventListener('click', function(event){
      if(header.hasAttribute('data-menu-open') && !header.contains(event.target)) setOpen(false);
    });
  }

  function render(){
    enhanceHeaderMenu();
    if(isHome()) return;
    if(document.querySelector('.sbd-public-nav, .sbd-site-header, .sbd-site-return, .sbd-nav')) return;
    var nav = el('nav', 'sbd-public-nav');
    nav.setAttribute('aria-label', 'Page escape navigation');

    var home = el('a', '', 'Home');
    home.href = siteUrl('/');
    home.setAttribute('aria-label', 'Return to the System by Dave home page');

    var tools = el('a', '', 'Tools');
    tools.href = siteUrl('/tools.html');
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
