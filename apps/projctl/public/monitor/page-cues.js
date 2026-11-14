// Cues page: the recorded cue path and map, the Projctl cue listener forms and the cue checks.
import { startMonitor, onLive, esc, $, lockState, checksHTML } from './monitor.js';
import { CUES, OSC, checkRows } from './monitor-data.js';

$('#cue-map').innerHTML = `<div role="row" class="fm-tr fm-tr--head"><span role="columnheader" class="avd-eyebrow">Cue</span><span role="columnheader" class="avd-eyebrow">Message</span><span role="columnheader" class="avd-eyebrow">Goes to</span><span role="columnheader" class="avd-eyebrow">Route</span><span role="columnheader" class="avd-eyebrow">Result</span></div>`
  + CUES.map(r => `<div role="row" class="fm-tr"><span role="cell" class="fm-td">${esc(r.cue)}</span><span role="cell" class="fm-td fm-td--muted">${esc(r.msg)}</span><span role="cell" class="fm-td">${esc(r.dest)}</span><span role="cell" class="fm-td fm-td--mono fm-td--wrap">${esc(r.route)}</span><span role="cell" class="fm-td fm-td--nowrap"><span class="avd-dot avd-dot--idle" aria-hidden="true"></span>NT</span></div>`).join('');
$('#cue-osc').innerHTML = `<span class="avd-eyebrow">${esc(OSC.ports)}</span>${OSC.forms.map(f => `<code>${esc(f)}</code>`).join('')}<ul class="fm-list"><li><span class="avd-dot avd-dot--idle" aria-hidden="true"></span><span data-slot-note>P numbers here are controller slots. The relay reports which slot each lane uses.</span></li><li><span class="avd-dot avd-dot--idle" aria-hidden="true"></span><span>OK on the cue port means received. It does not mean the projector did it.</span></li><li><span class="avd-dot avd-dot--idle" aria-hidden="true"></span><span>Approved hosts and source limits are still to be read back.</span></li><li><span class="avd-dot avd-dot--idle" aria-hidden="true"></span><span>Show Lock limits this path only. Millumin sends its commands on its own.</span></li></ul>`;
$('#cue-checks').innerHTML = checksHTML(checkRows(['midi', 'preset', 'show-restored']));

startMonitor();
onLive(live => {
  const lock = lockState();
  $('[data-lock-line]').textContent = lock === 'on' ? 'Show Lock on' : lock === 'off' ? 'Show Lock off' : 'Show Lock unknown';
  const slots = live.connected ? live.snapshot.projectors.filter(p => /^[A-D]$/.test(p.lane || '')).sort((a, b) => a.lane.localeCompare(b.lane)).map(p => `${p.lane} is ${p.slot}`) : [];
  $('[data-slot-note]').textContent = slots.length ? `P numbers here are controller slots. Today ${slots.join(', ')} on this relay.` : 'P numbers here are controller slots. The relay reports which slot each lane uses.';
});
