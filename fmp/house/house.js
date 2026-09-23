import { houseData } from './house-data.js?v=c7d13e26c2b674d5';

const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]));
const tabs = [...document.querySelectorAll('.tabs a')];
const panels = [...document.querySelectorAll('.panel')];
const labels = { ok:'Recorded in source', caution:'Partial / check required', issue:'Source conflict', unknown:'Unidentified' };
let selectedUnit = null;
let rear = false;
let evidence = false;

function showPanel(hash, scroll = false) {
  const tab = tabs.find(item => item.hash === hash) || tabs[0];
  for (const item of tabs) item.setAttribute('aria-current', item === tab ? 'page' : 'false');
  for (const panel of panels) panel.hidden = `#${panel.id}` !== tab.hash;
  if (scroll) document.querySelector('.tabs').scrollIntoView({ block:'start' });
}
function navigate(hash) {
  if (location.hash !== hash) history.pushState(null, '', hash);
  showPanel(hash, true);
}
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || !tabs.some(tab => tab.hash === link.hash) || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  navigate(link.hash);
});
addEventListener('hashchange', () => showPanel(location.hash));
addEventListener('popstate', () => showPanel(location.hash));

function syncThemeLabel() {
  const control = $('#theme');
  if (control && control.tagName !== 'SELECT') control.textContent = window.fmpTheme.theme === 'dark' ? 'Light mode' : 'Dark mode';
}
// The existing suite controller handles preference persistence and delegated toggles.
document.addEventListener('fmp-theme', syncThemeLabel);
syncThemeLabel();

