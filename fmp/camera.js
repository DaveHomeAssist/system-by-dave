import {
  FALLBACK_REGISTRY, createDraft, inspectCameraStore, prepareSubmission, safeCameraRegistry,
  positionFor, positionKeyFromLocation, resumeAccountDraft, setCheck, setPosition, visibleDrafts, submissionMayHaveReachedServer
} from './camera-core.js?v=90d8a9324a19f3ff';
import { CLIENT_ID } from './mail.js?v=4a521185a33c8463';
import { loadPhotoBlob, loadPhotoFiles, storePhoto } from './photos.js?v=cd1feeb0fd50c5df';
import { NOTION_API_URL } from './notion-config.js?v=b675c734abe301f4';

import { CAMERA_STAGES, cameraPages, cameraShell } from './camera-view.js?v=dd4d86325bb3c596';

const view = { stage: 'setup', page: 0 };
let activePages;
const STORAGE_KEY = 'fmpCameraOperationsV1';
const OWNER_KEY = 'fmpCameraLocalOwnerV1';
const API_BASE = /^https:\/\/[a-z0-9-]+\.[a-z0-9.-]*run\.app$/.test(NOTION_API_URL) ? NOTION_API_URL : '';
const SETUP_TEST_ONLY = document.body.dataset.setupTestOnly === 'true';
const PUBLIC_REFERENCES = Object.freeze({ backFocus: '/backfocus/', fieldGuide: '/fmp/gear/#g2', cameraOps: '/fmp/build/', ptzOps: '/fmp/ptz/' });
const PUBLIC_RELEASE = document.body.dataset.publicRelease === 'true';
// The public export stamps the rig catalog size here so the reference card cannot drift from the data.
const RIG_COMPONENTS = Number.parseInt(document.body.dataset.rigComponents, 10) || 0;
// Camera pages have no <base>, so the app root comes from this module's own URL.
const APP_HOME = new URL('./', import.meta.url).pathname;
const app = document.getElementById('cameraApp');
const announcements = document.getElementById('cameraAnnouncements');
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

let storageOk = true;
let localOwner = '';
try {
  localOwner = localStorage.getItem(OWNER_KEY);
  if (!localOwner) { localOwner = crypto.randomUUID(); localStorage.setItem(OWNER_KEY, localOwner); }
} catch {
  storageOk = false;
  localOwner = crypto.randomUUID();
}
let ownerKey = `local:${localOwner}`;
let identity = null;
let credential = null;
let credentialExpires = 0;
let credentialTimer;
let busy = false;
let notice = '';
let noticeError = false;
let googlePromise;
let photoUrls = [];
let editingGranted = false;
let releaseEditing;
let storageHeld = false;
let storageMessage = '';
let storedValue = null;
let refreshScheduled = false;

function storageFailure(message) {
  storageOk = false;
  storageMessage = message;
  view.stage = 'status';
  view.page = 0;
  if (announcements) announcements.textContent = message;
  if (!refreshScheduled) {
    refreshScheduled = true;
    queueMicrotask(() => { refreshScheduled = false; render(); });
  }
}

function loadStore() {
  try {
    storedValue = localStorage.getItem(STORAGE_KEY);
    const value = inspectCameraStore(JSON.parse(storedValue || '{}'));
    if (value.invalidDrafts) {
      storageHeld = true;
      storageOk = false;
      storageMessage = 'Some saved drafts are unreadable. Editing is paused to preserve the original data. Download saved drafts from Setup and ask the lead to recover them.';
    }
    return value;
  } catch {
    storageHeld = true;
    storageOk = false;
    storageMessage = 'Saved camera data cannot be read. Editing is paused; existing storage has not been replaced. Download saved drafts from Setup for recovery.';
    return { drafts: {}, activeDraftId: '', events: [], registry: FALLBACK_REGISTRY };
  }
}
const store = loadStore();
if (!storageOk && !storageMessage) {
  storageHeld = true;
  storageMessage = 'This browser could not save the local operator identity. Editing is paused to keep drafts recoverable. Enable browser storage, then reload.';
}

function saveStore() {
  if (!editingGranted || storageHeld) return false;
  try {
    if (localStorage.getItem(STORAGE_KEY) !== storedValue) {
      storageHeld = true;
      storageFailure('Another tab changed the saved camera data. Editing is paused. Download this tab’s recovery copy before reloading; nothing was overwritten.');
      return false;
    }
    const next = JSON.stringify(store);
    localStorage.setItem(STORAGE_KEY, next);
    storedValue = next;
    storageOk = true;
    storageMessage = '';
    return true;
  } catch {
    storageFailure('This draft could not be saved on this device. Keep this tab open and download its recovery copy from Setup. No submission will start without a saved recovery snapshot.');
    return false;
  }
}

