'use strict';

const artDirection = {
  afterjinx: 'Build a deep-sea scene with one focal creature, ink-blue water and warm tentacle accents around the edges. Use controlled halftone or scanline texture in the shadows and crisp silhouettes where the artwork meets the lettering zones.',
  afterbreak: 'Use a near-black base, distressed chrome and cool, mirrored edge linework. Leave a prominent opening for a supplied mystery-headliner graphic.',
  endpoint: 'Use a near-black ground, a central geometric axis, crisp circuit lines and controlled neon at the edges. Keep the middle quiet for artist marks.',
  portrait: 'Reserve a central silhouette for the supplied artist cutout. Frame it with warm rim light and restrained metallic shapes, then fade to dark charcoal behind the billing.',
  custom: 'Use one strong visual subject, a restrained palette and contrast shaped around the title and billing zones.'
};

const formats = {
  feed: { name: 'a 4:5 feed flyer (1080 × 1350 px)', spacing: 'Leave a 6% margin on all sides for important artwork and text.' },
  story: { name: 'a 9:16 story (1080 × 1920 px)', spacing: 'Keep the title and CTA at least 250 px from the top and bottom and 72 px from either side.' },
  print: { name: 'a 4 × 6 inch portrait print flyer', spacing: 'Keep type and logos inside the printer’s safe area and extend edge artwork through the specified bleed.' },
  keep: { name: 'the source canvas', spacing: 'Keep the existing dimensions, crop and spacing.' }
};

const layout = 'Reserve distinct zones from top to bottom for the event title, a large headliner or focal image, support billing and a low-detail footer. Keep clear separation between tiers and let one focal point carry the image.';
const fieldNames = ['title', 'mode', 'format', 'preset', 'direction', 'preserve', 'copy'];
const storageKey = 'sbd.envision.events.v1';
const byId = (id) => document.getElementById(id);
const form = byId('brief');
const field = (name) => form.elements.namedItem(name);
const tabs = [...document.querySelectorAll('.navigation [role="tab"]')];
const smallScreen = matchMedia('(max-width: 680px)');
let activeId = null;
let previousMode = 'new';
let built = false;

function announce(message) {
  byId('notice').textContent = message;
}

function selectTab(tab, focus = false) {
  for (const button of tabs) {
    const selected = button === tab;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
    byId(button.getAttribute('aria-controls')).hidden = !selected;
  }
  if (tab.id === 'tab-saved') renderSaved();
  if (focus) tab.focus();
}

for (const [index, tab] of tabs.entries()) {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (event) => {
    const positions = {
      ArrowLeft: (index + tabs.length - 1) % tabs.length,
      ArrowRight: (index + 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1
    };
    if (!Object.hasOwn(positions, event.key)) return;
    event.preventDefault();
    selectTab(tabs[positions[event.key]], true);
  });
}

function showMobilePanel(panel) {
  byId('studio').dataset.mobilePanel = panel;
  byId('show-brief').setAttribute('aria-pressed', String(panel === 'brief'));
  byId('show-result').setAttribute('aria-pressed', String(panel === 'result'));
}

byId('show-brief').addEventListener('click', () => showMobilePanel('brief'));
byId('show-result').addEventListener('click', () => showMobilePanel('result'));

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  byId('theme').textContent = theme === 'dark' ? 'Light theme' : 'Dark theme';
}

try {
  if (localStorage.getItem('sbd-theme') === 'dark') setTheme('dark');
} catch {
  // The theme still works for the current page when storage is disabled.
}

byId('theme').addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  setTheme(theme);
  try {
    localStorage.setItem('sbd-theme', theme);
  } catch {
    // The current page already reflects the choice.
  }
});

function briefValues() {
  return Object.fromEntries(fieldNames.map((name) => [name, field(name).value.trim()]));
}

function syncMode(resetFormat = false) {
  const mode = field('mode').value;
  const editing = mode === 'revise';
  const keepOption = field('format').querySelector('[value="keep"]');
  keepOption.disabled = !editing;
  keepOption.hidden = !editing;
  if (resetFormat && mode !== previousMode) {
    if (editing) field('format').value = 'keep';
    else if (field('format').value === 'keep') field('format').value = 'feed';
  }
  previousMode = mode;
  byId('preset-field').hidden = editing;
  byId('preserve-field').hidden = !editing;
  byId('direction-label').firstChild.textContent = editing ? 'What should change? ' : 'Your direction ';
  byId('direction-label').querySelector('span').hidden = editing;
  field('direction').required = editing;
  field('direction').placeholder = editing
    ? 'Flatten the excess glow and bring back a gritty scanline texture.'
    : 'Icy blue around the edges. Room for six artist logos.';
}

