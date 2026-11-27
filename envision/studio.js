'use strict';

const artDirection = {
  optical: 'Photograph an amber glass prism on a dark cobalt optical bench. Show a narrow cyan beam bending through one polished face, a sharp reflection and fine surface grain.',
  paper: 'Photograph blank ivory index cards and a graphite pencil on a midnight-blue desk. Use raking side light to reveal the paper fibers and cast a single crisp shadow.',
  subject: 'Give the main subject a recognizable silhouette. Choose lighting, materials and a background that support the requested scene.',
  afterjinx: 'Build a deep-sea scene with one focal creature, ink-blue water and warm tentacle accents around the edges. Use controlled halftone or scanline texture in the shadows and crisp silhouettes where the artwork meets the lettering zones.',
  afterbreak: 'Use a near-black base, distressed chrome and cool, mirrored edge linework. Leave a prominent opening for a supplied mystery-headliner graphic.',
  endpoint: 'Use a near-black ground, a central geometric axis, crisp circuit lines and controlled neon at the edges. Keep the middle quiet for artist marks.',
  portrait: 'Reserve a central silhouette for the supplied artist cutout. Frame it with warm rim light and restrained metallic shapes, then fade to dark charcoal behind the billing.',
  custom: 'Use one strong visual subject, a restrained palette and contrast shaped around the title and billing zones.'
};

const formats = {
  square: { name: 'a square image (1:1)', spacing: 'Balance the subject within the square and leave breathing room at each edge.' },
  wide: { name: 'a wide image (16:9)', spacing: 'Compose across the horizontal frame. Give the subject and its shadow room to read at a small size.' },
  tall: { name: 'a tall image (9:16)', spacing: 'Use the height of the frame and leave room above and below the subject.' },
  feed: { name: 'a 4:5 feed flyer (1080 × 1350 px)', spacing: 'Leave a 6% margin on all sides for important artwork and text.' },
  story: { name: 'a 9:16 story (1080 × 1920 px)', spacing: 'Keep the title and CTA at least 250 px from the top and bottom and 72 px from either side.' },
  print: { name: 'a 4 × 6 inch portrait print flyer', spacing: 'Keep type and logos inside the printer’s safe area and extend edge artwork through the specified bleed.' },
  keep: { name: 'the source canvas', spacing: 'Keep the existing dimensions, crop and spacing.' }
};

const layout = 'Reserve distinct zones from top to bottom for the event title, a large headliner or focal image, support billing and a low-detail footer. Keep clear separation between tiers and let one focal point carry the image.';
const imageFormats = ['square', 'wide', 'tall'];
const studies = globalThis.EnvisionDirections;
const imagePresets = ['optical', 'paper', ...studies.map((s) => s.id), 'subject'];
for (const study of studies) artDirection[study.id] = study.prompt;
const isImage = (mode) => mode === 'image' || mode === 'image-revise';
const isRevision = (mode) => mode === 'revise' || mode === 'image-revise';
const validFormat = (mode, value) => Object.hasOwn(formats, value)
  && (value === 'keep' ? isRevision(mode) : imageFormats.includes(value) === isImage(mode));
const validPreset = (mode, value) => Object.hasOwn(artDirection, value) && imagePresets.includes(value) === isImage(mode);
const fieldNames = ['title', 'mode', 'format', 'preset', 'direction', 'preserve', 'copy'];
const storageKey = 'sbd.envision.events.v1';
const byId = (id) => document.getElementById(id);
const form = byId('brief');
const field = (name) => form.elements.namedItem(name);
const subjectOption = field('preset').querySelector('[value="subject"]');
for (const study of studies) field('preset').add(new Option(study.name, study.id), subjectOption);
const tabs = [...document.querySelectorAll('.navigation [role="tab"]')];
const smallScreen = matchMedia('(max-width: 680px)');
let activeId = null;
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
  const brief = Object.fromEntries(fieldNames.map((name) => [name, field(name).value.trim()]));
  if (isImage(brief.mode)) brief.copy = '';
  return brief;
}

function filterOptions(select, allowed, fallback) {
  for (const option of select.options) {
    option.disabled = !allowed(option.value);
    option.hidden = option.disabled;
  }
  if (!allowed(select.value)) select.value = fallback;
}

function needsDirection(brief) {
  return isRevision(brief.mode) || (brief.mode === 'image' && brief.preset === 'subject');
}