function routePosition() {
  return document.body.dataset.position || positionKeyFromLocation(location.pathname, location.search) || 'pit-center';
}

function currentDraft() {
  const current = store.drafts[store.activeDraftId];
  if (current?.ownerKey === ownerKey && current.positionKey === routePosition()) return current;
  const matching = visibleDrafts(store.drafts, ownerKey)
    .filter(draft => draft.positionKey === routePosition() && !draft.checkedOutReceipt)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
  if (matching) {
    store.activeDraftId = matching.draftId;
    return matching;
  }
  const draft = createDraft(routePosition(), ownerKey);
  store.drafts[draft.draftId] = draft;
  store.activeDraftId = draft.draftId;
  saveStore();
  return draft;
}

function updateDraft(draft) {
  draft.updatedAt = new Date().toISOString();
  store.drafts[draft.draftId] = draft;
  return saveStore();
}

function setNotice(message, error = false) {
  notice = message;
  noticeError = error;
  if (error) { view.stage = 'status'; view.page = 0; }
  if (announcements) announcements.textContent = message;
}

function backendState(draft) {
  if (!navigator.onLine) return ['pending', 'Offline'];
  if (!API_BASE) return ['', 'Backend not deployed'];
  if (identity) return ['online', identity.email];
  if (draft.pendingAction) return ['pending', 'Pending sign-in'];
  return ['', 'Sign in required'];
}

function eventOptions(draft) {
  const options = store.events.map(event =>
    `<option value="${escapeHtml(event.id)}" ${draft.eventId === event.id ? 'selected' : ''}>${escapeHtml(event.date)} · ${escapeHtml(event.name)} · ${escapeHtml(event.status || 'status unknown')}</option>`);
  return `<option value="">${options.length ? 'Choose the show' : 'Sign in once to load FMP Events'}</option>${options.join('')}`;
}

function referenceCards(position) {
  const refs = { ...FALLBACK_REGISTRY.references, ...(store.registry.references || {}) };
  // The signed-in registry still names Notion pages. The public release always opens its own HTML pages.
  if (PUBLIC_RELEASE) Object.assign(refs, PUBLIC_REFERENCES);
  if (SETUP_TEST_ONLY && !PUBLIC_RELEASE) {
    refs.backFocus = '/resources/fmp-back-focus-card.html';
    refs.fieldGuide = '/resources/ursa-broadcast-g2-reference.html';
  }
  const items = [
    ...(PUBLIC_RELEASE ? [
      ['CALL', 'Bowl camera guide', 'Tour modes, meeting, song flow and directing', '/fmp/guide/', false],
      ['3D', 'Camera rig explorer', `${RIG_COMPONENTS ? `${RIG_COMPONENTS} components` : 'Components'}, photo evidence and operating notes`, '/fmp/rig/', false]
    ] : []),
    ['BF', 'Back focus field guide', 'Frame, zoom, focus and repeat', refs.backFocus, !PUBLIC_RELEASE],
    // Operators open these mid-task, so they keep the camera workspace open behind them, as before.
    ['OPS', 'Camera build & strike', 'Assignment, safe build, signal path, comms and strike', refs.cameraOps, true],
    ['GEAR', 'Camera equipment', 'Body, lens and fiber converters, with open reads', refs.fieldGuide, true],
    ['CAM4', 'Catwalk PTZ', 'SuperJoy, presets, show operation and cleared FMP-8 history', refs.ptzOps, true],
    ...(SETUP_TEST_ONLY && !PUBLIC_RELEASE ? [
      ['PDF', 'Printable G2 reference', 'Existing house reference PDF', '/resources/ursa-broadcast-g2-reference.pdf', true],
      ['MAP', 'Venue and signal maps', 'Select a zone or device, then read its evidence', '/#maps', true]
    ] : [])
  ].filter(item => position.ptz || item[0] !== 'CAM4');
  return items.map(([icon, name, copy, url, newTab = true]) => `
    <a class="reference" href="${escapeHtml(url)}"${newTab ? ' target="_blank" rel="noopener noreferrer"' : ''}>
      <span class="reference-icon" aria-hidden="true">${icon}</span>
      <span><strong>${escapeHtml(name)}</strong><small>${escapeHtml(copy)}</small></span>
    </a>`);
}

