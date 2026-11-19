// Know tab: diagrams and documents the relay serves from a private folder on the relay computer.
// Diagrams open in a zoomable viewer. Documents are shown as plain text: nothing in a file is run
// or inserted as markup. A PDF opens in the browser's own viewer in a new tab.
const MAX_TEXT_BYTES = 512 * 1024;
const ZOOM_STEPS = [1, 1.5, 2, 3, 4, 6, 8];
const TYPES = { svg: 'Diagram', png: 'Diagram', pdf: 'PDF', md: 'Document', txt: 'Text', json: 'Data' };

function el(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  if (text != null) node.textContent = text;
  return node;
}
const fileUrl = file => `api/know/file?f=${encodeURIComponent(file)}`;
// What the relay may name: the same shape the relay itself accepts.
const safeFile = file => typeof file === 'string' && file.length <= 200 && !/[\u0000-\u001f\u007f\\]/.test(file) && !file.startsWith('/') && file.split('/').every(part => part && !part.startsWith('.'));

// Plain text with light structure: markdown headings become headings, everything else stays as typed.
export function textBlocks(text, type) {
  if (type !== 'md') return [{ kind: 'pre', text }];
  const blocks = [];
  let open = null;
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) { blocks.push({ kind: heading[1].length === 1 ? 'h1' : 'h2', text: heading[2].trim() }); open = null; }
    else if (!line.trim()) open = null;
    else if (open) open.text += `\n${line}`;
    else { open = { kind: 'p', text: line }; blocks.push(open); }
  }
  return blocks;
}

