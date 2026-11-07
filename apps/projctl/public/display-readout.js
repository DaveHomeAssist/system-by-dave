export function displaySignature(report) {
  return (report.displays || []).map(d => JSON.stringify([d.name, d.manufacturerId, d.productId, d.resolution, d.pixelResolution, d.rotation, d.mirror, d.online, d.edid?.fingerprint || d.edid?.state])).sort();
}
export function compareBaseline(report, baseline) {
  if (!baseline || baseline.schema !== 1 || baseline.host !== report.host || !Array.isArray(baseline.signature)) return 'No baseline for this relay computer.';
  return JSON.stringify(displaySignature(report)) === JSON.stringify(baseline.signature) ? 'Matches saved display baseline.' : 'Display configuration changed: compare resolution, connection, and EDID below.';
}
export function renderHostDisplays(output, report) {
  output.replaceChildren();
  const add = (parent, tag, text) => { const el = document.createElement(tag); el.textContent = text; parent.append(el); return el; };
  add(output, 'p', `${report.state} · ${report.collectedAt ? new Date(report.collectedAt).toLocaleString() : 'No sample'} · ${report.host || 'Relay computer'}`);
  if (report.state !== 'reported') { add(output, 'p', report.reason || 'Display reads are unavailable.'); return; }
  add(output, 'p', 'Source-facing EDID may belong to a converter or KVM. No A–D assignment is implied. Read-only; video settings are unchanged.');
  const key = `projctl.display-baseline.v1:${report.host}`;
  let baseline;
  try { baseline = JSON.parse(localStorage.getItem(key)); } catch { /* unavailable storage or invalid saved data */ }
  const status = add(output, 'p', compareBaseline(report, baseline)); status.setAttribute('role', 'status');
  const controls = add(output, 'div', '');
  const save = add(controls, 'button', 'Save comparison baseline'); save.className = 'avd-btn'; save.type = 'button';
  save.onclick = () => {
    try { localStorage.setItem(key, JSON.stringify({ schema: 1, host: report.host, savedAt: report.collectedAt, signature: displaySignature(report) })); status.textContent = 'Baseline saved in this browser for this relay computer.'; }
    catch { status.textContent = 'Could not save baseline: browser storage unavailable.'; }
  };
  const exportButton = add(controls, 'button', 'Export display report'); exportButton.className = 'avd-btn'; exportButton.type = 'button';
  exportButton.onclick = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'projctl-display-report.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  if (!report.displays?.length) add(output, 'p', 'No connected displays reported by macOS.');
  for (const d of report.displays || []) {
    const card = add(output, 'article', '');
    add(card, 'strong', d.name || d.id);
    add(card, 'p', `Active output: ${d.resolution || 'Unavailable'} · ${d.connection || 'Connection unknown'}`);
    add(card, 'p', `EDID: ${d.edid?.state || 'unavailable'} · ${d.edid?.name || ''} ${d.edid?.manufacturer || ''}`);
    if (d.edid?.fingerprint) add(card, 'p', `Fingerprint: ${d.edid.fingerprint.slice(0, 16)}`);
    if (d.edid?.detailedTimings?.length) add(card, 'p', 'Advertised detailed timings: ' + d.edid.detailedTimings.map(t => `${t.width} × ${t.height} @ ${t.refreshHz} Hz${t.preferred ? ' (preferred)' : ''}`).join('; '));
    add(card, 'p', d.edid?.reason || 'EDID not available.');
  }
  const details = add(output, 'details', ''); add(details, 'summary', `Raw EDID records (${report.edidRecords?.length || 0})`);
  add(details, 'p', 'These records are retained even when their output association is unknown. Export includes raw EDID and may contain display serial identifiers.');
  for (const e of report.edidRecords || []) add(details, 'p', `${e.name || 'Unnamed'} · ${e.state} · ${e.fingerprint?.slice(0, 16) || e.reason}`);
  if (!report.edidRecords?.length) add(details, 'p', 'No raw EDID exposed through this macOS registry interface. This does not mean the display is disconnected.');
}