const spaces = [...new Set(houseData.rows.map(row => row['Venue Space']))];
for (const space of spaces) $('#display-zone').add(new Option(space, space));
function renderDisplays() {
  const query = $('#display-search').value.trim().toLocaleLowerCase();
  const zone = $('#display-zone').value;
  const confidence = $('#display-evidence').value;
  const rows = houseData.rows.map((row, index) => ({ row, index })).filter(({ row }) =>
    (!zone || row['Venue Space'] === zone) &&
    (!confidence || (confidence === 'flagged' ? Boolean(row['Defect Flag']) : row.Confidence === confidence)) &&
    (!query || Object.values(row).join(' ').toLocaleLowerCase().includes(query)));
  $('#display-rows').innerHTML = rows.map(({ row:r, index }) => `<tr><td><button type="button" data-display="${index}">${escape(r.Position)}</button><small>Source ID ${escape(r['Device ID'] || 'not recorded')}</small></td><td>${escape(r['Venue Space'])}<small>Map key ${escape(r['Map Key'] || 'not recorded')}</small></td><td>${escape(r.Technology)}<small>${escape(r.Model)}</small></td><td>${escape(r.Confidence)}<small>${escape(r.Status)}</small></td><td>${escape(r['Defect Flag'] || '—')}</td></tr>`).join('') || '<tr><td colspan="5">No source records match these filters.</td></tr>';
  $('#display-count').textContent = `${rows.length} of ${houseData.rows.length} source records · ${rows.filter(({ row }) => row['Defect Flag']).length} with a defect or conflict flag`;
}
$('#display-search').addEventListener('input', renderDisplays);
$('#display-zone').addEventListener('change', renderDisplays);
$('#display-evidence').addEventListener('change', renderDisplays);
$('#display-clear').addEventListener('click', () => {
  $('#display-search').value = $('#display-zone').value = $('#display-evidence').value = '';
  renderDisplays();
});
const dialog = $('#display-detail');
$('#display-rows').addEventListener('click', event => {
  const button = event.target.closest('[data-display]');
  if (!button) return;
  const row = houseData.rows[Number(button.dataset.display)];
  $('#display-detail-body').innerHTML = `<h2 id="display-detail-title">${escape(row.Position)}</h2><span class="badge">${escape(row.Confidence)} · imported September 17, 2026</span><dl class="facts">${Object.entries(row).filter(([key]) => key !== 'Position').map(([key, value]) => `<div${['Notes','Source'].includes(key) ? ' class="wide"' : ''}><dt>${escape(key)}</dt><dd>${escape(value || 'Not recorded')}</dd></div>`).join('')}</dl>`;
  dialog.showModal();
});
$('#display-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });

function renderRack() {
  const groups = rear ? [...houseData.groups].reverse() : houseData.groups;
  $('#rack-bays').classList.toggle('evidence-view', evidence);
  $('#rack-bays').innerHTML = groups.map(group => `<section class="bay" aria-label="${escape(group.name)}"><p class="bay-code">${escape(group.code)} · ${rear ? 'REAR REFERENCE' : 'FRONT REFERENCE'}</p><h3>${escape(group.name)}</h3><div class="rack-stack">${group.units.map(unit => {
    const ports = houseData.rear[unit.d];
    return `<button type="button" class="rack-unit u${unit.height} ${unit.state}" data-unit="${unit.d}" aria-pressed="${selectedUnit === unit.d}" aria-label="${escape(unit.mk + ' ' + unit.md + ', ' + unit.label + ', ' + labels[unit.state])}"><span class="model">${escape(unit.mk)} · ${escape(unit.md)}</span><span class="unit-label">${escape(evidence ? labels[unit.state] : unit.label)}</span>${rear ? `<span class="rear-ports">${ports ? ports.map(port => `<span>${escape(port)}</span>`).join('') : '<span>Rear not recorded</span>'}</span>` : ''}</button>`;
  }).join('')}<div class="rack-space">UNRECORDED SPACE<br>Capacity and U positions not surveyed</div></div></section>`).join('');
}
function unitName(id) { return id.startsWith('T:') ? houseData.terminals[id.slice(2)] || 'Unrecorded endpoint' : houseData.devices[id]?.title || 'Unrecorded device'; }
function inspectUnit(key, focus) {
  selectedUnit = key;
  const device = houseData.devices[key];
  if (!device) return;
  renderRack();
  const traces = houseData.traces[key] || [];
  $('#rack-detail').innerHTML = `<p class="eyebrow">Equipment inspector · source snapshot</p><h3>${escape(device.title)}</h3><span class="badge ${device.state}">${escape(labels[device.state])}</span><p>${escape(device.sub)}</p><dl class="facts">${device.facts.map(fact => `<div><dt>${escape(fact.k)}</dt><dd>${escape(fact.v)}</dd></div>`).join('')}</dl>${device.open ? `<h4>Next read</h4><p>${escape(device.open)}</p>` : '<p>No additional check is written for this entry. That does not certify the equipment.</p>'}${traces.length ? `<details><summary>Logical paths in the uploaded record</summary><ul class="trace-list">${traces.map(([a,b,confidence]) => `<li>${escape(unitName(a))} → ${escape(unitName(b))}<small>${({rec:'Recorded by the source',inf:'Inferred by the source',unk:'Unknown / untraced'})[confidence]}</small></li>`).join('')}</ul><p>Historical source claims. Physical connections and current signal flow need confirmation.</p></details>` : ''}<a class="action" href="${key === 'atem' ? '/switcher/' : '/fmp/rig/'}">${key === 'atem' ? 'Open switcher model reference' : 'Open camera rig reference'} →</a>`;
  if (focus) $('#rack-detail').focus({ preventScroll:true });
  if (innerWidth <= 680) $('#rack-detail').scrollIntoView({ block:'start' });
}
$('#rack-bays').addEventListener('click', event => {
  const button = event.target.closest('[data-unit]');
  if (button) inspectUnit(button.dataset.unit, true);
});
$('#rack-rear').addEventListener('click', () => { rear = !rear; $('#rack-rear').setAttribute('aria-pressed', String(rear)); renderRack(); });
$('#rack-confidence').addEventListener('click', () => { evidence = !evidence; $('#rack-confidence').setAttribute('aria-pressed', String(evidence)); renderRack(); });

$('#site-zones').innerHTML = spaces.map((space, index) => `<button type="button" data-space="${index}"><span>${escape(space)}</span><span>${houseData.rows.filter(row => row['Venue Space'] === space).length} →</span></button>`).join('');
$('#site-zones').addEventListener('click', event => {
  const button = event.target.closest('[data-space]');
  if (!button) return;
  $('#display-search').value = $('#display-evidence').value = '';
  $('#display-zone').value = spaces[Number(button.dataset.space)];
  renderDisplays();
  navigate('#displays');
  $('#display-zone').focus({ preventScroll:true });
});
$('#print').addEventListener('click', () => print());
renderDisplays();
renderRack();
showPanel(location.hash);
