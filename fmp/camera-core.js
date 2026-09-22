export const CHECK_STATES = Object.freeze([
  { value: 'pass', label: 'Pass' },
  { value: 'issue', label: 'Issue' },
  { value: 'not_checked', label: 'Not checked' },
  { value: 'na', label: 'Not applicable' }
]);

export const FALLBACK_REGISTRY = Object.freeze({
  schema: 'FMP_CAMERA_POSITION_REGISTRY_V1',
  updated: '2026-09-15',
  source: 'bundled documented fallback',
  positions: [
    { key: 'pit-center', displayName: 'Pit · Center', notionPosition: 'Cam 1 · Pit SR', legacyCamera: '1', ptz: false },
    { key: 'front-of-house', displayName: 'Front of House', notionPosition: 'Cam 2 · FOH', legacyCamera: '2', ptz: false },
    { key: 'pit-stage-left', displayName: 'Pit · Stage Left', notionPosition: 'Cam 3 · Pit SL', legacyCamera: '3', ptz: false },
    { key: 'catwalk', displayName: 'Catwalk', notionPosition: 'Cam 4 · PTZ', legacyCamera: '4', ptz: true }
  ],
  // Public HTML references on the suite's canonical home, never Notion pages: crews need no Notion account.
  references: {
    backFocus: 'https://housevideo.app/backfocus/',
    fieldGuide: 'https://housevideo.app/fmp/gear/#g2',
    cameraOps: 'https://housevideo.app/fmp/build/',
    ptzOps: 'https://housevideo.app/fmp/ptz/'
  }
});

export const HUMAN_BUILD_CHECKS = Object.freeze([
  ['power', 'Power and body start', 'Camera reaches its normal running state and the status LCD lights. If it is on battery, check the indicator is not already down to its last bar.'],
  ['viewfinder', 'Viewfinder image', 'A live picture in the viewfinder, not bars and not black. Bars mean someone left the camera on colour bars.'],
  ['signal', 'Signal at switcher', 'The switcher shows this camera on its own input, in the house format. A frame that rolls or tears points at format or reference, not at the camera.'],
  ['tally', 'Tally', 'Put this camera on Program and confirm the light comes up on THIS camera. Tally follows the camera\u2019s own ID number rather than the socket it is plugged into, so a mismatched ID lights the wrong operator.'],
  ['comms', 'Comms', 'Two way: the operator hears the director and the director hears them. Test both directions; one working direction is a common way to find out too late.'],
  ['backFocus', 'Back focus', 'Zoom fully in on a distant detail and focus, then zoom fully out and check it is still sharp. If it drifts, back focus needs setting before the show, not during it.']
]);
export const PTZ_BUILD_CHECKS = Object.freeze([
  ['power', 'Power', 'Head powered and finished starting. It draws power either from PoE+ on the network run or from its 12 V input, so confirm which one is feeding it before assuming a dead port.'],
  ['network', 'Network and control link', 'The controller reaches the head and the head answers. Control travels over the production LAN, separately from the SDI run, so video can be perfect while control is dead.'],
  ['video', 'Video at switcher', 'A picture on the switcher input this head is patched to. Video and control are independent paths; confirm both rather than inferring one from the other.'],
  ['controller', 'Correct controller camera', 'Move the head and watch that THIS head moves. Selecting the wrong camera on the panel is the fastest way to move a shot that is on air.'],
  ['preset', 'Preset recall', 'Recall a known preset and confirm the framing is what it should be. Take care near the keypad: on the hardware, holding a number overwrites that preset with the current shot.'],
  ['simultaneousPanTilt', 'Pan and tilt together', 'Drive the joystick diagonally. Both axes should move at once and stop together; one axis lagging or sticking is a fault to report now rather than during a show.']
]);
export const HUMAN_STOW_CHECKS = Object.freeze([
  ['viewfinder', 'Viewfinder stowed', 'Viewfinder folded back to its travel position and not left bearing weight or proud of the body.'],
  ['cables', 'Cables coiled and inside case', 'Coiled the way they were, inside the case, with nothing trapped in the lid or trailing where it can be stepped on.'],
  ['lensCap', 'Lens capped', 'Cap on the lens. It protects the front element and it is the visible sign to the next person that the camera was put away properly.'],
  ['bodyCase', 'Body seated in case', 'Body sitting properly in its foam, not resting on a cable or a strap, and the case able to close without being forced.']
]);
export const PTZ_STOW_CHECKS = Object.freeze([
  ['parked', 'PTZ parked', 'Head returned to its parked position using the controller. Never move the head by hand to park it — the manufacturer warns that turning a powered head can damage it.'],
  ['powerState', 'Approved power state', 'Left in whatever power state the venue has agreed for this head, not simply switched off. Someone else may expect it reachable.'],
  ['controller', 'Controller left ready', 'Panel left on a safe camera selection and out of any menu, so the next operator does not start inside a menu wondering why nothing moves.'],
  ['areaClear', 'Catwalk area clear', 'Nothing left on the catwalk: no tools, no coffee, no loose cable. Anything up there can fall into the bowl.']
]);

