// One equipment menu shared by the study explorers.
(() => {
  'use strict';
  const nav = document.querySelector('.model-site-nav, .r-site-nav');
  if (!nav) return;
  const base = new URL('../../', document.currentScript.src || new URL('../models/assets/equipment-switcher.js', location.href));
  const equipment = [
    ['URSA camera & fiber rig', 'rig/'],
    ['ATEM HD8 ISO', 'models/atem-hd8-iso.html'],
    ['SuperJoy G1', 'ptz/SuperJoy-G1-Interactive-Guide.html'],
    ['BirdDog P240', 'models/p240.html'],
    ['ATEM Camera Control Panel', 'models/ccu4.html']
  ];
  const label = document.createElement('label');
  label.className = 'equipment-switcher';
  label.append('Equipment ');
  const select = document.createElement('select');
  select.setAttribute('aria-label', 'Switch equipment');
  for (const [name, route] of equipment) {
    const url = new URL(route, base);
    const option = new Option(name, url.href);
    option.selected = location.pathname.replace(/index\.html$/, '') === url.pathname;
    select.add(option);
  }
  select.addEventListener('change', () => location.assign(select.value));
  label.append(select);
  // Keep the rig's theme control on its first mobile row before the full-width menu.
  if (nav.matches('.r-site-nav')) nav.append(label);
  else nav.querySelector('a[href$="#models"]').after(label);
})();
