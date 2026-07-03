/* System by Dave — universal tool nav.
   Renders a small fixed nav on every tool page so you can always get back to a
   menu: Home, AV Suite, All Tools, plus prev/next within the tool's department.
   Self-contained, dependency-free. Coexists with js/av-suite-context.js (that
   dock is bottom-left and only appears with ?sbdShow= context; this sits
   bottom-right and always shows). Opt out with <html data-sbd-nav="off">. */
(function(){
  if(document.documentElement.getAttribute('data-sbd-nav') === 'off') return;

  // Tool data comes from js/sbd-registry.js (single source of truth).
  // Pages must include the registry before this script.
  var REG = window.SBD_REGISTRY;
  if(!REG || !REG.navDepartments || !REG.toolById){
    if(window.console && console.warn) console.warn('sbd-nav: SBD_REGISTRY missing — include js/sbd-registry.js before js/sbd-nav.js.');
    return;
  }
  var DEPARTMENTS = REG.navDepartments.map(function(group){
    return {label: group.label, tools: group.toolIds.map(function(id){
      var tool = REG.toolById(id);
      return tool ? {name: tool.name, href: tool.href} : null;
    }).filter(Boolean)};
  });
  var ALIASES = REG.aliases || {};
  // Destinations, not tools — never render the nav on these.
  var SKIP = {'index.html':1, '':1, 'av-suite.html':1, 'tools.html':1, '404.html':1, '500.html':1};

  function currentRoute(){
    var file = (window.location.pathname.split('/').pop() || '').toLowerCase();
    return ALIASES[file] || file;
  }

  function locate(route){
    for(var d = 0; d < DEPARTMENTS.length; d++){
      var tools = DEPARTMENTS[d].tools;
      for(var i = 0; i < tools.length; i++){
        if(tools[i].href === route) return {dept:DEPARTMENTS[d], index:i};
      }
    }
    return null;
  }

  function el(tag, cls, text){
    var node = document.createElement(tag);
    if(cls) node.className = cls;
    if(text != null) node.textContent = text;
    return node;
  }

  function link(cls, href, text, label){
    var a = el('a', cls, text);
    a.href = href;
    if(label) a.setAttribute('aria-label', label);
    return a;
  }

  function render(){
    var route = currentRoute();
    if(SKIP[route]) return;
    if(document.querySelector('nav.sbd-nav')) return;

    var style = el('style');
    style.textContent = [
      '.sbd-nav{position:fixed;right:14px;bottom:14px;z-index:9998;display:flex;align-items:center;gap:5px;padding:6px;border:1px solid rgba(150,162,178,.32);border-radius:12px;background:rgba(13,16,21,.93);box-shadow:0 10px 30px rgba(0,0,0,.42);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);font:600 12px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}',
      '.sbd-nav a{display:inline-flex;align-items:center;gap:5px;min-height:34px;padding:7px 11px;border:1px solid rgba(120,132,148,.4);border-radius:8px;color:#e9eef5;background:rgba(30,37,47,.85);text-decoration:none;white-space:nowrap;transition:background 140ms ease,border-color 140ms ease,transform 140ms ease,color 140ms ease}',
      '.sbd-nav a:hover{border-color:#e08a4f;background:rgba(42,31,22,.96);color:#fff;transform:translateY(-1px)}',
      '.sbd-nav a:active{transform:translateY(1px) scale(.98)}',
      '.sbd-nav a:focus-visible{outline:2px solid #e08a4f;outline-offset:2px}',
      '.sbd-nav a[aria-disabled="true"]{opacity:.35;pointer-events:none}',
      '.sbd-nav .sbd-nav-dept{color:#93a1b3;font:700 10px "SFMono-Regular",Menlo,monospace;text-transform:uppercase;letter-spacing:.08em;padding:0 4px;white-space:nowrap}',
      '.sbd-nav .sbd-nav-sep{width:1px;align-self:stretch;margin:2px 1px;background:rgba(120,132,148,.32)}',
      '.sbd-nav .sbd-nav-step{max-width:150px;overflow:hidden;text-overflow:ellipsis}',
      '@media (max-width:680px){body.has-sbd-nav{padding-bottom:calc(118px + env(safe-area-inset-bottom))}.sbd-nav{left:10px;right:10px;bottom:max(10px,env(safe-area-inset-bottom));flex-wrap:wrap;justify-content:center;align-items:stretch;max-height:28vh;overflow:auto}.sbd-nav a{min-height:38px;padding:7px 9px;justify-content:center}.sbd-nav .sbd-nav-sep{display:none}.sbd-nav .sbd-nav-dept{flex:1 0 100%;text-align:center;padding-top:2px}.sbd-nav .sbd-nav-step{flex:1 1 40%;max-width:46vw;min-width:0}}',
      '@media print{.sbd-nav{display:none!important}}'
    ].join('');

    var nav = el('nav', 'sbd-nav');
    nav.setAttribute('data-sbd-nav', 'true');
    nav.setAttribute('aria-label', 'Tool navigation');

    nav.appendChild(link('', 'index.html', '⌂ Home', 'Back to the System by Dave home page'));
    nav.appendChild(link('', 'av-suite.html', '▦ AV Suite', 'Open the AV Suite hub'));
    nav.appendChild(link('', 'tools.html', '≡ All Tools', 'Browse all tools'));

    var here = locate(route);
    if(here && here.dept.tools.length > 1){
      nav.appendChild(el('span', 'sbd-nav-sep'));
      nav.appendChild(el('span', 'sbd-nav-dept', here.dept.label));
      var n = here.dept.tools.length;
      var prev = here.dept.tools[(here.index - 1 + n) % n];
      var next = here.dept.tools[(here.index + 1) % n];
      nav.appendChild(link('sbd-nav-step', prev.href, '‹ ' + prev.name, 'Previous in ' + here.dept.label + ': ' + prev.name));
      nav.appendChild(link('sbd-nav-step', next.href, next.name + ' ›', 'Next in ' + here.dept.label + ': ' + next.name));
    }

    document.head.appendChild(style);
    document.body.appendChild(nav);
    document.body.classList.add('has-sbd-nav');
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', render);
  }else{
    render();
  }
})();