const POSITION_KEYS = new Set(FALLBACK_REGISTRY.positions.map(position => position.key));
const LEGACY = Object.fromEntries(FALLBACK_REGISTRY.positions.map(position => [position.legacyCamera, position.key]));
const STATES = new Set(CHECK_STATES.map(state => state.value));

export function positionKeyFromLocation(pathname, search = '') {
  const pathKey = pathname.split('/').filter(Boolean).at(-1);
  if (POSITION_KEYS.has(pathKey)) return pathKey;
  const params = new URLSearchParams(search);
  if (POSITION_KEYS.has(params.get('position'))) return params.get('position');
  return LEGACY[params.get('camera')] || '';
}

export function positionFor(registry, key) {
  return registry?.positions?.find(position => position.key === key) ||
    FALLBACK_REGISTRY.positions.find(position => position.key === key) ||
    FALLBACK_REGISTRY.positions[0];
}

export function checksFor(position, stage) {
  if (stage === 'build') return position.ptz ? PTZ_BUILD_CHECKS : HUMAN_BUILD_CHECKS;
  return position.ptz ? PTZ_STOW_CHECKS : HUMAN_STOW_CHECKS;
}

export function initialChecks(position, stage) {
  return Object.fromEntries(checksFor(position, stage).map(([key]) => [key, 'not_checked']));
}

export function createDraft(positionKey, ownerKey, now = new Date()) {
  const position = positionFor(FALLBACK_REGISTRY, positionKey);
  return {
    draftId: crypto.randomUUID(),
    ownerKey,
    positionKey: position.key,
    eventId: '',
    eventName: '',
    operatorName: '',
    assignment: {
      cameraNumber: position.legacyCamera || '',
      bodyIdentifier: '',
      bodyModel: '',
      lens: '',
      switcherInput: position.legacyCamera || '',
      controlChannel: position.ptz ? 'PTZ control' : ''
    },
    assignmentConfirmed: false,
    buildChecks: initialChecks(position, 'build'),
    stowChecks: initialChecks(position, 'stow'),
    faults: [],
    checkedInReceipt: null,
    checkedOutReceipt: null,
    previousSessionId: '',
    setupTest: false,
    pendingAction: '',
    updatedAt: now.toISOString()
  };
}

export function setPosition(draft, registry, key) {
  const previous = positionFor(registry, draft.positionKey);
  const position = positionFor(registry, key);
  if (!POSITION_KEYS.has(position.key)) throw new Error('Choose a valid camera position.');
  draft.positionKey = position.key;
  if (!draft.assignment.cameraNumber || draft.assignment.cameraNumber === previous.legacyCamera) {
    draft.assignment.cameraNumber = position.legacyCamera || '';
  }
  if (!draft.assignment.switcherInput || draft.assignment.switcherInput === previous.legacyCamera) {
    draft.assignment.switcherInput = position.legacyCamera || '';
  }
  const previousControl = previous.ptz ? 'PTZ control' : '';
  if (!draft.assignment.controlChannel || draft.assignment.controlChannel === previousControl) {
    draft.assignment.controlChannel = position.ptz ? 'PTZ control' : '';
  }
  draft.buildChecks = initialChecks(position, 'build');
  draft.stowChecks = initialChecks(position, 'stow');
  draft.assignmentConfirmed = false;
  draft.updatedAt = new Date().toISOString();
  return draft;
}

export function setCheck(checks, name, value) {
  if (!(name in checks) || !STATES.has(value)) throw new Error('Invalid check state.');
  checks[name] = value;
  return checks;
}

export function checkInIssues(draft) {
  const issues = [];
  if (!draft.eventId) issues.push('Choose the show.');
  if (!draft.operatorName.trim()) issues.push('Enter the operator name.');
  if (!draft.assignmentConfirmed) issues.push('Confirm tonight’s assignment.');
  if (Object.values(draft.buildChecks).some(value => !STATES.has(value))) issues.push('Complete each build check.');
  return issues;
}

