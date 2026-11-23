export const destinations = Object.freeze([
  {id:'home', label:'Home', href:'/#home'},
  {id:'handoff', label:'Handoff', href:'/#handoff'},
  {id:'schedule', label:'Calendar', href:'/#schedule'},
  {id:'review', label:'Run review', href:'/run-review/'},
  {id:'rig', label:'Rig', href:'/#rig'},
  {id:'stage', label:'Stage view', href:'/#stage'},
  {id:'pixels', label:'Pixels', href:'/#pixels'},
  {id:'notes', label:'Notes', href:'/#notes'},
  {id:'updates', label:'Updates', href:'/#updates'},
  {id:'documents', label:'Documents', href:'/#documents'},
  {id:'scenic', label:'Scenic', href:'/scenic/'},
  {id:'throw', label:'Throw calculator', href:'/#throw'}
]);

export const opening = Object.freeze({
  at:'2026-11-25T19:00:00-05:00',
  label:'Wednesday, November 25 · 7:00 p.m. Eastern',
  source:'https://www.walnutstreettheatre.org/season/mainstage.2026.schedule.php'
});

export function countdown(now = Date.now()) {
  const remaining = Math.max(0, Math.ceil((Date.parse(opening.at) - now) / 1000));
  return {remaining, days:Math.floor(remaining/86400), hours:Math.floor(remaining/3600)%24,
    minutes:Math.floor(remaining/60)%60, seconds:remaining%60};
}

export function header({root=false, current='home'} = {}) {
  const links = destinations.map(item => `<a href="${item.href}" data-nav-key="${item.id}"${root && item.href.startsWith('/#') ? ` data-route="${item.id}"` : ''}${item.id===current ? ' aria-current="page"' : ''}>${item.label}</a>`).join('');
  return `<header class="wst-header" data-wst-header${root?' data-workspace-root':''}>
<div class="wst-header-top"><a class="wst-brand" href="/#home" aria-label="Frozen workspace home">Frozen<span aria-hidden="true">✳</span></a><span class="wst-location" data-nav-location>${destinations.find(item=>item.id===current)?.label || 'Workspace'}</span><div class="wst-header-tools"><time id="clock" aria-label="Current Eastern time"></time><button id="find-page" class="wst-tool" type="button" aria-label="Find a workspace page" aria-haspopup="dialog" aria-keyshortcuts="Meta+K Control+K"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><span>Find</span><kbd>⌘K</kbd></button><button id="theme" class="wst-tool wst-appearance" type="button" aria-label="Appearance"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg></button></div></div>
<nav class="wst-nav" aria-label="Workspace">${links}</nav>
${root?'<div class="wst-system"><span id="workspace-host">Website workspace</span><div id="booth-status" aria-label="Show status"><span id="show-lock">PROJCTL: UNKNOWN</span><span aria-hidden="true"> · </span><span id="poll-age">TELEMETRY: UNKNOWN</span></div><details id="nav-more" class="wst-operator-nav" data-controller-only hidden><summary>Controller tools</summary><div><button type="button" data-route="rig" data-open-controls>Live controls</button><button type="button" data-route="presets">Presets</button><button type="button" data-route="log">Log</button><button type="button" data-route="configuration">Configuration</button></div></details></div>':''}
</header>`;
}

export function openingCard() {
  return `<a class="home-choice opening-card" href="/#schedule" data-route="schedule" data-opening-at="${opening.at}" aria-label="Opening night, November 25 at 7 p.m. Eastern. Open calendar">
<span class="opening-eyebrow"><span class="opening-spark" aria-hidden="true">✳</span> The curtain rises</span><strong>Opening night</strong>
<span class="opening-digits" role="timer" aria-live="off" aria-label="Time until opening night"><span><b data-count="days">··</b><small>days</small></span><i aria-hidden="true">:</i><span><b data-count="hours">··</b><small>hours</small></span><i aria-hidden="true">:</i><span><b data-count="minutes">··</b><small>mins</small></span><i aria-hidden="true">:</i><span><b data-count="seconds">··</b><small>secs</small></span></span>
<time datetime="${opening.at}" class="opening-date">Nov 25 · 7:00 p.m. Eastern</time><span class="opening-state" hidden>Opening night is here. Let the magic begin.</span>
</a>`;
}

export function adaptWorkspaceScript(source) {
  if (source.includes('/* Canonical workspace navigation */')) return source;
  const required = ["const moreWasOpen=document.querySelector('#nav-more').open;document.querySelector('#nav-more').open=false;", "for(const button of document.querySelectorAll('[data-route]'))button.onclick=()=>navigate(button.dataset.route,{controls:button.hasAttribute('data-open-controls')});"];
  for (const seam of required) if (!source.includes(seam)) throw new Error('Workspace navigation source changed: '+seam.slice(0,75));
  source=source.replace(required[0], "const moreWasOpen=document.querySelector('#nav-more')?.open||false;if(document.querySelector('#nav-more'))document.querySelector('#nav-more').open=false;");
  source=source.replace(required[1], "for(const button of document.querySelectorAll('[data-route]'))button.onclick=event=>{if(button.tagName==='A')event.preventDefault();navigate(button.dataset.route,{controls:button.hasAttribute('data-open-controls')});};");
  source=source.replace("workspaceMenu.addEventListener('click'", "workspaceMenu?.addEventListener('click'");
  source=source.replace("if(!moreMenu.contains(event.target))moreMenu.open=false;", "if(moreMenu&&!moreMenu.contains(event.target))moreMenu.open=false;");
  source=source.replace("if(moreMenu.open){", "if(moreMenu?.open){");
  source=source.replace("if(route==='throw'){", "window.dispatchEvent(new CustomEvent('frozen:navigate',{detail:{route,panelId:spec.panel.id}}));\n if(route==='throw'){");
  source=source.replace("a[href*=\"/run-review/\"], .document-card", ".wst-nav a:not([data-route]), a[href*=\"/run-review/\"], .document-card");
  source=source.replace(/document\.querySelector\('#find-page'\)\.textContent[^\n]*\n/,'');
  return '/* Canonical workspace navigation */\n'+source;
}
