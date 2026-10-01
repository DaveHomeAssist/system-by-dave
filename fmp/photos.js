// Images live in IndexedDB, not the small localStorage walk record. No uploads here.
export const MAX_PHOTOS = 12;
export const MAX_PHOTO_BYTES = 600 * 1024;

export function photoRefs(walk, includeDraft = false) {
  const owners = [walk.meta, ...(walk.faults || []), ...(includeDraft && walk.draft ? [walk.draft] : [])];
  return [...new Map(owners.flatMap(owner => owner?.photos || []).map(ref => [ref.id, ref])).values()];
}

export function imageType(bytes) {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)) return 'image/png';
  const text = String.fromCharCode(...bytes.subarray(0, 12));
  if (text.startsWith('RIFF') && text.slice(8) === 'WEBP') return 'image/webp';
  return '';
}

export function validatePhoto(photo) {
  if (!photo || !/^[a-f0-9-]{36}$/.test(photo.id) || photo.name !== `photo-${photo.id}.jpg` || photo.type !== 'image/jpeg' ||
      !Number.isInteger(photo.size) || photo.size < 1 || photo.size > MAX_PHOTO_BYTES ||
      typeof photo.base64 !== 'string' || photo.base64.length > Math.ceil(MAX_PHOTO_BYTES / 3) * 4 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(photo.base64)) {
    throw new Error('Invalid photo attachment. Remove it and add the image again.');
  }
  const binary = atob(photo.base64);
  if (binary.length !== photo.size || imageType(Uint8Array.from(binary.slice(0, 12), c => c.charCodeAt(0))) !== 'image/jpeg') {
    throw new Error('Photo data is damaged. Remove it and add the image again.');
  }
}

async function database() {
  return new Promise((resolve, reject) => {
    let settled = false;
    const request = indexedDB.open('fmpPhotosV1', 1);
    const timer = setTimeout(() => fail(), 8000);
    const fail = () => { settled = true; clearTimeout(timer); reject(new Error('Photo storage is unavailable. Keep your original photo and try a regular browser.')); };
    request.onupgradeneeded = () => request.result.createObjectStore('photos', { keyPath: 'id' });
    request.onerror = request.onblocked = fail;
    request.onsuccess = () => {
      clearTimeout(timer);
      if (settled) { request.result.close(); return; }
      resolve(request.result);
    };
  });
}

async function storedPhoto(id, value) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('photos', value ? 'readwrite' : 'readonly');
      const timer = setTimeout(() => tx.abort(), 8000);
      const request = value ? tx.objectStore('photos').add(value) : tx.objectStore('photos').get(id);
      tx.oncomplete = () => { clearTimeout(timer); resolve(request.result); };
      tx.onabort = tx.onerror = () => { clearTimeout(timer); reject(new Error('Photo storage failed. Keep your original photo; nothing new was attached.')); };
    });
  } finally { db.close(); }
}

function blobBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('Could not read the saved photo.'));
    reader.readAsDataURL(blob);
  });
}

export async function photoFiles(walk, includeDraft = false) {
  const refs = photoRefs(walk, includeDraft);
  const files = [];
  for (const ref of refs) {
    const row = await storedPhoto(ref.id);
    if (!row?.blob) throw new Error(`A saved photo is missing (${ref.name}). Reattach it before sending or exporting; images will not be silently omitted.`);
    const file = { ...ref, base64: await blobBase64(row.blob) };
    validatePhoto(file);
    files.push(file);
  }
  return files;
}

async function preparePhoto(file) {
  if (!file.size || file.size > 20 * 1024 * 1024) throw new Error('Choose a photo smaller than 20 MB.');
  const type = imageType(new Uint8Array(await file.slice(0, 12).arrayBuffer()));
  if (!type) throw new Error('Choose a JPEG, PNG, or WebP photo. Export HEIC as JPEG first. SVG and other files are not accepted.');
  const url = URL.createObjectURL(new Blob([file], { type }));
  const img = new Image();
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { img.src = ''; reject(new Error('This image could not be decoded. Try another photo.')); }, 10000);
      img.onload = () => { clearTimeout(timer); resolve(); };
      img.onerror = () => { clearTimeout(timer); reject(new Error('This image could not be decoded. Try another photo.')); };
      img.src = url;
    });
    if (!img.naturalWidth || img.naturalWidth * img.naturalHeight > 64_000_000) throw new Error('Choose an image under 64 megapixels.');
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let blob;
    for (const quality of [0.84, 0.7, 0.55, 0.4]) {
      blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (blob && blob.size <= MAX_PHOTO_BYTES) break;
    }
    if (!blob || blob.size > MAX_PHOTO_BYTES) throw new Error('This image is too detailed to attach. Choose a smaller version.');
    const id = crypto.randomUUID();
    return { id, blob, ref: { id, name: `photo-${id}.jpg`, type: 'image/jpeg', size: blob.size, width: canvas.width, height: canvas.height, addedAt: new Date().toISOString() } };
  } finally { img.src = ''; URL.revokeObjectURL(url); }
}

