// Explicit Gmail compose handoff. No OAuth, send request, or submission receipt.
import { recipients, snapshot, subjectFor } from './mail.js?v=fe07a45a7b6d1153';
import { initializePhotos, validateBackupPhotos, verifyBackupPhotoImages, restoreBackupPhotos } from './photos.js?v=56a96b43f5b35693';
const R = window.FMPWalkReliability;
const $ = id => document.getElementById(id);
initializePhotos();
for (const [field, key] of [['emailTo','to'],['emailCc','cc'],['emailBcc','bcc']]) {
  $(field).value = window.S.recipients?.[key] || '';
  $(field).addEventListener('input', () => { window.S.recipients = Object.fromEntries(['to','cc','bcc'].map(key => [key, $({to:'emailTo',cc:'emailCc',bcc:'emailBcc'}[key]).value])); window.saveSoon(); });
}
$('emailSend').onclick = () => {
  try {
    const {walk, markdown} = window.prepareExport();
    const fields = recipients({to:$('emailTo').value,cc:$('emailCc').value,bcc:$('emailBcc').value});
    const record = snapshot(walk, markdown);
    $('emailStatus').textContent = R.gmailDraft(fields, subjectFor(record), markdown, window.open.bind(window));
  } catch(error) { $('emailStatus').textContent = error.message; }
};
let proposed = null, importGeneration = 0;
function dialog(title, body, buttons) {
  const trigger = document.activeElement, el = document.createElement('dialog');
  const heading = document.createElement('h2'); heading.id = 'recovery-dialog-title'; heading.textContent = title;
  el.setAttribute('aria-labelledby', heading.id); el.append(heading, body);
  const row = document.createElement('div'); row.className = 'btnrow';
  for (const [label, handler] of buttons) { const button = document.createElement('button'); button.textContent = label; button.onclick = () => handler(el); row.append(button); }
  el.append(row); document.body.append(el);
  el.addEventListener('close', () => { el.remove(); if(trigger?.isConnected) trigger.focus(); });
  el.addEventListener('keydown', event => {
    event.stopPropagation();
    if(event.key === 'Tab') {
      const controls = [...el.querySelectorAll('button:not([disabled]),input,select,textarea,[href]')].filter(node => node.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if(first && event.shiftKey && document.activeElement === first) { last.focus(); event.preventDefault(); }
      else if(first && !event.shiftKey && document.activeElement === last) { first.focus(); event.preventDefault(); }
    }
  });
  el.showModal(); return el;
}
$('backupFile').onchange = async () => {
  const attempt = ++importGeneration;
  proposed = null; $('previewRestore').disabled = true;
  try {
    const file = $('backupFile').files[0]; if(!file) return;
    if(file.size > 30 * 1024 * 1024) throw new Error('Backup exceeds the 30 MB limit.');
    const parsed = R.parseBackup(await file.text()); validateBackupPhotos(parsed); await verifyBackupPhotoImages(parsed);
    if(attempt !== importGeneration) return;
    proposed = parsed; $('previewRestore').disabled = false;
    $('restoreStatus').textContent = 'Backup validated. Preview it before replacing the current walk.';
  } catch(error) { if(attempt === importGeneration) $('restoreStatus').textContent = `${error.message} Current draft is unchanged.`; }
};
$('previewRestore').onclick = () => {
  if(!proposed) return;
  window.flush();
  const preview = proposed, oldRaw = window.loadedRaw;
  const body = document.createElement('p');
  body.textContent = `${preview.walk.meta.show || 'Untitled'} · ${preview.walk.meta.date || 'Undated'} · ${preview.walk.walkId}. ${Object.keys(preview.walk.res).length} reading records, ${preview.walk.faults.length} faults, ${preview.photoFiles.length} photos. Replacement preserves this backup's ID. Download the current backup first if you need to keep it.`;
  dialog('Preview walk replacement', body, [['Cancel', el => el.close()], ['Replace current walk', async el => {
    const button = el.querySelector('.btnrow button:last-child'); button.disabled = true;
    try {
      if(window.loadedRaw !== oldRaw || window.store.get(window.WALK_KEY) !== oldRaw) throw new Error('Draft changed since preview. Close and preview again.');
      await restoreBackupPhotos(preview);
      // Allow explicit recovery of malformed storage; never bypass a concurrent edit.
      const next = R.validateDraft(preview.walk);
      window.FMPWalkCore.restoreWalk(next, next);
      const raw = JSON.stringify(next);
      if(window.loadedRaw !== oldRaw || window.store.get(window.WALK_KEY) !== oldRaw) throw new Error('Draft changed during photo restore. Preview again.');
      if(!window.store.set(window.WALK_KEY, raw)) throw new Error('Walk storage failed. Current draft was not replaced.');
      window.loadedRaw = raw; window.recoveryLocked = false; window.STORAGE_OK = true;
      window.S = next; window.undoSnapshot = null; window.__grab = null; window.__grabSheet = null;
      window.syncSetup(); window.go('setup'); window.dispatchEvent(new Event('fmp-walk-change')); $('recoveryNotice').hidden = true;
      $('restoreStatus').textContent = 'Complete backup restored. Walk ID preserved.'; proposed = null; $('previewRestore').disabled = true; el.close();
    } catch(error) { body.textContent = `${error.message} Keep the current tab open. Current draft is unchanged.`; button.disabled = false; }
  }]]);
};
$('downloadLegacy').onclick = () => window.dl('fmp-original-legacy-draft.json', window.store.get('fmp-walk-v2') || '', 'application/json');
try {
  const raw = window.store.get('fmp-walk-v2');
  if(raw && JSON.stringify(JSON.parse(raw)) !== JSON.stringify(window.S.legacyDraft)) {
    $('legacyRecovery').hidden = false; $('reviewLegacy').disabled = false;
    $('reviewLegacy').onclick = () => {
      try {
        const legacy = JSON.parse(window.store.get('fmp-walk-v2'));
        proposed = R.backup(R.migrateLegacy(legacy, window.FMPWalkCore));
        $('previewRestore').onclick();
      } catch(error) { $('restoreStatus').textContent = `${error.message} Original legacy draft and current walk remain unchanged.`; window.go('rep'); }
    };
  }
} catch { $('legacyRecovery').hidden = false; $('legacyRecovery').querySelector('p').textContent = 'A malformed legacy design draft was left untouched. Download original draft before recovery.'; }
let reference = null;
async function loadReference() {
  $('retryReference').hidden = true; $('referenceStatus').textContent = 'Loading dated reference…';
  try {
    const response = await fetch('./walk-reference.json', {signal:AbortSignal.timeout(10000)});
    if(!response.ok) throw new Error(`Reference request failed (${response.status}).`);
    const data = await response.json();
    if(!Array.isArray(data.photos) || !Array.isArray(data.openFaults)) throw new Error('Invalid reference data.');
    reference = data; paintReference();
    $('referenceStatus').textContent = `${data.openFaultsAsOf}. Historical context only; no current Pass, Flag or verification is inferred.`;
  } catch(error) { $('referenceStatus').textContent = `${error.message} The embedded walk route and your draft remain available.`; $('retryReference').hidden = false; }
}
function paintReference() {
  $('knownFaults').replaceChildren(); $('fieldGallery').replaceChildren();
  for (const fault of reference.openFaults) {
    const row = document.createElement('div'); row.className = 'known-fault';
    const label = document.createElement('label'); label.textContent = `${fault.zone} · ${fault.summary} (${fault.state})`;
    const select = document.createElement('select');
    for (const [value,text] of [['not_reobserved','Not re-observed'],['present','Still present'],['cleared','Not seen on this walk'],['not_observed','Not observed']]) { const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option); }
    select.value = window.S.fobs?.[fault.id] || 'not_reobserved';
    select.onchange = () => { window.S.fobs[fault.id] = select.value; window.save(); };
    label.append(select); row.append(label); $('knownFaults').append(row);
  }
  for (const photo of reference.photos) {
    const button = document.createElement('button'); button.type = 'button';
    const image = document.createElement('img'); image.src = `./assets/walk-photos/${photo.file}`; image.alt = photo.caption; image.loading = 'lazy';
    const caption = document.createElement('span'); caption.textContent = `${photo.caption} · ${photo.date}`; button.append(image,caption);
    button.onclick = () => {
      const body = document.createElement('div'), original = document.createElement('img'), note = document.createElement('p'); original.src = image.src; original.alt = photo.caption; note.textContent = `${photo.date} · Historical reference. ${photo.note || ''}`; body.append(original,note);
      dialog(photo.caption,body,[['Close',el => el.close()]]);
    };
    $('fieldGallery').append(button);
  }
}
$('retryReference').onclick = loadReference;
window.addEventListener('fmp-walk-change', () => { if(reference) paintReference(); });
loadReference();