export function checkoutIssues(draft) {
  const issues = [];
  if (!draft.checkedInReceipt?.sessionId) issues.push('Confirm check-in before check-out.');
  if (Object.values(draft.stowChecks).some(value => !STATES.has(value))) issues.push('Complete each stow check.');
  for (const fault of draft.faults) {
    if (!fault.description?.trim()) issues.push('Describe every saved fault.');
    if (!['Critical', 'Degraded', 'Cosmetic'].includes(fault.severity)) issues.push('Choose a valid fault severity.');
  }
  return issues;
}

export function visibleDrafts(drafts, ownerKey) {
  return Object.values(drafts || {}).filter(draft => draft?.ownerKey === ownerKey);
}

const plainObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const strings = value => plainObject(value) && Object.values(value).every(item => typeof item === 'string');
const validPhotoRef = ref => plainObject(ref) && typeof ref.id === 'string' && typeof ref.name === 'string';
const validFault = fault => plainObject(fault) && typeof fault.id === 'string' && typeof fault.description === 'string' &&
  ['Critical', 'Degraded', 'Cosmetic'].includes(fault.severity) && Array.isArray(fault.photos) && fault.photos.every(validPhotoRef);
const validReceipt = value => value == null || (plainObject(value) && typeof value.sessionId === 'string');

export function safeCameraRegistry(value) {
  if (value?.schema !== FALLBACK_REGISTRY.schema || !Array.isArray(value.positions) || value.positions.length !== 4) return FALLBACK_REGISTRY;
  const seen = new Set();
  for (const item of value.positions) {
    const expected = FALLBACK_REGISTRY.positions.find(position => position.key === item?.key);
    if (!expected || seen.has(item.key) || item.ptz !== expected.ptz || item.legacyCamera !== expected.legacyCamera ||
      typeof item.displayName !== 'string' || !item.displayName.trim() || typeof item.notionPosition !== 'string') return FALLBACK_REGISTRY;
    seen.add(item.key);
  }
  const references = { ...FALLBACK_REGISTRY.references };
  for (const [key, url] of Object.entries(value.references || {})) {
    if (!(key in references) || typeof url !== 'string') continue;
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:' && ['housevideo.app', 'app.notion.com'].includes(parsed.hostname) && !parsed.username && !parsed.password) references[key] = url;
    } catch { /* Keep the bundled reference when a cached URL is invalid. */ }
  }
  return { ...value, positions: value.positions.map(item => ({ ...item })), references };
}

function validDraft(draft, id) {
  if (!plainObject(draft) || draft.draftId !== id || typeof draft.ownerKey !== 'string' || !POSITION_KEYS.has(draft.positionKey) ||
    !['eventId', 'eventName', 'operatorName', 'updatedAt'].every(key => typeof draft[key] === 'string') ||
    typeof draft.assignmentConfirmed !== 'boolean' || typeof draft.setupTest !== 'boolean' ||
    !strings(draft.assignment) || !['cameraNumber', 'bodyIdentifier', 'bodyModel', 'lens', 'switcherInput', 'controlChannel'].every(key => typeof draft.assignment[key] === 'string') ||
    !Array.isArray(draft.faults) || !draft.faults.every(validFault) ||
    !validReceipt(draft.checkedInReceipt) || !validReceipt(draft.checkedOutReceipt) ||
    !['', 'check-in', 'check-out'].includes(draft.pendingAction || '')) return false;
  const position = positionFor(FALLBACK_REGISTRY, draft.positionKey);
  if (!['build', 'stow'].every(stage => plainObject(draft[`${stage}Checks`]) &&
    checksFor(position, stage).every(([key]) => STATES.has(draft[`${stage}Checks`][key])))) return false;
  const correction = draft.leadCorrection;
  if (correction && (!plainObject(correction) || !strings(correction.changes) || typeof correction.reason !== 'string' || typeof correction.overrideId !== 'string')) return false;
  const pending = draft.pendingSubmission;
  if (pending) {
    const payload = pending.payload;
    if (!plainObject(pending) || pending.action !== draft.pendingAction || !plainObject(payload) ||
      typeof payload.capturedAt !== 'string' || !Number.isFinite(Date.parse(payload.capturedAt)) || payload.positionKey !== draft.positionKey ||
      !strings(payload.checks)) return false;
    if (pending.action === 'check-in' && (payload.draftId !== id || typeof payload.operatorName !== 'string' ||
      typeof payload.eventId !== 'string' || !strings(payload.assignment))) return false;
    if (pending.action === 'check-out' && (payload.sessionId !== draft.checkedInReceipt?.sessionId ||
      !Array.isArray(payload.faults) || !payload.faults.every(validFault))) return false;
  }
  return true;
}

