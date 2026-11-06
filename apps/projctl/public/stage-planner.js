import { LANES } from './lanes.js';
import { stageReference } from './stage-reference.js';
import { scenarioBaseline, calculateScenario, scenarioUpwardShift, withScenarioUpwardShift, DLE150_SOURCE } from './stage-scenario.js';
const number = value => Number(value.toFixed(2));
export async function createStagePlanner(host, plot, onScenario, openLive) {
  await import('/ProjectorThrow/throwline-scene-state.js');
  const engine = window.ThrowlineSceneState;
  const baseline = scenarioBaseline(stageReference(plot));
  let scenarios = structuredClone(baseline), lane = 'D';
  const field = (key, label, step = '.25', extra = '') => `<label class="avd-field"><span class="avd-field__label">${label}</span><input class="avd-input" type="number" step="${step}" data-plan="${key}" ${extra}></label>`;
  host.innerHTML = `<div class="pj-plan-heading"><strong>What-if planning</strong><span class="pj-plan-badge">Not sent to projectors</span></div>
    <p class="pj-mono pj-note">Select A–D and edit below. Projectors frames the units; Orbit shows the full beam. In the room preview, Roof reveals the interior.</p>
    <div class="pj-plan-lanes" role="group" aria-label="Planning projector">${Object.keys(LANES).map(key => `<button class="avd-btn" type="button" data-plan-lane="${key}">${key}</button>`).join('')}</div>
    <p class="pj-mono pj-note" id="plan-baseline-note"></p>
    <div class="pj-plan-actions"><button class="avd-btn" type="button" id="plan-reset">Reset recorded plan</button><button class="avd-btn avd-btn--quiet" type="button" id="plan-live">Live controls</button></div>
    <fieldset class="pj-plan-fields"><legend>Lens &amp; full raster</legend>
      <label class="avd-field pj-plan-wide"><span class="avd-field__label">Candidate lens</span><select class="avd-input" data-plan="lens"><option value="recorded">Match recorded footprint · drawing ratio</option><option value="manual">Custom lens range · estimate</option><option value="current">ET-DLE170 · recorded A/D plot</option><option value="dle150">ET-DLE150 · DW830 candidate</option></select></label>
      ${field('min', 'Wide throw ratio', '.01', 'min="0.05" max="20"')}${field('max', 'Tele throw ratio', '.01', 'min="0.05" max="20"')}
      ${field('distance', 'Lens to target plane (ft)', '.25', 'min="1" max="250"')}${field('raster', 'Native raster width (ft)', '.25', 'min="2" max="100"')}
      <label class="avd-field"><span class="avd-field__label">Orientation</span><select class="avd-input" data-plan="portrait"><option value="true">Portrait</option><option value="false">Landscape</option></select></label>
      ${field('aspect', 'Native aspect (width ÷ height)', '.01', 'min="0.2" max="10"')}
    </fieldset>
    <fieldset class="pj-plan-fields"><legend>Optical placement · feet</legend>
      ${field('lensHeight', 'Lens height above stage floor', '.25', 'min="0" max="80"')}${field('lensOffset', 'Lens sideways from target centre', '.25', 'min="-40" max="40"')}
      ${field('centerHeight', 'Raster centre above stage floor', '.25', 'min="0" max="80"')}${field('centerOffset', 'Raster sideways from target centre', '.25', 'min="-40" max="40"')}
      ${field('upShift', 'World upward shift (% raster height)', '.5', 'min="-100" max="100"')}
    </fieldset>
    <fieldset class="pj-plan-fields"><legend>Mapped content inside raster</legend>
      ${field('contentHeight', 'Content height (ft)', '.25', 'min="0.25" max="100"')}
      <label class="avd-field"><span class="avd-field__label">Placement</span><select class="avd-input" data-plan="contentAlign"><option value="center">Centred</option><option value="top">Top of raster</option></select></label>
    </fieldset>
    <div class="pj-plan-presets"><span class="avd-field__label">D lens study · proposed dimensions</span><button class="avd-btn" type="button" data-plan-preset="20">Recorded ET-DLE170 · 20 ft raster</button><button class="avd-btn" type="button" data-plan-preset="26">DLE150 · 26 ft / 20 ft content</button><button class="avd-btn" type="button" data-plan-preset="28">DLE150 · 28 ft / 20 ft content</button></div>
    <output id="plan-result" class="pj-plan-result" aria-live="polite"></output>
    <p class="pj-mono pj-note">Feet. Height datum: stage floor. Sideways axis follows the selected target edge in the recorded plot; positive is its right-hand end. Distance is perpendicular to that target plane. Recorded depth may be drawing-derived.</p>
    <p class="pj-mono pj-note">Coloured face = proposed full raster; white outline = mapped content. Recorded coverage stays visible. No cove, structural, rigging or beam-clearance verification. Enlarging a raster can spill light and reduce content resolution.</p>
    <a class="pj-mono" href="${DLE150_SOURCE}" target="_blank" rel="noopener noreferrer">Panasonic ET-DLE150 source · WXGA 1.36–1.98:1</a>`;
  const $ = s => host.querySelector(s);
  const update = () => {
    try {
      const scenario = scenarios[lane];
      const result = calculateScenario(engine, scenario);
      const { upShift, ...comparable } = scenario;
      const changed = JSON.stringify(comparable) !== JSON.stringify(baseline[lane]);
      const shiftWarning = result.geometry.shift.horizontal.exceeded || result.geometry.shift.vertical.exceeded ? ' Required shift exceeds a documented single-axis limit.' : '';
      $('#plan-result').textContent = `${changed ? 'PROPOSED' : 'RECORDED FOOTPRINT'} · Throw: ${result.geometry.placement.label}.${shiftWarning} Raster ${number(result.width)} × ${number(result.height)} ft; top ${number(result.top)} ft, bottom ${number(result.bottom)} ft above stage floor. Required ratio ${result.geometry.image.requiredRatio.toFixed(3)}:1. Native shift: H ${number(result.geometry.image.horizontalShiftPercent)}%, V ${number(result.geometry.image.shiftPercent)}%. Mapped content uses ${Math.round(result.contentFraction * 100)}% of raster height.${lane === 'D' ? ` Compared with a 20 ft raster at this same centre, the top changes by ${number((result.height - 20) / 2)} ft.` : ''} ${lane === 'D' ? 'Recorded A/D plot names ET-DLE170 (1.80–2.54). Physical barrel and remaining travel unverified; maximum upward shift is user-reported.' : 'Installed lens and shift limits remain unverified.'}`;
      $('#plan-result').dataset.state = shiftWarning ? 'bad' : result.geometry.placement.tone;
      onScenario(result, lane);
    } catch (error) { $('#plan-result').textContent = error.message; $('#plan-result').dataset.state = 'bad'; onScenario(null, lane); }
  };
  const sync = () => {
    const scenario = scenarios[lane];
    try { scenario.upShift = scenarioUpwardShift(engine, scenario); } catch { scenario.upShift = null; }
    host.querySelectorAll('[data-plan]').forEach(input => { const value = scenario[input.dataset.plan]; input.value = value == null ? '' : typeof value === 'number' ? number(value) : String(value); });
    host.querySelectorAll('[data-plan-lane]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.planLane === lane)));
    $('[data-plan="lens"] option[value="dle150"]').disabled = lane !== 'D';
    $('[data-plan="lens"] option[value="current"]').disabled = !['A', 'D'].includes(lane);
    $('[data-plan="min"]').readOnly = scenario.lens === 'dle150'; $('[data-plan="max"]').readOnly = scenario.lens === 'dle150';
    $('[data-plan="aspect"]').readOnly = ['dle150', 'current'].includes(scenario.lens);
    $('.pj-plan-presets').hidden = lane !== 'D';
    $('[data-plan="raster"]').previousElementSibling.textContent = scenario.portrait ? 'Full raster height (ft, portrait)' : 'Full raster width (ft, landscape)';
    $('#plan-baseline-note').textContent = `${lane} · ${LANES[lane].target}. ${baseline[lane].heightKnown ? 'Recorded lens height.' : 'Recorded lens height unknown: enter a proposed height to preview.'} Dimensions describe plotted raster coverage; each lane can be explored independently. Edits stay in this tab; reset restores the loaded drawing.`;
    update();
  };
  host.querySelectorAll('[data-plan-lane]').forEach(button => button.onclick = () => { lane = button.dataset.planLane; sync(); });
  host.querySelectorAll('[data-plan]').forEach(input => input.addEventListener('change', () => {
    const key = input.dataset.plan, next = scenarios[lane];
    next[key] = input.type === 'number' ? input.value === '' ? null : Number(input.value) : key === 'portrait' ? input.value === 'true' : input.value;
    if (key === 'upShift' && next.lensHeight != null) {
      try { next.centerHeight = withScenarioUpwardShift(engine, next, next.upShift).centerHeight; } catch { /* sync shows invalid planning fields */ }
    }
    if (key === 'min' || key === 'max') next.lens = 'manual';
    if (key === 'lens' && next.lens === 'current') { next.min = 1.8; next.max = 2.54; next.aspect = 1.6; }
    if (key === 'lens' && next.lens === 'dle150') { next.min = 1.36; next.max = 1.98; next.aspect = 1.6; }
    if (key === 'lens' && next.lens === 'recorded') { next.min = baseline[lane].min; next.max = baseline[lane].max; }
    sync();
  }));
  $('#plan-reset').onclick = () => { scenarios = structuredClone(baseline); sync(); };
  $('#plan-live').onclick = () => openLive(lane);
  host.querySelectorAll('[data-plan-preset]').forEach(button => button.onclick = () => {
    const currentLens = button.dataset.planPreset === '20';
    scenarios.D = { ...scenarios.D, lens: currentLens ? 'current' : 'dle150', min: currentLens ? 1.8 : 1.36, max: currentLens ? 2.54 : 1.98, aspect: 1.6, portrait: true, distance: 38.5,
      raster: Number(button.dataset.planPreset), contentHeight: 20, contentAlign: 'top' };
    if (scenarios.D.lensHeight == null) { $('#plan-result').textContent = 'Preset loaded. Enter a proposed lens height; no measured height has been assumed.'; }
    sync();
  });
  sync();
  return { select(nextLane) { lane = nextLane; sync(); }, refresh: update };
}
