import { CHECK_STATES, checksFor, pendingLabel } from './camera-core.js?v=90d8a9324a19f3ff';

const esc = value => String(value ?? '').replace(/[&<>"']/g, character =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
export const CAMERA_STAGES = ['setup', 'build', 'faults', 'stow', 'refs'];
const names = { setup: 'Setup', build: 'Build', faults: 'Faults', stow: 'Stow', refs: 'References', status: 'Status', lead: 'Lead' };

// Each page is a bounded task, not a clipped portion of a longer scrolling form.
export function cameraPages({ draft, position, identity, eventOptions, references, draftOptions = '', testOnly, busy, messages, publicRelease = false, readOnly = false, canReclaim = false }) {
  const confirmed = Boolean(draft.checkedInReceipt);
  const evidenceLocked = busy || readOnly || Boolean(draft.pendingAction);
  const locked = confirmed || evidenceLocked;
  const closed = Boolean(draft.checkedOutReceipt);
  const stowLocked = closed || evidenceLocked;
  const retryBlocked = Boolean(draft.pendingAction && !draft.pendingSubmission);
  const page = (title, detail, body) => ({ title, detail, body });
  const assignment = (key, label, max = 120) => `<label>${label}<input data-assignment="${key}" maxlength="${max}" value="${esc(draft.assignment[key])}" ${locked ? 'disabled' : ''}></label>`;
  const checkPages = stage => checksFor(position, stage).map(([key, label], index, rows) => page(
    label, `${stage === 'build' ? 'Build' : 'Stow'} check ${index + 1} of ${rows.length} · choose the observed state`,
    `<div class="check-question"><span class="check-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><div class="segmented" role="group" aria-label="${esc(label)} status">${CHECK_STATES.map(state => `<button type="button" data-check-stage="${stage}" data-check="${key}" data-state="${state.value}" aria-pressed="${draft[stage === 'build' ? 'buildChecks' : 'stowChecks'][key] === state.value}" ${(stage === 'build' ? locked : stowLocked) ? 'disabled' : ''}>${esc(state.label)}</button>`).join('')}</div></div>`));
  const summary = stage => {
    const values = Object.values(draft[stage === 'build' ? 'buildChecks' : 'stowChecks']);
    return `<div class="check-summary">${CHECK_STATES.map(state => `<span><strong>${values.filter(value => value === state.value).length}</strong>${esc(state.label)}</span>`).join('')}</div>`;
  };
  // Crews have no Notion account, so the public receipt names the record instead of linking to it.
  const receipt = (result, label) => result ? `<div class="receipt"><strong>${esc(label)}</strong>${publicRelease || !/^https:\/\/www\.notion\.so\/[A-Za-z0-9_-]+$/.test(result.url || '') ? '<span>Recorded as a Crew Call</span>' : `<a href="${esc(result.url)}" target="_blank" rel="noopener">Open Crew Call ↗</a>`}</div>` : '';
  const setup = [
    page('Connect your account', 'Sign in to load shows and submit. Draft work stays on this device.',
      `<div class="account-card"><div id="cameraGoogle"></div>${identity ? `<strong class="account-email">${esc(identity.email)}</strong><button class="secondary" type="button" id="disconnect" ${busy ? 'disabled' : ''}>Sign out of this tab</button>` : '<p>No Notion account needed.</p>'}</div><button class="text-button" type="button" id="changeLocalOwner" ${evidenceLocked ? 'disabled' : ''}>Change local operator profile</button>`),
    page('Show & operator', 'Choose tonight’s show and identify the person at this position.',
      `<div class="field-grid"><label>Show<select data-field="eventId" ${locked ? 'disabled' : ''}>${eventOptions}</select></label><label>Operator name<input data-field="operatorName" maxlength="120" autocomplete="name" value="${esc(draft.operatorName)}" ${locked ? 'disabled' : ''}></label></div>`),
    page('Camera identity', 'Verify the labels here. Leave unknown values blank.',
      `<div class="field-grid">${assignment('cameraNumber', 'Camera number', 30)}${assignment('bodyIdentifier', 'Body identifier')}</div>`),
    page('Body & lens', 'Use tonight’s equipment, not an assumed house default.',
      `<div class="field-grid">${assignment('bodyModel', 'Body model')}${assignment('lens', 'Lens')}</div>`),
    page('Signal & control', 'Verify where this camera lands and how it is controlled.',
      `<div class="field-grid">${assignment('switcherInput', 'Switcher input', 80)}${assignment('controlChannel', position.ptz ? 'PTZ control' : 'Shading / control channel')}</div>`),
    page('Verify the assignment', 'Blank fields stay unknown. This step does not submit anything.',
      `<label class="check-confirm"><input type="checkbox" data-field="assignmentConfirmed" ${draft.assignmentConfirmed ? 'checked' : ''} ${locked ? 'disabled' : ''}><span>I verified the position, show and tonight’s assignment.</span></label><label class="check-confirm"><input type="checkbox" data-field="setupTest" ${draft.setupTest ? 'checked' : ''} ${locked || testOnly ? 'disabled' : ''}><span>Mark records as SETUP TEST.${testOnly ? ' Required here.' : ''}</span></label>`)
  ];
  if (draftOptions) setup.push(page('Saved sessions', 'Only your drafts for this physical position. Changing the selection does not submit anything.',
    `<label>Resume a saved session<select id="draftPicker" ${busy || readOnly ? 'disabled' : ''}>${draftOptions}</select></label>`));
  setup.push(page('Draft recovery', 'Download a private copy before closing a tab with unsaved or uncertain work.', '<p>Includes operator details and photo references. Photo blobs remain in this browser.</p><button class="secondary" type="button" id="downloadRecovery">Download saved drafts</button>'));
  const build = [...checkPages('build'), page('Review & check in', 'Only Confirm check-in submits. Not checked never means passed.',
    `${summary('build')}<button class="primary" type="button" id="checkIn" ${confirmed || busy || readOnly || retryBlocked ? 'disabled' : ''}>${draft.pendingAction === 'check-in' ? 'Retry pending check-in' : 'Confirm check-in'}</button>`)];
  if (confirmed) build.push(page('Check-in receipt', 'The server confirmed this check-in and read it back from Notion.', `${receipt(draft.checkedInReceipt, 'Server-confirmed check-in')}${!closed ? `<button class="secondary" type="button" id="handoff" ${evidenceLocked ? 'disabled' : ''}>Start operator handoff</button>` : ''}`));
  const faults = [page('Fault observations', `${draft.faults.length} of 6 observations · submitted only at checkout.`,
    `${draft.faults.length ? `<label>Open an observation<select id="faultPicker"><option value="">Choose a fault</option>${draft.faults.map((fault, index) => `<option value="${1 + index * 2}">Fault ${index + 1} · ${esc(fault.severity)}</option>`).join('')}</select></label>` : '<p>No faults added. An Issue check does not create a fault automatically.</p>'}<button class="danger" type="button" id="addFault" ${stowLocked || draft.faults.length >= 6 ? 'disabled' : ''}>Add fault</button>`)];
  draft.faults.forEach((fault, index) => {
    faults.push(page(`Fault ${index + 1} · observation`, 'Describe the symptom. Every fault remains separately attributed.',
      `<div class="fault-fields"><label>Severity<select data-fault-field="severity" data-fault-index="${index}" ${stowLocked ? 'disabled' : ''}>${['Critical', 'Degraded', 'Cosmetic'].map(value => `<option ${fault.severity === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label><label>What happened<textarea rows="2" maxlength="10000" data-fault-field="description" data-fault-index="${index}" ${stowLocked ? 'disabled' : ''}>${esc(fault.description)}</textarea></label></div>`));
    faults.push(page(`Fault ${index + 1} · evidence`, 'One optional photo. Removing a draft does not resolve a server fault.',
      `<label>Photo<input type="file" accept="image/jpeg,image/png,image/webp" data-fault-photo="${index}" ${stowLocked || fault.photos?.length ? 'disabled' : ''}></label><div class="photo-row"><div data-photo-preview="${index}">${fault.photos?.length ? 'Loading photo…' : 'No photo attached.'}</div><div class="photo-actions">${fault.photos?.length && !closed ? `<button class="secondary" type="button" data-remove-photo="${index}" ${stowLocked ? 'disabled' : ''}>Remove photo</button>` : ''}<button class="danger" type="button" data-remove-fault="${index}" ${stowLocked ? 'disabled' : ''}>Remove fault</button></div></div>`));
  });
  const stow = [...checkPages('stow')];
  if (!position.ptz) stow.push(page('Return the headset', 'Confirm only when a headset was issued and returned.',
    `<label class="check-confirm"><input type="checkbox" data-field="headsetReturned" ${draft.headsetReturned ? 'checked' : ''} ${stowLocked ? 'disabled' : ''}><span>Headset returned.</span></label>`));
  stow.push(page('Review & check out', `${draft.faults.length} fault observation(s). The Crew Call stays open until you submit.`,
    `${summary('stow')}<button class="primary" type="button" id="checkOut" ${!confirmed || closed || busy || readOnly || retryBlocked ? 'disabled' : ''}>${draft.pendingAction === 'check-out' ? 'Retry pending checkout' : 'Confirm checkout'}</button>${!confirmed ? '<p class="note">Check in first to enable checkout.</p>' : ''}`));
  if (closed) stow.push(page('Checkout receipt', 'The server confirmed this checkout. Faults remain open until separately resolved.', receipt(draft.checkedOutReceipt, `Server-confirmed checkout · ${draft.checkedOutReceipt.state}`)));
  // Long errors are readable in full by paging, never hidden in a clipped banner.
  const status = messages.flatMap(message => {
    const chunks = message.match(readOnly ? /[\s\S]{1,110}(?:\s|$)|[\s\S]{1,110}/g : /[\s\S]{1,200}(?:\s|$)|[\s\S]{1,200}/g) || ['No new messages.'];
    return chunks.map((text, index) => page(index ? 'Status · continued' : 'Connection & draft status', 'No automatic submissions. Keep this tab open while work is pending.', `<p class="status-message">${esc(text)}</p>${readOnly && !canReclaim ? '<button class="secondary" type="button" id="downloadRecovery">Download saved drafts</button>' : ''}${canReclaim ? '<button class="primary" type="button" id="retryEditing">Try editing here</button>' : ''}`));
  });
  const correction = draft.leadCorrection;
  const correctionField = (key, label, max = 120) => `<label>${label}<input data-correction="${key}" maxlength="${max}" value="${esc(correction?.changes?.[key] ?? draft.assignment[key])}" ${evidenceLocked || correction?.pending ? 'disabled' : ''}></label>`;
  const lead = identity?.roles?.some(role => ['lead', 'admin'].includes(role)) && confirmed ? [
    page('Correct camera identity', 'Local correction draft. No server changes until you confirm.', `<div class="field-grid">${correctionField('cameraNumber', 'Camera number', 30)}${correctionField('bodyIdentifier', 'Body identifier')}</div>`),
    page('Correct body & lens', 'Blank corrections leave the server value unchanged.', `<div class="field-grid">${correctionField('bodyModel', 'Body model')}${correctionField('lens', 'Lens')}</div>`),
    page('Correct signal & control', 'Verify tonight’s routing before applying a correction.', `<div class="field-grid">${correctionField('switcherInput', 'Switcher input', 80)}${correctionField('controlChannel', 'Control channel')}</div>`),
    page('Confirm lead correction', correction?.pending ? 'Outcome uncertain. Values are locked so an explicit retry can reconcile the same correction.' : 'Requires a reason and explicit confirmation. Earlier evidence stays intact.',
      `<label>Reason<textarea id="overrideReason" data-correction-reason maxlength="1000" rows="2" ${evidenceLocked || correction?.pending ? 'disabled' : ''}>${esc(correction?.reason || '')}</textarea></label><button class="secondary" type="button" id="override" ${evidenceLocked ? 'disabled' : ''}>${correction?.pending ? 'Retry lead correction' : 'Apply lead correction'}</button>`)
  ] : [];
  const refs = references.map(reference => page('Position reference', 'Opens separately. Your draft stays here.', reference));
  if (lead.length) refs.push(page('Lead controls', 'Assignment corrections require a reason and explicit confirmation.', '<button type="button" class="secondary" data-stage="lead">Open lead correction</button>'));
  return { setup, build, faults, stow, refs, status, lead };
}

export function cameraShell({ draft, position, registry, pages, view, testOnly, publicRelease = false, appHome = './', connectionText, dotClass, hasAlert, readOnly = false, busy = false }) {
  if (!pages[view.stage]?.length) view.stage = 'setup';
  view.page = Math.max(0, Math.min(view.page, pages[view.stage].length - 1));
  const page = pages[view.stage][view.page];
  const last = view.page === pages[view.stage].length - 1;
  const nextStage = CAMERA_STAGES[CAMERA_STAGES.indexOf(view.stage) + 1];
  const home = publicRelease ? '/fmp/' : testOnly ? '/#cameras' : appHome;
  const homeLabel = publicRelease ? 'Back to FMP Video Operations' : testOnly ? 'Back to House Operations' : 'Back to FMP Walk';
  // The public release loads theme.js, which handles these toggles and updates aria-pressed when the theme
  // changes. Wide layouts show the top bar copy; phones show the status row copy, where the top bar has no room.
  const darkTheme = globalThis.document?.documentElement.dataset.theme === 'dark';
  const themeToggle = place => `<button type="button" class="theme-toggle theme-toggle-${place}" data-theme-toggle aria-pressed="${darkTheme}"><span aria-hidden="true">◐</span><span class="theme-toggle-label">Dark theme</span></button>`;
  const statusBar = `<button class="status-bar ${hasAlert ? 'attention' : ''}" type="button" id="statusDetails"><span>${hasAlert ? 'Attention needed' : draft.pendingAction ? 'Pending · confirmation needed' : 'Draft stays on this device'}</span><span>View status ↗</span></button>`;
  return `<a class="skip" href="#screenTitle">Skip to current task</a><div class="shell">
    <header class="topbar"><a class="brand" href="${home}" aria-label="${homeLabel}"><span class="brand-mark">FMP</span><span>CAMERA<span class="brand-sub">OPERATIONS</span></span></a>${publicRelease ? themeToggle('top') : ''}<label class="position-select"><span>Physical position</span><select id="positionPicker" ${draft.checkedInReceipt || draft.pendingAction || busy || readOnly ? 'disabled' : ''}>${registry.positions.map(item => `<option value="${esc(item.key)}" ${item.key === draft.positionKey ? 'selected' : ''}>${esc(item.displayName)}</option>`).join('')}</select></label><button id="showStatus" class="connection ${hasAlert ? 'attention' : ''}" aria-label="Open connection and draft status"><span class="dot ${dotClass}"></span><span>${hasAlert ? 'Attention' : identityLabel(connectionText)}</span></button></header>
    <div class="test-strip">${testOnly ? `<strong>${publicRelease ? 'SETUP TEST' : 'PRIVATE TEST'}</strong><span>${publicRelease ? 'Not venue accepted · explicit saves only' : 'SETUP TEST only · not venue accepted'}</span>` : '<strong>LIVE WORKFLOW</strong><span>Explicit saves · local drafts</span>'}</div>
    <div class="workspace"><nav class="stage-nav" aria-label="Camera workflow">${CAMERA_STAGES.map((stage, index) => `<button type="button" data-stage="${stage}" aria-current="${view.stage === stage ? 'step' : 'false'}"><span class="stage-number">${String(index + 1).padStart(2, '0')}</span><span>${names[stage]}</span>${stage === 'faults' && draft.faults.length ? `<span class="count">${draft.faults.length}</span>` : ''}</button>`).join('')}<div class="rail-note"><strong>${esc(position.displayName)}</strong><span>${esc(pendingLabel(draft))}</span><p>One screen. One task.<br>No automatic saves to Notion.</p>${pages.lead.length ? '<button type="button" data-stage="lead">Lead correction</button>' : ''}</div></nav>
    <main class="workflow" id="workflow"><header class="screen-head"><div class="screen-meta"><p class="eyebrow">${names[view.stage]} / ${String(view.page + 1).padStart(2, '0')}</p><span class="draft-status">${esc(draft.pendingAction ? 'Pending locally' : draft.checkedOutReceipt ? 'Checkout confirmed' : draft.checkedInReceipt ? 'Checked in' : 'Device draft')}</span></div><h1 id="screenTitle" tabindex="-1">${esc(page.title)}</h1><p class="screen-detail">${esc(page.detail)}</p></header><section class="screen-body" aria-labelledby="screenTitle">${page.body}</section><footer class="screen-footer"><button class="secondary" type="button" id="previousPage" ${!view.page ? 'disabled' : ''}>← Back</button><label class="page-picker"><span class="sr-only">Jump to ${names[view.stage]} step</span><select id="pagePicker">${pages[view.stage].map((item, index) => `<option value="${index}" ${index === view.page ? 'selected' : ''}>${index + 1} / ${pages[view.stage].length} · ${esc(item.title)}</option>`).join('')}</select></label><button class="primary" type="button" id="nextPage" ${last && !nextStage ? 'disabled' : ''}>${last && nextStage ? `${names[nextStage]} →` : 'Next →'}</button></footer></main></div>
    ${publicRelease ? `<div class="status-row">${statusBar}${themeToggle('bottom')}</div>` : statusBar}</div>`;
}

function identityLabel(text) {
  return esc(text.includes('@') ? 'Connected' : text);
}