function syncMode(modeChanged = false) {
  const mode = field('mode').value;
  const image = isImage(mode);
  const editing = isRevision(mode);
  filterOptions(field('format'), value => validFormat(mode, value), image ? 'square' : 'feed');
  filterOptions(field('preset'), value => validPreset(mode, value), image ? 'optical' : 'afterjinx');
  if (editing && modeChanged) field('format').value = 'keep';
  byId('preset-field').hidden = editing;
  byId('preserve-field').hidden = !editing;
  byId('copy-details').hidden = image;
  byId('brief-heading').textContent = image ? 'Image brief' : 'Flyer brief';
  byId('name-label').textContent = image ? 'Brief name' : 'Event name';
  field('title').placeholder = image ? 'e.g. Prism study' : 'e.g. AfterBreak';
  const required = needsDirection(briefValues());
  field('direction').required = required;
  byId('direction-label').querySelector('strong').textContent = editing ? 'What should change?' : (required ? 'Describe your subject' : 'Your direction');
  byId('direction-label').querySelector('span').hidden = required;
  field('preserve').placeholder = image ? 'Camera angle, subject silhouette and palette.' : 'Same layout, title and artist logos.';
  field('direction').placeholder = image
    ? (editing ? 'Soften the shadow and change the camera angle.'
      : field('preset').value === 'subject' ? 'Describe the subject, materials and light.'
      : 'Bring the main subject closer and soften the shadows.')
    : (editing ? 'Flatten the excess glow and restore the scanline texture.' : 'Icy blue around the edges. Room for six artist logos.');
  const art = byId('art-crop');
  const preset = field('preset').value;
  const paper = preset === 'paper';
  const study = image && !editing && studies.find((s) => s.id === preset);
  const thumb = byId('direction-art');
  art.hidden = editing || (image ? preset === 'subject' : preset !== 'afterjinx');
  art.dataset.kind = image ? 'image' : 'show';
  art.dataset.preset = preset;
  thumb.hidden = !study;
  if (study) thumb.src = './directions/' + study.id + '.webp';
  else thumb.removeAttribute('src');
  art.setAttribute('aria-label', study ? study.alt : image ? (paper ? 'Ivory index cards and a pencil on a navy desk' : 'Cyan and amber optical glass on a dark workbench') : 'Detail from the AfterJinx 2025 flyer');
  byId('art-label').textContent = image ? (study?.name || (paper ? 'Paper and ink' : 'Optical study')) + ' · rendered on Walter' : 'From the AfterJinx flyer archive';
  byId('empty-help').textContent = editing ? 'Describe the change and what should stay in the original. Build the prompt to review your revision.'
    : 'Choose an art direction and build the prompt. Export a named brief to use it in your personal studio.';
}