function buildPrompt(brief) {
  const format = formats[brief.format];
  const eventContext = brief.title ? ' for ' + brief.title : '';
  if (brief.mode === 'revise') {
    const size = brief.format === 'keep' ? format.spacing : 'Recompose for ' + format.name + '. ' + format.spacing;
    const preserve = brief.preserve || 'Existing lettering, logos, billing order, layout hierarchy and all other unaffected artwork.';
    return [
      'Edit the supplied flyer' + eventContext + '.',
      'Change: ' + brief.direction,
      'Keep: ' + preserve,
      size + ' Preserve contrast and legibility around every text zone. Limit edits to the requested changes.'
    ].join('\n\n');
  }
  return [
    'Create artwork' + eventContext + ' for ' + format.name + '.',
    artDirection[brief.preset],
    brief.direction ? 'Creative direction: ' + brief.direction : '',
    layout + ' ' + format.spacing,
    'Render the artwork only. Leave the lettering zones blank for exact event copy and supplied logos.'
  ].filter(Boolean).join('\n\n');
}

function updateResult() {
  const brief = briefValues();
  const available = built && (brief.mode !== 'revise' || Boolean(brief.direction));
  byId('empty-prompt').hidden = available;
  byId('prompt-content').hidden = !available;
  byId('copy-prompt').disabled = !available;
  if (!available) return;
  byId('prompt-output').value = buildPrompt(brief);
  byId('result-help').textContent = brief.mode === 'revise'
    ? 'Attach the original flyer in your image generator and paste this edit prompt.'
    : 'Paste this into your image generator. Add the real type and logos in layout.';
  byId('layout-map').hidden = brief.mode === 'revise' && brief.format === 'keep';
  byId('layout-note').textContent = formats[brief.format].spacing;
  byId('placement').hidden = !brief.copy;
  byId('placement-output').value = brief.copy;
}

form.addEventListener('input', (event) => {
  if (event.target === field('mode')) syncMode(true);
  updateResult();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (field('mode').value === 'revise' && !field('direction').value.trim()) {
    announce('Describe what to change in the existing flyer.');
    field('direction').focus();
    return;
  }
  built = true;
  updateResult();
  showMobilePanel('result');
  if (smallScreen.matches) byId('copy-prompt').focus();
  announce('Prompt ready.');
});

async function copyOutput(id, success) {
  const output = byId(id);
  try {
    await navigator.clipboard.writeText(output.value);
    announce(success);
  } catch {
    output.focus();
    output.select();
    announce('Text selected. Use your browser’s copy command.');
  }
}

byId('copy-prompt').addEventListener('click', () => copyOutput('prompt-output', 'Prompt copied.'));
byId('copy-placement').addEventListener('click', () => copyOutput('placement-output', 'Event copy copied.'));

function readEvents() {
  const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
  if (!Array.isArray(stored)) throw new TypeError('Saved events must be an array');
  return stored;
}

function saveEvent() {
  const brief = briefValues();
  if (!brief.title) {
    announce('Enter an event name before saving.');
    field('title').focus();
    return;
  }
  try {
    const records = readEvents();
    const id = activeId || crypto.randomUUID();
    const entry = { id, ...brief };
    const next = [entry, ...records.filter((record) => record.id !== id)];
    localStorage.setItem(storageKey, JSON.stringify(next));
    activeId = id;
    byId('new-event').hidden = false;
    announce('Event saved in this browser.');
  } catch {
    announce('Could not save. Keep this tab open and copy any details you need.');
  }
}

function openEvent(record) {
  for (const name of fieldNames) field(name).value = record[name];
  activeId = record.id;
  built = false;
  byId('new-event').hidden = false;
  byId('copy-details').open = Boolean(record.copy);
  syncMode();
  updateResult();
  selectTab(byId('tab-studio'));
  showMobilePanel('brief');
  field('title').focus();
  announce('Event opened.');
}

function renderSaved() {
  const list = byId('saved-list');
  list.replaceChildren();
  try {
    const records = readEvents();
    byId('empty-saved').hidden = records.length > 0;
    byId('empty-saved').textContent = 'Save a brief from the Studio to reopen it here.';
    for (const record of records) {
      const item = document.createElement('li');
      const title = document.createElement('span');
      title.className = 'event-name';
      title.textContent = record.title;
      const open = document.createElement('button');
      open.type = 'button';
      open.textContent = 'Open';
      open.setAttribute('aria-label', 'Open ' + record.title);
      open.addEventListener('click', () => openEvent(record));
      item.append(title, open);
      list.append(item);
    }
  } catch {
    byId('empty-saved').hidden = false;
    byId('empty-saved').textContent = 'Saved events are unavailable in this browser.';
  }
}

function newEvent() {
  form.reset();
  activeId = null;
  built = false;
  byId('new-event').hidden = true;
  byId('copy-details').open = false;
  syncMode();
  updateResult();
  selectTab(byId('tab-studio'));
  showMobilePanel('brief');
  field('title').focus();
  announce('New brief ready.');
}

byId('save-event').addEventListener('click', saveEvent);
byId('new-event').addEventListener('click', newEvent);
byId('create-event').addEventListener('click', newEvent);
addEventListener('storage', (event) => {
  if ((event.key === storageKey || event.key === null) && !byId('saved').hidden) renderSaved();
});

// Keep the static guide available until the studio is ready to use.
selectTab(byId('tab-studio'));
byId('tab-studio').parentElement.hidden = false;
