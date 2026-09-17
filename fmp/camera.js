import {
  FALLBACK_REGISTRY, checkInPayload, checkoutPayload, createDraft,
  positionFor, positionKeyFromLocation, resumeAccountDraft, setCheck, setPosition, visibleDrafts
} from './camera-core.js?v=86ae252646f022ea';
import { CLIENT_ID } from './mail.js?v=4a521185a33c8463';
import { loadPhotoBlob, loadPhotoFiles, storePhoto } from './photos.js?v=cd1feeb0fd50c5df';
import { NOTION_API_URL } from './notion-config.js?v=b675c734abe301f4';

import { CAMERA_STAGES, cameraPages, cameraShell } from './camera-view.js?v=be5658a7dd7fa28d';

const view = { stage: 'setup', page: 0 };
let activePages;
const STORAGE_KEY = 'fmpCameraOperationsV1';
const OWNER_KEY = 'fmpCameraLocalOwnerV1';
const API_BASE = /^https:\/\/[a-z0-9-]+\.[a-z0-9.-]*run\.app$/.test(NOTION_API_URL) ? NOTION_API_URL : '';
const SETUP_TEST_ONLY = document.body.dataset.setupTestOnly === 'true';
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
  localOwner = localStorage.getItem(OWNER_KEY) || crypto.randomUUID();
  localStorage.setItem(OWNER_KEY, localOwner);
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

function loadStore() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return {
      drafts: value.drafts && typeof value.drafts === 'object' ? value.drafts : {},
      activeDraftId: typeof value.activeDraftId === 'string' ? value.activeDraftId : '',
      events: Array.isArray(value.events) ? value.events : [],
      registry: value.registry?.schema === 'FMP_CAMERA_POSITION_REGISTRY_V1' ? value.registry : FALLBACK_REGISTRY
    };
  } catch {
    storageOk = false;
    return { drafts: {}, activeDraftId: '', events: [], registry: FALLBACK_REGISTRY };
  }
}
const store = loadStore();

function saveStore() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    storageOk = true;
    return true;
  } catch {
    storageOk = false;
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
  saveStore();
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
  if (PUBLIC_RELEASE) refs.backFocus = '/backfocus/';
  if (SETUP_TEST_ONLY && !PUBLIC_RELEASE) {
    refs.backFocus = '/resources/fmp-back-focus-card.html';
    refs.fieldGuide = '/resources/ursa-broadcast-g2-reference.html';
  }
  const items = [
    ...(PUBLIC_RELEASE ? [
      ['WALK', 'Preshow venue walk', 'Route checks, fault photos and report export', '/fmpwalk/', false],
      ['CALL', 'Bowl camera guide', 'Tour modes, meeting, song flow and directing', '/fmp/guide/', false],
      ['3D', 'Camera rig explorer', `${RIG_COMPONENTS ? `${RIG_COMPONENTS} components` : 'Components'}, photo evidence and operating notes`, '/fmp/rig/', false]
    ] : []),
    ['BF', 'Back-focus card', 'Frame, zoom, focus, repeat', refs.backFocus, !PUBLIC_RELEASE],
    ['G2', 'URSA Broadcast G2 field guide', 'Build, media, viewfinder and body reference', refs.fieldGuide, true],
    ['OP', 'Build and stow instructions', 'House camera operating sequence', refs.cameraOps, true],
    ['PTZ', 'PTZ control notes', 'Controller and catwalk checks', refs.ptzOps, true],
    ...(SETUP_TEST_ONLY && !PUBLIC_RELEASE ? [
      ['PDF', 'Printable G2 reference', 'Existing house reference PDF', '/resources/ursa-broadcast-g2-reference.pdf', true],
      ['MAP', 'Venue and signal maps', 'Select a zone or device, then read its evidence', '/#maps', true]
    ] : [])
  ].filter(item => position.ptz || item[0] !== 'PTZ');
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
  if (SETUP_TEST_ONLY && !draft.checkedInReceipt && !draft.setupTest) {
    draft.setupTest = true;
    updateDraft(draft);
  }
  const position = positionFor(store.registry, draft.positionKey);
  const savedDrafts = identity ? visibleDrafts(store.drafts, ownerKey).filter(item => item.positionKey === draft.positionKey) : [];
  const draftOptions = savedDrafts.map(item => `<option value="${escapeHtml(item.draftId)}" ${item.draftId === draft.draftId ? 'selected' : ''}>${escapeHtml(item.eventName || 'Show not selected')} · ${item.checkedOutReceipt ? 'Checked out' : item.pendingAction ? 'Pending' : item.checkedInReceipt ? 'Checked in' : 'Draft'} · ${escapeHtml(item.updatedAt)}</option>`).join('');
  const [dotClass, connectionText] = backendState(draft);
  const messages = [
    ...(!storageOk ? ['Browser storage is unavailable. Keep this page open. This draft may not survive a reload.'] : []),
    ...(!navigator.onLine ? ['Offline. Work stays on this device. Submission needs an explicit retry after reconnecting.'] : []),
    ...(notice ? [notice] : []),
    `Connection: ${connectionText}. ${draft.pendingAction ? 'Submission is pending on this device.' : 'No automatic submissions.'}`,
    ...(SETUP_TEST_ONLY ? [`${PUBLIC_RELEASE ? 'Commissioning build' : 'Private test build'} · not venue accepted. Use synthetic observations only. Every new record is marked SETUP TEST; signed-in saving still needs verification.`] : [])
  ];
  activePages = cameraPages({ draft, position, identity, eventOptions: eventOptions(draft),
    references: referenceCards(position), draftOptions, testOnly: SETUP_TEST_ONLY, busy, messages });
  app.innerHTML = cameraShell({ draft, position, registry: store.registry, pages: activePages, view,
    testOnly: SETUP_TEST_ONLY, publicRelease: PUBLIC_RELEASE, appHome: APP_HOME, connectionText, dotClass, hasAlert: noticeError || !storageOk });
  bind(draft);
  paintPhotos(draft);
  mountGoogle();
  if (restoreFocus) requestAnimationFrame(() => {
    const target = app.querySelector(restoreFocus);
    if (target && !target.disabled) target.focus({ preventScroll: true });
  });
}

