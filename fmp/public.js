// Hash links preserve reload, sharing, Back/Forward and native modified-click behavior.
const theme = document.getElementById('theme');
if (window.fmpTheme) {
  const syncTheme = () => { theme.value = window.fmpTheme.preference; };
  syncTheme();
  theme.addEventListener('change', () => window.fmpTheme.set(theme.value));
  document.addEventListener('fmp-theme', syncTheme);
}

const tabs = [...document.querySelectorAll('.portal-tabs [data-panel]')];
const panels = [...document.querySelectorAll('.portal-panel')];
const aliases = new Map([['#operators', '#cameras'], ['#reference', '#learn'], ['#3d', '#models'], ['#walk', '#cameras']]);
// panelFor answers whether a hash addresses a panel at all; panelHash picks the
// panel to show for an address bar that may hold anything. Keeping them separate
// is what lets an ordinary in-page anchor fall through to the browser.
const panelFor = hash => {
  const requested = aliases.get(hash) || hash;
  return panels.some(panel => `#${panel.id}` === requested) ? requested : null;
};
const panelHash = hash => panelFor(hash) || '#cameras';
function show(hash, focus = false) {
  const active = panelHash(hash);
  for (const tab of tabs) tab.setAttribute('aria-current', tab.hash === active ? 'page' : 'false');
  for (const panel of panels) panel.hidden = `#${panel.id}` !== active;
  document.querySelectorAll('.setup-link').forEach(link => link.setAttribute('aria-current', active === '#setup' ? 'page' : 'false'));
  if (focus) document.getElementById(active.slice(1)).focus({ preventScroll: true });
}

document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  const hash = link && panelFor(link.hash);
  // Anything that is not a panel link is the browser's to handle, so anchors
  // into a reference section still scroll instead of switching tabs.
  if (!hash || link.classList.contains('skip')) return;
  if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  if (location.hash !== hash) history.pushState(null, '', hash);
  // A keyboard activation moves into the selected panel; pointer users keep their place.
  show(hash, event.detail === 0);
});
// An address that does not name a panel is an in-page anchor, not a tab change.
// Switching panels here would undo the anchor the reader just followed.
const followHash = () => { const hash = panelFor(location.hash); if (hash) show(hash); };
addEventListener('hashchange', followHash);
addEventListener('popstate', followHash);

const search = document.getElementById('reference-search');
const category = document.getElementById('reference-category');
const references = [...document.querySelectorAll('#reference-list > a')];
const normalize = text => text.toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
function filterReferences() {
  const words = normalize(search.value.trim()).split(/\s+/).filter(Boolean);
  let shown = 0;
  for (const reference of references) {
    const text = normalize(`${reference.textContent} ${reference.dataset.search || ''}`);
    const included = (category.value === 'all' || (reference.dataset.category || '').split(' ').includes(category.value)) &&
      words.every(word => text.includes(word));
    reference.hidden = !included;
    shown += Number(included);
  }
  const count = document.getElementById('reference-count');
  if (count) count.textContent = `${shown} of ${references.length} references`;
  const empty = document.getElementById('reference-empty');
  if (empty) empty.hidden = shown !== 0;
}
function clearReferences() {
  search.value = '';
  category.value = 'all';
  filterReferences();
  search.focus();
}
// Reference filtering is an enhancement. Every panel but one ships hidden and
// only show() reveals them, so a missing filter control must never throw here
// and leave the whole hub with no visible panel and dead tabs.
if (search && category) {
  search.addEventListener('input', filterReferences);
  category.addEventListener('change', filterReferences);
  document.getElementById('reference-clear')?.addEventListener('click', clearReferences);
  document.getElementById('reference-reset')?.addEventListener('click', clearReferences);
  filterReferences();
}
show(location.hash);
document.documentElement.dataset.enhanced = 'true';
