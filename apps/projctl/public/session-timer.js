// Session timer: a browser stopwatch shown in projector details. It is shared by every lane,
// kept under projctl.sessionTimer.v1 in this browser, and falls back to a session-only timer
// when storage is unavailable. It sends nothing to the relay or the projectors.
export const TIMER_KEY = 'projctl.sessionTimer.v1';
const MAX_MS = 7 * 24 * 3600 * 1000;
const fresh = () => ({ version: 1, running: false, startedAt: null, elapsedMs: 0 });

export function normalizeTimer(value, now = Date.now()) {
  const clean = fresh();
  if (!value || value.version !== 1) return clean;
  if (Number.isFinite(value.elapsedMs) && value.elapsedMs >= 0) clean.elapsedMs = Math.min(value.elapsedMs, MAX_MS);
  if (value.running === true && Number.isFinite(value.startedAt) && value.startedAt <= now && now - value.startedAt <= MAX_MS) {
    clean.running = true; clean.startedAt = value.startedAt;
  }
  return clean;
}
export const elapsedOf = (timer, now = Date.now()) => Math.min(MAX_MS, timer.elapsedMs + (timer.running ? Math.max(0, now - timer.startedAt) : 0));
export function formatElapsed(ms) {
  const total = Math.floor(Math.max(0, ms) / 1000), pad = n => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
}

export function createSessionTimer(host, { getStorage = () => localStorage, now = () => Date.now() } = {}) {
  let storage = null, stored = true, timer = fresh(), active = false, tick = null, resetTimer = null, armed = false;
  try { storage = getStorage(); const saved = storage.getItem(TIMER_KEY); timer = normalizeTimer(saved ? JSON.parse(saved) : null, now()); }
  catch { stored = false; }
  host.classList.add('avd-panel', 'pj-dc-panel', 'pj-session-panel');
  host.innerHTML = `<div class="pj-dc-head"><span class="avd-eyebrow">Session timer</span><span class="pj-dc-state" data-timer-state></span></div>
    <p class="pj-session-time" data-timer-time>00:00:00</p>
    <div class="pj-session-actions"><button type="button" class="avd-btn avd-btn--primary" data-timer-toggle>Start</button><button type="button" class="avd-btn" data-timer-reset>Reset</button></div>
    <p class="pj-dc-note" data-timer-note></p>`;
  const $ = selector => host.querySelector(selector);
  const save = () => { if (!stored) return; try { storage.setItem(TIMER_KEY, JSON.stringify(timer)); } catch { stored = false; } };
  const disarm = () => { armed = false; clearTimeout(resetTimer); resetTimer = null; };
  function paint() {
    const ms = elapsedOf(timer, now());
    $('[data-timer-time]').textContent = formatElapsed(ms);
    $('[data-timer-state]').textContent = timer.running ? 'Running' : ms ? 'Paused' : 'Stopped';
    host.dataset.timerState = timer.running ? 'running' : ms ? 'paused' : 'stopped';
    const toggle = $('[data-timer-toggle]');
    toggle.textContent = timer.running ? 'Pause' : ms ? 'Resume' : 'Start';
    toggle.setAttribute('aria-pressed', String(timer.running));
    const reset = $('[data-timer-reset]');
    reset.textContent = armed ? 'Confirm reset' : 'Reset';
    reset.disabled = !ms && !armed;
    reset.classList.toggle('avd-btn--danger', armed);
    $('[data-timer-note]').textContent = armed ? 'Tap Confirm reset within 3 seconds.' : stored ? 'Kept in this browser · shared by A to D' : 'Browser storage unavailable · this session only';
  }
  const schedule = () => { clearTimeout(tick); tick = null; if (active && timer.running && !document.hidden) tick = setTimeout(() => { paint(); schedule(); }, 1000 - (now() % 1000) + 5); };
  $('[data-timer-toggle]').onclick = () => {
    const t = now();
    timer = timer.running ? { ...timer, running: false, startedAt: null, elapsedMs: elapsedOf(timer, t) } : { ...timer, running: true, startedAt: t };
    disarm(); save(); paint(); schedule();
  };
  $('[data-timer-reset]').onclick = () => {
    if (!armed) { armed = true; resetTimer = setTimeout(() => { disarm(); paint(); }, 3000); paint(); return; }
    disarm(); timer = fresh(); save(); paint(); schedule();
  };
  const onStorage = event => { if (event.key === TIMER_KEY) { try { timer = normalizeTimer(JSON.parse(event.newValue), now()); } catch { timer = fresh(); } disarm(); paint(); schedule(); } };
  const onVisibility = () => { paint(); schedule(); };
  window.addEventListener('storage', onStorage);
  document.addEventListener('visibilitychange', onVisibility);
  paint();
  return {
    setActive(next) { active = !!next; if (!active) disarm(); paint(); schedule(); },
    get value() { return { ...timer }; },
    destroy() { clearTimeout(tick); disarm(); window.removeEventListener('storage', onStorage); document.removeEventListener('visibilitychange', onVisibility); },
  };
}
