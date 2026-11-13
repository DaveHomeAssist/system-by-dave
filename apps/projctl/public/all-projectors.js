import { supportsPatterns } from './output-recovery.js';
import { projectorName, orderedProjectors } from './lanes.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

export function createAllProjectors({ state, connected, connectionOf, send }) {
  const dialog = document.querySelector('#all-confirm');
  const confirm = document.querySelector('#all-confirm-send');
  const cancel = document.querySelector('#all-confirm-cancel');
  const note = document.querySelector('#all-confirm-note');
  const results = document.querySelector('#all-results');
  let request = null, busy = false, returnFocus = null, expiry = null;
  const devices = () => orderedProjectors(state().projectors);
  const fingerprint = () => JSON.stringify({ connected: connected(), lock: state().lock, targets: devices().map(p => [p.slot,p.lane,p.model,p.driver,p.ip,p.mac,p.inputs,p.inputPreference,p.controlRevision,!!p.busy,connectionOf(p).current,p.status?.power]) });
  const allowed = command => connected() && state().relay?.commandTargetBinding === 1 && (!state().lock || command === 'shutter' || request?.cmd === 'power' && request?.arg === 1);
  const targetHTML = projectors => projectors.map(p => `<li><strong>${escape(projectorName(p))}</strong><span>${escape(connectionOf(p).current ? p.status?.power || 'Connected' : connectionOf(p).detail)} · ${escape(p.model)}</span></li>`).join('');
  function close() {
    if (busy) return;
    clearTimeout(expiry); request = null; dialog.close(); returnFocus?.focus();
  }
  function review(message = 'Review every target before confirming.') {
    clearTimeout(expiry);
    request.fingerprint = fingerprint(); request.token = null;
    request.targets = devices().map(p => ({ slot: p.slot, revision: p.controlRevision }));
    document.querySelector('#all-confirm-title').textContent = request.label + '?';
    document.querySelector('#all-confirm-targets').innerHTML = targetHTML(devices());
    note.textContent = message;
    confirm.textContent = 'Confirm and send';
    confirm.className = 'avd-btn ' + (request.cmd==='power' && request.arg===0 ? 'avd-btn--danger' : 'avd-btn--primary');
    confirm.disabled = !allowed(request.cmd);
  }
  function open(button) {
    if (busy) return;
    returnFocus = button;
    request = { cmd:button.dataset.all, arg:button.dataset.all === 'resetInput' ? undefined : button.dataset.all === 'pattern' ? button.dataset.arg : Number(button.dataset.arg), label:button.textContent.trim() };
    review(request.cmd==='resetInput' ? 'Clear internal test patterns where supported, then select and verify HDMI for these projectors.' : request.cmd==='power'&&request.arg===0 ? 'Power off has a final confirmation after the controller checks these targets.' : undefined); dialog.showModal(); cancel.focus();
  }
  confirm.onclick = async () => {
    if (!request || busy) return;
    if (request.fingerprint !== fingerprint()) { review('The target list or safety state changed. Review it and confirm again.'); return; }
    if (!allowed(request.cmd)) { note.textContent = 'This action is unavailable in the current connection or show-lock state.'; return; }
    if (request.token && Date.now() - request.armedAt < 400) return;
    busy = true; confirm.disabled = true; cancel.disabled = true; dialog.setAttribute('aria-busy','true'); note.textContent = 'Sending. Waiting for the relay response...';
    try {
      const response = await send({ slot:'all', cmd:request.cmd, arg:request.arg, expectedTargets:request.targets, ...(request.token ? {confirm:request.token} : {}) });
      if (response.all?.confirm) {
        request.token = response.all.confirm; request.armedAt = Date.now();
        const slots = response.all.targets || [];
        document.querySelector('#all-confirm-targets').innerHTML = targetHTML(devices().filter(p => slots.includes(p.slot)));
        note.textContent = 'The relay confirmed these targets. Confirm power off within 3 seconds.';
        confirm.textContent = 'Confirm power off';
        const token = request.token;
        expiry = setTimeout(() => { if (request?.token === token && !busy) review('Power-off confirmation expired. Review the targets and confirm again.'); },3000);
        return;
      }
      results.textContent = request.label + '\n' + Object.entries(response).map(([slot,result]) => `${projectorName(devices().find(p => p.slot===slot) || {slot})}: ${result.error || result.detail || (result.result === 'OK' ? 'Command accepted' : result.result || 'Check live status')}`).join('\n');
      busy = false; close();
    } catch (error) { note.textContent = `No response confirmed. Check the live projector states before retrying. ${error.message}`; }
    finally { busy = false; confirm.disabled = !request || !allowed(request.cmd); cancel.disabled = false; dialog.removeAttribute('aria-busy'); }
  };
  cancel.onclick = close;
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  for (const button of document.querySelectorAll('[data-all]')) button.onclick = () => open(button);
  return {
    update() {
      document.querySelector('#all-targets').innerHTML = targetHTML(devices());
      for (const button of document.querySelectorAll('[data-all]')) {
        const safe = !state().lock || button.dataset.all === 'shutter' || button.dataset.all === 'power' && button.dataset.arg === '1';
        button.disabled = !connected() || !state().relay?.commandTargetBinding || !safe || !devices().some(p => connectionOf(p).current && (button.dataset.all !== 'pattern' || supportsPatterns(p)));
      }
    },
  };
}
