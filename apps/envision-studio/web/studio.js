'use strict';
const $ = (id) => document.getElementById(id);
const API = '/api/v1';
const state = {
  tab: 'projects',
  list: [],
  project: null,
  version: null,
  stage: null,
  layer: null,
  archived: false,
  favorite: false,
  compare: false,
  other: null,
  mask: null,
  maskParent: null,
  request: 0,
  pending: new Map(),
  exports: new Map(),
  drafts: new Map(),
  get dirty() { return this.drafts.size > 0; },
  presets: [],
};
const uuid = () => crypto.randomUUID();
const path = (suffix) => '/projects/' + state.project.id + suffix;
const query = (obj) => new URLSearchParams(obj).toString();
const media = (pid, h, thumb = false) =>
  API + '/projects/' + pid + '/media/' + h + (thumb ? '?thumb=1' : '');
const stage = () => state.project?.data.stages.find((s) => s.id === state.stage);
const layer = () => stage()?.layers.find((l) => l.id === state.layer);
const version = () => state.project?.versions.find((v) => v.id === state.version);
const fieldText = (l) =>
  l.template
    ? l.template.replace(/\{\{(\w+)\}\}/g, (_, k) => state.project.data.fields[k] ?? '')
    : (state.project.data.fields[l.binding] ?? l.text);
