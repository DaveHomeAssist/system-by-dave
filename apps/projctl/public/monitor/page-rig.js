// Rig page: recorded lanes and rasters, the selected projector's control mirror and acceptance.
// Every control here stays disabled except Stop lens, which the relay allows under Show Lock.
import { startMonitor, onLive, laneModels, patch, esc, $, live, lockState, stopLens, checksHTML, relayUnavailableText } from './monitor.js';
import { LANES, POWER, WORKBOOK, checkRows } from './monitor-data.js';
import { tileModels, tileSummary } from './mac-tiles.js';

let selected = 'C', stopping = false;
const kv = (k, v) => `<div class="fm-kv"><span class="avd-eyebrow">${esc(k)}</span><span class="fm-kv__v">${esc(v)}</span></div>`;

function render() {
  const L = laneModels(), v = L[selected], lock = lockState();
  patch($('#rig-lanes'), LANES.map(rec => L[rec.lane]).map(x => `<button type="button" class="fm-lanecard fm-pick" data-lane="${x.lane}" data-pick="${x.lane}" data-key="lane-${x.lane}" aria-pressed="${x.lane === selected}"><span class="fm-feed__head"><span class="fm-laneidx">${x.lane}</span><span class="fm-lanename">${esc(x.surface)}</span></span><span class="fm-lanecard__body"><span class="fm-lanecard__model">${esc(x.liveModel || x.model)} · ${esc(x.orientation)}</span><span class="pj-mono fm-small">${esc(x.lens)}</span><span class="fm-flag">${esc(x.lensFlag)}</span><span class="pj-mono fm-small">Plot ${esc(x.raster)}</span><span class="pj-mono fm-small">${esc(x.ip || (live.connected ? 'No address saved' : 'Address from the relay'))} · ${esc(x.prod)} production · ${esc(x.slot || '—')} controller</span></span></button>`).join(''));

  const ctl = $('#rig-ctl');
  ctl.dataset.lane = selected;
  $('[data-sel-lane]', ctl).textContent = selected;
  $('[data-sel-name]', ctl).textContent = `Projector ${selected}`;
  $('[data-sel-surface]', ctl).textContent = v.surface;
  $('[data-sel-model]', ctl).textContent = `${v.liveModel || v.model} · ${v.route}`;
  $('#rig-lock-tag').textContent = lock === 'on' ? 'Locked' : lock === 'off' ? 'Monitor view' : relayUnavailableText();
  $('#rig-note').firstChild.textContent = lock === 'on' ? 'Show Lock is on. Lens, pattern and input controls are locked.'
    : lock === 'off' ? 'Show Lock is off. This monitor still sends no lens, pattern or input changes; use Projctl.'
      : `${relayUnavailableText()}. Controls are shown for reference only.`;
  const canStop = live.connected && !!v.projector && v.current && v.projector.capabilities?.lens !== false;
  const stop = $('#rig-stop');
  stop.disabled = stopping || !canStop;
  stop.title = canStop ? `Stop any lens movement on ${v.slot}` : 'Stop lens needs a connected relay and a replying projector.';

  const schedules = live.snapshot?.powerSchedules?.schedules;
  const saved = !live.connected ? relayUnavailableText() : !Array.isArray(schedules) || !schedules.length ? 'None saved · off until enabled'
    : `${schedules.length} saved · ${schedules.filter(s => s.enabled).length} enabled`;
  patch($('#rig-power'), [kv('Schedules', saved), ...POWER.map(r => kv(r.k, r.v))].join(''));
}

// ---- Show Macs: the latest report each Mac sent to this relay. Read only; nothing here sends a command.
let macView = null, macFetchedAt = 0, macTimer = 0;
const macHTML = m => {
  // One reserved third line, so a tile never changes height when its state does: the failing check, else what was last
  // known, else the first note. Everything is also in the tooltip.
  const third = m.failing ? `<strong>${esc(m.failing.label)}</strong> ${esc(m.failing.observed)}${m.failing.more ? ` <span class="fm-mac__more">+${m.failing.more} more</span>` : ''}`
    : esc(m.lastKnown || m.notes[0] || '') + (!m.lastKnown && m.notes.length > 1 ? ` <span class="fm-mac__more">+${m.notes.length - 1} more</span>` : '');
  const all = [m.failing && `${m.failing.label}: ${m.failing.observed}`, m.lastKnown, ...m.notes].filter(Boolean).join('\n');
  return `<article class="fm-mac" role="listitem" data-host="${esc(m.host)}" data-state="${m.state}">
<div class="fm-mac__head"><span class="fm-mac__dot" aria-hidden="true"></span><h3 class="fm-mac__title">${esc(m.title)}</h3><span class="pj-mono fm-small fm-mac__machine">${esc(m.machine)}</span>${m.practice ? '<span class="fm-tag fm-tag--muted fm-mac__practice">Practice report</span>' : ''}<span class="fm-word fm-mac__word">${esc(m.word)}</span></div>
<p class="pj-mono fm-small fm-mac__line">${esc(m.line)}</p>
<p class="fm-mac__third${m.failing ? ' fm-mac__fail' : ''}"${all ? ` title="${esc(all)}"` : ''}>${third}</p>
</article>`;
};
function renderMacs() {
  const models = tileModels({ view: macView, fetchedAt: macFetchedAt, connected: live.connected, attempted: live.attempted });
  patch($('#rig-macs'), models.map(macHTML).join(''));
  $('#macs-tag').textContent = live.connected ? tileSummary(models) : relayUnavailableText();
}
async function loadMacs() {
  clearTimeout(macTimer);
  if (!document.hidden) {
    try {
      const r = await fetch('/api/mac-status', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
      if (r.status === 401) { location.href = '/login.html'; return; }
      macView = r.ok ? await r.json() : null;
      if (r.ok) macFetchedAt = Date.now();
    } catch { macView = null; }
    renderMacs();
  }
  macTimer = setTimeout(loadMacs, 10000);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) loadMacs(); });
setInterval(renderMacs, 5000); // ages and staleness move on without waiting for the next read

$('#rig-plot').innerHTML = ['D', 'B', 'C', 'A'].map(k => LANES.find(l => l.lane === k)).map(l => `<div class="fm-raster" data-lane="${l.lane}"><span class="fm-lanename">${l.lane} · ${esc(l.surface)}</span><span>${esc(l.raster)}</span></div>`).join('');
$('#rig-checks').innerHTML = checksHTML(checkRows(null));
$('#rig-workbook').href = WORKBOOK;
$('#rig-lanes').addEventListener('click', event => {
  const lane = event.target.closest('[data-pick]')?.dataset.pick;
  if (lane) { selected = lane; $('#rig-stop-status').textContent = ''; render(); }
});
$('#rig-stop').addEventListener('click', async () => {
  const v = laneModels()[selected];
  if (!v.slot) return;
  stopping = true; render();
  const status = $('#rig-stop-status');
  status.textContent = `Sending Stop lens to ${v.slot}…`;
  try { await stopLens(v.slot); status.textContent = `Stop lens accepted by the relay for ${v.slot}. Watch the image to confirm.`; }
  catch (error) { status.textContent = `Stop lens failed: ${error.message}`; }
  finally { stopping = false; render(); $('#rig-stop').focus(); }
});

startMonitor();
onLive(() => { render(); renderMacs(); });
loadMacs();