// Invalid drafts are never rewritten or discarded. The caller holds the original
// storage value for download and disables writes until it can be recovered.
export function inspectCameraStore(value) {
  if (!plainObject(value) || (value.drafts != null && !plainObject(value.drafts))) throw new Error('Saved camera drafts have an invalid format.');
  const drafts = {};
  let invalidDrafts = 0;
  for (const [id, draft] of Object.entries(value.drafts || {})) {
    if (validDraft(draft, id)) drafts[id] = draft;
    else invalidDrafts++;
  }
  return { ...value, drafts, invalidDrafts,
    activeDraftId: typeof value.activeDraftId === 'string' ? value.activeDraftId : '',
    events: (Array.isArray(value.events) ? value.events : []).filter(event => plainObject(event) &&
      ['id', 'name', 'date'].every(key => typeof event[key] === 'string')).map(event => ({ ...event, status: typeof event.status === 'string' ? event.status : '' })),
    registry: safeCameraRegistry(value.registry) };
}

// Capture time, observations and photo references once, before sending anything.
// Photo blobs remain in IndexedDB under their immutable reference IDs.
export function prepareSubmission(draft, action, capturedAt = new Date().toISOString()) {
  if (draft.pendingAction) {
    if (draft.pendingAction !== action || draft.pendingSubmission?.action !== action) {
      throw new Error('This older pending draft has no original submission snapshot. Download its recovery copy and ask the lead to reconcile the server record before making a new submission.');
    }
    return structuredClone(draft.pendingSubmission.payload);
  }
  const payload = action === 'check-in' ? checkInPayload(draft, capturedAt) :
    action === 'check-out' ? checkoutPayload(draft, structuredClone(draft.faults), capturedAt) : null;
  if (!payload) throw new Error('Unknown camera submission.');
  draft.pendingAction = action;
  draft.pendingSubmission = { action, payload: structuredClone(payload), networkAttempted: false };
  return payload;
}

export function submissionMayHaveReachedServer(draft) {
  // Older snapshots have no attempt marker, so their outcome remains unknown.
  return Boolean(draft.pendingAction && draft.pendingSubmission?.networkAttempted !== false);
}

// Run only after backend identity verification. Preserve local work when an
// account already has an open session; never rebind another account's draft.
export function resumeAccountDraft(store, accountOwner, priorOwner, positionKey) {
  const active = store.drafts[store.activeDraftId];
  const existing = active?.ownerKey === accountOwner && active.positionKey === positionKey ? active :
    visibleDrafts(store.drafts, accountOwner).filter(item => item.positionKey === positionKey && !item.checkedOutReceipt)
      .sort((a, b) => Number(Boolean(b.pendingAction || b.checkedInReceipt)) - Number(Boolean(a.pendingAction || a.checkedInReceipt)) || String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
  if (existing) { store.activeDraftId = existing.draftId; return { draft: existing, resumed: true }; }
  const draft = active?.ownerKey === priorOwner && priorOwner.startsWith('local:') && active.positionKey === positionKey
    ? active : createDraft(positionKey, accountOwner);
  draft.ownerKey = accountOwner;
  store.drafts[draft.draftId] = draft;
  store.activeDraftId = draft.draftId;
  return { draft, resumed: false };
}

export function checkInPayload(draft, capturedAt = new Date().toISOString()) {
  const issues = checkInIssues(draft);
  if (issues.length) throw new Error(issues[0]);
  return {
    draftId: draft.draftId,
    positionKey: draft.positionKey,
    eventId: draft.eventId,
    operatorName: draft.operatorName.trim(),
    assignment: { ...draft.assignment },
    assignmentConfirmed: draft.assignmentConfirmed,
    checks: { ...draft.buildChecks },
    capturedAt,
    previousSessionId: draft.previousSessionId || '',
    setupTest: Boolean(draft.setupTest)
  };
}

export function checkoutPayload(draft, faults, capturedAt = new Date().toISOString()) {
  const issues = checkoutIssues(draft);
  if (issues.length) throw new Error(issues[0]);
  return {
    sessionId: draft.checkedInReceipt.sessionId,
    positionKey: draft.positionKey,
    checks: { ...draft.stowChecks },
    faults,
    capturedAt,
    headsetReturned: Boolean(draft.headsetReturned),
    setupTest: Boolean(draft.setupTest)
  };
}

export function pendingLabel(draft) {
  if (draft.pendingAction === 'check-in') return 'Check-in is pending. Its recovery snapshot stays only on this device until confirmed.';
  if (draft.pendingAction === 'check-out') return 'Check-out is pending. Its recovery snapshot stays only on this device until confirmed.';
  if (draft.checkedOutReceipt) return `Checked out · ${draft.checkedOutReceipt.state}`;
  if (draft.checkedInReceipt) return 'Checked in · open';
  return 'Draft · not submitted';
}