function say(message, error = false) {
  $('message').textContent = message;
  document.querySelector('footer').classList.toggle('error', error);
}
function element(tag, text, cls) {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
}
function act(node, fn, event = 'click') {
  node.addEventListener(event, async (e) => {
    try {
      await fn(e);
    } catch (err) {
      say(err.message || 'Operation failed.', true);
    }
  });
}
function button(label, fn, cls) {
  const n = element('button', label, cls);
  n.type = 'button';
  act(n, fn);
  return n;
}
function options(id, items, wanted) {
  const sel = $(id);
  sel.replaceChildren(...items.map(([v, l]) => new Option(l, v)));
  if (items.some(([v]) => v === wanted)) sel.value = wanted;
}
function remember(k, v) {
  try {
    localStorage.setItem(k, v);
  } catch {}
}
function recall(k) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
async function api(route, { method = 'GET', body, form } = {}) {
  const headers = {};
  if (method !== 'GET') headers['X-Envision'] = 'studio';
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + route, {
    method,
    headers,
    body: form ?? (body === undefined ? undefined : JSON.stringify(body)),
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) throw Error(data.error || 'Studio request failed (' + res.status + ').');
  return data;
}
const post = (route, body = {}) => api(route, { method: 'POST', body });
async function download(route) {
  const res = await fetch(API + route);
  if (!res.ok) throw Error((await res.json()).error || 'Download unavailable.');
  const header = res.headers.get('content-disposition') || '';
  const utf = header.match(/filename\*=UTF-8''([^;]+)/i);
  const plain = header.match(/filename="?([^";]+)"?/i);
  const name = utf ? decodeURIComponent(utf[1]) : plain?.[1] || 'Envision';
  const url = URL.createObjectURL(await res.blob());
  const link = element('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  say('Download requested · ' + name);
}
async function named(title, value = '', type = false) {
  const dlg = $('name-dialog');
  $('dialog-title').textContent = title;
  $('dialog-name').value = value;
  $('kind-choice').hidden = !type;
  dlg.returnValue = 'cancel';
  dlg.showModal();
  $('dialog-name').focus();
  await new Promise((resolve) => dlg.addEventListener('close', resolve, { once: true }));
  return dlg.returnValue === 'ok' ? $('dialog-name').value.trim() : null;
}
function mayLeave() {
  return !state.dirty || confirm('Discard the unsaved form changes?');
}
function trackDraft(input) {
  const key = input.dataset.key ? 'field:' + input.dataset.key : input.id;
  state.drafts.set(key, input.type === 'checkbox' ? input.checked : input.value);
}
function restoreDrafts() {
  for (const [key, value] of state.drafts) {
    const input = key.startsWith('field:')
      ? $('fields').querySelector('[data-key="' + key.slice(6) + '"]')
      : $(key);
    if (!input) continue;
    if (input.type === 'checkbox') input.checked = value;
    else input.value = value;
  }
}
async function dashboard() {
  const data = await api('/state'),
    changed = JSON.stringify(state.list) !== JSON.stringify(data.projects);
  state.list = data.projects;
  const w =
    data.workers.find((x) => x.online && x.profiles.length) || data.workers.find((x) => x.online);
  state.worker = w;
  $('pause-worker').disabled = !w;
  $('pause-worker').textContent = w?.paused ? 'Resume worker' : 'Pause worker';
  $('worker').textContent = w
    ? w.paused
      ? 'Walter paused'
      : w.engine === 'Local engine offline'
        ? 'Engine offline'
        : w.busy
          ? 'Walter rendering'
          : 'Walter online'
    : 'Walter offline';
  $('pending').textContent = data.pending;
  if (changed || !$('project-grid').childElementCount) projectCards();
}
function projectCards() {
  const q = $('search').value.trim().toLowerCase();
  const list = state.list.filter(
    (p) =>
      p.archived === state.archived &&
      ([p.name, ...p.tags].join(' ').toLowerCase().includes(q) || state.matches?.has(p.id)),
  );
  $('project-grid').replaceChildren(
    ...list.map((p) => {
      const n = button('', () => open(p.id), 'card');
      n.setAttribute(
        'aria-label',
        p.name +
          ' ' +
          (p.kind === 'show' ? 'Show project' : 'Image project') +
          ' · revision ' +
          p.revision,
      );
      if (p.background) {
        const im = element('img');
        im.src = media(p.id, p.background, true);
        im.alt = '';
        im.loading = 'lazy';
        n.append(im);
      } else n.append(element('span', p.name.slice(0, 1), 'blank'));
      const stamp = new Date(p.updated * 1000).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      n.append(
        element('b', p.name),
        element(
          'small',
          (p.kind === 'show' ? 'Show' : 'Image') +
            ' · ' +
            stamp +
            ' · ' +
            (p.activeJobs ? p.activeJobs + ' pending' : 'r' + p.revision),
        ),
      );
      return n;
    }),
  );
  if (!list.length)
    $('project-grid').append(
      element('p', q ? 'No matching project.' : 'Create a project or import an editable flyer.'),
    );
  $('archive-filter').textContent = state.archived ? 'Show active' : 'Show archived';
}
function displayTab(name) {
  state.tab = name;
  const target =
    state.project && ['create', 'library', 'layout'].includes(name)
      ? 'project/' + state.project.id + '/' + name
      : name;
  window.history.replaceState(null, '', '#' + target);
  for (const n of document.querySelectorAll('nav [data-tab]')) {
    if (n.dataset.tab === name) n.setAttribute('aria-current', 'page');
    else n.removeAttribute('aria-current');
  }
  $('projects').hidden = name !== 'projects';
  $('queue').hidden = name !== 'queue';
  $('bench').hidden = !['create', 'library', 'layout'].includes(name);
  for (const id of ['create', 'library', 'layout']) $(id).hidden = id !== name;
  if (name === 'layout') $('view-mode').value = 'layout';
  if (name === 'create') $('view-mode').value = 'art';
  if (state.project && !$('bench').hidden) preview();
}
async function tab(name) {
  if (name === state.tab || !mayLeave()) return;
  if (['create', 'library', 'layout'].includes(name) && !state.project) {
    const last = recall('envision.personal.last'),
      p =
        state.list.find((x) => !x.archived && x.id === last) || state.list.find((x) => !x.archived);
    if (!p) {
      say('Create or import a project first.');
      return;
    }
    await open(p.id, name);
    return;
  }
  if (state.dirty) {
    state.drafts.clear();
    syncProject(true);
  }
  displayTab(name);
  if (name === 'queue') await queueView();
  if (name === 'projects') await dashboard();
}
async function open(pid, tabName = 'create') {
  if (!mayLeave()) return;
  const token = ++state.request;
  const p = await api('/projects/' + pid);
  if (token !== state.request) return;
  state.project = p;
  state.drafts.clear();
  state.version = p.data.selected || p.versions[0]?.id || null;
  state.stage = p.data.stages[0].id;
  for (const e of p.exports || [])
    if (['queued', 'running'].includes(e.state)) state.exports.set(e.id, p.id);
  state.layer = null;
  state.compare = false;
  state.other = null;
  state.mask = null;
  state.maskParent = null;
  state.submitKey = null;
  $('prompt').value = p.data.brief || '';
  $('operation').value = 'generate';
  $('starting').replaceChildren();
  for (const id of ['composition', 'style-ref']) $(id).replaceChildren();
  $('library-search').value = '';
  $('format').value = 'source';
  state.lastFormat = 'source';
  remember('envision.personal.last', pid);
  syncProject(true);
  displayTab(tabName);
  await presets();
  say(p.data.name + ' · revision ' + p.revision);
}
async function reload(forms = false) {
  if (!state.project) return;
  const id = state.project.id,
    seq = ++state.request,
    p = await api('/projects/' + id);
  if (seq !== state.request || state.project?.id !== id) return false;
  if (state.dirty && !forms && p.revision !== state.project.revision) {
    state.project.versions = p.versions;
    state.project.exports = p.exports;
    syncProject(false);
    say('Project changed on another device. Save your edits or reopen the latest revision.', true);
    return true;
  }
  state.project = p;
  syncProject(forms);
  return true;
}
async function edit(change, savedForm) {
  const p = state.project,
    d = structuredClone(p.data);
  const submitted = [...state.drafts].filter(([key]) =>
    savedForm === (key.startsWith('field:') ? 'fields' : 'layer'));
  change(d);
  const out = await api('/projects/' + p.id, {
    method: 'PATCH',
    body: { revision: p.revision, data: d },
  });
  if (state.project?.id !== p.id) return;
  state.project = { ...state.project, ...out };
  for (const [key, value] of submitted) {
    if (state.drafts.get(key) === value) state.drafts.delete(key);
  }
  syncProject(true);
  say('Saved revision ' + out.revision + '.');
  await dashboard();
}
function visibleVersions() {
  return state.project.versions.filter((v) => v.role !== 'mask');
}
function syncProject(forms) {
  const p = state.project;
  if (!p) return;
  $('project-title').textContent = p.data.name;
  $('project-kind').textContent = p.data.kind === 'show' ? 'Show project' : 'Image project';
  if (!stage()) state.stage = p.data.stages[0].id;
  if (!version()) state.version = p.data.selected || visibleVersions()[0]?.id || null;
  if (!layer()) state.layer = stage().layers[0]?.id || null;
  const refs = visibleVersions().map((v) => [v.id, v.label]);
  options('starting', [['', 'None'], ...refs], $('starting').value);
  for (const id of ['composition', 'style-ref']) {
    const map = new Map(visibleVersions().map((v) => [v.hash, v.label]));
    options(id, [['', 'None'], ...map], $(id).value);
  }
  if (state.other === state.version || !p.versions.some((v) => v.id === state.other))
    state.other = visibleVersions().find((v) => v.id !== state.version)?.id || null;
  options(
    'compare-version',
    refs.filter(([id]) => id !== state.version),
    state.other,
  );
  if (forms) {
    options(
      'stage',
      p.data.stages.map((s) => [s.id, s.name]),
      state.stage,
    );
    options(
      'layer',
      stage().layers.map((l) => [l.id, l.label]),
      state.layer,
    );
    layerForm();
    fieldsForm();
    restoreDrafts();
  }
  library();
  exportList();
  preview();
  operation();
}
function viewUrl(hash) {
  if ($('view-mode').value === 'art') return hash ? media(state.project.id, hash) : null;
  const q = {
    stage: state.stage,
    format: $('format').value,
    revision: state.project.revision,
    w: $('custom-w').value,
    h: $('custom-h').value,
    guides: $('guides').checked ? '1' : '0',
  };
  if (hash) q.background = hash;
  return API + path('/proof?' + query(q));
}
function setImg(id, url) {
  const n = $(id);
  if (!url) {
    n.removeAttribute('src');
    return;
  }
  if (n.getAttribute('src') !== url) n.src = url;
}
for (const id of ['art', 'other-art']) {
  $(id).addEventListener('error', async () => {
    const n = $(id),
      url = n.getAttribute('src');
    if (!url) return;
    let message = 'Preview unavailable. Reopen the project or retry the connection.';
    try {
      const r = await fetch(url);
      if (!r.ok) message = (await r.json()).error || message;
    } catch {}
    if (n.getAttribute('src') === url) say(message, true);
  });
}
function preview() {
  if (!state.project) return;
  const v = version(),
    o = state.project.versions.find((x) => x.id === state.other);
  const comparing = state.compare && Boolean(o);
  const currentHash =
    state.tab === 'layout' && !comparing
      ? stage()?.background || state.project.data.background
      : v?.hash || state.project.data.background;
  const url = viewUrl(currentHash);
  setImg('art', url);
  $('no-art').hidden = !!url;
  $('second-frame').hidden = !comparing;
  $('compare-tools').hidden = !comparing;
  setImg('other-art', comparing ? viewUrl(o.hash) : null);
  $('art-caption').textContent =
    $('view-mode').value === 'layout' ? stage().name + ' · ' + $('format').value : v?.label || '';
  $('other-caption').textContent = o?.label || '';
  $('compare').textContent = comparing ? 'End compare' : 'Compare';
  if (!comparing) $('frames').classList.remove('mobile-compare');
}
function operation() {
  const op = $('operation').value;
  $('generative').hidden = op === 'finish';
  $('finish-controls').hidden = op !== 'finish';
  $('mask-actions').hidden = !['mask', 'finish'].includes(op);
  $('generate').textContent = op === 'finish' ? 'Apply local finish' : 'Generate on Walter';
  const source = (op === 'finish' ? '' : $('starting').value) || state.version;
  $('mask-state').textContent = state.mask && state.maskParent === source
    ? 'Edit region saved.'
    : op === 'finish'
      ? 'The finish applies to the whole image until you paint a region.'
      : 'Paint the area to change.';
}
function library() {
  const q = $('library-search').value.trim().toLowerCase();
  const vs = visibleVersions().filter(
    (v) =>
      (!state.favorite || v.favorite) &&
      [v.label, v.recipe?.prompt || ''].join(' ').toLowerCase().includes(q),
  );
  $('versions').replaceChildren(
    ...vs.map((v) => {
      const n = button(
        '',
        () => {
          state.version = v.id;
          syncProject(false);
        },
        'version' + (v.id === state.version ? ' active' : ''),
      );
      const im = element('img');
      im.src = media(state.project.id, v.hash, true);
      im.loading = 'lazy';
      im.alt = '';
      n.append(
        im,
        element('b', (v.favorite ? '★ ' : '') + v.label),
        element('small', v.width + ' × ' + v.height + ' · ' + v.role),
      );
      return n;
    }),
  );
  $('version-actions').hidden = !version();
  if (version()) {
    $('recipe').textContent = JSON.stringify(version().recipe, null, 2);
    $('favorite').textContent = version().favorite ? 'Unfavorite' : 'Favorite';
    $('replay').hidden = !version().recipe?.prompt;
  }
  $('favorites').textContent = state.favorite ? 'Show all' : 'Favorites';
}
function layerForm() {
  $('source-file').hidden = !stage().importFile;
  const l = layer();
  $('layer-edit').hidden = !l;
  $('custom-size').hidden = $('format').value !== 'custom';
  const fmt = $('format').value,
    over = stage().formats[fmt] || {};
  $('framing').value = over.fit || 'fit';
  $('framing').disabled = fmt === 'source';
  $('guides').disabled = !['story', 'feed'].includes(fmt);
  if (!l) return;
  options(
    'binding',
    [['', 'Stage override'], ...Object.keys(state.project.data.fields).map((k) => [k, k])],
    l.binding,
  );
  $('wording').value = fieldText(l);
  $('template').value = l.template || '';
  $('locked').checked = !!l.locked;
  const b = projectedBox(l, fmt, over);
  ['x', 'y', 'w', 'h'].forEach((k, i) => ($('box-' + k).value = +(100 * b[i]).toFixed(5)));
  $('crop-x').value = 100 * (over.anchor?.[0] ?? 0.5);
  $('crop-y').value = 100 * (over.anchor?.[1] ?? 0.5);
  for (const id of [
    'wording',
    'template',
    'binding',
    'replace-logo',
    'clear-logo',
    'box-x',
    'box-y',
    'box-w',
    'box-h',
  ])
    $(id).disabled = !!l.locked;
}
function projectedBox(l, fmt, over) {
  if (over.boxes?.[l.id]) return over.boxes[l.id];
  if (fmt === 'source' || over.fit === 'fill') return l.box;
  const source = state.project.data.canvas;
  const sizes = {
    feed: [1080, 1350],
    story: [1080, 1920],
    lobby: [1920, 1080],
    custom: [+$('custom-w').value, +$('custom-h').value],
  };
  const output = sizes[fmt],
    scale = Math.min(output[0] / source[0], output[1] / source[1]);
  const fraction = source.map((n, i) => (n * scale) / output[i]),
    anchor = over.anchor || [0.5, 0.5];
  return l.box.map((n, i) => n * fraction[i % 2] + (i < 2 ? (1 - fraction[i]) * anchor[i] : 0));
}
function fieldsForm() {
  const nodes = Object.entries(state.project.data.fields).map(([key, value]) => {
    const binding = stage().layers.find((l) => l.binding === key);
    const l = element('label', binding ? binding.label + ' · ' + key : key),
      input = element('input');
    input.dataset.key = key;
    input.value = value;
    input.maxLength = 800;
    if (key === 'copy') input.maxLength = 1600;
    if (['starts', 'ends'].includes(key)) input.type = 'datetime-local';
    input.addEventListener('input', () => trackDraft(input));
    l.append(input);
    return l;
  });
  $('fields').replaceChildren(...nodes);
  $('field-effects').textContent = '';
  $('fields').oninput = (e) => {
    const key = e.target.dataset.key;
    if (!key) return;
    const using = state.project.data.stages.filter((s) =>
      s.layers.some((l) => l.binding === key || l.template?.includes('{{' + key + '}}')),
    );
    const independent = state.project.data.stages.filter((s) => !using.includes(s));
    $('field-effects').textContent =
      (using.length
        ? 'Uses this field in ' + using.map((s) => s.name).join(', ') + '.'
        : 'No layer uses this field.') +
      (independent.length ? ' Other stages use their own copy or omit this field.' : '');
  };
}
async function loadAsset(file, role) {
  const form = new FormData();
  form.append('file', file);
  form.append('role', role);
  return api(path('/assets'), { method: 'POST', form });
}
async function fileInput(id, fn) {
  act(
    $(id),
    async () => {
      const file = $(id).files[0];
      $(id).value = '';
      if (!file) return;
      await fn(file);
    },
    'change',
  );
}
function saveMark(h) {
  return edit((d) => {
    const l = d.stages.find((s) => s.id === state.stage).layers.find((x) => x.id === state.layer);
    if (l.locked) throw Error('Unlock the layer before changing its logo.');
    if (l.binding) {
      if (h) d.logos[l.binding] = h;
      else delete d.logos[l.binding];
      l.logo = null;
    } else l.logo = h;
  });
}
function exportList() {
  const rows = state.project.exports || [];
  $('export-list').replaceChildren(
    ...rows.slice(0, 6).map((x) => {
      const n = element('div', undefined, 'download');
      n.append(element('b', 'Revision ' + x.revision + ' · ' + x.state));
      const tools = element('div', undefined, 'tools');
      for (const f of x.files) {
        tools.append(
          button((f.stage ? f.stage + ' · ' : '') + f.format, () =>
            download(path('/media/' + f.hash + '?' + query({ download: f.name }))),
          ),
        );
      }
      if (x.state === 'succeeded')
        tools.append(button('Package ZIP', () => download('/exports/' + x.id + '/package')));
      if (x.state === 'failed') {
        n.append(element('p', x.error));
        tools.append(
          button('Retry', async () => {
            await post('/exports/' + x.id + '/retry');
            state.exports.set(x.id, state.project.id);
          }),
        );
      }
      n.append(tools);
      return n;
    }),
  );
}
async function queueView() {
  const jobs = await api('/jobs');
  $('jobs').replaceChildren(
    ...jobs.map((j) => {
      const n = element('article', undefined, 'job');
      const pname = state.list.find((p) => p.id === j.project)?.name || 'Project';
      n.append(
        element('h3', pname + ' · ' + j.state),
        element('p', j.payload.prompt),
        element(
          'small',
          j.state === 'queued'
            ? 'Waiting for a compatible worker'
            : j.error ||
                [
                  j.worker,
                  j.progress,
                  j.receipt?.totalSeconds ? j.receipt.totalSeconds + ' s elapsed' : '',
                ]
                  .filter(Boolean)
                  .join(' · '),
        ),
      );
      const controls = element('div', undefined, 'tools');
      if (['queued', 'running'].includes(j.state))
        controls.append(
          button('Cancel', async () => {
            await post('/jobs/' + j.id + '/cancel');
            await queueView();
          }),
        );
      if (['failed', 'cancelled'].includes(j.state))
        controls.append(
          button('Retry', async () => {
            await post('/jobs/' + j.id + '/retry');
            state.pending.set(j.id, j.project);
            await queueView();
          }),
        );
      if (j.result)
        controls.append(
          button('Open result', async () => {
            await open(j.project, 'library');
            state.version = j.result;
            syncProject(false);
          }),
        );
      n.append(controls);
      return n;
    }),
  );
  if (!jobs.length) $('jobs').append(element('p', 'No render jobs yet.'));
}
async function presets() {
  state.presets = await api('/presets');
  options(
    'preset',
    [['', 'Choose preset'], ...state.presets.map((p) => [p.id, p.name])],
    $('preset').value,
  );
}
function recipe() {
  const refs = {};
  if ($('composition').value) refs.composition = $('composition').value;
  if ($('style-ref').value) refs.style = $('style-ref').value;
  const parent =
    $('starting').value ||
    (['mask', 'revise'].includes($('operation').value) ? state.version : null);
  if ($('operation').value === 'mask') {
    if (!state.mask || state.maskParent !== parent)
      throw Error('Paint an edit region for this source first.');
    refs.mask = state.mask;
  }
  return {
    operation: $('operation').value,
    prompt: $('prompt').value.trim(),
    size: $('render-size').value.split(',').map(Number),
    count: Number($('count').value),
    seed: $('seed').value === '' ? null : Number($('seed').value),
    parent,
    refs,
    strength: Number($('strength').value),
    profile: 'sdxl-turbo-local',
  };
}
act(
  $('create'),
  async (e) => {
    e.preventDefault();
    if ($('generate').disabled) return;
    $('generate').disabled = true;
    try {
      if ($('operation').value === 'finish') {
        const parent = state.version,
          mask = state.maskParent === parent ? state.mask : null;
        const r = await post(path('/finishes'), {
          parent,
          mask,
          effect: $('effect').value,
          amount: Number($('amount').value),
        });
        state.version = r.id;
        await reload();
        displayTab('library');
        say('Local finish saved.');
        return;
      }
      const b = recipe(),
        fingerprint = JSON.stringify([state.project.id, b]);
      if (!b.prompt) throw Error('Enter an image direction.');
      if (!state.submitKey || state.submitKey.fingerprint !== fingerprint)
        state.submitKey = { fingerprint, key: uuid() };
      const r = await post(path('/jobs'), { ...b, key: state.submitKey.key });
      state.submitKey = null;
      r.jobs.forEach((id) => state.pending.set(id, state.project.id));
      say(
        r.jobs.length +
          ' candidate' +
          (r.jobs.length === 1 ? '' : 's') +
          ' queued. You can close this tab.',
      );
      await dashboard();
      await queueView();
    } finally {
      $('generate').disabled = false;
    }
  },
  'submit',
);

