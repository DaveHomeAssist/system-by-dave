// Projector details control panels: test-pattern picture tiles and the heat reading.
// These build the desired DOM; app.js patches it in place so focus and command state survive
// status updates. They send commands only through the callbacks they are given.
import { patternThumb } from './pattern-thumbs.js';
import { heatDetail } from './heat-notice.js';
import { patternIsOff } from './output-recovery.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const identityOf = p => JSON.stringify([p?.slot, p?.driver, p?.ip, p?.mac]);
const DOTS = { ok: 'done', watch: 'waiting', hot: 'blocked', unknown: 'idle' };

function head(title, state, extra = '') {
  const node = document.createElement('div');
  node.className = 'pj-dc-head';
  node.innerHTML = `<span class="avd-eyebrow">${esc(title)}</span>${state}${extra}`;
  return node;
}
function note(text, attrs = '') {
  const node = document.createElement('p');
  node.className = 'pj-dc-note';
  if (attrs) node.setAttribute(...attrs);
  node.textContent = text;
  return node;
}

// Patterns in the model's code order with favorites first; Off is Clear pattern, not a tile.
// Sorting by code keeps the manufacturer order even where object keys look numeric.
export function patternTiles(table, favorites = []) {
  return Object.entries(table || {}).filter(([code]) => !patternIsOff(code))
    .sort(([a], [b]) => Number(favorites.includes(b)) - Number(favorites.includes(a)) || a.localeCompare(b, 'en', { numeric: true }));
}

export function patternPanelContent({ projector: p, lane, table, supported, current, stale, favorites, disabled, clearDisabled, feedback, onPattern, onClear }) {
  const out = document.createElement('div');
  if (!p) {
    out.append(head('Test patterns', ''), note('No assigned projector · pattern controls unavailable'));
    return out;
  }
  const currentName = !supported ? 'Not supported' : patternIsOff(current) ? 'Off' : table?.[current] || current || 'Unknown';
  out.append(head('Test patterns', `<span class="pj-dc-state">${esc(currentName)}${stale ? ' (last known)' : ''}</span>`));
  if (!supported) {
    out.append(note('This driver has no internal test patterns. Reset to HDMI stays available.'));
    return out;
  }
  const grid = document.createElement('div');
  grid.className = 'pj-pattern-tiles';
  grid.setAttribute('role', 'group');
  grid.setAttribute('aria-label', `Test patterns for ${lane}`);
  for (const [code, name] of patternTiles(table, favorites)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'avd-btn pj-pattern-tile';
    button.dataset.tilePattern = code;
    button.dataset.focusKey = `${p.slot}:details:pattern:${code}`;
    button._controlIdentity = identityOf(p);
    button.setAttribute('aria-pressed', String(!stale && String(current) === code));
    if (favorites.includes(code)) { button.dataset.favorite = 'true'; button.title = `${name} · favorite`; }
    button.disabled = disabled;
    button.innerHTML = `${patternThumb(name)}<span>${esc(name)}</span>`;
    button.onclick = event => onPattern(code, event.currentTarget);
    grid.append(button);
  }
  const foot = document.createElement('div');
  foot.className = 'pj-pattern-foot';
  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'avd-btn pj-pattern-clear';
  clear.dataset.action = 'clear';
  clear.dataset.focusKey = `${p.slot}:details:clear`;
  clear._controlIdentity = identityOf(p);
  clear.disabled = clearDisabled;
  clear.textContent = 'Clear pattern';
  clear.onclick = event => onClear(event.currentTarget);
  const status = note(feedback || 'Ready', ['role', 'status']);
  status.setAttribute('aria-live', 'polite');
  foot.append(clear, status);
  out.append(grid, foot);
  return out;
}

export function heatPanelContent({ projector, current, now = Date.now(), onOpenThermal }) {
  const model = heatDetail(projector, current, now);
  const out = document.createElement('div');
  out.append(head('Heat', `<span class="avd-state pj-heat-state" data-heat-level="${model.level}"><span class="avd-dot avd-dot--${DOTS[model.level]}" aria-hidden="true"></span><span>${esc(model.word)}</span></span>`));
  const reading = document.createElement('p');
  reading.className = 'pj-heat-reading';
  reading.innerHTML = `<strong>${esc(model.value)}</strong><span>°C</span>`;
  const open = document.createElement('button');
  open.type = 'button';
  open.className = 'avd-btn avd-btn--sm avd-btn--quiet pj-heat-open';
  open.dataset.focusKey = 'details:thermal-watch';
  open.textContent = 'Thermal watch';
  open.onclick = () => onOpenThermal();
  out.append(reading, note(model.note), open);
  return out;
}