export function createKnow({ panel, list, status, title, tools, stage, back, audience = 'show-backup,designer', onSignedOut = () => {} }) {
  let items = [], current = null, zoom = { mode: 'fit', scale: 1 }, loadedAt = 0, token = 0;

  async function get(url, as) {
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (response.status === 401) { onSignedOut(); throw new Error('signed out'); }
    if (!response.ok) throw Object.assign(new Error(`the relay answered ${response.status}`), { status: response.status });
    return as === 'json' ? response.json() : response.text();
  }

  function setStage(mode, ...nodes) {
    stage.dataset.mode = mode;
    stage.replaceChildren(...nodes);
    stage.scrollTop = 0; stage.scrollLeft = 0;
    tools.hidden = mode !== 'diagram';
  }
  const say = text => el('p', { class: 'sb-empty' }, text);

  function applyZoom() {
    const image = stage.querySelector('img');
    if (!image) return;
    stage.dataset.zoom = zoom.mode;
    if (zoom.mode === 'fit') { image.style.width = ''; image.style.height = ''; }
    else {
      // The image box is a scaled copy of the viewer and the picture is contained inside it, so the
      // shape is always right, including for a diagram that declares no size of its own.
      const sized = image.naturalWidth > 0 && image.naturalHeight > 0;
      const scale = zoom.mode === 'actual' ? 1 : zoom.scale;
      const [width, height] = zoom.mode === 'actual' && sized ? [image.naturalWidth, image.naturalHeight] : [stage.clientWidth * scale, stage.clientHeight * scale];
      image.style.width = `${Math.round(width)}px`; image.style.height = `${Math.round(height)}px`;
    }
    for (const button of tools.querySelectorAll('[data-zoom]')) {
      const pressed = button.dataset.zoom === zoom.mode;
      if (['fit', 'actual'].includes(button.dataset.zoom)) button.setAttribute('aria-pressed', String(pressed));
    }
  }
  tools.addEventListener('click', event => {
    const button = event.target.closest('button[data-zoom]');
    if (!button) return;
    const step = button.dataset.zoom, at = ZOOM_STEPS.indexOf(zoom.scale);
    if (step === 'fit' || step === 'actual') zoom = { mode: step, scale: 1 };
    else {
      const next = ZOOM_STEPS[Math.max(0, Math.min(ZOOM_STEPS.length - 1, (zoom.mode === 'scale' ? at : 0) + (step === 'in' ? 1 : -1)))];
      zoom = next === 1 ? { mode: 'fit', scale: 1 } : { mode: 'scale', scale: next };
    }
    applyZoom();
  });
  // Drag to pan a zoomed diagram. Scrolling and the arrow keys work too, because the stage is a scroll panel.
  let drag = null;
  stage.addEventListener('pointerdown', event => {
    if (stage.dataset.mode !== 'diagram' || zoom.mode === 'fit' || event.button !== 0) return;
    drag = { x: event.clientX, y: event.clientY, left: stage.scrollLeft, top: stage.scrollTop };
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointermove', event => { if (drag) { stage.scrollLeft = drag.left - (event.clientX - drag.x); stage.scrollTop = drag.top - (event.clientY - drag.y); } });
  for (const name of ['pointerup', 'pointercancel']) stage.addEventListener(name, () => { drag = null; });
  stage.addEventListener('dblclick', () => { if (stage.dataset.mode === 'diagram') { zoom = zoom.mode === 'fit' ? { mode: 'scale', scale: 2 } : { mode: 'fit', scale: 1 }; applyZoom(); } });

  async function open(item, { focus = false } = {}) {
    const mine = ++token;
    current = item;
    panel.dataset.know = 'viewer';
    title.textContent = item.title;
    for (const button of list.querySelectorAll('button[data-file]')) button.setAttribute('aria-current', String(button.dataset.file === item.file));
    zoom = { mode: 'fit', scale: 1 };
    if (!item.available) setStage('note', say('This file is listed but is not in the documents folder.'));
    else if (item.type === 'svg' || item.type === 'png') {
      const image = el('img', { class: 'sb-know__image', alt: item.title, draggable: 'false' });
      image.addEventListener('load', () => { if (mine === token) applyZoom(); });
      image.addEventListener('error', () => { if (mine === token) setStage('note', say('The relay did not send this diagram.')); });
      image.src = fileUrl(item.file);
      setStage('diagram', image);
      applyZoom();
    } else if (item.type === 'pdf') {
      const link = el('a', { class: 'sb-btn sb-btn--primary', href: fileUrl(item.file), target: '_blank', rel: 'noopener noreferrer' }, 'Open the PDF in a new tab');
      setStage('note', say('A PDF opens in the browser\'s own viewer.'), link);
    } else if (item.bytes > MAX_TEXT_BYTES) setStage('note', say('This document is too long to show here.'));
    else {
      setStage('note', say('Reading.'));
      try {
        const text = await get(fileUrl(item.file), 'text');
        if (mine !== token) return;
        const article = el('article', { class: 'sb-know__text' });
        for (const block of textBlocks(text, item.type)) article.append(el(block.kind === 'h1' ? 'h4' : block.kind === 'h2' ? 'h5' : block.kind === 'pre' ? 'pre' : 'p', {}, block.text));
        setStage('text', article);
      } catch { if (mine === token) setStage('note', say('The relay did not send this document.')); }
    }
    if (focus) stage.focus();
  }

  list.addEventListener('click', event => {
    const button = event.target.closest('button[data-file]');
    const item = button && items.find(entry => entry.file === button.dataset.file);
    if (item) open(item, { focus: true });
  });
  back.addEventListener('click', () => {
    panel.dataset.know = 'list';
    (list.querySelector('button[aria-current="true"]') || list.querySelector('button'))?.focus();
  });

  function draw(answer) {
    items = (Array.isArray(answer?.items) ? answer.items : []).filter(item => item && typeof item.title === 'string' && safeFile(item.file) && Object.hasOwn(TYPES, item.type));
    const words = { 'not-configured': 'No documents folder is set up on the relay.', missing: 'The documents folder or its list is not there.', invalid: 'The documents list could not be read.', unreadable: 'The documents folder could not be read.' };
    if (answer?.state !== 'configured') status.textContent = words[answer?.state] || 'The relay did not send a documents list.';
    else status.textContent = `${items.length} ${items.length === 1 ? 'item' : 'items'}${answer.sample ? ' · sample set for the simulator, not a real rig' : ''}`;
    status.dataset.sample = String(!!answer?.sample);
    const nodes = [];
    for (const [kind, heading] of [['diagram', 'Diagrams'], ['doc', 'Documents']]) {
      const group = items.filter(item => item.kind === kind);
      if (!group.length) continue;
      // A heading, then a list that holds nothing but its items.
      const rows = el('ul', { class: 'sb-know__items', 'aria-label': heading });
      for (const item of group) {
        const button = el('button', { type: 'button', class: 'sb-know__item', 'data-file': item.file, 'aria-current': String(current?.file === item.file) });
        button.append(el('span', { class: 'sb-know__name' }, item.title), el('span', { class: 'sb-know__type' }, item.available ? TYPES[item.type] : 'Missing'));
        const row = el('li'); row.append(button); rows.append(row);
      }
      nodes.push(el('h3', { class: 'sb-know__group' }, heading), rows);
    }
    list.replaceChildren(...nodes);
    if (current && !items.some(item => item.file === current.file)) { current = null; title.textContent = 'Choose a diagram or document'; setStage('empty'); panel.dataset.know = 'list'; }
    if (!current && !items.length) setStage('empty', say(status.textContent));
    else if (!current) setStage('empty', say('Choose a diagram or document from the list.'));
  }

  async function load({ force = false } = {}) {
    if (!force && Date.now() - loadedAt < 30000) return;
    loadedAt = Date.now();
    try { draw(await get(`api/know?audience=${audience}`, 'json')); }
    catch (error) { if (error.message !== 'signed out') draw({ state: error.status === 404 ? 'not-configured' : 'unreadable', items: [] }); loadedAt = 0; }
  }
  addEventListener('resize', () => { if (stage.dataset.mode === 'diagram') applyZoom(); });

  return { load, get items() { return items; } };
}
