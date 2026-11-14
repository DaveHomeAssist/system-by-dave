// Rig page: recorded lanes and rasters, the selected projector's control mirror and acceptance.
// Every control here stays disabled except Stop lens, which the relay allows under Show Lock.
import { startMonitor, onLive, laneModels, patch, esc, $, live, lockState, stopLens, checksHTML } from './monitor.js';
import { LANES, POWER, WORKBOOK, checkRows } from './monitor-data.js';

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
  $('#rig-lock-tag').textContent = lock === 'on' ? 'Locked' : lock === 'off' ? 'Monitor view' : 'Relay offline';
  $('#rig-note').firstChild.textContent = lock === 'on' ? 'Show Lock is on. Lens, pattern and input controls are locked.'
    : lock === 'off' ? 'Show Lock is off. This monitor still sends no lens, pattern or input changes; use Projctl.'
      : 'Relay offline. Controls are shown for reference only.';
  const canStop = live.connected && !!v.projector && v.current && v.projector.capabilities?.lens !== false;
  const stop = $('#rig-stop');
  stop.disabled = stopping || !canStop;
  stop.title = canStop ? `Stop any lens movement on ${v.slot}` : 'Stop lens needs a connected relay and a replying projector.';

  const schedules = live.snapshot?.powerSchedules?.schedules;
  const saved = !live.connected ? 'Relay offline' : !Array.isArray(schedules) || !schedules.length ? 'None saved · off until enabled'
    : `${schedules.length} saved · ${schedules.filter(s => s.enabled).length} enabled`;
  patch($('#rig-power'), [kv('Schedules', saved), ...POWER.map(r => kv(r.k, r.v))].join(''));
}

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
onLive(render);
