'use strict';

function createWebExporter(saveBlob) {
  const get = (id) => document.getElementById('web-' + id);
  const dialog = get('dialog'), format = get('format'), framing = get('framing');
  const preview = get('preview'), status = get('status'), name = get('name');
  let profiles, versionRoute, request, blob, previewUrl;

  function clearPreview() {
    request?.abort();
    preview.hidden = true;
    preview.removeAttribute('src');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    blob = null;
    get('retry').hidden = true;
    get('download').disabled = true;
  }

  async function read(url, signal) {
    const response = await fetch(url, { cache: 'no-store', signal });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw Error(body?.error || 'The studio connection failed. Retry the preview.');
    }
    return response;
  }

  async function refresh() {
    clearPreview();
    const controller = new AbortController();
    request = controller;
    const current = () => dialog.open && request === controller && !controller.signal.aborted;
    let pendingUrl;
    status.textContent = 'Preparing preview…';
    try {
      if (!profiles) {
        const response = await read('/api/v1/artwork-formats', controller.signal);
        const values = (await response.json()).formats;
        if (!current()) return;
        if (!Array.isArray(values) || !values.length)
          throw Error('Web formats are unavailable. Retry the preview.');
        format.replaceChildren(...values.map((p) => new Option(
          p.label + ' · ' + p.width + ' × ' + p.height + ' · ' + (p.extension === 'jpg' ? 'JPEG' : 'WebP'), p.id
        )));
        profiles = values;
      }
      const profile = profiles.find((p) => p.id === format.value);
      get('extension').textContent = '.' + profile.extension;
      const query = new URLSearchParams({ format: profile.id, framing: framing.value });
      const response = await read(versionRoute + '?' + query, controller.signal);
      const data = await response.blob();
      if (!current()) return;
      if (data.type !== profile.mime) throw Error('The studio returned an unexpected image format.');
      pendingUrl = URL.createObjectURL(data);
      const check = new Image();
      check.src = pendingUrl;
      await check.decode();
      if (!current()) return;
      if (check.naturalWidth !== profile.width || check.naturalHeight !== profile.height)
        throw Error('The preview has unexpected dimensions.');
      blob = data;
      previewUrl = pendingUrl;
      pendingUrl = null;
      preview.src = previewUrl;
      preview.hidden = false;
      status.textContent = profile.width + ' × ' + profile.height + ' px · ' + (blob.size / 1024).toFixed(1) + ' KiB';
      get('download').disabled = false;
    } catch (error) {
      if (!current()) return;
      status.textContent = error.message || 'Could not prepare this preview.';
      get('retry').hidden = false;
    } finally {
      if (pendingUrl) URL.revokeObjectURL(pendingUrl);
    }
  }

  function cleanName(value) {
    let base = value.trim().replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '-').replace(/[. ]+$/, '');
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(base)) base = '_' + base;
    return base;
  }
  function validName() {
    const value = name.value.trim();
    const valid = value && value === cleanName(value) && new TextEncoder().encode(value).length <= 240;
    name.setCustomValidity(valid ? '' : 'Use a short file name without path separators, reserved characters or a trailing period.');
    return valid;
  }

  function trimExtension() {
    const suffix = get('extension').textContent;
    const value = name.value.trim();
    if (suffix && value.length > suffix.length && value.toLowerCase().endsWith(suffix))
      name.value = value.slice(0, -suffix.length);
    validName();
  }
  get('form').addEventListener('submit', (event) => {
    event.preventDefault();
    trimExtension();
    if (blob && name.reportValidity())
      saveBlob(blob, name.value.trim() + get('extension').textContent);
  });
  name.addEventListener('input', validName);
  name.addEventListener('blur', trimExtension);
  format.addEventListener('change', refresh);
  framing.addEventListener('change', refresh);
  get('retry').addEventListener('click', refresh);
  get('close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { if (!dialog.open) clearPreview(); });
  window.addEventListener('pagehide', () => { if (dialog.open) dialog.close(); clearPreview(); });
  return (project, artwork) => {
    versionRoute = '/api/v1/projects/' + project.id + '/versions/' + artwork.id + '/web-asset';
    get('source').textContent = artwork.label;
    name.value = cleanName(project.data.name) || 'Envision';
    validName();
    framing.value = 'center';
    if (profiles) format.value = 'square';
    dialog.showModal();
    format.focus();
    refresh();
  };
}