for (const n of document.querySelectorAll('nav [data-tab]')) act(n, () => tab(n.dataset.tab));
act($('theme'), () => {
  const dark = document.documentElement.dataset.theme !== 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  $('theme').textContent = dark ? 'Light' : 'Dark';
  remember('envision.personal.theme', dark ? 'dark' : 'light');
});
if (recall('envision.personal.theme') === 'dark') $('theme').click();
let searchTimer;
$('search').oninput = () => {
  clearTimeout(searchTimer);
  state.matches = null;
  projectCards();
  const q = $('search').value.trim();
  if (q)
    searchTimer = setTimeout(async () => {
      try {
        const ids = await api('/projects/search?' + query({ q }));
        if ($('search').value.trim() === q) {
          state.matches = new Set(ids);
          projectCards();
        }
      } catch (err) {
        say(err.message, true);
      }
    }, 200);
};
act($('archive-filter'), () => {
  state.archived = !state.archived;
  projectCards();
});
act($('new-project'), async () => {
  const name = await named('New project', '', true);
  if (!name) return;
  const p = await post('/projects', { name, kind: $('dialog-kind').value });
  await dashboard();
  await open(p.id);
});
fileInput('import-project', async (f) => {
  const form = new FormData();
  form.append('file', f);
  const p = await api('/imports', { method: 'POST', form });
  await dashboard();
  await open(p.id, 'layout');
});
for (const [id, role] of [
  ['reference-file', 'reference'],
  ['library-file', 'reference'],
]) {
  fileInput(id, async (f) => {
    const r = await loadAsset(f, role);
    state.version = r.id;
    await reload();
    if (id === 'reference-file') $('composition').value = r.hash;
    say('Reference saved.');
  });
}
act($('project-menu'), () => {
  $('edit-name').value = state.project.data.name;
  $('edit-tags').value = state.project.data.tags.join(', ');
  $('archive').textContent = state.project.data.archived ? 'Restore project' : 'Archive';
  $('settings-dialog').showModal();
});
act($('save-project'), async () => {
  await edit((d) => {
    d.name = $('edit-name').value.trim();
    d.tags = $('edit-tags')
      .value.split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  });
  $('settings-dialog').close();
});
act($('archive'), async () => {
  await edit((d) => (d.archived = !d.archived));
  $('settings-dialog').close();
  displayTab('projects');
});
act($('duplicate'), async () => {
  const p = await post(path('/duplicate'));
  $('settings-dialog').close();
  await dashboard();
  await open(p.id);
});
$('operation').onchange = operation;
$('starting').onchange = () => {
  state.mask = null;
  state.maskParent = null;
  operation();
};
act($('save-preset'), async () => {
  const name = await named('Save style preset');
  if (!name) return;
  const b = recipe();
  delete b.parent;
  delete b.refs.mask;
  b.operation = 'generate';
  await post('/presets', { name, project: state.project.id, data: b });
  await presets();
  say('Style preset saved.');
});
act($('apply-preset'), async () => {
  if (!$('preset').value) throw Error('Choose a saved style.');
  const b = await post(path('/presets/' + $('preset').value + '/apply'));
  await reload();
  $('prompt').value = b.prompt;
  $('render-size').value = b.size.join(',');
  $('strength').value = b.strength;
  $('count').value = b.count;
  $('seed').value = b.seed ?? '';
  $('operation').value = b.operation;
  for (const [id, role] of [
    ['composition', 'composition'],
    ['style-ref', 'style'],
  ]) {
    if (b.refs[role] && ![...$(id).options].some((o) => o.value === b.refs[role]))
      $(id).add(new Option('Preset reference', b.refs[role]));
    $(id).value = b.refs[role] || '';
  }
  operation();
  say('Style preset applied.');
});
act($('compare'), () => {
  if (!state.other) throw Error('Add a second image to compare.');
  state.compare = !state.compare;
  preview();
});
act($('expand-proof'), () => {
  if (!$('art').src) throw Error('Select artwork to view.');
  $('proof-art').src = $('art').src;
  $('proof-label').textContent = $('art-caption').textContent || state.project.data.name;
  $('proof-swap').hidden = !state.compare;
  $('proof-dialog').showModal();
});
act($('proof-swap'), () => {
  const second = $('proof-art').src === $('art').src;
  $('proof-art').src = $(second ? 'other-art' : 'art').src;
  $('proof-label').textContent = $(second ? 'other-caption' : 'art-caption').textContent;
});
act($('proof-close'), () => $('proof-dialog').close());
act(
  $('compare-version'),
  () => {
    state.other = $('compare-version').value;
    preview();
  },
  'change',
);
act($('swap-compare'), () => {
  const old = state.version;
  state.version = state.other;
  state.other = old;
  syncProject(false);
});
act($('zoom'), () => {
  $('frames').classList.toggle('zoomed');
});
$('view-mode').onchange = preview;
act($('favorites'), () => {
  state.favorite = !state.favorite;
  library();
});
$('library-search').oninput = library;
act($('favorite'), async () => {
  await post(path('/versions/' + state.version + '/favorite'));
  await reload();
});
act($('use-art'), async () => {
  const v = version();
  await edit((d) => {
    d.selected = v.id;
    d.background = v.hash;
    if (d.kind === 'image') d.canvas = [v.width, v.height];
  });
});
act($('save-brief'), async () => {
  await edit((d) => {
    d.brief = $('prompt').value.trim();
  });
});
act($('replay'), () => {
  const r = version().recipe;
  displayTab('create');
  $('prompt').value = r.prompt;
  $('operation').value = r.operation;
  $('render-size').value = r.size.join(',');
  $('seed').value = r.seed;
  $('count').value = '1';
  $('strength').value = r.strength;
  $('starting').value = r.parent || '';
  $('composition').value = r.refs?.composition || '';
  $('style-ref').value = r.refs?.style || '';
  state.mask = r.refs?.mask || null;
  state.maskParent = r.parent;
  operation();
  say('Generation settings restored.');
});
act($('revise-art'), () => {
  displayTab('create');
  $('starting').value = state.version;
  $('operation').value = 'revise';
  operation();
});
act($('download-art'), () => download(path('/versions/' + state.version + '/png')));
act(
  $('stage'),
  () => {
    if (!mayLeave()) {
      $('stage').value = state.stage;
      return;
    }
    state.drafts.clear();
    state.stage = $('stage').value;
    state.layer = null;
    syncProject(true);
  },
  'change',
);
act(
  $('layer'),
  () => {
    if (!mayLeave()) {
      $('layer').value = state.layer;
      return;
    }
    state.drafts.clear();
    state.layer = $('layer').value;
    layerForm();
    fieldsForm();
  },
  'change',
);
act(
  $('format'),
  () => {
    if (!mayLeave()) {
      $('format').value = state.lastFormat || 'source';
      return;
    }
    state.drafts.clear();
    state.lastFormat = $('format').value;
    layerForm();
    fieldsForm();
    preview();
  },
  'change',
);
act(
  $('framing'),
  () =>
    edit((d) => {
      const s = d.stages.find((s) => s.id === state.stage);
      const cfg = (s.formats[$('format').value] ??= { boxes: {}, anchor: [0.5, 0.5] });
      cfg.fit = $('framing').value;
    }),
  'change',
);
act($('guides'), preview, 'change');
for (const k of ['custom-w', 'custom-h']) act($(k), preview, 'change');
for (const k of [
  'wording',
  'binding',
  'template',
  'box-x',
  'box-y',
  'box-w',
  'box-h',
  'crop-x',
  'crop-y',
  'locked',
]) {
  $(k).addEventListener('input', () => trackDraft($(k)));
}
$('binding').onchange = () => {
  if ($('binding').value) {
    $('wording').value = state.project.data.fields[$('binding').value];
    trackDraft($('wording'));
  }
};
act($('save-layer'), () =>
  edit((d) => {
    const s = d.stages.find((s) => s.id === state.stage),
      l = s.layers.find((l) => l.id === state.layer),
      fmt = $('format').value;
    if (!l.locked) {
      l.binding = $('binding').value;
      l.template = $('template').value;
      if (!l.template) {
        if (l.binding) d.fields[l.binding] = $('wording').value;
        else l.text = $('wording').value;
      }
      const b = ['x', 'y', 'w', 'h'].map((k) => Number($('box-' + k).value) / 100);
      const cfg = (s.formats[fmt] ??= { anchor: [0.5, 0.5], boxes: {} });
      cfg.boxes ??= {};
      cfg.anchor = [$('crop-x'), $('crop-y')].map((n) => Number(n.value) / 100);
      if (fmt === 'source') l.box = b;
      else if (b.some((n, i) => Math.abs(n - projectedBox(l, fmt, cfg)[i]) > 1e-6))
        cfg.boxes[l.id] = b;
    }
    l.locked = $('locked').checked;
  }, 'layer'),
);
fileInput('replace-logo', async (f) => {
  const r = await loadAsset(f, 'logo');
  await saveMark(r.hash);
  await reload();
});
act($('clear-logo'), () => saveMark(null));
act($('add-layer'), async () => {
  const label = await named('New layer');
  if (!label || !mayLeave()) return;
  state.drafts.clear();
  const id = uuid();
  state.layer = id;
  await edit((d) =>
    d.stages
      .find((s) => s.id === state.stage)
      .layers.push({
        id,
        label,
        kind: 'info',
        text: label,
        original: '',
        binding: '',
        template: '',
        box: [0.1, 0.44, 0.8, 0.12],
        locked: false,
        logo: null,
        art: null,
      }),
  );
});
act($('add-field'), async () => {
  const key = await named('New event field');
  if (!key) return;
  if (!/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(key))
    throw Error('Use letters, digits or underscores for the field name.');
  if (Object.hasOwn(state.project.data.fields, key))
    throw Error('That event field already exists.');
  await edit((d) => {
    for (const input of $('fields').querySelectorAll('input'))
      d.fields[input.dataset.key] = input.value;
    d.fields[key] = '';
  }, 'fields');
});
act($('save-fields'), () =>
  edit((d) => {
    for (const input of $('fields').querySelectorAll('input'))
      d.fields[input.dataset.key] = input.value;
  }, 'fields'),
);
act($('new-stage'), async () => {
  const name = await named('Duplicate stage', stage().name + ' copy');
  if (!name || !mayLeave()) return;
  state.drafts.clear();
  const s = structuredClone(stage());
  s.name = name;
  s.id = uuid();
  state.stage = s.id;
  await edit((d) => d.stages.push(s));
});
fileInput('stage-file', async (f) => {
  const name = await named('Stage name', f.name.replace(/(?:\.flyer)?\.json$/i, ''));
  if (!name || !mayLeave()) return;
  state.drafts.clear();
  const form = new FormData();
  form.append('file', f);
  form.append('stage', name);
  form.append('revision', state.project.revision);
  const p = await api(path('/imports'), { method: 'POST', form });
  state.stage = p.data.stages.at(-1).id;
  await reload(true);
});
act($('make-export'), async () => {
  if (state.dirty) throw Error('Save your layer and event edits before exporting.');
  const formats = [...$('output-formats').querySelectorAll(':checked')].map((n) => n.value);
  const r = await post(path('/exports'), {
    revision: state.project.revision,
    stage: state.stage,
    campaign: $('all-stages').checked,
    formats,
    size: [+$('custom-w').value, +$('custom-h').value],
  });
  state.exports.set(r.id, state.project.id);
  await reload();
  say('Output set queued on Dominic.');
});
act($('native'), () => download(path('/editable?revision=' + state.project.revision)));
act($('source-file'), () => {
  const file = stage().importFile;
  return download(path('/media/' + file.hash + '?' + query({ download: file.name })));
});
act($('legacy'), () =>
  download(
    path(
      '/editable?' +
        query({ revision: state.project.revision, type: 'legacy', stage: state.stage }),
    ),
  ),
);
act($('refresh-jobs'), queueView);
act($('pause-worker'), async () => {
  const w = state.worker;
  if (!w) return;
  await post('/workers/' + encodeURIComponent(w.id) + '/pause', { paused: !w.paused });
  say(
    w.paused
      ? 'Worker will resume on its next heartbeat.'
      : 'Worker will pause after the active job.',
  );
});
window.addEventListener('beforeunload', (e) => {
  if (state.dirty) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// The edit map stays in source pixel coordinates. The overlay is display-only.
let maskBase = null,
  editingMaskParent = null,
  maskMap = null,
  history = [],
  painting = false,
  lastPoint = null;
function redrawMask() {
  const cv = $('mask-canvas'),
    ctx = cv.getContext('2d');
  ctx.drawImage(maskBase, 0, 0);
  const tint = document.createElement('canvas');
  tint.width = cv.width;
  tint.height = cv.height;
  const tc = tint.getContext('2d');
  tc.drawImage(maskMap, 0, 0);
  tc.globalCompositeOperation = 'source-in';
  tc.fillStyle = '#ff735b';
  tc.fillRect(0, 0, cv.width, cv.height);
  ctx.globalAlpha = 0.58;
  ctx.drawImage(tint, 0, 0);
  ctx.globalAlpha = 1;
}
function stash() {
  if (history.length >= 6) history.shift();
  history.push(maskMap.getContext('2d').getImageData(0, 0, maskMap.width, maskMap.height));
}
act($('paint-mask'), async () => {
  const id = ($('operation').value === 'finish' ? '' : $('starting').value) || state.version,
    v = state.project.versions.find((x) => x.id === id);
  if (!v) throw Error('Choose a starting image.');
  if (v.width * v.height > 4_194_304)
    throw Error('Use a source of 4 megapixels or less for phone mask editing.');
  maskBase = new Image();
  maskBase.src = media(state.project.id, v.hash);
  await maskBase.decode();
  maskMap = element('canvas');
  maskMap.width = maskBase.naturalWidth;
  maskMap.height = maskBase.naturalHeight;
  const cv = $('mask-canvas');
  cv.width = maskMap.width;
  cv.height = maskMap.height;
  history = [];
  if (state.mask && state.maskParent === id) {
    const old = new Image();
    old.src = media(state.project.id, state.mask);
    await old.decode();
    const mc = maskMap.getContext('2d');
    mc.drawImage(old, 0, 0);
    const data = mc.getImageData(0, 0, cv.width, cv.height);
    for (let i = 0; i < data.data.length; i += 4) data.data[i + 3] = data.data[i];
    mc.putImageData(data, 0, 0);
  }
  editingMaskParent = id;
  redrawMask();
  $('mask-dialog').showModal();
});
const cv = $('mask-canvas');
function paint(e) {
  const r = cv.getBoundingClientRect(),
    x = ((e.clientX - r.left) * cv.width) / r.width,
    y = ((e.clientY - r.top) * cv.height) / r.height;
  const ctx = maskMap.getContext('2d'),
    width = (Math.min(cv.width, cv.height) * Number($('brush').value)) / 100;
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'white';
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, width / 2, 0, Math.PI * 2);
  ctx.fill();
  if (lastPoint) {
    ctx.beginPath();
    ctx.moveTo(...lastPoint);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  lastPoint = [x, y];
  redrawMask();
}
cv.onpointerdown = (e) => {
  stash();
  painting = true;
  lastPoint = null;
  cv.setPointerCapture(e.pointerId);
  paint(e);
};
cv.onpointermove = (e) => {
  if (painting) paint(e);
};
cv.onpointerup = cv.onpointercancel = () => {
  painting = false;
  lastPoint = null;
};
act($('undo-mask'), () => {
  if (history.length) {
    maskMap.getContext('2d').putImageData(history.pop(), 0, 0);
    redrawMask();
  }
});
act($('clear-mask'), () => {
  stash();
  maskMap.getContext('2d').clearRect(0, 0, cv.width, cv.height);
  redrawMask();
});
act($('invert-mask'), () => {
  stash();
  const c = maskMap.getContext('2d'),
    d = c.getImageData(0, 0, cv.width, cv.height);
  for (let i = 0; i < d.data.length; i += 4) {
    d.data[i + 3] = 255 - d.data[i + 3];
    d.data[i] = d.data[i + 1] = d.data[i + 2] = 255;
  }
  c.putImageData(d, 0, 0);
  redrawMask();
});
act($('mask-zoom'), () => cv.parentElement.classList.toggle('zoom'));
act($('mask-close'), () => $('mask-dialog').close());
act($('mask-save'), async () => {
  const parent = editingMaskParent, pid = state.project.id;
  const out = element('canvas');
  out.width = cv.width;
  out.height = cv.height;
  const c = out.getContext('2d');
  c.fillStyle = 'black';
  c.fillRect(0, 0, cv.width, cv.height);
  c.drawImage(maskMap, 0, 0);
  const blob = await new Promise((resolve) => out.toBlob(resolve, 'image/png'));
  if (!blob) throw Error('Could not encode mask.');
  const r = await loadAsset(new File([blob], 'Edit region.png', { type: 'image/png' }), 'mask');
  if (state.project.id !== pid || editingMaskParent !== parent) return;
  state.mask = r.hash;
  state.maskParent = parent;
  $('mask-dialog').close();
  operation();
  say('Mask saved. Clear pixels are protected.');
});

let polling = false;
async function tick() {
  if (polling || document.hidden) return;
  polling = true;
  try {
    await dashboard();
    if (state.tab === 'queue') await queueView();
    let update = false;
    const finishedJobs = [], finishedExports = [];
    for (const [id, pid] of [...state.pending]) {
      const j = await api('/jobs/' + id);
      if (['succeeded', 'failed', 'cancelled'].includes(j.state)) {
        finishedJobs.push(id);
        if (state.project?.id === pid) {
          update = true;
          if (j.result && !state.dirty) state.version = j.result;
        }
        say(
          j.state === 'succeeded' ? 'Candidate ready in Library.' : j.error || j.state,
          j.state === 'failed',
        );
      }
    }
    for (const [id, pid] of [...state.exports]) {
      const x = await api('/exports/' + id);
      if (!['queued', 'running'].includes(x.state)) {
        finishedExports.push(id);
        update ||= state.project?.id === pid;
        say(x.error || 'Export ready.', !!x.error);
      }
    }
    if (update && !(await reload())) return;
    for (const id of finishedJobs) state.pending.delete(id);
    for (const id of finishedExports) state.exports.delete(id);
  } catch (err) {
    say(err.message, true);
  } finally {
    polling = false;
  }
}
async function start() {
  await dashboard();
  for (const j of await api('/jobs'))
    if (['queued', 'running'].includes(j.state)) state.pending.set(j.id, j.project);
  const deep = location.hash.match(/^#project\/([a-f0-9]{32})\/(create|layout|library)$/);
  if (deep && state.list.some((p) => p.id === deep[1])) await open(deep[1], deep[2]);
  else if (location.hash === '#queue') await tab('queue');
  else say('Private studio ready.');
  setInterval(tick, 5000);
}
window.addEventListener('hashchange', async () => {
  const deep = location.hash.match(/^#project\/([a-f0-9]{32})\/(create|layout|library)$/);
  try {
    if (deep) await open(deep[1], deep[2]);
    else await tab(location.hash === '#queue' ? 'queue' : 'projects');
  } catch (err) {
    say(err.message, true);
  }
});
start().catch((err) => say(err.message, true));