function bind(draft) {
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
    if (!selected || selected.ownerKey !== ownerKey || selected.positionKey !== draft.positionKey || busy) return;
    store.activeDraftId = selected.draftId;
    saveStore();
    go('setup');
  });
  app.querySelectorAll('[data-correction], [data-correction-reason]').forEach(field => field.addEventListener('input', () => {
    if (busy || draft.leadCorrection?.pending) return;
    draft.leadCorrection ||= { overrideId: crypto.randomUUID(), changes: { ...draft.assignment }, reason: '' };
    if (field.hasAttribute('data-correction-reason')) draft.leadCorrection.reason = field.value;
    else draft.leadCorrection.changes[field.dataset.correction] = field.value;
    updateDraft(draft);
  }));
  for (const id of ['showStatus', 'statusDetails']) document.getElementById(id).addEventListener('click', () => go('status'));
  document.getElementById('positionPicker').addEventListener('change', event => {
    if (draft.checkedInReceipt) return;
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
    const name = field.dataset.field;
    draft[name] = field.type === 'checkbox' ? field.checked : field.value;
    if (name === 'eventId') draft.eventName = store.events.find(event => event.id === field.value)?.name || '';
    updateDraft(draft);
  }));
  app.querySelectorAll('[data-assignment]').forEach(field => field.addEventListener('input', () => {
    draft.assignment[field.dataset.assignment] = field.value;
    draft.assignmentConfirmed = false;
    const checkbox = app.querySelector('[data-field="assignmentConfirmed"]');
    if (checkbox) checkbox.checked = false;
    updateDraft(draft);
  }));
  app.querySelectorAll('[data-check]').forEach(button => button.addEventListener('click', () => {
    const checks = button.dataset.checkStage === 'build' ? draft.buildChecks : draft.stowChecks;
    setCheck(checks, button.dataset.check, button.dataset.state);
    updateDraft(draft);
    render();
  }));
  app.querySelectorAll('[data-fault-field]').forEach(field => field.addEventListener('input', () => {
    draft.faults[Number(field.dataset.faultIndex)][field.dataset.faultField] = field.value;
    updateDraft(draft);
  }));
  app.querySelectorAll('[data-remove-fault]').forEach(button => button.addEventListener('click', () => {
    if (!confirm('Remove this unsent fault from the checkout draft?')) return;
    draft.faults.splice(Number(button.dataset.removeFault), 1);
    updateDraft(draft);
    view.page = 0;
    render('#addFault');
  }));
  app.querySelectorAll('[data-fault-photo]').forEach(input => input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    busy = true;
    setNotice('Saving a stripped, compressed JPEG copy in this browser.');
    render();
    try {
      const ref = await storePhoto(file);
      draft.faults[Number(input.dataset.faultPhoto)].photos = [ref];
      updateDraft(draft);
      setNotice('Photo saved in this browser. It is not in Notion until checkout is server-confirmed.');
    } catch (error) {
      setNotice(error.message, true);
    } finally {
      busy = false;
      render();
    }
  }));
  app.querySelectorAll('[data-remove-photo]').forEach(button => button.addEventListener('click', () => {
    draft.faults[Number(button.dataset.removePhoto)].photos = [];
    updateDraft(draft);
    setNotice('Photo removed from this draft. The local blob is retained for recovery.');
    render();
  }));
  document.getElementById('addFault')?.addEventListener('click', () => {
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
    error.uncertain = response.status === 409 || response.status === 429 || response.status >= 500;
    throw error;
  }
  return body;
}

function uncertainSubmission(error) {
  return error.uncertain || error.name === 'TimeoutError' || error.name === 'AbortError' || error instanceof TypeError;
}