function focusSelectorFor(element) {
  if (!element || !app.contains(element)) return '';
  if (element.id) return `#${element.id}`;
  if (element.dataset.positionKey) return `[data-position-key="${element.dataset.positionKey}"]`;
  if (element.dataset.check) return `[data-check-stage="${element.dataset.checkStage}"][data-check="${element.dataset.check}"][data-state="${element.dataset.state}"]`;
  if (element.dataset.field) return `[data-field="${element.dataset.field}"]`;
  if (element.dataset.assignment) return `[data-assignment="${element.dataset.assignment}"]`;
  if (element.dataset.faultField) return `[data-fault-field="${element.dataset.faultField}"][data-fault-index="${element.dataset.faultIndex}"]`;
  if (element.dataset.removeFault) return `[data-remove-fault="${element.dataset.removeFault}"]`;
  if (element.dataset.removePhoto) return `[data-remove-photo="${element.dataset.removePhoto}"]`;
  return '';
}

function render(preferredFocus = '') {
  const restoreFocus = preferredFocus || focusSelectorFor(document.activeElement);
  photoUrls.splice(0).forEach(url => URL.revokeObjectURL(url));
  const draft = currentDraft();
  if (SETUP_TEST_ONLY && !draft.checkedInReceipt && !draft.pendingAction && !draft.setupTest) {
    draft.setupTest = true;
    updateDraft(draft);
  }
  const position = positionFor(store.registry, draft.positionKey);
  const savedDrafts = identity ? visibleDrafts(store.drafts, ownerKey).filter(item => item.positionKey === draft.positionKey) : [];
  const draftOptions = savedDrafts.map(item => `<option value="${escapeHtml(item.draftId)}" ${item.draftId === draft.draftId ? 'selected' : ''}>${escapeHtml(item.eventName || 'Show not selected')} · ${item.checkedOutReceipt ? 'Checked out' : item.pendingAction ? 'Pending' : item.checkedInReceipt ? 'Checked in' : 'Draft'} · ${escapeHtml(item.updatedAt)}</option>`).join('');
  const [dotClass, connectionText] = backendState(draft);
  const messages = [
    ...(storageMessage ? [storageMessage] : []),
    ...(!navigator.onLine ? ['Offline. Work stays on this device. Submission needs an explicit retry after reconnecting.'] : []),
    ...(notice ? [notice] : []),
    ...(draft.pendingAction ? [draft.pendingSubmission ? 'Submission evidence is locked. Retry uses the original saved values and capture time. A missing receipt does not prove the server rejected it.' : 'This older pending draft has no original submission snapshot. Download saved drafts from Setup and ask the lead to reconcile its server record.'] : []),
    `Connection: ${connectionText}. ${draft.pendingAction ? 'Server confirmation is pending.' : 'No automatic submissions.'}`,
    ...(SETUP_TEST_ONLY ? [`${PUBLIC_RELEASE ? 'Commissioning build' : 'Private test build'} · not venue accepted. Use synthetic observations only. Every new record is marked SETUP TEST; signed-in saving still needs verification.`] : [])
  ];
  activePages = cameraPages({ draft, position, identity, eventOptions: eventOptions(draft),
    references: referenceCards(position), draftOptions, testOnly: SETUP_TEST_ONLY, publicRelease: PUBLIC_RELEASE, busy, messages, readOnly: !editingGranted || storageHeld, canReclaim: !editingGranted && !storageHeld && Boolean(navigator.locks?.request) });
  app.innerHTML = cameraShell({ draft, position, registry: store.registry, pages: activePages, view,
    testOnly: SETUP_TEST_ONLY, publicRelease: PUBLIC_RELEASE, appHome: APP_HOME, connectionText, dotClass, hasAlert: noticeError || !storageOk,
    busy, readOnly: !editingGranted || storageHeld });
  bind(draft);
  paintPhotos(draft);
  mountGoogle();
  if (restoreFocus) requestAnimationFrame(() => {
    const target = app.querySelector(restoreFocus);
    if (target && !target.disabled) target.focus({ preventScroll: true });
  });
}

