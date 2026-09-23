// Hash tabs and the theme label for the FMP reference pages (camera equipment, camera build and
// strike, catwalk PTZ). One panel shows at a time and every tab is addressable, so links from the
// rig, the camera workspace and the hub's Learn tab open the right section directly. Without
// JavaScript every panel stays visible as one document.
const tabs = [...document.querySelectorAll('.tabs a')];
const panels = [...document.querySelectorAll('.panel')];

function showPanel(hash, scroll = false) {
  const tab = tabs.find(item => item.hash === hash) || tabs[0];
  for (const item of tabs) item.setAttribute('aria-current', item === tab ? 'page' : 'false');
  for (const panel of panels) panel.hidden = `#${panel.id}` !== tab.hash;
  const tabBar = document.querySelector('.tabs');
  if (scroll && getComputedStyle(tabBar).position === 'sticky') tabBar.scrollIntoView({ block: 'start' });
}

document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || !tabs.some(tab => tab.hash === link.hash) || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  if (location.hash !== link.hash) history.pushState(null, '', link.hash);
  showPanel(link.hash, true);
});
addEventListener('hashchange', () => showPanel(location.hash));
addEventListener('popstate', () => showPanel(location.hash));

const themeButton = document.querySelector('#theme');
const syncThemeLabel = () => { if (themeButton && themeButton.tagName !== 'SELECT') themeButton.textContent = window.fmpTheme?.theme === 'dark' ? 'Light mode' : 'Dark mode'; };
// theme.js owns the preference and the delegated toggle; this only keeps the label in step.
document.addEventListener('fmp-theme', syncThemeLabel);
syncThemeLabel();
showPanel(location.hash);
