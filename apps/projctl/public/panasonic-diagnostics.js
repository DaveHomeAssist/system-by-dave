const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function diagnosticsHTML(projector, current, now = Date.now()) {
  if (projector?.driver !== 'panasonic') return '';
  const diagnostics = projector.webDiagnostics;
  const section = (title, sample, content) => {
    const time = Date.parse(sample?.observedAt);
    const fresh = current && sample?.state === 'reported' && Number.isFinite(time) && now - time < 120000;
    const age = Number.isFinite(time) ? ` · read ${Math.max(0, Math.round((now - time) / 1000))} s ago` : '';
    return `<section class="pj-web-diagnostics"><h3>${title}</h3><p class="pj-mono">${fresh ? 'Reported' : sample?.state === 'reported' ? 'Last known' : 'Unavailable'}${age}</p>${sample?.state === 'reported' ? content : '<p>Web status has not supplied this reading.</p>'}</section>`;
  };
  const status = diagnostics?.status, self = diagnostics?.selfTest;
  const lamps = (status?.lamps || []).map(lamp => `<li>Lamp ${esc(lamp.id)} · ${esc(lamp.state || 'Unknown')} · ${esc(lamp.hours ?? 'Unknown')} h</li>`).join('');
  const issues = (self?.checks || []).filter(check => check.result !== 'OK').map(check => `${check.name} · ${check.result}`).join('; ');
  const checks = (self?.checks || []).map(check => `<li>${esc(check.name)} · <strong>${esc(check.result)}</strong></li>`).join('');
  return section('Panasonic signal and lamps', status, `<p>${esc(status?.signalTiming || 'Signal timing not reported')}</p><p>Lamp selection ${esc(status?.lampSelection || 'Unknown')} · power ${esc(status?.lampPower || 'Unknown')}</p><ul>${lamps}</ul><p>Projector runtime ${esc(status?.runtimeHours ?? 'Unknown')} h</p>`)
    + section('Panasonic Self Test', self, `<p><strong>${esc(self?.result)}</strong>${issues ? ' · ' + esc(issues) : ''}</p><details data-panasonic-self-test><summary data-focus-key="panasonic-self-test">All Self Test checks</summary><ul>${checks}</ul><p class="pj-mono">${esc(self?.code || 'No error code reported')}</p></details>`);
}

export function preserveDiagnostics(container) {
  const details = container.querySelector('[data-panasonic-self-test]');
  const open = !!details?.open;
  const focused = details?.querySelector('summary') === document.activeElement;
  return () => {
    const next = container.querySelector('[data-panasonic-self-test]');
    if (next) next.open = open;
    if (focused) next?.querySelector('summary')?.focus();
  };
}