export async function storePhoto(file) {
  if (busy) throw new Error('Wait for the other photo save to finish.');
  busy++;
  try {
    const row = await preparePhoto(file);
    await storedPhoto(row.id, { id: row.id, blob: row.blob });
    return row.ref;
  } finally {
    busy--;
  }
}

export async function loadPhotoBlob(id) {
  const row = await storedPhoto(id);
  if (!row?.blob) throw new Error('A saved photo is missing from this browser. Reattach the original.');
  return row.blob;
}

export async function loadPhotoFiles(refs) {
  return photoFiles({ meta: { photos: refs || [] }, faults: [] });
}

let busy = 0;
export function ensurePhotosReady() {
  if (busy) throw new Error('Wait for photo saving to finish before sending or exporting.');
}

function mountEditor(root, owner, current) {
  let active = true;
  let version = 0;
  const urls = [];
  const revoke = () => { urls.splice(0).forEach(url => URL.revokeObjectURL(url)); };
  root.innerHTML = '<label class="photo-label">Add photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple></label>' +
    '<p class="mini">Up to 12 photos per walk. Keep the originals.</p>' +
    '<p class="photo-status mini" role="status" aria-live="polite"></p><div class="photo-grid"></div>';
  const input = root.querySelector('input');
  const notice = root.querySelector('.photo-status');
  const grid = root.querySelector('.photo-grid');
  const live = () => active && current();
  const show = (text, error = false) => { notice.textContent = text; notice.className = error ? 'photo-status note crit' : 'photo-status mini'; };
  const changed = () => {
    if (!window.save()) throw new Error('Walk storage failed; the attachment change was not saved. Keep your originals and export the walk.');
    window.updateReportPreview();
  };
  const paint = async () => {
    const generation = ++version;
    revoke(); grid.replaceChildren();
    for (const [index, ref] of (owner.photos || []).entries()) {
      const card = document.createElement('div'); card.className = 'photo-card';
      const label = document.createElement('p'); label.className = 'mini'; label.textContent = `Photo ${index + 1}`;
      card.append(label); grid.append(card);
      try {
        const row = await storedPhoto(ref.id);
        if (!live() || generation !== version) return;
        if (!row?.blob) throw new Error('Photo missing from this browser. Reattach the original.');
        const url = URL.createObjectURL(row.blob); urls.push(url);
        const link = document.createElement('a'); link.href = url; link.download = ref.name; link.title = `Download photo ${index + 1}`;
        const img = document.createElement('img'); img.src = url; img.alt = `Photo ${index + 1} for ${owner.pos || 'this report'}`;
        link.append(img, document.createTextNode('Download photo')); card.prepend(link);
      } catch (error) { label.textContent = error.message; }
      if (!live() || generation !== version) return;
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Remove'; remove.setAttribute('aria-label', `Remove photo ${index + 1}`);
      remove.onclick = () => {
        if (!live() || input.disabled) return;
        const before = owner.photos;
        owner.photos = before.filter(photo => photo.id !== ref.id);
        try { changed(); show('Removed from this report. Existing downloads and emails are unchanged.'); }
        catch (error) { owner.photos = before; show(error.message, true); }
        paint();
      };
      card.append(remove);
    }
  };
  input.onchange = async () => {
    if (!live() || input.disabled) return;
    const selected = [...input.files]; input.value = '';
    if (!selected.length) return;
    if (busy) { show('Wait for the other photo save to finish, then choose these files again.', true); return; }
    input.disabled = true; busy++;
    let count = 0;
    try {
      if (photoRefs(window.S, true).length + selected.length > MAX_PHOTOS) throw new Error('Up to 12 photos per walk, including drafts. Remove an attachment before adding more.');
      for (const file of selected) {
        show(`Saving photo ${count + 1} of ${selected.length}… Keep this tab open.`);
        const row = await preparePhoto(file);
        if (!live()) return;
        await storedPhoto(row.id, { id: row.id, blob: row.blob });
        if (!live()) return;
        const before = owner.photos;
        owner.photos = [...(before || []), row.ref];
        try { changed(); } catch (error) { if (before) owner.photos = before; else delete owner.photos; throw error; }
        count++;
      }
      show(`${count} photo${count === 1 ? '' : 's'} saved in this browser. Download the walk backup to keep a copy.`);
    } catch (error) { if (live()) show(`${count ? `${count} saved. ` : ''}${error.message}`, true); }
    finally { busy--; input.disabled = false; if (live()) paint(); }
  };
  paint();
  return () => { active = false; version++; revoke(); };
}