async function submitCheckIn(draft) {
  try {
    if (SETUP_TEST_ONLY && !draft.setupTest) throw new Error('Only SETUP TEST records can be submitted from this test build.');
    const payload = checkInPayload(draft);
    if (!navigator.onLine || !credential || !API_BASE) {
      if (!confirm('Save this check-in as pending on this device? It will not be described as complete.')) return;
      draft.pendingAction = 'check-in';
      updateDraft(draft);
      setNotice('Check-in is pending locally. Sign in while online, then tap Retry pending check-in.');
      render();
      return;
    }
    if (!confirm(`Submit check-in for ${draft.operatorName} at ${positionFor(store.registry, draft.positionKey).displayName}?\n\nThis creates one Crew Call in Notion. No email is sent.`)) return;
    busy = true; setNotice('Submitting check-in. Keep this tab open.'); render();
    const result = await api('/api/camera/check-in', { method: 'POST', body: JSON.stringify(payload) });
    draft.checkedInReceipt = result;
    view.stage = 'build';
    view.page = activePages.build.length;
    draft.pendingAction = '';
    updateDraft(draft);
    setNotice('Check-in confirmed by the server and read back from Notion.');
  } catch (error) {
    draft.pendingAction = uncertainSubmission(error) ? 'check-in' : '';
    updateDraft(draft);
    setNotice(uncertainSubmission(error) ?
      'Check-in outcome is uncertain. Keep this draft and inspect Notion before retrying the same submission.' : error.message, true);
  } finally {
    busy = false;
    render();
  }
}

async function submitCheckout(draft) {
  try {
    if (SETUP_TEST_ONLY && !draft.setupTest) throw new Error('Only SETUP TEST records can be submitted from this test build.');
    const faults = [];
    for (const fault of draft.faults) faults.push({ ...fault, photos: await loadPhotoFiles(fault.photos || []) });
    const payload = checkoutPayload(draft, faults);
    if (!navigator.onLine || !credential || !API_BASE) {
      if (!confirm('Save this checkout as pending on this device? The Crew Call will remain open in Notion.')) return;
      draft.pendingAction = 'check-out';
      updateDraft(draft);
      setNotice('Checkout is pending locally. The server record remains open until you retry explicitly.');
      render();
      return;
    }
    if (!confirm(`Submit checkout with ${faults.length} fault record(s)?\n\nStow states marked Not checked remain visible. Faults stay open until separately resolved. No email is sent.`)) return;
    busy = true; setNotice('Submitting checkout and fault evidence. Keep this tab open.'); render();
    const result = await api('/api/camera/check-out', { method: 'POST', body: JSON.stringify(payload) });
    draft.checkedOutReceipt = result;
    view.stage = 'stow';
    view.page = activePages.stow.length;
    draft.pendingAction = '';
    updateDraft(draft);
    setNotice('Checkout confirmed by the server and read back from Notion.');
  } catch (error) {
    draft.pendingAction = uncertainSubmission(error) ? 'check-out' : '';
    updateDraft(draft);
    setNotice(uncertainSubmission(error) ?
      'Checkout outcome is uncertain. Keep the evidence and inspect the Crew Call and Faults before retrying.' : error.message, true);
  } finally {
    busy = false;
    render();
  }
}

function startHandoff(draft) {
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
  const correction = draft.leadCorrection;
  const reason = correction?.reason.trim();
  if (!reason) { setNotice('Enter the reason for the lead correction.', true); render(); return; }
  if (!Object.entries(correction.changes).some(([key, value]) => value.trim() && value.trim() !== draft.assignment[key])) {
    setNotice('Change at least one assignment value before applying a correction.', true); render(); return;
  }
  if (!confirm('Apply these assignment values as an attributed lead correction?')) return;
  correction.pending = true;
  updateDraft(draft);
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
  if (!confirm('Switch local operator profile? Existing local drafts remain stored but will be hidden from the new profile.')) return;
  localOwner = crypto.randomUUID();
  try { localStorage.setItem(OWNER_KEY, localOwner); } catch { storageOk = false; }
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
    if (context.registry?.schema === 'FMP_CAMERA_POSITION_REGISTRY_V1') store.registry = context.registry;
    if (draft) updateDraft(draft); else saveStore();
    clearTimeout(credentialTimer);
    credentialTimer = setTimeout(() => { disconnect(false); setNotice('Google sign-in expired. Sign in again before submitting.'); render(); }, credentialExpires - Date.now());
    setNotice(resumed ? 'Resumed your saved account draft. Any separate local draft is preserved. Nothing was submitted.' : 'Connected to the FMP backend. No data is submitted until you confirm an action.');
  } catch (error) {
    disconnect(false);
    setNotice(error.message, true);
  }
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
  return googlePromise;
}

async function mountGoogle() {
  const target = document.getElementById('cameraGoogle');
  if (!target || identity || !API_BASE || !navigator.onLine) {
    if (target && !identity) target.innerHTML = '<span class="tiny">Google sign-in becomes available after the secure backend is deployed and this device is online.</span>';
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
  photoUrls.splice(0).forEach(url => URL.revokeObjectURL(url));
});
window.addEventListener('beforeunload', event => {
  if (busy) { event.preventDefault(); event.returnValue = ''; }
});

render();
