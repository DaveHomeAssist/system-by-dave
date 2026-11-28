'use strict';

function createDirectionEditor({ project, artwork, api, reload, notify }) {
  const el = (id) => document.getElementById(id);
  const input = el('prompt');
  const dialog = el('direction-dialog');
  const drafts = new Map();
  const saving = new Set();
  const prefix = 'envision.create.direction.v1.';
  const savedText = () => project()?.data.brief || '';
  const studies = globalThis.EnvisionDirections;

  function draftFor(id) {
    if (!drafts.has(id)) {
      let draft = null;
      try {
        const found = JSON.parse(sessionStorage.getItem(prefix + id));
        if (found && [found.base, found.text].every((s) => typeof s === 'string' && s.length <= 6000))
          draft = { base: found.base, text: found.text };
      } catch {}
      drafts.set(id, draft);
    }
    return drafts.get(id);
  }

  function store(id, draft) {
    drafts.set(id, draft);
    try {
      if (draft) sessionStorage.setItem(prefix + id, JSON.stringify(draft));
      else sessionStorage.removeItem(prefix + id);
    } catch {}
  }

  function refresh() {
    const p = project();
    if (!p) return;
    const saved = savedText();
    let draft = draftFor(p.id);
    if (draft?.text === saved && !saving.has(p.id)) {
      store(p.id, null);
      draft = null;
    }
    const text = draft?.text ?? saved;
    if (input.value !== text) input.value = text;
    const conflict = !!draft && draft.base !== saved;
    el('save-brief').disabled = !draft || conflict || saving.has(p.id);
    el('direction-state').textContent = saving.has(p.id) ? 'Saving…' : conflict ? 'Review changes'
      : draft ? 'Draft in this tab' : saved ? 'Saved to project' : '';
    el('direction-conflict').hidden = !conflict;
    el('other-direction').textContent = conflict ? saved || '(Empty direction)' : '';
    if (dialog.open) updateRecallButtons();
  }

  function setText(text) {
    const id = project().id;
    const saved = savedText();
    store(id, text === saved && !saving.has(id) ? null : { base: draftFor(id)?.base ?? saved, text });
    refresh();
  }

  function canReplace(text) {
    return !draftFor(project().id)?.text || input.value === text
      || confirm('Replace your unsaved image direction?');
  }

  async function save() {
    const id = project().id;
    const draft = draftFor(id);
    if (!draft || saving.has(id) || draft.base !== savedText()) return;
    saving.add(id);
    refresh();
    try {
      const out = await api('/projects/' + id + '/brief', {
        method: 'PATCH', body: { brief: draft.text, expectedBrief: draft.base },
      });
      const current = draftFor(id);
      store(id, current && current.text !== draft.text && current.text !== out.brief
        ? { base: out.brief, text: current.text } : null);
      if (project()?.id === id) {
        project().data.brief = out.brief;
        await reload();
      }
    } catch (err) {
      if (project()?.id === id) {
        if (err.status === 409) await reload();
        else throw err;
      }
    } finally {
      saving.delete(id);
      if (project()?.id === id) refresh();
    }
  }

  function choose(text) {
    if (typeof text !== 'string' || !canReplace(text)) return;
    setText(text);
    dialog.close();
    input.focus();
  }

  function updateRecallButtons() {
    el('recall-brief').hidden = !savedText();
    el('recall-art').hidden = !artwork()?.recipe?.prompt;
    el('stored-directions').hidden = el('recall-brief').hidden && el('recall-art').hidden;
  }

  function showPicker() {
    const gallery = el('direction-gallery');
    if (!gallery.childElementCount) {
      for (const study of studies) {
        const tile = document.createElement('button');
        tile.type = 'button';
        tile.setAttribute('aria-label', 'Use ' + study.name + ' direction');
        const image = document.createElement('img');
        image.src = '/ui/directions/' + study.id + '.webp';
        image.alt = study.alt;
        image.width = 640;
        image.height = 360;
        const label = document.createElement('span');
        label.textContent = study.name;
        tile.append(image, label);
        tile.addEventListener('click', () => choose(study.prompt));
        gallery.append(tile);
      }
    }
    updateRecallButtons();
    dialog.showModal();
  }

  input.addEventListener('input', () => setText(input.value));
  el('save-brief').addEventListener('click', () => save().catch((err) => notify(err.message, true)));
  el('take-saved-direction').addEventListener('click', () => {
    store(project().id, null);
    refresh();
    input.focus();
  });
  el('keep-direction-draft').addEventListener('click', () => {
    store(project().id, { base: savedText(), text: input.value });
    refresh();
    input.focus();
  });
  el('recall-direction').addEventListener('click', showPicker);
  el('empty-directions').addEventListener('click', showPicker);
  el('close-directions').addEventListener('click', () => dialog.close());
  el('recall-brief').addEventListener('click', () => choose(savedText()));
  el('recall-art').addEventListener('click', () => choose(artwork()?.recipe?.prompt));
  return { refresh, setText, canReplace };
}
