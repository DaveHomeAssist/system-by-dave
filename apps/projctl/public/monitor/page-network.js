// Network page: control and picture maps, device details and addresses.
// Addresses come only from this relay at runtime; the public repository keeps none of them.
import { relayUnavailableText, startMonitor, onLive, laneModels, patch, esc, $, live, lockState, checksHTML } from './monitor.js';
import { LANES, RELAYS, PIXELS, LINK_HEALTH, HUB, checkRows } from './monitor-data.js';

let view = 'control', selected = 'macbook';
const kv = (k, v) => `<div class="fm-kv fm-kv--wide"><span class="avd-eyebrow">${esc(k)}</span><span class="fm-kv__v">${esc(v)}</span></div>`;
const host = () => live.connected ? location.host : 'this relay';
const octet = ip => /^\d+\.\d+\.\d+\.\d+$/.test(ip || '') ? '.' + ip.split('.')[3] : ip ? ip : 'no address';
const subnet = L => { const ip = Object.values(L).map(v => v.ip).find(x => /^\d+\.\d+\.\d+\.\d+$/.test(x || '')); return ip ? ip.split('.').slice(0, 3).join('.') + '.x' : null; };

function nodes(L) {
  const lock = lockState(), lockWord = lock === 'on' ? 'On · limits Projctl commands only' : lock === 'off' ? 'Off' : `Unknown · ${relayUnavailableText().toLowerCase()}`;
  const out = {
    gio: { kind: 'Lighting console', name: 'ETC Gio', word: 'Reported', rows: [['Network', 'Lighting network'], ['Sends', 'MIDI to the mioXL'], ['Fires', 'Projection and pixel cues'], ['Sheet', 'CU1']] },
    mio: { kind: 'MIDI interface', name: 'iConnectivity mioXL', word: 'Recorded route', rows: [['Location', 'Third floor rack'], ['In', 'Gio MIDI'], ['Out', 'Network MIDI to both Studios'], ['Check', 'midi']] },
    m5: { kind: 'Playback · projection', name: 'M5 Studio', word: 'Recorded', rows: [['Runs', 'Millumin · four projector feeds'], ['Receives', 'Network MIDI through the mioXL'], ['Sends', 'PJLink to A, B, D · Pulse or PJLink to C'], ['Picture', '4 × USB to HDMI, then HDBaseT'], ['Show Lock', 'Does not cover these commands']] },
    m1: { kind: 'Playback · pixels', name: 'M1 Studio', word: 'Recorded', rows: [['Runs', 'Millumin · pixel playback'], ['Network', 'Lighting network'], ['Sends', 'Pixel data to the deck decoder']] },
    lum: { kind: 'Lighting switch', name: 'Jump Top Luminex', word: 'Reported', rows: [['Record', 'November 14'], ['Carries', 'Cat5 for the deck pixels'], ['Path', 'Recorded routing']] },
    dec: { kind: 'Deck pixel decoder', name: 'DMXking deck decoder', word: 'Recorded route', rows: PIXELS.slice(0, 5).map(p => [p.k, p.v]) },
    macbook: { kind: 'Control relay', name: live.connected ? 'This controller' : RELAYS.macbook.name, word: live.connected ? 'Connected' : 'Recorded',
      rows: [['Serving', live.connected ? `This page · ${location.host}` : 'Not connected to this page'], ['Version', live.connected ? live.snapshot.relay?.release?.name || 'Not reported by this version' : RELAYS.macbook.build], ['Poll', live.connected ? `${Math.round((live.snapshot.relay?.pollIntervalMs || 5000) / 1000)} s · live` : RELAYS.macbook.poll], ['Show Lock', lockWord], ['Record', live.connected ? 'Reading the connected controller' : 'Nov 13 snapshot']] },
    studio: { kind: 'Reporting relay', name: RELAYS.studio.name, word: 'RELAY-1', rows: [['Role', 'Posts Health Logs rows'], ['Address', 'In the project hub'], ['Poll', RELAYS.studio.poll], ['Decision', 'Keep both relays, Studio slowed · Nov 13'], ['Record', 'November 15']] },
    sw: { kind: 'Network switch', name: 'LAN switch', word: 'Recorded route', rows: [['Network', `Projector LAN${subnet(L) ? ' · ' + subnet(L) : ''}`], ['To do', 'Label and mount in the cove and at the rack']] },
    usb: { kind: 'Adapters', name: 'USB to HDMI', word: 'Recorded route', rows: [['Count', '4'], ['Note', 'USB-C reseat restored 1920 × 1200 in the recorded check'], ['Check', 'usb']] },
    aten: { kind: 'EDID emulator', name: 'ATEN VC081A', word: 'Planned', rows: [['State', 'Selected · units out for now'], ['Purpose', 'Hold EDID for the computer'], ['Next', 'Test one ATEN path in the agreed window'], ['Check', 'aten']] },
    tx: { kind: 'Extenders', name: 'AV Access HDBaseT', word: 'Recorded', rows: [['Type', '4K HDMI over HDBaseT'], ['Lanes', 'All four'], ['Before changes', 'Photograph the model label and EDID switches'], ['Run', 'Dedicated category cable to each projector'], ['Check', 'hdmi']] },
    kvm: { kind: 'Operator display', name: 'KVM or field monitor', word: 'Operator station', rows: [['Feed', 'Studio built-in HDMI'], ['Plan', 'Mini PC on venue Wi-Fi · accepted direction']] },
  };
  for (const v of Object.values(L)) out[v.lane.toLowerCase()] = { kind: `Projector ${v.lane}`, name: v.surface, word: live.connected ? v.word : 'Recorded', rows: [
    ['Model', `${v.liveModel || v.model} · ${v.orientation}`], ['Address', v.ip || (live.connected ? 'No address saved' : 'From the relay')],
    ['Labels', `Production ${v.prod} · controller slot ${v.slot || 'unassigned'}`], ['Control', v.route], ['Picture', 'HDBaseT receiver · 1920 × 1200 recorded']] };
  return out;
}

