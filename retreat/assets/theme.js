const retreatTheme = document.querySelector('.theme-toggle');
const retreatRoot = document.documentElement;
const themeColor = document.querySelector('meta[name="theme-color"]');

function applyTheme(theme) {
  const dark = theme === 'dark';
  retreatRoot.dataset.theme = theme;
  retreatTheme.textContent = dark ? 'Light mode' : 'Dark mode';
  themeColor.content = dark ? '#191e1b' : '#f8f6f0';
}

let savedTheme;
try {
  savedTheme = localStorage.getItem('sbd-theme');
} catch {}

applyTheme(savedTheme === 'dark' ? 'dark' : 'light');
retreatTheme.hidden = false;
retreatTheme.addEventListener('click', () => {
  const next = retreatRoot.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try {
    localStorage.setItem('sbd-theme', next);
  } catch {}
});