function bind(draft) {
  const canEdit = () => !busy && editingGranted && !storageHeld && !draft.pendingAction;
  const go = (stage, page = 0) => { view.stage = stage; view.page = page; render('#screenTitle'); };
  app.querySelectorAll('[data-stage]').forEach(button => button.addEventListener('click', () => go(button.dataset.stage)));
  document.getElementById('previousPage').addEventListener('click', () => go(view.stage, view.page - 1));
  document.getElementById('nextPage').addEventListener('click', () => {
    if (view.page + 1 < activePages[view.stage].length) go(view.stage, view.page + 1);
    else go(CAMERA_STAGES[CAMERA_STAGES.indexOf(view.stage) + 1] || 'setup');
  });
  document.getElementById('pagePicker').addEventListener('change', event => go(view.stage, Number(event.target.value)));
  document.getElementById('faultPicker')?.addEventListener('change', event => {
    if (event.target.value) go('faults', Number(event.target.value));
  });
  document.getElementById('draftPicker')?.addEventListener('change', event => {
    const selected = store.drafts[event.target.value];
    if (!selected || selected.ownerKey !== ownerKey || selected.positionKey !== draft.positionKey || busy || !editingGranted || storageHeld) return;
    store.activeDraftId = selected.draftId;
    saveStore();
    go('setup');
  });
  app.querySelectorAll('[data-correction], [data-correction-reason]').forEach(field => field.addEventListener('input', () => {
    if (!canEdit() || draft.leadCorrection?.pending) return;
    draft.leadCorrection ||= { overrideId: crypto.randomUUID(), changes: { ...draft.assignment }, reason: '' };
    if (field.hasAttribute('data-correction-reason')) draft.leadCorrection.reason = field.value;
    else draft.leadCorrection.changes[field.dataset.correction] = field.value;
    updateDraft(draft);
  }));
  for (const id of ['showStatus', 'statusDetails']) document.getElementById(id).addEventListener('click', () => go('status'));
  document.getElementById('positionPicker').addEventListener('change', event => {
    if (!canEdit() || draft.checkedInReceipt) return;
    if (!confirm('Change the physical position? Current build and stow selections will reset.')) {
      event.target.value = draft.positionKey;
      return;
    }
    setPosition(draft, store.registry, event.target.value);
    updateDraft(draft);
    const prefix = location.pathname.split('/camera/')[0];
    history.replaceState({}, '', `${prefix}/camera/${draft.positionKey}/`);
    document.body.dataset.position = draft.positionKey;
    setNotice('Position corrected before submission.');
    go('setup');
  });
  app.querySelectorAll('[data-field]').forEach(field => field.addEventListener('input', () => {
    if (!canEdit() || (draft.checkedInReceipt && field.dataset.field !== 'headsetReturned') || draft.checkedOutReceipt) return;
    const name = field.dataset.field;
    draft[name] = field.type === 'checkbox' ? field.checked : field.value;
    if (name === 'eventId') draft.eventName = store.events.find(event => event.id === field.value)?.name || '';
    updateDraft(draft);
  }));
  app.querySelectorAll('[data-assignment]').forEach(field => field.addEventListener('input', () => {
    if (!canEdit() || draft.checkedInReceipt) return;
    draft.assignment[field.dataset.assignment] = field.value;
    draft.assignmentConfirmed = false;
    const checkbox = app.querySelector('[data-field="assignmentConfirmed"]');
    if (checkbox) checkbox.checked = false;
    updateDraft(draft);
  }));
  app.querySelectorAll('[data-check]').forEach(button => button.addEventListener('click', () => {
    if (!canEdit() || draft.checkedOutReceipt || (button.dataset.checkStage === 'build' && draft.checkedInReceipt)) return;
    const checks = button.dataset.checkStage === 'build' ? draft.buildChecks : draft.stowChecks;
    setCheck(checks, button.dataset.check, button.dataset.state);
    updateDraft(draft);
    render();
  }));
  app.querySelectorAll('[data-fault-field]').forEach(field => field.addEventListener('input', () => {
    if (!canEdit() || draft.checkedOutReceipt) return;
    draft.faults[Number(field.dataset.faultIndex)][field.dataset.faultField] = field.value;
    updateDraft(draft);
  }));
  app.querySelectorAll('[data-remove-fault]').forEach(button => button.addEventListener('click', () => {
    if (!canEdit() || draft.checkedOutReceipt) return;
    if (!confirm('Remove this unsent fault from the checkout draft?')) return;
    draft.faults.splice(Number(button.dataset.removeFault), 1);
    updateDraft(draft);
    view.page = 0;
    render('#addFault');
  }));
  app.querySelectorAll('[data-fault-photo]').forEach(input => input.addEventListener('change', async () => {
    if (!canEdit() || draft.checkedOutReceipt) return;
    const file = input.files?.[0];
    if (!file) return;
    busy = true;
    setNotice('Saving a stripped, compressed JPEG copy in this browser.');
    render();
    try {
      const ref = await storePhoto(file);
      draft.faults[Number(input.dataset.faultPhoto)].photos = [ref];
      if (!updateDraft(draft)) throw new Error('The photo is stored, but its draft reference could not be saved. Keep this page open and download a recovery copy.');
      setNotice('Photo saved in this browser. It is not in Notion until checkout is server-confirmed.');
    } catch (error) {
      setNotice(error.message, true);
    } finally {
      busy = false;
      render();
    }
  }));
  app.querySelectorAll('[data-remove-photo]').forEach(button => button.addEventListener('click', () => {
    if (!canEdit() || draft.checkedOutReceipt) return;
    draft.faults[Number(button.dataset.removePhoto)].photos = [];
    updateDraft(draft);
    setNotice('Photo removed from this draft. The local blob is retained for recovery.');
    render();
  }));
  document.getElementById('addFault')?.addEventListener('click', () => {
    if (!canEdit() || draft.checkedOutReceipt || draft.faults.length >= 6) return;
    draft.faults.push({ id: crypto.randomUUID(), severity: 'Degraded', description: '', photos: [] });
    updateDraft(draft);
    view.stage = 'faults';
    view.page = 1 + (draft.faults.length - 1) * 2;
    render(`[data-fault-field="description"][data-fault-index="${draft.faults.length - 1}"]`);
  });
  document.getElementById('checkIn')?.addEventListener('click', () => submitCheckIn(draft));
  document.getElementById('checkOut')?.addEventListener('click', () => submitCheckout(draft));
  document.getElementById('handoff')?.addEventListener('click', () => startHandoff(draft));
  document.getElementById('disconnect')?.addEventListener('click', disconnect);
  document.getElementById('override')?.addEventListener('click', () => submitOverride(draft));
  document.getElementById('changeLocalOwner')?.addEventListener('click', changeLocalOwner);
  document.getElementById('downloadRecovery')?.addEventListener('click', downloadRecovery);
  document.getElementById('retryEditing')?.addEventListener('click', () => acquireEditing());
}