function render() {
  const L = laneModels(), N = nodes(L), lock = lockState();
  document.querySelectorAll('[data-map]').forEach(map => { map.hidden = map.dataset.map !== view; });
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  $('[data-relay-host]').textContent = host();
  $('[data-relay-dot]').className = `avd-dot avd-dot--${live.connected ? 'done' : 'idle'}`;
  $('[data-lock-line]').textContent = lock === 'on' ? 'Show Lock on' : lock === 'off' ? 'Show Lock off' : 'Show Lock unknown';
  $('[data-lan-label]').textContent = `Projector LAN${subnet(L) ? ' · ' + subnet(L) : ''}`;
  const lanes = LANES.map(r => L[r.lane]);
  patch($('[data-lane-nodes="control"]'), lanes.map(v => `<button type="button" class="fm-node" data-node="${v.lane.toLowerCase()}" data-lane="${v.lane}" data-pick="${v.lane.toLowerCase()}" data-key="node-${v.lane}" aria-pressed="${selected === v.lane.toLowerCase()}"><span class="avd-dot avd-dot--${live.connected ? v.st : 'idle'}" aria-hidden="true"></span><span><b>${v.lane} · ${esc(v.surface)}</b><br>${esc(octet(v.ip))} · ${esc((v.liveModel || v.model).replace(/^(Panasonic|Barco) /, ''))}</span></button>`).join(''));
  patch($('[data-lane-nodes="picture"]'), lanes.map(v => `<button type="button" class="fm-node" data-node="p${v.lane.toLowerCase()}" data-lane="${v.lane}" data-pick="${v.lane.toLowerCase()}" data-key="pnode-${v.lane}" aria-pressed="${selected === v.lane.toLowerCase()}"><span><b>${v.lane} · ${esc(v.surface)}</b><br>RX · ${esc(v.model.replace(/^(Panasonic|Barco) /, ''))}</span></button>`).join(''));
  document.querySelectorAll('.fm-node[data-pick]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.pick === selected)));

  const s = N[selected] || N.macbook;
  patch($('#net-dev'), `<div class="avd-panel__head"><h2 id="dev-title" class="avd-panel__title">${esc(s.kind)}</h2><span class="fm-tag">${esc(s.word)}</span></div><div class="avd-panel__body"><h3>${esc(s.name)}</h3><div class="fm-kvs">${s.rows.map(([k, v]) => kv(k, v)).join('')}</div></div>`);

  const rows = [...lanes.map(v => [`${v.lane} · ${v.surface}`, v.ip || (live.connected ? 'None saved' : relayUnavailableText()), live.connected ? 'Relay · live' : 'Needs relay']),
    ['This relay', live.connected ? location.host : relayUnavailableText(), live.connected ? 'This page' : 'Needs relay'],
    ['Studio relay', 'Project hub', 'Recorded'], ['Lighting network', 'Project hub', 'Team record']];
  patch($('#net-addr'), `<div role="row" class="fm-tr fm-tr--head"><span role="columnheader" class="avd-eyebrow">Device</span><span role="columnheader" class="avd-eyebrow">Address</span><span role="columnheader" class="avd-eyebrow">Record</span></div>`
    + rows.map(([n, a, r]) => `<div role="row" class="fm-tr"><span role="cell" class="fm-td fm-td--clip">${esc(n)}</span><span role="cell" class="fm-td fm-td--mono">${a === 'Project hub' ? `<a href="${HUB}" target="_blank" rel="noopener noreferrer">Project hub ↗</a>` : esc(a)}</span><span role="cell" class="fm-td">${esc(r)}</span></div>`).join(''));
}

$('#net-health').innerHTML = LINK_HEALTH.map(h => `<li><span class="avd-dot avd-dot--${h.st}" aria-hidden="true"></span><span class="fm-stack"><span>${esc(h.title)}</span><span class="pj-mono fm-small">${esc(h.detail)}</span></span></li>`).join('');
$('#net-checks').innerHTML = checksHTML(checkRows(['pjlink', 'delivery']));
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { view = b.dataset.view; render(); }));
document.querySelector('.fm-mapwrap').addEventListener('click', event => { const key = event.target.closest('[data-pick]')?.dataset.pick; if (key) { selected = key; render(); } });

startMonitor();
onLive(render);