function buildPrompt(brief) {
  const format = formats[brief.format];
  const eventContext = brief.title ? ' for ' + brief.title : '';
  if (isRevision(brief.mode)) {
    const size = brief.format === 'keep' ? format.spacing : 'Recompose for ' + format.name + '. ' + format.spacing;
    if (isImage(brief.mode)) {
      return ['Edit the supplied image' + eventContext + '.', 'Change: ' + brief.direction,
        'Keep: ' + (brief.preserve || 'The subject, materials and lighting outside the requested edit.'), size].join('\n\n');
    }
    const preserve = brief.preserve || 'Existing lettering, logos, billing order, layout hierarchy and all other unaffected artwork.';
    return [
      'Edit the supplied flyer' + eventContext + '.',
      'Change: ' + brief.direction,
      'Keep: ' + preserve,
      size + ' Preserve contrast and legibility around every text zone. Limit edits to the requested changes.'
    ].join('\n\n');
  }
  if (isImage(brief.mode)) {
    return ['Create ' + format.name + eventContext + '.', artDirection[brief.preset], brief.direction, format.spacing].filter(Boolean).join('\n\n');
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
  const available = built && (!needsDirection(brief) || Boolean(brief.direction));
  byId('empty-prompt').hidden = available;
  byId('prompt-content').hidden = !available;
  byId('copy-prompt').disabled = !available;
  if (!available) return;
  byId('prompt-output').value = buildPrompt(brief);
  byId('result-help').textContent = isRevision(brief.mode)
    ? 'Use the original artwork as a reference when you run this prompt.'
    : (isImage(brief.mode) ? 'Copy the prompt to your generator or export the brief to your personal studio.' : 'Paste this into your image generator. Add the real type and logos in layout.');
  byId('layout-sample').hidden = isImage(brief.mode);
  byId('layout-map').hidden = brief.mode === 'revise' && brief.format === 'keep';
  byId('layout-note').textContent = formats[brief.format].spacing;
  byId('placement').hidden = !brief.copy;
  byId('placement-output').value = brief.copy;
}

form.addEventListener('input', (event) => {
  if (event.target === field('mode')) syncMode(true);
  if (event.target === field('preset')) syncMode();
  updateResult();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (needsDirection(briefValues()) && !field('direction').value.trim()) {
    announce('Enter your direction to build this prompt.');
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
  if (!Array.isArray(stored)) throw new TypeError('Saved briefs must be an array');
  return stored;
}

const personalOriginKey = 'sbd.envision.personalOrigin.v1';
function personalOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Enter the private studio’s HTTPS address without a path or credentials.');
  }
  return url.origin;
}
function showPersonalOrigin(value) {
  const link = byId('open-personal');
  link.removeAttribute('href');
  link.hidden = !value;
  if (value) link.href = value + '/';
  byId('personal-origin').value = value;
}
try {
  const saved = localStorage.getItem(personalOriginKey);
  if (saved) showPersonalOrigin(personalOrigin(saved));
} catch { /* The prompt kit also works without a saved studio address. */ }
byId('personal-address').addEventListener('submit', event => {
  event.preventDefault();
  const input = byId('personal-origin').value.trim();
  let value;
  try { value = input ? personalOrigin(input) : ''; }
  catch { announce('Enter the private studio’s HTTPS origin, including its port.'); return; }
  try {
    if (value) localStorage.setItem(personalOriginKey, value);
    else localStorage.removeItem(personalOriginKey);
    showPersonalOrigin(value);
    announce(value ? 'Personal studio address saved in this browser.' : 'Personal studio address cleared.');
  } catch { announce('This browser could not save the address.'); }
});

function saveEvent() {
  const brief = briefValues();
  if (!brief.title) {
    announce('Enter a name before saving the brief.');
    field('title').focus();
    return;
  }
  try {
    const records = readEvents();
    const id = activeId || crypto.randomUUID();
    const entry = { id, ...brief };
    const next = [entry, ...records.filter((record) => record?.id !== id)];
    localStorage.setItem(storageKey, JSON.stringify(next));
    activeId = id;
    byId('new-event').hidden = false;
    announce('Brief saved in this browser.');
  } catch {
    announce('Could not save. Keep this tab open and copy any details you need.');
  }
}

function openEvent(record) {
  field('mode').value = record.mode;
  if (!field('mode').value) field('mode').value = 'new';
  syncMode(true);
  for (const name of ['format', 'preset']) {
    const valid = [...field(name).options].some(option => option.value === record[name] && !option.disabled);
    if (valid) field(name).value = record[name];
  }
  for (const name of ['title', 'direction', 'preserve', 'copy']) {
    field(name).value = typeof record[name] === 'string' ? record[name] : '';
  }
  activeId = record.id;
  built = false;
  byId('new-event').hidden = false;
  byId('copy-details').open = Boolean(record.copy);
  syncMode();
  updateResult();
  selectTab(byId('tab-studio'));
  showMobilePanel('brief');
  field('title').focus();
  announce('Brief opened.');
}

function exportBrief(brief) {
  if (!brief.title?.trim()) {
    announce('Enter a name before exporting the brief.');
    showMobilePanel('brief');
    field('title').focus();
    return;
  }
  if (!['new', 'revise', 'image', 'image-revise'].includes(brief.mode) || !validFormat(brief.mode, brief.format)
    || (!isRevision(brief.mode) && !validPreset(brief.mode, brief.preset))
    || (needsDirection(brief) && (typeof brief.direction !== 'string' || !brief.direction.trim()))) {
    announce('Open the brief, choose a format and enter your direction before exporting.');
    return;
  }
  const image = isImage(brief.mode);
  window.downloadEnvisionBrief({kind: image ? 'image' : 'show', title: brief.title, prompt: buildPrompt(brief), copy: brief.copy});
  announce('Brief exported. Open Import project in your personal studio.');
}

byId('export-current').addEventListener('click', () => exportBrief(briefValues()));

function renderSaved() {
  const list = byId('saved-list');
  list.replaceChildren();
  try {
    const records = readEvents();
    byId('empty-saved').hidden = records.length > 0;
    byId('empty-saved').textContent = 'Save a brief from the Studio to reopen it here.';
    for (const record of records) {
      if (!record || typeof record.title !== 'string' || !record.id) continue;
      const item = document.createElement('li');
      const title = document.createElement('span');
      title.className = 'event-name';
      title.textContent = record.title;
      const open = document.createElement('button');
      open.type = 'button';
      open.textContent = 'Open';
      open.setAttribute('aria-label', 'Open ' + record.title);
      open.addEventListener('click', () => openEvent(record));
      const transfer = document.createElement('button');
      transfer.type = 'button';
      transfer.textContent = 'Export brief';
      transfer.setAttribute('aria-label', 'Export brief for ' + record.title);
      transfer.addEventListener('click', () => exportBrief(record));
      item.append(title, open, transfer);
      list.append(item);
    }
    if (list.children.length < records.length) {
      byId('empty-saved').hidden = false;
      byId('empty-saved').textContent = 'Some saved briefs could not be read. Their data is still in this browser.';
    }
  } catch {
    byId('empty-saved').hidden = false;
    byId('empty-saved').textContent = 'Saved briefs are unavailable in this browser.';
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
syncMode();
selectTab(byId('tab-studio'));
byId('tab-studio').parentElement.hidden = false;
