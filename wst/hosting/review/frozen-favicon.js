/* frozen-favicon.js
   Shared Frozen snowflake favicon switcher.
   Reads ?favicon=01..09 or a name (classic, inverted, rose, round, bold, beads, crystal, bloom, ice).
   Persists localStorage key frozenFavicon (writes the two-digit id; also accepts a stored name).
   Swaps the image/svg+xml icon link. No fetch, no URL rewrite, no focus change.
*/
(() => {
  const KEY = 'frozenFavicon';
  const ICONS = [
    ['01', 'classic', 'Classic'],
    ['02', 'inverted', 'Inverted'],
    ['03', 'rose', 'Rose'],
    ['04', 'round', 'Round'],
    ['05', 'bold', 'Bold'],
    ['06', 'beads', 'Beads'],
    ['07', 'crystal', 'Crystal'],
    ['08', 'bloom', 'Bloom'],
    ['09', 'ice', 'Ice'],
  ];
  const fileOf = icon => 'favicon-' + icon[0] + '-' + icon[1] + '.svg';
  const byToken = token => {
    if (!token) return null;
    const value = String(token).trim().toLowerCase().replace(/\.svg$/, '').replace(/^favicon-/, '');
    return ICONS.find(icon => value === icon[0] || value === icon[1] || value === icon[0] + '-' + icon[1]) || null;
  };
  const iconLink = () => document.querySelector('link[rel="icon"][type="image/svg+xml"]');
  const directory = () => {
    const href = (iconLink() && iconLink().getAttribute('href')) || 'favicons/favicon-01-classic.svg';
    const cut = href.lastIndexOf('/');
    return cut >= 0 ? href.slice(0, cut + 1) : '';
  };
  const readStored = () => {
    try { return byToken(localStorage.getItem(KEY)); } catch { return null; }
  };
  const writeStored = id => {
    try { localStorage.setItem(KEY, id); } catch { /* Choice stays for this visit. */ }
  };
  const requested = byToken(new URLSearchParams(location.search).get('favicon'));
  let active = requested || readStored() || ICONS[0];
  if (requested) writeStored(requested[0]);

  function apply(icon, persist) {
    if (!icon) return;
    active = icon;
    const node = iconLink();
    if (node) node.setAttribute('href', directory() + fileOf(icon));
    if (persist) writeStored(icon[0]);
    document.querySelectorAll('[data-frozen-favicon]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-frozen-favicon') === icon[0]));
    });
  }
  apply(active, false);

  function mount() {
    if (document.getElementById('frozen-favicon-picker')) return;
    const picker = document.createElement('div');
    picker.id = 'frozen-favicon-picker';
    picker.className = 'frozen-favicon-picker';
    picker.setAttribute('role', 'group');
    picker.setAttribute('aria-label', 'Snowflake favicon');
    const dir = directory();
    for (const icon of ICONS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'frozen-favicon-choice';
      button.dataset.frozenFavicon = icon[0];
      button.title = icon[2];
      button.setAttribute('aria-label', icon[2] + ' favicon');
      button.setAttribute('aria-pressed', String(icon[0] === active[0]));
      const img = document.createElement('img');
      img.alt = '';
      img.width = 32;
      img.height = 32;
      img.draggable = false;
      img.src = dir + fileOf(icon);
      button.append(img);
      button.addEventListener('click', () => apply(icon, true));
      picker.append(button);
    }
    const slot = document.getElementById('frozen-favicon-slot');
    if (slot) slot.append(picker);
    else { picker.classList.add('frozen-favicon-corner'); document.body.append(picker); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