async function paintPhotos(draft) {
  for (const [index, fault] of draft.faults.entries()) {
    const target = app.querySelector(`[data-photo-preview="${index}"]`);
    const ref = fault.photos?.[0];
    if (!target || !ref) continue;
    try {
      const blob = await loadPhotoBlob(ref.id);
      const url = URL.createObjectURL(blob);
      photoUrls.push(url);
      if (target.isConnected) target.innerHTML = `<a href="${url}" download="${escapeHtml(ref.name)}"><img class="photo-preview" src="${url}" alt="Fault photo ${index + 1}"></a>`;
    } catch (error) {
      if (target.isConnected) target.innerHTML = `<span class="tiny">${escapeHtml(error.message)}</span>`;
    }
  }
}

async function api(path, options = {}) {
  if (!API_BASE) throw new Error('The secure backend has not been deployed yet.');
  if (!credential || credentialExpires <= Date.now()) throw new Error('Sign in before submitting.');
  const response = await fetch(API_BASE + path, {
    ...options,
    credentials: 'omit',
    redirect: 'error',
    cache: 'no-store',
    signal: AbortSignal.timeout(290000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${credential}` }
  });
  let body = {};
  try { body = await response.json(); } catch {}
  if (response.status === 401 || response.status === 403) disconnect(false);
  if (!response.ok) {
    const error = new Error(body.error || 'The server rejected the submission.');
    error.status = response.status;
    error.submissionNotStarted = body.submissionState === 'not_started';
    error.uncertain = !error.submissionNotStarted && (response.status === 409 || response.status === 429 || response.status >= 500);
    throw error;
  }
  return body;
}

function uncertainSubmission(error) {
  return error.uncertain || error.name === 'TimeoutError' || error.name === 'AbortError' || error instanceof TypeError;
}

async function submitCheckIn(draft) { return submitCamera(draft, 'check-in'); }
async function submitCheckout(draft) { return submitCamera(draft, 'check-out'); }

async function submitCamera(draft, action) {
  if (busy || !editingGranted || storageHeld || draft.ownerKey !== ownerKey) return;
  if ((action === 'check-in' && draft.checkedInReceipt) || (action === 'check-out' && draft.checkedOutReceipt)) return;
  const offline = !navigator.onLine || !credential || !API_BASE;
  const label = action === 'check-in' ? 'Check-in' : 'Checkout';
  const priorAttempt = submissionMayHaveReachedServer(draft);
  let requestStarted = false;
  try {
    if (SETUP_TEST_ONLY && !draft.setupTest) throw new Error('Only SETUP TEST records can be submitted from this test build.');
    const prompt = offline ? `Save this ${label.toLowerCase()} as pending on this device? It will require an explicit retry after signing in online.` :
      action === 'check-in' ? `Submit check-in for ${draft.operatorName} at ${positionFor(store.registry, draft.positionKey).displayName}?\n\nThis creates one Crew Call in Notion. No email is sent.` :
      `Submit checkout with ${draft.faults.length} fault record(s)?\n\nNot checked stays explicit. Faults remain open until separately resolved. No email is sent.`;
    if (!confirm(prompt)) return;
    busy = true;
    const payload = prepareSubmission(draft, action);
    if (SETUP_TEST_ONLY && !payload.setupTest) throw new Error('This saved submission is not a SETUP TEST. Keep its recovery copy and ask the lead to reconcile it before using this commissioning build.');
    if (!updateDraft(draft)) throw new Error('The recovery snapshot could not be saved. Nothing was submitted. Keep this tab open and download saved drafts from Setup.');
    if (offline) {
      setNotice(`${label} recovery snapshot is saved on this device. Sign in online, then retry explicitly. Evidence stays locked until confirmed.`);
      return;
    }
    setNotice(`Submitting ${label.toLowerCase()} using its saved recovery snapshot. Keep this tab open.`);
    render();
    if (action === 'check-out') {
      for (const fault of payload.faults) fault.photos = await loadPhotoFiles(fault.photos || []);
    }
    // Persist the possibility of a server write before sending, including when
    // retrying an offline draft. Reload cannot erase an uncertain earlier attempt.
    draft.pendingSubmission.networkAttempted = true;
    if (!updateDraft(draft)) throw new Error('The submission attempt could not be saved. Nothing was submitted. Keep this tab open and download saved drafts from Setup.');
    requestStarted = true;
    const result = await api(`/api/camera/${action}`, { method: 'POST', body: JSON.stringify(payload) });
    if (!/^[a-f0-9]{64}$/.test(result.sessionId || '') || !/^[a-f0-9-]{36}$/.test(result.pageId || '') ||
      !(action === 'check-in' ? result.state === 'active' : ['done', 'waiting', 'blocked'].includes(result.state)) ||
      (action === 'check-out' && result.sessionId !== payload.sessionId)) throw new TypeError('The server receipt could not be verified.');
    draft[action === 'check-in' ? 'checkedInReceipt' : 'checkedOutReceipt'] = result;
    draft.pendingAction = '';
    delete draft.pendingSubmission;
    const saved = updateDraft(draft);
    view.stage = action === 'check-in' ? 'build' : 'stow';
    view.page = activePages[view.stage].length;
    setNotice(`${label} confirmed by the server and read back from Notion.${saved ? '' : ' The receipt could not be saved locally. Download a recovery copy before closing this tab.'}`, !saved);
  } catch (error) {
    const canEdit = !priorAttempt && (!requestStarted || error.submissionNotStarted === true);
    if (canEdit && draft.pendingSubmission?.action === action) {
      draft.pendingAction = '';
      delete draft.pendingSubmission;
      updateDraft(draft);
    }
    const unconfirmed = !canEdit && draft.pendingAction && (requestStarted || priorAttempt);
    setNotice(canEdit && error.submissionNotStarted ?
      `${error.message} The server did not start this submission. Review the draft, correct it and submit again.` :
      unconfirmed ?
        `${label} outcome is uncertain. The original evidence stays locked. Retry this saved submission explicitly to reconcile it; do not start a replacement record. Latest response: ${error.message}` : error.message, true);
  } finally {
    busy = false;
    render();
  }
}

function startHandoff(draft) {
  if (busy || !editingGranted || storageHeld || draft.pendingAction || !draft.checkedInReceipt) return;
  if (!confirm('Start a new operator record for this position? The previous Crew Call will stay intact and open until its checkout is submitted.')) return;
  const next = createDraft(draft.positionKey, ownerKey);
  next.eventId = draft.eventId;
  next.eventName = draft.eventName;
  next.assignment = { ...draft.assignment };
  next.previousSessionId = draft.checkedInReceipt.sessionId;
  next.setupTest = draft.setupTest;
  store.drafts[next.draftId] = next;
  store.activeDraftId = next.draftId;
  updateDraft(next);
  setNotice('Handoff draft started. Enter the next operator; the earlier evidence was not overwritten.');
  view.stage = 'setup';
  view.page = 1;
  render('[data-field="operatorName"]');
}

async function submitOverride(draft) {
  if (busy || !editingGranted || storageHeld || draft.pendingAction) return;
  const correction = draft.leadCorrection;
  const reason = correction?.reason.trim();
  if (!reason) { setNotice('Enter the reason for the lead correction.', true); render(); return; }
  if (!Object.entries(correction.changes).some(([key, value]) => value.trim() && value.trim() !== draft.assignment[key])) {
    setNotice('Change at least one assignment value before applying a correction.', true); render(); return;
  }
  if (!confirm('Apply these assignment values as an attributed lead correction?')) return;
  correction.pending = true;
  if (!updateDraft(draft)) { setNotice('The lead correction recovery copy could not be saved. Nothing was submitted.', true); render(); return; }
  busy = true; setNotice('Applying the lead correction.'); render();
  try {
    await api('/api/camera/override', { method: 'POST', body: JSON.stringify({
      sessionId: draft.checkedInReceipt.sessionId,
      overrideId: correction.overrideId,
      reason,
      changes: { ...correction.changes }
    }) });
    Object.entries(correction.changes).forEach(([key, value]) => { if (value.trim()) draft.assignment[key] = value.trim(); });
    delete draft.leadCorrection;
    updateDraft(draft);
    setNotice('Lead correction confirmed and read back from Notion.');
  } catch (error) {
    correction.pending = Boolean(uncertainSubmission(error));
    updateDraft(draft);
    setNotice(error.message, true);
  } finally {
    busy = false;
    render();
  }
}

function disconnect(repaint = true) {
  credential = null;
  credentialExpires = 0;
  identity = null;
  clearTimeout(credentialTimer);
  ownerKey = `local:${localOwner}`;
  store.activeDraftId = '';
  setNotice('Google sign-in cleared. Account-bound drafts are hidden from this local profile.');
  if (repaint) render();
}

function changeLocalOwner() {
  if (busy || !editingGranted || storageHeld || currentDraft().pendingAction) return;
  if (!confirm('Switch local operator profile? Existing local drafts remain stored but will be hidden from the new profile.')) return;
  const nextOwner = crypto.randomUUID();
  try { localStorage.setItem(OWNER_KEY, nextOwner); }
  catch { storageFailure('The new operator profile could not be saved. Your current profile and drafts remain active.'); return; }
  localOwner = nextOwner;
  disconnect(false);
  ownerKey = `local:${localOwner}`;
  store.activeDraftId = '';
  setNotice('New local operator profile started.');
  render();
}

async function accountOwnerKey(subject) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(subject));
  return `account:${[...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2, '0')).join('')}`;
}

async function handleCredential(result) {
  if (busy || !editingGranted || storageHeld) return;
  busy = true;
  setNotice('Checking the signed-in account. Draft edits will resume when the connection is verified.');
  render();
  try {
    const claims = JSON.parse(atob(result.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!claims.sub || !claims.email || !Number.isFinite(claims.exp) || claims.exp * 1000 <= Date.now() + 60000) throw new Error('Google sign-in is incomplete or expired.');
    const priorOwner = ownerKey;
    const accountOwner = await accountOwnerKey(claims.sub);
    credential = result.credential;
    credentialExpires = claims.exp * 1000 - 60000;
    const context = await api('/api/camera/context');
    ownerKey = accountOwner;
    const { draft, resumed } = resumeAccountDraft(store, accountOwner, priorOwner, routePosition());
    identity = { email: claims.email, roles: context.roles || [] };
    store.events = context.events || [];
    store.registry = safeCameraRegistry(context.registry);
    if (draft) updateDraft(draft); else saveStore();
    clearTimeout(credentialTimer);
    credentialTimer = setTimeout(() => {
      credential = null;
      credentialExpires = 0;
      identity = null;
      // An expiring token must not switch the draft underneath an in-flight
      // submission. Explicit sign-out still hides account-bound local drafts.
      setNotice('Google sign-in expired. This draft is preserved. Sign in again before submitting.');
      render();
    }, credentialExpires - Date.now());
    setNotice(resumed ? 'Resumed your saved account draft. Any separate local draft is preserved. Nothing was submitted.' : 'Connected to the FMP backend. No data is submitted until you confirm an action.');
  } catch (error) {
    disconnect(false);
    setNotice(error.message, true);
  }
  busy = false;
  render();
}

function loadGoogle() {
  if (googlePromise) return googlePromise;
  googlePromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => window.google?.accounts?.id ? resolve() : reject(new Error('Google sign-in did not initialize.'));
    script.onerror = () => reject(new Error('Google sign-in could not load.'));
    document.head.appendChild(script);
    setTimeout(() => reject(new Error('Google sign-in timed out.')), 15000);
  });
  googlePromise = googlePromise.catch(error => { googlePromise = null; throw error; });
  return googlePromise;
}

async function mountGoogle() {
  const target = document.getElementById('cameraGoogle');
  if (!target || identity || !API_BASE || !navigator.onLine || !editingGranted || storageHeld) {
    if (target && !identity) target.textContent = !editingGranted || storageHeld ? 'This tab is read-only. Open Status for editing and recovery options.' : 'Google sign-in needs the secure backend and an online connection.';
    return;
  }
  try {
    await loadGoogle();
    if (!target.isConnected) return;
    window.google.accounts.id.initialize({ client_id: CLIENT_ID, auto_select: false, callback: handleCredential });
    window.google.accounts.id.renderButton(target, { type: 'standard', theme: 'outline', size: 'large', text: 'signin_with' });
  } catch (error) {
    if (target.isConnected) target.textContent = error.message;
  }
}

window.addEventListener('online', () => { setNotice('Connection restored. Pending work will not submit until you tap Retry.'); render(); });
window.addEventListener('offline', () => render());
window.addEventListener('pagehide', () => {
  credential = null;
  identity = null;
  clearTimeout(credentialTimer);
  editingGranted = false;
  releaseEditing?.();
  releaseEditing = null;
  photoUrls.splice(0).forEach(url => URL.revokeObjectURL(url));
});
window.addEventListener('beforeunload', event => {
  if (busy || !storageOk) { event.preventDefault(); event.returnValue = ''; }
});

// One editor owns the whole legacy store. Other tabs can read references but
// cannot overwrite camera evidence. Unsupported browsers fail closed for edits.
async function acquireEditing() {
  if (editingGranted) return;
  if (!navigator.locks?.request) {
    storageMessage ||= 'This browser cannot safely coordinate saved camera drafts. Use a current browser with Web Locks support to edit; references remain available.';
    storageOk = false;
    view.stage = 'status'; view.page = 0;
    render();
    return;
  }
  try {
    await navigator.locks.request(STORAGE_KEY, { ifAvailable: true }, async lock => {
      if (!lock) {
        storageMessage = 'Camera drafts are open for editing in another tab. Close that camera tab, then choose Try editing here. References remain available.';
        storageOk = false;
        view.stage = 'status'; view.page = 0;
        render();
        return;
      }
      editingGranted = true;
      if (!storageHeld) {
        Object.assign(store, loadStore());
        if (!storageHeld) { storageOk = true; storageMessage = ''; view.stage = 'setup'; view.page = 0; }
      }
      if (storageHeld) { view.stage = 'status'; view.page = 0; }
      render();
      await new Promise(resolve => { releaseEditing = resolve; });
    });
  } catch {
    editingGranted = false;
    storageMessage = 'The browser could not secure the camera editing lock. Reload before editing; saved data has not been replaced.';
    storageOk = false;
    render();
  }
}

function downloadRecovery() {
  const saved = storedValue;
  const blob = new Blob([JSON.stringify({ schema: 'FMP_CAMERA_RECOVERY_V1', capturedAt: new Date().toISOString(), savedStorage: saved, currentDrafts: store }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `fmp-camera-recovery-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setNotice('Recovery copy downloaded. It contains operator details and photo references; photo blobs remain in this browser. Keep it private and ask the lead to reconcile pending records.');
  render();
}

window.addEventListener('storage', event => {
  if (editingGranted && event.key === STORAGE_KEY && event.newValue !== storedValue) {
    storageHeld = true;
    storageFailure('Another tab changed saved camera data. Editing is paused. Download this tab’s recovery copy before reloading.');
  }
});
window.addEventListener('pageshow', event => {
  if (event.persisted) location.reload();
});
acquireEditing();
