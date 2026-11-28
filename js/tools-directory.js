/* Search the static directory so every project remains available without JavaScript. */
(() => {
  const root = document.documentElement;
  const search = document.getElementById('toolSearch');
  const picker = document.getElementById('categoryPicker');
  const results = document.getElementById('toolsResults');
  const empty = document.getElementById('toolsEmpty');
  const count = document.getElementById('toolCount');
  const theme = document.getElementById('themeSwitch');
  const buttons = [...document.querySelectorAll('#filterChips [data-chip]')];
  const categories = buttons.map((button) => button.dataset.chip);
  const projects = [...results.querySelectorAll('.tool-card')].map((card) => ({
    card,
    categories: card.dataset.chips.split(' '),
    keywords: (card.textContent + ' ' + card.dataset.chips).toLowerCase(),
  }));
  let category = 'All';
  let pendingUrl;

  function setTheme(value) {
    root.dataset.theme = value;
    theme.textContent = value === 'dark' ? 'Light theme' : 'Dark theme';
    document.querySelector('meta[name="theme-color"]').content = value === 'dark' ? '#111916' : '#f4f2ed';
  }

  function filter() {
    const terms = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let found = 0;
    for (const project of projects) {
      const visible = (category === 'All' || project.categories.includes(category)) &&
        terms.every((term) => project.keywords.includes(term));
      project.card.hidden = !visible;
      if (visible) found++;
    }
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(button.dataset.chip === category));
    }
    picker.value = category;
    empty.hidden = found > 0;
    count.textContent = found === projects.length ? found + ' projects' : found + ' of ' + projects.length + ' projects';
    results.scrollTop = 0;
  }

  function writeUrl(push) {
    clearTimeout(pendingUrl);
    const url = new URL(location.href);
    const query = search.value.trim();
    if (query) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    url.hash = category === 'All' ? '' : category.toLowerCase();
    if (url.href !== location.href) {
      if (push) history.pushState(null, '', url);
      else history.replaceState(null, '', url);
    }
  }

  function readUrl() {
    clearTimeout(pendingUrl);
    const url = new URL(location.href);
    category = categories.find((item) => item.toLowerCase() === url.hash.slice(1).toLowerCase()) || 'All';
    search.value = (url.searchParams.get('q') || '').slice(0, search.maxLength);
    filter();
  }

  function choose(value) {
    if (category === value) return;
    writeUrl(false);
    category = value;
    writeUrl(true);
    filter();
  }

  try { setTheme(localStorage.getItem('sbd-theme') === 'dark' ? 'dark' : 'light'); }
  catch { setTheme('light'); }
  theme.addEventListener('click', () => {
    setTheme(root.dataset.theme === 'light' ? 'dark' : 'light');
    try { localStorage.setItem('sbd-theme', root.dataset.theme); } catch {}
  });
  window.addEventListener('storage', (event) => {
    if (event.key === 'sbd-theme' || event.key === null) setTheme(event.newValue === 'dark' ? 'dark' : 'light');
  });
  for (const button of buttons) {
    const value = button.dataset.chip;
    picker.add(new Option(value === 'All' ? 'All categories' : value, value));
    button.addEventListener('click', () => choose(value));
  }
  picker.addEventListener('change', () => choose(picker.value));
  search.addEventListener('input', () => {
    filter();
    clearTimeout(pendingUrl);
    pendingUrl = setTimeout(() => writeUrl(false), 180);
  });
  search.addEventListener('change', () => writeUrl(false));
  document.getElementById('resetFilters').addEventListener('click', () => {
    writeUrl(false);
    search.value = '';
    category = 'All';
    writeUrl(true);
    filter();
    search.focus();
  });
  document.querySelector('.sbd-skip-link').addEventListener('click', (event) => {
    event.preventDefault();
    document.getElementById('main-content').focus();
  });
  window.addEventListener('popstate', readUrl);
  window.addEventListener('hashchange', readUrl);
  readUrl();
  document.getElementById('toolsControls').hidden = false;
  theme.hidden = false;
})();