export function initializePhotos() {
  let disposeFault = () => {};
  let disposeReport = () => {};
  const api = {
    ensureReady: ensurePhotosReady,
    mountFault(owner) {
      disposeFault();
      disposeFault = mountEditor(document.getElementById('faultPhotos'), owner, () => window.S.draft === owner && document.getElementById('sheet').classList.contains('on'));
    },
    closeFault() { disposeFault(); },
    renderReport() {
      disposeReport();
      const owner = window.S.meta;
      disposeReport = mountEditor(document.getElementById('reportPhotos'), owner, () => window.S.meta === owner);
      const count = (window.S.faults || []).reduce((n, fault) => n + (fault.photos || []).length, 0);
      document.getElementById('faultPhotoSummary').textContent = `${count} saved fault photo${count === 1 ? '' : 's'} also included. View or change them under Faults → Edit. Unsaved fault drafts are excluded from email.`;
    },
    async exportWalk() {
      ensurePhotosReady();
      window.flush();
      const walk = structuredClone(window.S);
      const files = await photoFiles(walk, true);
      const backup = window.FMPWalkReliability.backup(walk, files);
      window.dl(`fmp-walk-backup-${walk.meta.date || 'undated'}-${walk.walkId}.json`, JSON.stringify(backup, null, 2), 'application/json');
    }
  };
  window.FMPPhotos = api;
  api.renderReport();
  if (window.S.draft && document.getElementById('sheet').classList.contains('on')) api.mountFault(window.S.draft);
  window.addEventListener('beforeunload', event => { if (busy) { event.preventDefault(); event.returnValue = ''; } });
}

export function validateBackupPhotos(backup) {
  const files = new Map();
  for (const file of backup.photoFiles) {
    validatePhoto(file);
    if(files.has(file.id)) throw new Error('Duplicate backup photo ID.');
    files.set(file.id,file);
  }
  for (const owner of [backup.walk.meta, ...backup.walk.faults, ...(backup.walk.draft ? [backup.walk.draft] : [])]) {
    if(owner.photos != null && !Array.isArray(owner.photos)) throw new Error('Invalid photo associations.');
    for (const ref of owner.photos || []) {
      const file = files.get(ref.id);
      if(!file || ref.name !== file.name || ref.size !== file.size || ref.type !== file.type) throw new Error('Backup is missing or mismatches an associated photo.');
    }
  }
  const refs = photoRefs(backup.walk,true);
  if(refs.length !== files.size) throw new Error('Backup has unassociated photos.');
}
export async function restoreBackupPhotos(backup) {
  validateBackupPhotos(backup);
  // Check collisions before writing. A restore must never overwrite existing evidence.
  const pending = [];
  for (const file of backup.photoFiles) {
    const binary = atob(file.base64), bytes = Uint8Array.from(binary,c => c.charCodeAt(0));
    const existing = await storedPhoto(file.id);
    if(existing?.blob) {
      if(await blobBase64(existing.blob) !== file.base64) throw new Error('Photo ID conflicts with existing evidence. Current photos were not changed.');
    } else pending.push({id:file.id,blob:new Blob([bytes],{type:file.type})});
  }
  for(const row of pending) await storedPhoto(row.id,row);
}

export async function verifyBackupPhotoImages(backup) {
  validateBackupPhotos(backup);
  for(const file of backup.photoFiles) {
    const image = await createImageBitmap(new Blob([Uint8Array.from(atob(file.base64), c => c.charCodeAt(0))], {type:'image/jpeg'}));
    try { if(image.width > 1600 || image.height > 1600 || image.width < 1 || image.height < 1) throw new Error('Backup image dimensions are unsupported.'); }
    finally { image.close(); }
  }
}
