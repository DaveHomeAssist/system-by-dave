(() => {
  'use strict';
  const api = window.AvCalculatorFieldSets;
  if (!api) return;
  const KEY = 'avCalculator.fieldSets.v1';
  const SCHEMA = 'system-by-dave.av-calculator-field-set.v1';
  const el = id => document.getElementById(id);
  const dialog = el('fieldSetsDialog');
  const select = el('fieldSetSelect');
  const status = el('fieldSetStatus');
  let sets = [];
  let pending = null;
  let writable = true;
  let observedRaw = null;

  function note(message, error = false) {
    status.textContent = message;
    status.dataset.error = String(error);
  }

  function validValues(values) {
    if (!values || typeof values !== 'object' || Array.isArray(values) ||
      Object.keys(values).length !== api.keys.length) return false;
    return api.keys.every(key => {
      if (!Object.prototype.hasOwnProperty.call(values, key)) return false;
      const field = document.querySelector(`[data-key="${key}"]`);
      if (!field) return false;
      const value = values[key];
      if (field.tagName === 'SELECT') return [...field.options].some(option => option.value === String(value));
      if (field.type === 'number') {
        if (typeof value !== 'number' || !Number.isFinite(value)) return false;
        if (field.min !== '' && value < Number(field.min)) return false;
        if (field.max !== '' && value > Number(field.max)) return false;
        const step = Number(field.step);
        if (field.step !== 'any' && Number.isFinite(step) && step > 0) {
          const base = field.min === '' ? 0 : Number(field.min);
          const offset = (value - base) / step;
          if (Math.abs(offset - Math.round(offset)) > Math.max(1, Math.abs(offset)) * Number.EPSILON * 8) return false;
        }
        return true;
      }
      return typeof value === 'string' && value.length <= 500;
    });
  }

  function validSet(item) {
    return item && typeof item === 'object' && !Array.isArray(item) &&
      typeof item.id === 'string' && item.id.length > 0 && item.id.length <= 100 &&
      typeof item.name === 'string' && item.name.trim().length > 0 && item.name.length <= 80 &&
      validValues(item.values);
  }

  function readSaved() {
    try {
      const raw = localStorage.getItem(KEY);
      observedRaw = raw;
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.sets) ||
        parsed.sets.length > 100 || !parsed.sets.every(validSet)) throw new Error('invalid saved sets');
      sets = parsed.sets;
    } catch (_) {
      writable = false;
      note('Saved field sets could not be read. They were preserved; export your browser data before replacing them.', true);
    }
  }

  function persist(next) {
    if (!writable) { note('Saved field sets are unreadable. No changes were written.', true); return false; }
    if (next.length > 100) { note('Field sets are full (100). Export or delete a set before adding another.', true); return false; }
    try {
      if (localStorage.getItem(KEY) !== observedRaw) {
        writable = false;
        note('Field sets changed in another tab. Reload and review them before saving.', true);
        return false;
      }
      const serialized = JSON.stringify({ version: 1, sets: next });
      localStorage.setItem(KEY, serialized);
      observedRaw = serialized;
      sets = next;
      render();
      return true;
    } catch (_) {
      note('Browser storage is unavailable. Current field sets were not changed.', true);
      return false;
    }
  }

  function render(selectedId) {
    select.replaceChildren();
    const placeholder = new Option(sets.length ? 'Choose a saved set' : 'No saved sets yet', '');
    select.add(placeholder);
    sets.forEach(set => select.add(new Option(set.name, set.id)));
    select.value = selectedId || '';
  }

  function selected() { return sets.find(set => set.id === select.value); }

  function showPreview(item) {
    const list = el('fieldSetPreviewValues');
    list.replaceChildren();
    api.keys.forEach(key => {
      const field = document.querySelector(`[data-key="${key}"]`);
      const label = document.querySelector(`label[for="${field.id}"]`);
      const name = document.createElement('dt');
      name.textContent = label?.textContent?.trim() || key;
      const value = document.createElement('dd');
      value.textContent = field.tagName === 'SELECT'
        ? [...field.options].find(option => option.value === String(item.values[key]))?.textContent || String(item.values[key])
        : String(item.values[key]);
      list.append(name, value);
    });
  }

  function download(set) {
    const file = new Blob([JSON.stringify({ schema: SCHEMA, name: set.name, values: set.values }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `av-calculator-${set.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'field-set'}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  el('fieldSetsOpen').addEventListener('click', () => dialog.showModal());
  el('fieldSetsClose').addEventListener('click', () => dialog.close());
  el('fieldSetSave').addEventListener('click', () => {
    const name = el('fieldSetName').value.trim();
    if (!name) { note('Enter a name before saving.', true); return; }
    const values = api.capture();
    if (!validValues(values)) { note('Current inputs need correction before saving.', true); return; }
    const id = crypto.randomUUID();
    if (persist([...sets, { id, name, values }])) {
      render(id);
      note(`“${name}” saved in this browser.`);
    }
  });
  el('fieldSetRecall').addEventListener('click', () => {
    const set = selected();
    if (!set) { note('Choose a saved set to recall.', true); return; }
    if (!api.restore(set.values)) { note('Set could not be recalled. Current inputs were preserved.', true); return; }
    note(`“${set.name}” recalled. Results were recalculated.`);
    dialog.close();
  });
  el('fieldSetExport').addEventListener('click', () => {
    const set = selected();
    if (!set) { note('Choose a saved set to export.', true); return; }
    download(set);
    note(`“${set.name}” exported.`);
  });
  el('fieldSetDelete').addEventListener('click', () => {
    const set = selected();
    if (!set) { note('Choose a saved set to delete.', true); return; }
    if (persist(sets.filter(item => item.id !== set.id))) note(`“${set.name}” deleted. Current calculator inputs were kept.`);
  });
  el('fieldSetImport').addEventListener('change', async event => {
    pending = null;
    el('fieldSetPreview').hidden = true;
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 100000) { note('The file is too large for one field set.', true); return; }
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || parsed.schema !== SCHEMA || typeof parsed.name !== 'string' ||
        !parsed.name.trim() || parsed.name.length > 80 || !validValues(parsed.values)) throw new Error('invalid file');
      pending = { name: parsed.name.trim(), values: parsed.values };
      el('fieldSetPreviewText').textContent = `Ready to add “${pending.name}” with ${api.keys.length} inputs. Current values will stay as they are.`;
      showPreview(pending);
      el('fieldSetPreview').hidden = false;
      note('Review the set, then choose Add imported set.');
    } catch (_) {
      note('Import failed: this is not a valid AV Calculator field set. Current inputs and saved sets were preserved.', true);
    }
  });
  el('fieldSetApply').addEventListener('click', () => {
    if (!pending) return;
    const item = { id: crypto.randomUUID(), ...pending };
    if (persist([...sets, item])) {
      render(item.id);
      note(`“${item.name}” added. Use Recall to apply it.`);
      pending = null;
      el('fieldSetPreview').hidden = true;
      el('fieldSetImport').value = '';
    }
  });
  readSaved();
  render();
})();
