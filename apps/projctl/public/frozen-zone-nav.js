/* Shared Frozen zone menu. The workspace shell already has this menu in the page.
   Other top-level Frozen pages mount the same labels from here. Embedded frames do not. */
(function () {
  var ZONES = [
    { id: 'home', label: 'Home', group: 'utility' },
    { id: 'handoff', label: 'Handoff', group: 'utility' },
    { id: 'planning', label: 'Planning', group: 'utility' },
    { id: 'rig', label: 'My Projector Rig', group: 'primary' },
    { id: 'stage', label: '3D Stage View', group: 'primary' },
    { id: 'controls', label: 'Live controls', group: 'more' },
    { id: 'pixels', label: 'Pixel Strips', group: 'more' },
    { id: 'presets', label: 'Presets', group: 'more' },
    { id: 'log', label: 'Log', group: 'more' },
    { id: 'configuration', label: 'Configuration', group: 'more' },
    { id: 'throw', label: 'Throw Calc', group: 'more' }
  ];
  var CONTROLLER_TABS = { home: 'home', rig: 'info', stage: 'stage', controls: 'rig', presets: 'presets', log: 'log', configuration: 'setup', throw: 'throw' };

  function zoneFromLocation(loc, hints) {
    hints = hints || {};
    if (hints.embedded) return '';
    if (hints.controllerTab) {
      var tabs = { home: 'home', notes: 'planning', info: 'rig', rig: 'controls', stage: 'stage', presets: 'presets', log: 'log', setup: 'configuration', throw: 'throw' };
      return Object.prototype.hasOwnProperty.call(tabs, hints.controllerTab) ? tabs[hints.controllerTab] : '';
    }
    var path = loc.pathname || '/';
    if (/\/monitor(\/|$)/.test(path) || /login\.html$/.test(path)) return '';
    if (/handoff\.html$/.test(path)) return 'handoff';
    if (/\/stage(\/|$)/.test(path)) return 'stage';
    var hash = (loc.hash || '').replace(/^#/, '');
    var head = hash.split('/')[0];
    if (!head) {
      if (path === '/' || /\/index\.html$/.test(path) || /\/workspace\/?$/.test(path)) return 'home';
      return '';
    }
    if (head === 'rig' && hash.split('/')[1] === 'controls') return 'controls';
    if (head === 'schedule' || head === 'notes' || head === 'updates' || head === 'documents') return 'planning';
    if (['home', 'handoff', 'rig', 'stage', 'pixels', 'presets', 'log', 'configuration', 'throw'].indexOf(head) >= 0) return head;
    return '';
  }

  function hrefFor(id, ctx) {
    ctx = ctx || {};
    if (!ctx.projctl) {
      if (id === 'handoff') return '/handoff.html';
      if (id === 'stage') return ctx.publicStage ? '/stage/' : '/#stage';
      if (id === 'planning') return '/#schedule';
      if (id === 'controls') return '/#rig/controls';
      if (id === 'home') return '/#home';
      return '/#' + id;
    }
    if (ctx.controller && CONTROLLER_TABS[id]) {
      if (id === 'controls') return '/#controls';
      if (id === 'configuration') return '/#configuration';
      return '/#' + id;
    }
    if (id === 'handoff') return '/workspace/handoff.html';
    if (id === 'planning') return '/workspace/#schedule';
    if (id === 'controls') return '/workspace/#rig/controls';
    if (id === 'home') return '/workspace/#home';
    return '/workspace/#' + id;
  }

  function isEmbedded() {
    try { if (window.parent !== window) return true; } catch (error) { return true; }
    var query;
    try { query = new URLSearchParams(location.search); } catch (error) { query = new URLSearchParams(); }
    if (query.get('embed') || query.get('workspaceEmbed') === '1') return true;
    return document.body.classList.contains('embedded-workspace') || document.body.classList.contains('pj-embedded-control') || document.documentElement.classList.contains('workspace-embedded');
  }

  function pageContext() {
    var path = location.pathname;
    var controller = !!(document.querySelector('.avd-shell #workspace-views') && document.querySelector('#tab-btn-rig'));
    var projctl = controller || /\/workspace\//.test(path) || /\/monitor\//.test(path) || /\/login\.html$/.test(path);
    return { projctl: projctl, controller: controller, publicStage: /\/stage(\/|$)/.test(path) && !projctl };
  }

  function currentZone(ctx) {
    if (ctx.controller) {
      var selected = document.querySelector('#workspace-views [aria-selected="true"]');
      return zoneFromLocation(location, { controllerTab: selected ? selected.getAttribute('data-tab') || '' : '' });
    }
    return zoneFromLocation(location, {});
  }

  function place(nav) {
    var avd = document.querySelector('.avd-shell');
    if (avd) {
      var header = avd.querySelector('.pj-header');
      if (header && header.parentNode === avd) header.insertAdjacentElement('afterend', nav);
      else avd.insertBefore(nav, avd.firstChild);
      return;
    }
    var monitor = document.querySelector('.fm-shell');
    if (monitor) {
      var monitorHeader = monitor.querySelector('header');
      if (monitorHeader) monitorHeader.insertAdjacentElement('afterend', nav);
      else monitor.insertBefore(nav, monitor.firstChild);
      return;
    }
    var shell = document.querySelector('.shell');
    if (shell) {
      shell.insertBefore(nav, shell.firstChild);
      return;
    }
    var notice = document.querySelector('.public-stage-notice');
    if (notice) {
      notice.parentNode.insertBefore(nav, notice);
      return;
    }
    document.body.insertBefore(nav, document.body.firstChild);
  }

  function start() {
    if (isEmbedded() || document.querySelector('[data-frozen-zone-nav]') || document.querySelector('#primary-navigation')) return;
    var ctx = pageContext();
    var nav = document.createElement('div');
    nav.className = 'workspace-navigation';
    nav.setAttribute('data-frozen-zone-nav', '');
    var utilities = document.createElement('nav');
    utilities.className = 'workspace-utilities';
    utilities.setAttribute('aria-label', 'Workspace');
    var primary = document.createElement('nav');
    primary.className = 'workspace-nav primary-navigation';
    primary.setAttribute('aria-label', 'Main menu');
    var more = document.createElement('details');
    more.className = 'nav-more';
    var summary = document.createElement('summary');
    summary.textContent = 'More';
    var items = document.createElement('div');
    items.className = 'more-items';
    more.appendChild(summary);
    more.appendChild(items);
    ZONES.forEach(function (zone) {
      var anchor = document.createElement('a');
      anchor.href = hrefFor(zone.id, ctx);
      anchor.textContent = zone.label;
      anchor.setAttribute('data-zone', zone.id);
      anchor.addEventListener('click', function (event) {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        var tab = CONTROLLER_TABS[zone.id];
        var button = ctx.controller && tab ? document.querySelector('#tab-btn-' + tab) : null;
        if (button) {
          event.preventDefault();
          button.click();
        }
        if (more.open) more.open = false;
        paint();
      });
      if (zone.group === 'utility') utilities.appendChild(anchor);
      else if (zone.group === 'primary') primary.appendChild(anchor);
      else items.appendChild(anchor);
    });
    primary.appendChild(more);
    nav.appendChild(utilities);
    nav.appendChild(primary);
    function paint() {
      var zone = currentZone(ctx);
      var links = nav.querySelectorAll('[data-zone]');
      for (var i = 0; i < links.length; i++) {
        if (links[i].getAttribute('data-zone') === zone) links[i].setAttribute('aria-current', 'page');
        else links[i].removeAttribute('aria-current');
      }
      more.classList.toggle('is-current', !!more.querySelector('[aria-current="page"]'));
    }
    place(nav);
    paint();
    document.addEventListener('click', function (event) {
      if (more.open && !more.contains(event.target)) more.open = false;
    });
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || !more.open || !nav.contains(document.activeElement)) return;
      more.open = false;
      summary.focus();
    });
    window.addEventListener('hashchange', paint);
    var views = document.querySelector('#workspace-views');
    if (views) views.addEventListener('click', paint);
    window.addEventListener('load', paint);
  }

  var api = { zones: ZONES, zoneFromLocation: zoneFromLocation, hrefFor: hrefFor, start: start };
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }
})();
