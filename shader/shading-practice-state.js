(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ShaderPracticeState = api;
})(typeof window !== 'undefined' ? window : undefined, function () {
  'use strict';

  // Deterministic camera-shading practice engine. Every picture, scope trace,
  // score and coaching line is a pure function of this state: nothing here
  // reads, measures or controls real equipment.

  const SCHEMA = 'shader.camera-practice.v1';
  const LEGACY_SCHEMA = 'throwline.camera-practice.v1';
  const SCHEMA_VERSION = 1;
  const CAMERA_IDS = ['camera-a', 'camera-b'];
  const SCOPES = ['waveform', 'parade', 'vectorscope', 'histogram'];
  const COMPARE_MODES = ['side', 'wipe', 'reference', 'target'];
  const SCOPE_LAYOUTS = ['single', 'quad'];
  // Bounds for everything an import can carry. Version 1 readers ignore the
  // optional view, checks, injectionRecords and demo fields, so older cached
  // pages still open newer exports.
  const LIMITS = Object.freeze({ checks: 20, injections: 12, demoSteps: 24, title: 80, label: 60, note: 280, lastAction: 160 });
  const PASS_RULE = Object.freeze({ score: 90, objective: 80 });
  const CONTROL_LIMITS = Object.freeze({
    iris: [-4, 4, 0.05],
    pedestal: [-10, 10, 0.1],
    gain: [-6, 18, 0.1],
    gamma: [0.6, 1.4, 0.01],
    whiteBalance: [2400, 10000, 50],
    saturation: [0, 2, 0.01],
    colorPhase: [-180, 180, 1]
  });
  const DEFAULT_CONTROLS = Object.freeze({
    iris: 0,
    pedestal: 0,
    gain: 0,
    gamma: 1,
    whiteBalance: 5600,
    saturation: 1,
    colorPhase: 0
  });
  const CONTROL_LABELS = Object.freeze({
    iris: 'Iris', pedestal: 'Pedestal', gain: 'Gain', gamma: 'Gamma',
    whiteBalance: 'White balance', saturation: 'Saturation', colorPhase: 'Color phase'
  });

  // What each control generally does, how this simulation models it, and the
  // limits of that description. Copy stays general on purpose: camera systems
  // name, scale and range these controls differently.
  const CONTROL_INFO = Object.freeze({
    iris: Object.freeze({
      unit: 'stops', decimals: 2, signed: true, fine: 0.05, coarse: 0.5, scope: 'waveform',
      verbs: Object.freeze({ up: 'open', down: 'close' }),
      summary: 'Generally: the lens aperture sets how much light reaches the sensor and moves exposure in stops.',
      simulation: 'Here: scales the whole generated picture, so peaks and midtones move most and black barely moves.',
      caveat: 'Response, range and feel depend on the lens and the control system.',
      effect: Object.freeze({ up: 'Opening iris scales the picture up; peaks and midtones rise fastest.', down: 'Closing iris scales the picture down; peaks and midtones fall while black barely moves.' })
    }),
    pedestal: Object.freeze({
      unit: '', decimals: 1, signed: true, fine: 0.1, coarse: 1, scope: 'waveform',
      verbs: Object.freeze({ up: 'raise', down: 'lower' }),
      summary: 'Generally: master black (pedestal) sets the black level of the picture.',
      simulation: 'Here: adds one offset to every level, so the whole trace moves up or down together.',
      caveat: 'Names, scales and ranges differ between manufacturers.',
      effect: Object.freeze({ up: 'Raising pedestal lifts the black floor, and in this simulation everything above it.', down: 'Lowering pedestal drops the black floor toward zero, and everything above it with it.' })
    }),
    gain: Object.freeze({
      unit: 'dB', decimals: 1, signed: true, fine: 0.1, coarse: 3, scope: 'waveform',
      verbs: Object.freeze({ up: 'add', down: 'reduce' }),
      summary: 'Generally: electronic amplification after the sensor; a brighter picture with more noise.',
      simulation: 'Here: 6 dB equals one stop of exposure, and simulated noise grows with gain.',
      caveat: 'Gain steps, noise and ISO mapping vary by camera.',
      effect: Object.freeze({ up: 'Adding gain brightens like iris and thickens the simulated noise.', down: 'Reducing gain darkens the picture and thins the simulated noise.' })
    }),
    gamma: Object.freeze({
      unit: '', decimals: 2, signed: false, fine: 0.01, coarse: 0.05, scope: 'waveform',
      verbs: Object.freeze({ up: 'raise', down: 'lower' }),
      summary: 'Generally: bends the transfer curve to move midtones.',
      simulation: 'Here: a power curve; zero and full scale stay put while midtones move.',
      caveat: 'Gamma tables and their numbering differ between systems.',
      effect: Object.freeze({ up: 'Raising gamma lifts midtones while black and peak hold.', down: 'Lowering gamma deepens midtones while black and peak hold.' })
    }),
    whiteBalance: Object.freeze({
      unit: 'K', decimals: 0, signed: false, fine: 50, coarse: 500, scope: 'parade',
      verbs: Object.freeze({ up: 'raise', down: 'lower' }),
      summary: 'Generally: sets which color temperature the camera renders as neutral.',
      simulation: 'Here: a setting above the light’s Kelvin warms the picture; below it cools the picture.',
      caveat: 'Real systems add presets, auto white and paint (R/B gain) controls that behave differently.',
      effect: Object.freeze({ up: 'A higher Kelvin setting than the light warms the picture: red rises and blue falls.', down: 'A lower Kelvin setting than the light cools the picture: blue rises and red falls.' })
    }),
    saturation: Object.freeze({
      unit: '×', decimals: 2, signed: false, fine: 0.01, coarse: 0.1, scope: 'vectorscope',
      verbs: Object.freeze({ up: 'increase', down: 'reduce' }),
      summary: 'Generally: scales color amplitude (chroma) without changing brightness.',
      simulation: 'Here: multiplies chroma around each pixel’s luma.',
      caveat: 'It may be labeled chroma, color gain or saturation.',
      effect: Object.freeze({ up: 'More saturation pushes the vectorscope pattern outward.', down: 'Less saturation pulls the vectorscope pattern toward center.' })
    }),
    colorPhase: Object.freeze({
      unit: '°', decimals: 0, signed: true, fine: 1, coarse: 10, scope: 'vectorscope',
      verbs: Object.freeze({ up: 'increase', down: 'decrease' }),
      summary: 'Generally: rotates hue for fine hue alignment.',
      simulation: 'Here: rotates every chroma vector by the set angle.',
      caveat: 'Not every camera or panel exposes a master phase control.',
      effect: Object.freeze({ up: 'Phase rotates every hue around the vectorscope; it cannot neutralize a cast.', down: 'Phase rotates every hue around the vectorscope; it cannot neutralize a cast.' })
    })
  });

  // Which controls move each scored objective, strongest first. Used only to
  // choose what to probe; the simulation itself decides what helps.
  const OBJECTIVE_CONTROLS = Object.freeze({
    'Exposure': Object.freeze(['iris', 'gain', 'gamma', 'pedestal']),
    'Black floor': Object.freeze(['pedestal', 'gamma', 'iris', 'gain']),
    'Highlight': Object.freeze(['iris', 'gain', 'gamma', 'pedestal']),
    'Highlight detail': Object.freeze(['iris', 'gain', 'gamma', 'pedestal']),
    'Midtone': Object.freeze(['gamma', 'iris', 'gain', 'pedestal']),
    'RGB balance': Object.freeze(['whiteBalance', 'colorPhase', 'saturation']),
    'Saturation': Object.freeze(['saturation', 'whiteBalance', 'colorPhase']),
    'Phase': Object.freeze(['colorPhase', 'whiteBalance', 'saturation'])
  });

  const SCENARIOS = Object.freeze({
    'match-cameras': Object.freeze({
      id: 'match-cameras',
      title: 'Match two cameras',
      brief: 'Bring Camera B into visual agreement with Camera A without chasing one scope in isolation.',
      objective: 'Match exposure, black level, RGB balance, saturation, and hue.',
      targetCameraId: 'camera-b',
      referenceCameraId: 'camera-a',
      initial: Object.freeze({
        a: Object.freeze({ iris: 0, pedestal: 0, gain: 0, gamma: 1, whiteBalance: 5600, saturation: 1, colorPhase: 0 }),
        b: Object.freeze({ iris: 0.8, pedestal: 4.5, gain: 3, gamma: 1.16, whiteBalance: 4100, saturation: 1.28, colorPhase: 24 })
      }),
      source: Object.freeze({ sourceKelvin: 5600, exposureBias: 0, blackBias: 0.018, contrast: 1, noise: 0.006 }),
      coach: Object.freeze([
        'Set black level before judging the rest of the tonal range.',
        'Use waveform and RGB parade together; a similar luma trace can still hide a color mismatch.',
        'Finish with saturation and phase after exposure and balance are stable.'
      ])
    }),
    'recover-highlights': Object.freeze({
      id: 'recover-highlights',
      title: 'Recover clipped highlights',
      brief: 'Camera B is clipping the bright reference chips. Recover highlight detail while keeping a usable midtone.',
      objective: 'Place the peak below clipping, retain midtone separation, and avoid crushing black.',
      targetCameraId: 'camera-b',
      referenceCameraId: 'camera-a',
      initial: Object.freeze({
        a: Object.freeze({ iris: 0, pedestal: 0, gain: 0, gamma: 1, whiteBalance: 5600, saturation: 1, colorPhase: 0 }),
        b: Object.freeze({ iris: 1.75, pedestal: 0, gain: 3, gamma: 1.04, whiteBalance: 5600, saturation: 1, colorPhase: 0 })
      }),
      source: Object.freeze({ sourceKelvin: 5600, exposureBias: -0.2, blackBias: 0.018, contrast: 1.08, noise: 0.006 }),
      coach: Object.freeze([
        'Reduce iris before using pedestal to disguise clipping.',
        'A peak touching the top line has no simulated highlight separation left.',
        'Check the midtone after the highlight returns; recovery should not make the picture unusably dark.'
      ])
    }),
    'set-black-level': Object.freeze({
      id: 'set-black-level',
      title: 'Set black level',
      brief: 'Camera B has elevated blacks. Seat the darkest useful detail above zero without crushing it.',
      objective: 'Place the black percentile in the target window while protecting the rest of the range.',
      targetCameraId: 'camera-b',
      referenceCameraId: 'camera-a',
      initial: Object.freeze({
        a: Object.freeze({ iris: 0, pedestal: 0, gain: 0, gamma: 1, whiteBalance: 5600, saturation: 1, colorPhase: 0 }),
        b: Object.freeze({ iris: 0, pedestal: 8, gain: 0, gamma: 1, whiteBalance: 5600, saturation: 1, colorPhase: 0 })
      }),
      source: Object.freeze({ sourceKelvin: 5600, exposureBias: 0, blackBias: 0.018, contrast: 1, noise: 0.004 }),
      coach: Object.freeze([
        'Pedestal moves the floor. Use the lower waveform, not the average picture level.',
        'Leave a small amount of separation above zero so dark detail remains visible.',
        'Recheck peak and midtone after placing black.'
      ])
    }),
    'neutralize-cast': Object.freeze({
      id: 'neutralize-cast',
      title: 'Neutralize a color cast',
      brief: 'Camera B is balanced for daylight under a warm source. Restore neutral chips and natural color relationships.',
      objective: 'Minimize RGB channel error, then confirm saturation and phase.',
      targetCameraId: 'camera-b',
      referenceCameraId: 'camera-a',
      initial: Object.freeze({
        a: Object.freeze({ iris: 0, pedestal: 0, gain: 0, gamma: 1, whiteBalance: 3200, saturation: 1, colorPhase: 0 }),
        b: Object.freeze({ iris: 0, pedestal: 0, gain: 0, gamma: 1, whiteBalance: 5600, saturation: 1.12, colorPhase: -18 })
      }),
      source: Object.freeze({ sourceKelvin: 3200, exposureBias: 0, blackBias: 0.018, contrast: 1, noise: 0.005 }),
      coach: Object.freeze([
        'Start with white balance so the RGB parade aligns on neutral content.',
        'Use phase for hue rotation, not as a substitute for white balance.',
        'Judge saturation after the neutral axis is stable.'
      ])
    })
  });

  const TROUBLESHOOTING = Object.freeze({
    'clipped-highlights': Object.freeze({ id: 'clipped-highlights', label: 'Clipped highlights', controls: Object.freeze({ iris: 4, gain: 18 }), explanation: 'Iris and gain were raised enough to remove highlight separation.' }),
    'lifted-blacks': Object.freeze({ id: 'lifted-blacks', label: 'Lifted blacks', controls: Object.freeze({ pedestal: 10 }), explanation: 'Pedestal was raised, lifting the lower waveform away from black.' }),
    'crushed-blacks': Object.freeze({ id: 'crushed-blacks', label: 'Crushed blacks', controls: Object.freeze({ pedestal: -10 }), explanation: 'Pedestal was lowered until dark detail approached clipping.' }),
    'warm-cast': Object.freeze({ id: 'warm-cast', label: 'Warm cast', controls: Object.freeze({ whiteBalance: 8000 }), explanation: 'White balance no longer matches the simulated source.' }),
    'low-saturation': Object.freeze({ id: 'low-saturation', label: 'Low saturation', controls: Object.freeze({ saturation: 0.35 }), explanation: 'Color amplitude was reduced across the image.' }),
    'phase-error': Object.freeze({ id: 'phase-error', label: 'Phase error', controls: Object.freeze({ colorPhase: 90 }), explanation: 'Color phase was rotated away from the reference.' }),
    'excessive-gain': Object.freeze({ id: 'excessive-gain', label: 'Excessive gain', controls: Object.freeze({ gain: 18 }), explanation: 'Gain increased exposure and simulated noise together.' })
  });

  // Guided demonstration sweeps: offsets from a matched baseline for one
  // control at a time. White balance scales the baseline Kelvin instead.
  const DEMO_SWEEPS = Object.freeze({
    iris: Object.freeze({ mode: 'add', values: Object.freeze([0, 1, 2, -1, -2]) }),
    pedestal: Object.freeze({ mode: 'add', values: Object.freeze([0, 5, 10, -5, -10]) }),
    gain: Object.freeze({ mode: 'add', values: Object.freeze([0, 6, 12, 18]) }),
    gamma: Object.freeze({ mode: 'add', values: Object.freeze([0, 0.2, 0.4, -0.2, -0.4]) }),
    whiteBalance: Object.freeze({ mode: 'scale', values: Object.freeze([1, 1.25, 1.5, 0.85, 0.75]) }),
    saturation: Object.freeze({ mode: 'add', values: Object.freeze([0, 0.5, 1, -0.5, -1]) }),
    colorPhase: Object.freeze({ mode: 'add', values: Object.freeze([0, 20, 45, -20, -45]) })
  });

  const LEVEL_ORDER = Object.freeze({ CRIT: 0, WARN: 1, OK: 2, IDLE: 3, RUN: 4 });

  const copy = value => JSON.parse(JSON.stringify(value));
  const own = (object, key) => typeof key === 'string' && Object.prototype.hasOwnProperty.call(object, key);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));
  const round = (value, digits = 4) => Number(Number(value).toFixed(digits));
  const finite = value => Number.isFinite(Number(value));
  const clampInt = (value, min, max, fallback) => (finite(value) ? Math.min(max, Math.max(min, Math.floor(Number(value)))) : fallback);
  const cleanSeed = value => String(value == null ? 'shader-demo-01' : value).trim().slice(0, 80) || 'shader-demo-01';
  const cameraKey = cameraId => cameraId === 'camera-a' ? 'a' : 'b';
  // Imported text is display-only plain text: control and bidi-override
  // characters are removed and length is bounded.
  const UNSAFE_TEXT = /[\u0000-\u0008\u000b-\u001f\u007f‪-‮⁦-⁩]/g;
  function cleanText(value, max, fallback = '') {
    const text = String(value == null ? '' : value).replace(UNSAFE_TEXT, ' ').replace(/\s+/g, ' ').trim().slice(0, max).trim();
    return text || fallback;
  }
  function cleanNote(value) {
    return String(value == null ? '' : value).replace(/\r\n?/g, '\n').replace(UNSAFE_TEXT, '').replace(/\n{3,}/g, '\n\n').slice(0, LIMITS.note).trim();
  }

  function hashSeed(value) {
    let hash = 2166136261;
    const text = String(value);
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededUnit(seed, index) {
    let value = (hashSeed(seed) + Math.imul(index + 1, 0x6d2b79f5)) >>> 0;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  function normalizeControl(name, value) {
    if (!own(CONTROL_LIMITS, name)) return undefined;
    const limits = CONTROL_LIMITS[name];
    const fallback = DEFAULT_CONTROLS[name];
    const numeric = finite(value) ? Number(value) : fallback;
    const stepped = Math.round(numeric / limits[2]) * limits[2];
    return round(clamp(stepped, limits[0], limits[1]), name === 'whiteBalance' || name === 'colorPhase' ? 0 : 2);
  }

  function normalizeControls(input = {}) {
    const source = input && typeof input === 'object' ? input : {};
    return Object.keys(CONTROL_LIMITS).reduce((controls, name) => {
      controls[name] = normalizeControl(name, source[name]);
      return controls;
    }, {});
  }

  function normalizeControlsPair(value) {
    const source = value && typeof value === 'object' ? value : {};
    return { 'camera-a': normalizeControls(source['camera-a']), 'camera-b': normalizeControls(source['camera-b']) };
  }

  function normalizeSource(supplied, fallback) {
    const input = supplied && typeof supplied === 'object' ? supplied : {};
    const pick = (name, min, max) => clamp(finite(input[name]) ? input[name] : fallback[name], min, max);
    return {
      sourceKelvin: pick('sourceKelvin', 2400, 10000),
      exposureBias: pick('exposureBias', -2, 2),
      blackBias: pick('blackBias', 0, 0.15),
      contrast: pick('contrast', 0.5, 1.8),
      noise: pick('noise', 0, 0.08)
    };
  }

  function scenarioFor(value) {
    return own(SCENARIOS, value) ? SCENARIOS[value] : SCENARIOS['match-cameras'];
  }

  function formatControl(name, value, options = {}) {
    const info = CONTROL_INFO[name];
    if (!info) return String(value);
    const number = Number(value);
    const fixed = number.toFixed(info.decimals);
    const text = info.signed && options.sign !== false && number > 0 ? `+${fixed}` : fixed.replace('-', '−');
    if (options.unit === false || !info.unit) return text;
    return info.unit === '×' || info.unit === '°' ? `${text}${info.unit}` : `${text} ${info.unit}`;
  }

  function createCamera(id, controls, source, seed) {
    return {
      id,
      label: id === 'camera-a' ? 'Camera A' : 'Camera B',
      controls: normalizeControls(controls),
      source: {
        sourceKelvin: clamp(source.sourceKelvin, 2400, 10000),
        exposureBias: clamp(source.exposureBias, -2, 2),
        blackBias: clamp(source.blackBias, 0, 0.15),
        contrast: clamp(source.contrast, 0.5, 1.8),
        noise: clamp(source.noise + seededUnit(`${seed}:${id}:noise`, 0) * 0.0015, 0, 0.08)
      }
    };
  }

  function normalizeFreeze(value, scenario) {
    if (!value || typeof value !== 'object' || !CAMERA_IDS.includes(value.cameraId)) return null;
    return {
      cameraId: value.cameraId,
      label: cleanText(value.label, LIMITS.label, 'Reference still'),
      controls: normalizeControls(value.controls),
      source: normalizeSource(value.source, scenario.source)
    };
  }

  function normalizeView(value, options, selectedCameraId, scenario) {
    const view = value && typeof value === 'object' ? value : {};
    const compare = COMPARE_MODES.includes(view.compare)
      ? view.compare
      : options.splitView === false ? (selectedCameraId === scenario.referenceCameraId ? 'reference' : 'target') : 'side';
    return {
      compare,
      wipe: finite(view.wipe) ? round(clamp(view.wipe, 0.05, 0.95), 2) : 0.5,
      scopeLayout: SCOPE_LAYOUTS.includes(view.scopeLayout) ? view.scopeLayout : 'single',
      freeze: normalizeFreeze(view.freeze, scenario)
    };
  }

  const showsBothCameras = compare => compare === 'side' || compare === 'wipe';

  function createPracticeState(options = {}) {
    const input = options && typeof options === 'object' ? options : {};
    const scenario = scenarioFor(input.scenarioId);
    const seed = cleanSeed(input.seed);
    const selectedCameraId = CAMERA_IDS.includes(input.selectedCameraId) ? input.selectedCameraId : scenario.targetCameraId;
    const view = normalizeView(input.view, input, selectedCameraId, scenario);
    return {
      schema: SCHEMA,
      schemaVersion: SCHEMA_VERSION,
      scenarioId: scenario.id,
      seed,
      attempt: Math.max(1, Math.floor(Number(input.attempt) || 1)),
      selectedCameraId,
      splitView: showsBothCameras(view.compare),
      scope: SCOPES.includes(input.scope) ? input.scope : 'waveform',
      cameras: [
        createCamera('camera-a', scenario.initial.a, scenario.source, seed),
        createCamera('camera-b', scenario.initial.b, scenario.source, seed)
      ],
      injections: [],
      lastAction: 'Scenario loaded',
      view,
      checks: [],
      injectionRecords: [],
      demo: null
    };
  }

  function normalizeChecks(value) {
    if (!Array.isArray(value)) return [];
    return value.filter(item => item && typeof item === 'object').slice(-LIMITS.checks).map((item, index) => ({
      n: clampInt(item.n, 1, 9999, index + 1),
      controls: normalizeControlsPair(item.controls)
    }));
  }

  function normalizeInjectionRecords(value) {
    if (!Array.isArray(value)) return [];
    return value
      .filter(record => record && own(TROUBLESHOOTING, record.id) && CAMERA_IDS.includes(record.cameraId))
      .slice(-LIMITS.injections)
      .map(record => ({
        id: record.id,
        cameraId: record.cameraId,
        previous: Object.fromEntries(Object.keys(TROUBLESHOOTING[record.id].controls).map(name => [
          name, normalizeControl(name, record.previous && typeof record.previous === 'object' ? record.previous[name] : undefined)
        ]))
      }));
  }

  function normalizeResume(value) {
    if (!value || typeof value !== 'object') return null;
    return {
      controls: normalizeControlsPair(value.controls),
      scope: SCOPES.includes(value.scope) ? value.scope : 'waveform',
      compare: COMPARE_MODES.includes(value.compare) ? value.compare : 'side',
      selectedCameraId: CAMERA_IDS.includes(value.selectedCameraId) ? value.selectedCameraId : 'camera-b'
    };
  }

  function normalizeDemo(value) {
    if (!value || typeof value !== 'object' || !Array.isArray(value.steps)) return null;
    const steps = value.steps.filter(step => step && typeof step === 'object').slice(0, LIMITS.demoSteps).map((step, index) => ({
      label: cleanText(step.label, LIMITS.label, `Step ${index + 1}`),
      note: cleanNote(step.note),
      controls: normalizeControlsPair(step.controls),
      scope: SCOPES.includes(step.scope) ? step.scope : 'waveform',
      compare: COMPARE_MODES.includes(step.compare) ? step.compare : null
    }));
    if (!steps.length) return null;
    return {
      title: cleanText(value.title, LIMITS.title, 'Demonstration'),
      focus: own(CONTROL_LIMITS, value.focus) ? value.focus : null,
      cameraId: CAMERA_IDS.includes(value.cameraId) ? value.cameraId : 'camera-b',
      compareWith: value.compareWith === 'previous' ? 'previous' : 'first',
      index: clampInt(value.index, 0, steps.length - 1, 0),
      steps,
      resume: normalizeResume(value.resume)
    };
  }

  function normalizeState(input = {}) {
    const source = input && typeof input === 'object' ? input : {};
    const base = createPracticeState(source);
    const inputCameras = Array.isArray(source.cameras) ? source.cameras : [];
    const cameras = base.cameras.map(camera => {
      const supplied = inputCameras.find(item => item && item.id === camera.id);
      if (!supplied) return camera;
      return { ...camera, controls: normalizeControls(supplied.controls), source: normalizeSource(supplied.source, camera.source) };
    });
    return {
      ...base,
      cameras,
      injections: Array.isArray(source.injections) ? source.injections.filter(id => own(TROUBLESHOOTING, id)).slice(0, LIMITS.injections) : [],
      lastAction: cleanText(source.lastAction, LIMITS.lastAction, base.lastAction),
      checks: normalizeChecks(source.checks),
      injectionRecords: normalizeInjectionRecords(source.injectionRecords),
      demo: normalizeDemo(source.demo)
    };
  }

  function getCamera(state, cameraId) {
    const normalized = state && state.schema === SCHEMA ? state : normalizeState(state);
    return normalized.cameras.find(camera => camera.id === cameraId) || normalized.cameras[0];
  }

  function updateCamera(state, cameraId, updater) {
    return {
      ...state,
      cameras: state.cameras.map(camera => camera.id === cameraId ? updater(camera) : camera)
    };
  }

  function controlsPair(state) {
    return Object.fromEntries(state.cameras.map(camera => [camera.id, { ...camera.controls }]));
  }

  function startControls(scenarioOrState) {
    const scenario = scenarioOrState && scenarioOrState.initial ? scenarioOrState : scenarioFor(scenarioOrState && scenarioOrState.scenarioId);
    return { 'camera-a': normalizeControls(scenario.initial.a), 'camera-b': normalizeControls(scenario.initial.b) };
  }

  // Replace camera controls without touching anything else; the result is a
  // plain state that every analysis function accepts.
  function withControls(input, pair) {
    const state = normalizeState(input);
    const controls = normalizeControlsPair(pair);
    return { ...state, cameras: state.cameras.map(camera => ({ ...camera, controls: { ...controls[camera.id] } })) };
  }

  function withCameraControl(state, cameraId, control, value) {
    return updateCamera(state, cameraId, camera => ({ ...camera, controls: { ...camera.controls, [control]: normalizeControl(control, value) } }));
  }

  // View preferences survive exercise changes; a frozen still and a running
  // demonstration belong to the exercise that made them.
  function carriedOptions(state) {
    return { scope: state.scope, view: { compare: state.view.compare, wipe: state.view.wipe, scopeLayout: state.view.scopeLayout, freeze: null } };
  }

  function applyIntent(input, intent = {}) {
    const state = normalizeState(input);
    const scenario = scenarioFor(state.scenarioId);
    const action = intent && typeof intent === 'object' ? intent : {};
    switch (action.type) {
      case 'set-control': {
        if (!CAMERA_IDS.includes(action.cameraId) || !own(CONTROL_LIMITS, action.control)) return state;
        const value = normalizeControl(action.control, action.value);
        return {
          ...updateCamera(state, action.cameraId, camera => ({ ...camera, controls: { ...camera.controls, [action.control]: value } })),
          selectedCameraId: action.cameraId,
          lastAction: `${getCamera(state, action.cameraId).label} ${CONTROL_LABELS[action.control]} set to ${value}`
        };
      }
      case 'step-control': {
        if (!CAMERA_IDS.includes(action.cameraId) || !own(CONTROL_INFO, action.control)) return state;
        const info = CONTROL_INFO[action.control];
        const size = action.size === 'coarse' ? info.coarse : info.fine;
        const direction = Number(action.direction) < 0 ? -1 : 1;
        const current = getCamera(state, action.cameraId).controls[action.control];
        return applyIntent(state, { type: 'set-control', cameraId: action.cameraId, control: action.control, value: current + direction * size });
      }
      case 'reset-control': {
        if (!CAMERA_IDS.includes(action.cameraId) || !own(CONTROL_LIMITS, action.control)) return state;
        const value = normalizeControl(action.control, scenario.initial[cameraKey(action.cameraId)][action.control]);
        return {
          ...withCameraControl(state, action.cameraId, action.control, value),
          selectedCameraId: action.cameraId,
          lastAction: `${getCamera(state, action.cameraId).label} ${CONTROL_LABELS[action.control]} restored to the exercise start`
        };
      }
      case 'reset-camera': {
        if (!CAMERA_IDS.includes(action.cameraId)) return state;
        return {
          ...updateCamera(state, action.cameraId, camera => ({ ...camera, controls: normalizeControls(scenario.initial[cameraKey(action.cameraId)]) })),
          selectedCameraId: action.cameraId,
          lastAction: `${getCamera(state, action.cameraId).label} restored to the exercise start`
        };
      }
      case 'select-camera':
        return CAMERA_IDS.includes(action.cameraId) ? { ...state, selectedCameraId: action.cameraId, lastAction: `${getCamera(state, action.cameraId).label} selected` } : state;
      case 'set-scope':
        return SCOPES.includes(action.scope) ? { ...state, scope: action.scope } : state;
      case 'set-scope-layout':
        return SCOPE_LAYOUTS.includes(action.layout) ? { ...state, view: { ...state.view, scopeLayout: action.layout } } : state;
      case 'set-split-view': {
        const compare = action.value ? 'side' : state.selectedCameraId === scenario.referenceCameraId ? 'reference' : 'target';
        return { ...state, splitView: Boolean(action.value), view: { ...state.view, compare }, lastAction: Boolean(action.value) ? 'Split view enabled' : 'Single camera view enabled' };
      }
      case 'set-compare': {
        if (!COMPARE_MODES.includes(action.mode)) return state;
        const labels = { side: 'Side-by-side comparison', wipe: 'Wipe comparison', reference: 'Reference only', target: 'Target only' };
        return { ...state, splitView: showsBothCameras(action.mode), view: { ...state.view, compare: action.mode }, lastAction: labels[action.mode] };
      }
      case 'set-wipe':
        return finite(action.value) ? { ...state, view: { ...state.view, wipe: round(clamp(action.value, 0.05, 0.95), 2) } } : state;
      case 'freeze-reference': {
        const reference = getCamera(state, scenario.referenceCameraId);
        const label = cleanText(action.label, LIMITS.label, `${reference.label} still`);
        return { ...state, view: { ...state.view, freeze: { cameraId: reference.id, label, controls: { ...reference.controls }, source: { ...reference.source } } }, lastAction: `${reference.label} reference frozen as a still` };
      }
      case 'release-freeze':
        return state.view.freeze ? { ...state, view: { ...state.view, freeze: null }, lastAction: 'Reference still released; showing the live reference' } : state;
      case 'load-scenario':
        // Attempt numbers describe retries of one exercise. A different
        // exercise starts its own run at attempt one; Replay and Apply seed
        // below remain explicit retries and advance the counter.
        return createPracticeState({ scenarioId: action.scenarioId, seed: action.seed == null ? state.seed : action.seed, attempt: action.scenarioId === state.scenarioId ? state.attempt + 1 : 1, ...carriedOptions(state) });
      case 'replay':
        return createPracticeState({ scenarioId: state.scenarioId, seed: state.seed, attempt: state.attempt + 1, ...carriedOptions(state) });
      case 'set-seed':
        return createPracticeState({ scenarioId: state.scenarioId, seed: action.seed, attempt: state.attempt + 1, ...carriedOptions(state) });
      case 'inject-trouble':
        return injectTrouble(state, action.injectionId, action.cameraId);
      case 'revert-injection':
        return revertInjection(state);
      case 'score-check': {
        const n = (state.checks.length ? state.checks[state.checks.length - 1].n : 0) + 1;
        const evaluation = evaluatePractice(state);
        return {
          ...state,
          checks: [...state.checks, { n: Math.min(9999, n), controls: controlsPair(state) }].slice(-LIMITS.checks),
          lastAction: `Attempt ${state.attempt} check ${n} scored ${evaluation.score}`
        };
      }
      case 'start-demo':
        return startDemo(state, action.control);
      case 'demo-capture':
        return captureDemoStep(state, action);
      case 'demo-goto':
        return goToDemoStep(state, action.index);
      case 'demo-update-step':
        return updateDemoStep(state, action);
      case 'demo-remove-step':
        return removeDemoStep(state);
      case 'demo-compare-with':
        return state.demo ? { ...state, demo: { ...state.demo, compareWith: action.value === 'previous' ? 'previous' : 'first' } } : state;
      case 'exit-demo':
        return exitDemo(state);
      default:
        return state;
    }
  }

  function injectTrouble(input, injectionId, cameraId = 'camera-b') {
    const state = normalizeState(input);
    if (!own(TROUBLESHOOTING, injectionId) || !CAMERA_IDS.includes(cameraId)) return state;
    const injection = TROUBLESHOOTING[injectionId];
    const camera = getCamera(state, cameraId);
    const reference = getCamera(state, cameraId === 'camera-a' ? 'camera-b' : 'camera-a');
    const injectedControls = { ...injection.controls };
    if (injectionId === 'phase-error') injectedControls.colorPhase = reference.controls.colorPhase >= 0 ? -90 : 90;
    if (injectionId === 'warm-cast') injectedControls.whiteBalance = camera.source.sourceKelvin >= 5000 ? 2500 : 8000;
    const controls = { ...camera.controls, ...Object.fromEntries(Object.entries(injectedControls).map(([name,value]) => [name,normalizeControl(name,value)])) };
    const previous = Object.fromEntries(Object.keys(injectedControls).map(name => [name, camera.controls[name]]));
    return {
      ...updateCamera(state, cameraId, item => ({ ...item, controls })),
      selectedCameraId: cameraId,
      injections: [...state.injections, injectionId].slice(-12),
      injectionRecords: [...state.injectionRecords, { id: injectionId, cameraId, previous }].slice(-LIMITS.injections),
      lastAction: `${injection.label} injected on ${camera.label}`
    };
  }

  // Undo the most recent fault: restore exactly the controls it changed. A
  // legacy export has no record of the prior values, so those controls return
  // to the exercise start instead.
  function revertInjection(input) {
    const state = normalizeState(input);
    const record = state.injectionRecords[state.injectionRecords.length - 1];
    const id = record ? record.id : state.injections[state.injections.length - 1];
    if (!id) return state;
    const scenario = scenarioFor(state.scenarioId);
    const cameraId = record ? record.cameraId : scenario.targetCameraId;
    const previous = record ? record.previous : Object.fromEntries(Object.keys(TROUBLESHOOTING[id].controls).map(name => [name, scenario.initial[cameraKey(cameraId)][name]]));
    const camera = getCamera(state, cameraId);
    const lastIndex = state.injections.lastIndexOf(id);
    return {
      ...updateCamera(state, cameraId, item => ({ ...item, controls: { ...item.controls, ...Object.fromEntries(Object.entries(previous).map(([name, value]) => [name, normalizeControl(name, value)])) } })),
      selectedCameraId: cameraId,
      injections: lastIndex < 0 ? state.injections : state.injections.filter((_, index) => index !== lastIndex),
      injectionRecords: record ? state.injectionRecords.slice(0, -1) : state.injectionRecords,
      lastAction: `${TROUBLESHOOTING[id].label} reverted on ${camera.label}`
    };
  }

  function rotateChroma(red, green, blue, degrees) {
    const y = red * 0.299 + green * 0.587 + blue * 0.114;
    const u = blue - y;
    const v = red - y;
    const radians = degrees * Math.PI / 180;
    const rotatedU = u * Math.cos(radians) - v * Math.sin(radians);
    const rotatedV = u * Math.sin(radians) + v * Math.cos(radians);
    return [y + rotatedV, y - rotatedV * 0.509 - rotatedU * 0.194, y + rotatedU];
  }

  function sourcePixel(x, y, width, height, camera, seed, index) {
    const nx = x / Math.max(1, width - 1);
    const ny = y / Math.max(1, height - 1);
    const zone = Math.floor(nx * 6);
    const chips = [0.025, 0.12, 0.3, 0.5, 0.72, 0.94];
    let level = chips[Math.min(chips.length - 1, zone)];
    level += (0.5 - ny) * 0.09;
    const colorBand = y > height * 0.68;
    let rgb = [level, level, level];
    if (colorBand) {
      const colors = [[0.75, 0.16, 0.14], [0.12, 0.62, 0.22], [0.12, 0.26, 0.76], [0.73, 0.58, 0.12], [0.62, 0.16, 0.66], [0.1, 0.62, 0.68]];
      const swatch = colors[Math.min(colors.length - 1, zone)];
      rgb = swatch.map(channel => channel * 0.82 + level * 0.18);
    }
    const vignette = 1 - Math.max(0, Math.hypot(nx - 0.5, ny - 0.48) - 0.36) * 0.13;
    const noise = (seededUnit(`${seed}:${camera.id}:pixel`, index) - 0.5) * camera.source.noise * (1 + Math.max(0, camera.controls.gain) / 6);
    return rgb.map(channel => channel * vignette + noise);
  }

  function processPixel(rgb, camera) {
    const controls = camera.controls;
    const source = camera.source;
    const exposure = Math.pow(2, controls.iris + controls.gain / 6 + source.exposureBias);
    const wbDelta = Math.log2(controls.whiteBalance / source.sourceKelvin);
    const wbFactors = [Math.pow(2, wbDelta * 0.42), 1, Math.pow(2, -wbDelta * 0.48)];
    let channels = rgb.map((channel, index) => {
      const contrasted = (channel - 0.18) * source.contrast + 0.18;
      const exposed = contrasted * exposure * wbFactors[index];
      const gammaAdjusted = Math.pow(Math.max(0, exposed), 1 / controls.gamma);
      return gammaAdjusted + source.blackBias + controls.pedestal * 0.005;
    });
    const luma = channels[0] * 0.299 + channels[1] * 0.587 + channels[2] * 0.114;
    channels = channels.map(channel => luma + (channel - luma) * controls.saturation);
    channels = rotateChroma(channels[0], channels[1], channels[2], controls.colorPhase);
    return channels.map(channel => clamp(channel, 0, 1));
  }

  function generateFrame(input, cameraId, options = {}) {
    const state = normalizeState(input);
    const camera = getCamera(state, cameraId);
    const width = Math.round(clamp(options.width || 64, 16, 160));
    const height = Math.round(clamp(options.height || 36, 9, 90));
    const samples = [];
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        const source = sourcePixel(x, y, width, height, camera, state.seed, index);
        const rgb = processPixel(source, camera);
        samples.push(rgb.map(value => round(value, 5)));
      }
    }
    return { width, height, cameraId: camera.id, seed: state.seed, samples };
  }

  // Luma exactly as the scopes and scores compute it.
  function lumaOf(rgb) {
    return clamp(rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114, 0, 1);
  }

  function percentileOfSorted(sorted, fraction) {
    const index = Math.floor(clamp(fraction, 0, 1) * Math.max(0, sorted.length - 1));
    return sorted[index] || 0;
  }

  function computeAnalysis(state, cameraId, options) {
    const frame = generateFrame(state, cameraId, options);
    const bins = 64;
    const histogram = Array(bins).fill(0);
    const paradeColumns = Object.fromEntries(['r','g','b'].map(channel => [channel,Array.from({ length: frame.width }, () => [])]));
    const waveformColumns = Array.from({ length: frame.width }, () => []);
    const vectorscope = [];
    const lumas = [];
    const sums = [0, 0, 0];
    let saturationSum = 0;
    frame.samples.forEach((rgb, index) => {
      const y = lumaOf(rgb);
      const u = clamp((rgb[2] - y) * 0.565, -0.5, 0.5);
      const v = clamp((rgb[0] - y) * 0.713, -0.5, 0.5);
      lumas.push(y);
      histogram[Math.min(bins - 1, Math.floor(y * bins))] += 1;
      ['r', 'g', 'b'].forEach((channel, channelIndex) => {
        sums[channelIndex] += rgb[channelIndex];
        paradeColumns[channel][index % frame.width].push(rgb[channelIndex]);
      });
      saturationSum += Math.hypot(u, v);
      waveformColumns[index % frame.width].push(y);
      if (index % 5 === 0) vectorscope.push({ u: round(u, 5), v: round(v, 5) });
    });
    const normalizeBins = values => {
      const max = Math.max(1, ...values);
      return values.map(value => round(value / max, 5));
    };
    const rgbMean = sums.map(value => value / frame.samples.length);
    const mean = lumas.reduce((sum, value) => sum + value, 0) / lumas.length;
    // One numeric sort serves every percentile; the values are identical to
    // sorting a copy per percentile.
    const sorted = Float64Array.from(lumas).sort();
    const black = percentileOfSorted(sorted, 0.05);
    const peak = percentileOfSorted(sorted, 0.99);
    const mid = percentileOfSorted(sorted, 0.5);
    const hue = Math.atan2(rgbMean[0] - mean, rgbMean[2] - mean) * 180 / Math.PI;
    return {
      ...frame,
      metrics: {
        black: round(black, 5), peak: round(peak, 5), mid: round(mid, 5), mean: round(mean, 5),
        rgbMean: rgbMean.map(value => round(value, 5)),
        rgbSpread: round(Math.max(...rgbMean) - Math.min(...rgbMean), 5),
        saturation: round(saturationSum / frame.samples.length, 5),
        hue: round(hue, 3),
        clippedPercent: round(lumas.filter(value => value >= 0.995).length / lumas.length * 100, 3),
        crushedPercent: round(lumas.filter(value => value <= 0.005).length / lumas.length * 100, 3)
      },
      histogram: normalizeBins(histogram),
      parade: Object.fromEntries(Object.entries(paradeColumns).map(([channel,columns]) => [channel,columns.map(column => ({ min: round(Math.min(...column), 5), max: round(Math.max(...column), 5), mean: round(column.reduce((sum,value) => sum + value,0) / column.length, 5) }))])),
      waveform: waveformColumns.map(column => ({ min: round(Math.min(...column), 5), max: round(Math.max(...column), 5), mean: round(column.reduce((sum, value) => sum + value, 0) / column.length, 5) })),
      vectorscope
    };
  }

  // Analyses are pure functions of seed, camera and resolution, so identical
  // requests share one read-only result. Callers must not mutate it.
  const analysisCache = new Map();
  const ANALYSIS_CACHE_LIMIT = 48;
  function analyzeCamera(input, cameraId, options = {}) {
    const state = normalizeState(input);
    const camera = getCamera(state, cameraId);
    const width = Math.round(clamp(options.width || 64, 16, 160));
    const height = Math.round(clamp(options.height || 36, 9, 90));
    const key = [state.seed, camera.id, width, height, JSON.stringify(camera.controls), JSON.stringify(camera.source)].join('\u0000');
    const cached = analysisCache.get(key);
    if (cached) {
      analysisCache.delete(key);
      analysisCache.set(key, cached);
      return cached;
    }
    const result = computeAnalysis(state, camera.id, { width, height });
    analysisCache.set(key, result);
    if (analysisCache.size > ANALYSIS_CACHE_LIMIT) analysisCache.delete(analysisCache.keys().next().value);
    return result;
  }

  function difference(a, b) {
    return Math.abs(a - b);
  }

  function objective(label, value, target, tolerance, weight, explanation) {
    const error = difference(value, target);
    const score = clamp(100 * (1 - error / tolerance), 0, 100);
    return { label, value: round(value, 4), target: round(target, 4), tolerance, weight, score: round(score, 1), passed: score >= 80, explanation };
  }

  function evaluatePractice(input) {
    const state = normalizeState(input);
    const scenario = scenarioFor(state.scenarioId);
    const target = analyzeCamera(state, scenario.targetCameraId);
    const reference = analyzeCamera(state, scenario.referenceCameraId);
    let objectives;
    if (scenario.id === 'recover-highlights') {
      objectives = [
        objective('Highlight detail', target.metrics.peak, reference.metrics.peak, 0.14, 0.4, 'Peak should sit below simulated clipping with visible separation.'),
        objective('Midtone', target.metrics.mid, reference.metrics.mid, 0.2, 0.35, 'Midtone should remain close to the reference camera.'),
        objective('Black floor', target.metrics.black, reference.metrics.black, 0.08, 0.25, 'Highlight recovery should not crush or lift the black floor.')
      ];
    } else if (scenario.id === 'set-black-level') {
      objectives = [
        objective('Black floor', target.metrics.black, reference.metrics.black, 0.035, 0.55, 'Place the lower signal close to the reference without clipping.'),
        objective('Midtone', target.metrics.mid, reference.metrics.mid, 0.12, 0.25, 'Protect midtone placement while adjusting pedestal.'),
        objective('Highlight', target.metrics.peak, reference.metrics.peak, 0.12, 0.2, 'Protect highlight placement while adjusting pedestal.')
      ];
    } else if (scenario.id === 'neutralize-cast') {
      objectives = [
        objective('RGB balance', target.metrics.rgbSpread, reference.metrics.rgbSpread, 0.16, 0.5, 'Neutral content should show comparable RGB channel balance.'),
        objective('Saturation', target.metrics.saturation, reference.metrics.saturation, 0.09, 0.25, 'Color amplitude should agree with the reference.'),
        objective('Phase', difference(target.metrics.hue, reference.metrics.hue), 0, 70, 0.25, 'Average chroma direction should align with the reference.')
      ];
    } else {
      objectives = [
        objective('Exposure', target.metrics.mean, reference.metrics.mean, 0.2, 0.22, 'Average exposure should agree across cameras.'),
        objective('Black floor', target.metrics.black, reference.metrics.black, 0.08, 0.18, 'The lower waveform should align.'),
        objective('Highlight', target.metrics.peak, reference.metrics.peak, 0.18, 0.18, 'Highlight placement should align.'),
        objective('RGB balance', target.metrics.rgbSpread, reference.metrics.rgbSpread, 0.16, 0.17, 'Neutral RGB channel separation should agree.'),
        objective('Saturation', target.metrics.saturation, reference.metrics.saturation, 0.1, 0.13, 'Color amplitude should agree.'),
        objective('Phase', difference(target.metrics.hue, reference.metrics.hue), 0, 70, 0.12, 'Average chroma direction should agree.')
      ];
    }
    const score = Math.round(objectives.reduce((sum, item) => sum + item.score * item.weight, 0));
    const sorted = [...objectives].sort((a, b) => a.score - b.score);
    const status = score >= 90 && objectives.every(item => item.passed) ? 'complete' : score >= 70 ? 'close' : 'adjust';
    const explanation = status === 'complete'
      ? 'Exercise complete. The simulated signal is inside every scoring window.'
      : `Work next on ${sorted[0].label.toLowerCase()}. ${sorted[0].explanation}`;
    return { scenarioId: scenario.id, score, status, explanation, objectives, target: target.metrics, reference: reference.metrics };
  }

  // ---------- training feedback ----------

  // Coarse progress without answers: a status word per objective.
  function bandFor(score) {
    if (score >= PASS_RULE.objective) return 'OK';
    if (score >= 40) return 'WARN';
    return 'CRIT';
  }

  function progressBands(input) {
    const evaluation = input && Array.isArray(input.objectives) ? input : evaluatePractice(input);
    return evaluation.objectives.map(item => ({ label: item.label, band: bandFor(item.score), explanation: item.explanation }));
  }

  function exerciseStatus(input) {
    const state = normalizeState(input);
    const scenario = scenarioFor(state.scenarioId);
    if (evaluatePractice(state).status === 'complete') return 'OK';
    const start = startControls(scenario);
    const untouched = CAMERA_IDS.every(id => JSON.stringify(getCamera(state, id).controls) === JSON.stringify(start[id]));
    return untouched && !state.checks.length ? 'IDLE' : 'RUN';
  }

  function gapPhrase(item) {
    const ratio = difference(item.value, item.target) / item.tolerance;
    const window = ratio >= 1 ? 'well outside its window' : ratio > 0.2 ? 'outside its window' : 'inside its window';
    let side;
    if (item.label === 'Phase') side = 'rotated away from the reference';
    else if (item.label === 'RGB balance') side = item.value > item.target ? 'with more channel separation than the reference' : 'with less channel separation than the reference';
    else if (item.label === 'Saturation') side = item.value > item.target ? 'stronger than the reference' : 'weaker than the reference';
    else side = item.value > item.target ? 'above the reference' : 'below the reference';
    return `${window}, ${side}`;
  }

  const SCOPE_NAMES = Object.freeze({ waveform: 'waveform', parade: 'RGB parade', vectorscope: 'vectorscope', histogram: 'histogram' });
  // Each exercise's teaching order (from its coach notes): when two controls
  // are nearly as useful, the one serving the earlier objective is named.
  const OBJECTIVE_PRIORITY = Object.freeze({
    'match-cameras': Object.freeze(['Black floor', 'Exposure', 'Highlight', 'RGB balance', 'Saturation', 'Phase']),
    'recover-highlights': Object.freeze(['Highlight detail', 'Midtone', 'Black floor']),
    'set-black-level': Object.freeze(['Black floor', 'Midtone', 'Highlight']),
    'neutralize-cast': Object.freeze(['RGB balance', 'Phase', 'Saturation'])
  });
  // Probe distances in fine steps, roughly doubling.
  const LINE_SEARCH = Object.freeze([2, 5, 10, 20, 40, 80, 160, 320]);

  // Weighted distance from every target. Unlike the score it keeps falling
  // while an objective is still far outside its window, where the score
  // stays pinned at zero.
  function matchError(evaluation) {
    return evaluation.objectives.reduce((sum, item) => sum + item.weight * difference(item.value, item.target) / item.tolerance, 0);
  }

  // Move one control in one direction while the match error keeps falling;
  // report the best-scoring point reached.
  function lineSearch(state, cameraId, control, direction, baseEvaluation) {
    const info = CONTROL_INFO[control];
    const start = getCamera(state, cameraId).controls[control];
    let best = null;
    let lowestError = matchError(baseEvaluation);
    let lastValue = start;
    for (let index = 0; index < LINE_SEARCH.length; index += 1) {
      const value = normalizeControl(control, start + direction * info.fine * LINE_SEARCH[index]);
      if (value === lastValue) break;
      lastValue = value;
      const result = evaluatePractice(withCameraControl(state, cameraId, control, value));
      const error = matchError(result);
      if (!best || result.score > best.result.score) best = { value, result };
      if (error >= lowestError) break;
      lowestError = error;
    }
    return best && best.result.score > baseEvaluation.score ? best : null;
  }

  // The most useful single correction on the target camera: the control and
  // direction that recover the most simulated score, named by the objective
  // they improve. Direction only; the exact value stays unsaid.
  function nextCorrection(input) {
    const state = normalizeState(input);
    const scenario = scenarioFor(state.scenarioId);
    const cameraId = scenario.targetCameraId;
    const camera = getCamera(state, cameraId);
    const evaluation = evaluatePractice(state);
    if (evaluation.status === 'complete') {
      return { complete: true, objective: null, control: null, direction: 0, cameraId, message: 'Every objective sits inside its window. Replay with a new seed, or change exercise.' };
    }
    const priority = OBJECTIVE_PRIORITY[scenario.id] || evaluation.objectives.map(item => item.label);
    const rankOf = label => (priority.includes(label) ? priority.indexOf(label) : 99);
    const failing = evaluation.objectives.some(item => !item.passed);
    // A move counts for an objective when it clearly improves one that is
    // still outside its window (or, once all pass, improves any of them).
    const counts = (entry) => {
      const before = evaluation.objectives[entry.index];
      if (!failing) return entry.delta >= 1;
      return !before.passed && entry.delta >= Math.min(10, Math.max(1, PASS_RULE.objective - before.score));
    };
    const candidates = [];
    Object.keys(CONTROL_LIMITS).forEach(control => [1, -1].forEach(direction => {
      const best = lineSearch(state, cameraId, control, direction, evaluation);
      if (!best) return;
      // Name the earliest objective in the teaching order that this move
      // improves, then prefer that objective's primary control.
      const improved = best.result.objectives
        .map((item, index) => ({ item, index, delta: item.score - evaluation.objectives[index].score }))
        .filter(counts)
        .sort((a, b) => rankOf(a.item.label) - rankOf(b.item.label) || b.delta - a.delta)[0];
      if (!improved) return;
      const primary = OBJECTIVE_CONTROLS[improved.item.label] || [];
      candidates.push({
        control, direction, score: best.result.score, objectiveIndex: improved.index,
        rank: rankOf(improved.item.label), controlRank: primary.includes(control) ? primary.indexOf(control) : 99
      });
    }));
    if (!candidates.length) {
      const weakest = [...evaluation.objectives].sort((a, b) => a.score - b.score)[0];
      return { complete: false, objective: weakest.label, control: null, direction: 0, cameraId, message: `${weakest.label} is ${gapPhrase(weakest)}, and no single control on ${camera.label} improves the match. Compare the scopes and check whether the reference moved.` };
    }
    const top = Math.max(...candidates.map(candidate => candidate.score));
    const threshold = evaluation.score + (top - evaluation.score) * 0.5;
    const chosen = candidates
      .filter(candidate => candidate.score >= threshold)
      .sort((a, b) => a.rank - b.rank || a.controlRank - b.controlRank || b.score - a.score)[0];
    const item = evaluation.objectives[chosen.objectiveIndex];
    const info = CONTROL_INFO[chosen.control];
    const verb = chosen.direction > 0 ? info.verbs.up : info.verbs.down;
    return {
      complete: false, objective: item.label, control: chosen.control, direction: chosen.direction, cameraId, scope: info.scope,
      message: `${item.label} is ${gapPhrase(item)}. Next, ${verb} ${CONTROL_LABELS[chosen.control]} on ${camera.label} and watch the ${SCOPE_NAMES[info.scope]}.`
    };
  }

  // Explain a scored check against the previous one (or the exercise start):
  // each changed control is replayed alone from the previous state so the
  // simulation itself shows what that change helped or hurt.
  function debriefPractice(input) {
    const state = normalizeState(input);
    if (!state.checks.length) return null;
    const scenario = scenarioFor(state.scenarioId);
    const current = state.checks[state.checks.length - 1];
    const previous = state.checks.length > 1 ? state.checks[state.checks.length - 2] : { n: 0, controls: startControls(scenario) };
    const beforeState = withControls(state, previous.controls);
    const afterState = withControls(state, current.controls);
    const before = evaluatePractice(beforeState);
    const after = evaluatePractice(afterState);
    const objectives = after.objectives.map((item, index) => ({
      label: item.label,
      before: before.objectives[index].score,
      after: item.score,
      delta: round(item.score - before.objectives[index].score, 1),
      band: bandFor(item.score),
      passed: item.passed,
      explanation: item.explanation
    }));
    // Closeness is measured against the pass window, so a change that moves a
    // far-off objective most of the way still counts before its score rises.
    const distance = item => difference(item.value, item.target) / item.tolerance;
    const beforeDistances = before.objectives.map(distance);
    const beforeError = matchError(before);
    const changes = [];
    CAMERA_IDS.forEach(cameraId => Object.keys(CONTROL_LIMITS).forEach(control => {
      const from = previous.controls[cameraId][control];
      const to = current.controls[cameraId][control];
      if (from === to) return;
      const single = evaluatePractice(withCameraControl(beforeState, cameraId, control, to));
      const effects = single.objectives
        .map((item, index) => ({
          label: item.label,
          closer: Math.round(clamp((beforeDistances[index] - distance(item)) / Math.max(beforeDistances[index], 0.2) * 100, -100, 100)),
          scoreDelta: round(item.score - before.objectives[index].score, 1)
        }))
        .filter(effect => Math.abs(effect.closer) >= 5)
        .sort((a, b) => Math.abs(b.closer) - Math.abs(a.closer))
        .slice(0, 3);
      const errorDelta = matchError(single) - beforeError;
      const direction = to > from ? 'up' : 'down';
      changes.push({
        cameraId, cameraLabel: getCamera(state, cameraId).label, control, label: CONTROL_LABELS[control],
        from, to, fromText: formatControl(control, from), toText: formatControl(control, to),
        scoreDelta: single.score - before.score, errorDelta: round(errorDelta, 3),
        verdict: errorDelta < -0.01 ? 'helped' : errorDelta > 0.01 ? 'hurt' : 'neutral',
        effects, explanation: CONTROL_INFO[control].effect[direction],
        referenceMoved: cameraId === scenario.referenceCameraId
      });
    }));
    changes.sort((a, b) => Math.abs(b.errorDelta) - Math.abs(a.errorDelta) || a.label.localeCompare(b.label));
    const combined = changes.reduce((sum, change) => sum + change.scoreDelta, 0);
    return {
      attempt: state.attempt,
      check: current.n,
      previousCheck: previous.n,
      baseline: previous.n ? `check ${previous.n}` : 'the exercise start',
      score: after.score,
      previousScore: before.score,
      delta: after.score - before.score,
      status: after.status,
      band: after.status === 'complete' ? 'OK' : after.status === 'close' ? 'WARN' : 'CRIT',
      explanation: after.explanation,
      objectives,
      changes,
      interacting: changes.length > 1 && Math.abs(combined - (after.score - before.score)) >= 3,
      next: nextCorrection(afterState),
      coach: [...scenario.coach]
    };
  }

  // Simulated signal conditions an operator would not put on air, worst first.
  function signalAlerts(input) {
    const state = normalizeState(input);
    const scenario = scenarioFor(state.scenarioId);
    const alerts = [];
    CAMERA_IDS.forEach(cameraId => {
      const camera = getCamera(state, cameraId);
      const metrics = analyzeCamera(state, cameraId).metrics;
      if (metrics.clippedPercent >= 5) alerts.push({ level: 'CRIT', code: 'clip', cameraId, title: `${camera.label} highlights clipping`, detail: `${metrics.clippedPercent.toFixed(1)}% of generated samples sit at full scale.` });
      else if (metrics.clippedPercent >= 0.5) alerts.push({ level: 'WARN', code: 'clip', cameraId, title: `${camera.label} highlights touching clip`, detail: `${metrics.clippedPercent.toFixed(1)}% of generated samples sit at full scale.` });
      if (metrics.crushedPercent >= 5) alerts.push({ level: 'CRIT', code: 'crush', cameraId, title: `${camera.label} blacks crushed`, detail: `${metrics.crushedPercent.toFixed(1)}% of generated samples sit at zero.` });
      else if (metrics.crushedPercent >= 0.5) alerts.push({ level: 'WARN', code: 'crush', cameraId, title: `${camera.label} blacks near crush`, detail: `${metrics.crushedPercent.toFixed(1)}% of generated samples sit at zero.` });
      if (camera.controls.gain >= 9) alerts.push({ level: 'WARN', code: 'gain', cameraId, title: `${camera.label} gain ${formatControl('gain', camera.controls.gain)}`, detail: 'Simulated noise rises with gain.' });
    });
    if (!state.demo) {
      const reference = getCamera(state, scenario.referenceCameraId);
      const start = normalizeControls(scenario.initial[cameraKey(reference.id)]);
      if (JSON.stringify(reference.controls) !== JSON.stringify(start)) {
        alerts.push({ level: 'WARN', code: 'reference-moved', cameraId: reference.id, title: `${reference.label} reference changed`, detail: 'The picture you are matching moved. Restore it, or freeze a still before experimenting.' });
      }
    }
    return alerts.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
  }

  // The workflow position, derived from state rather than stored.
  const WORKFLOW = Object.freeze([
    Object.freeze({ id: 'exercise', label: 'Choose exercise' }),
    Object.freeze({ id: 'inspect', label: 'Inspect reference and target' }),
    Object.freeze({ id: 'select', label: 'Select the target camera' }),
    Object.freeze({ id: 'adjust', label: 'Adjust controls' }),
    Object.freeze({ id: 'compare', label: 'Compare scopes' }),
    Object.freeze({ id: 'score', label: 'Score the attempt' }),
    Object.freeze({ id: 'review', label: 'Review coaching' }),
    Object.freeze({ id: 'replay', label: 'Replay or share' })
  ]);

  function workflowSteps(input) {
    const state = normalizeState(input);
    const scenario = scenarioFor(state.scenarioId);
    const start = startControls(scenario);
    const touched = JSON.stringify(getCamera(state, scenario.targetCameraId).controls) !== JSON.stringify(start[scenario.targetCameraId]);
    const lastCheck = state.checks[state.checks.length - 1];
    const scoredCurrent = Boolean(lastCheck) && JSON.stringify(lastCheck.controls) === JSON.stringify(controlsPair(state));
    let current;
    if (state.selectedCameraId !== scenario.targetCameraId && !touched) current = 'select';
    else if (!touched && !state.checks.length) current = 'adjust';
    else if (!scoredCurrent) current = 'score';
    else if (evaluatePractice(state).status !== 'complete') current = 'review';
    else current = 'replay';
    const currentIndex = WORKFLOW.findIndex(step => step.id === current);
    return WORKFLOW.map((step, index) => ({ ...step, done: index < currentIndex, current: index === currentIndex }));
  }

  // ---------- comparison and demonstration ----------

  function stateWithFrozenCamera(state, freeze) {
    return { ...state, cameras: state.cameras.map(camera => camera.id === freeze.cameraId ? { ...camera, controls: { ...freeze.controls }, source: { ...freeze.source } } : camera) };
  }

  // The two pictures the multiviewer and scopes compare. Practice compares the
  // reference (or its frozen still) with the target; a demonstration compares
  // one camera before and after the current step.
  function comparisonSources(input) {
    const state = normalizeState(input);
    const scenario = scenarioFor(state.scenarioId);
    if (state.demo) {
      const demo = state.demo;
      const beforeIndex = demo.compareWith === 'previous' ? Math.max(0, demo.index - 1) : 0;
      return {
        mode: 'demo',
        left: { role: 'before', cameraId: demo.cameraId, stepIndex: beforeIndex, stepLabel: demo.steps[beforeIndex].label, state: withControls(state, demo.steps[beforeIndex].controls), frozen: false },
        right: { role: 'after', cameraId: demo.cameraId, stepIndex: demo.index, stepLabel: demo.steps[demo.index].label, state, frozen: false }
      };
    }
    const freeze = state.view.freeze;
    return {
      mode: 'practice',
      left: freeze
        ? { role: 'reference', cameraId: freeze.cameraId, state: stateWithFrozenCamera(state, freeze), frozen: true, stillLabel: freeze.label }
        : { role: 'reference', cameraId: scenario.referenceCameraId, state, frozen: false },
      right: { role: 'target', cameraId: scenario.targetCameraId, state, frozen: false }
    };
  }

  function demoStepModified(input) {
    const state = normalizeState(input);
    if (!state.demo) return false;
    return JSON.stringify(controlsPair(state)) !== JSON.stringify(state.demo.steps[state.demo.index].controls);
  }

  function resumeOf(state) {
    return { controls: controlsPair(state), scope: state.scope, compare: state.view.compare, selectedCameraId: state.selectedCameraId };
  }

  function stepFromState(state, label, note, fallbackLabel) {
    return { label: cleanText(label, LIMITS.label, fallbackLabel), note: cleanNote(note), controls: controlsPair(state), scope: state.scope, compare: state.view.compare };
  }

  function pct(value) {
    return Math.round(value * 100);
  }

  function traceThickness(analysis) {
    return analysis.waveform.reduce((sum, column) => sum + (column.max - column.min), 0) / analysis.waveform.length;
  }

  // Describe a demonstration step from the simulation's own numbers.
  function demoNote(control, baseline, stepState, cameraId, from, to) {
    const before = analyzeCamera(baseline, cameraId);
    const after = analyzeCamera(stepState, cameraId);
    const a = before.metrics;
    const b = after.metrics;
    const change = `${CONTROL_LABELS[control]} ${formatControl(control, from)} → ${formatControl(control, to)}.`;
    let numbers;
    if (control === 'whiteBalance') numbers = `RGB means ${a.rgbMean.map(pct).join('/')} → ${b.rgbMean.map(pct).join('/')} and channel separation ${pct(a.rgbSpread)} → ${pct(b.rgbSpread)}`;
    else if (control === 'saturation') numbers = `Chroma amplitude ${pct(a.saturation)} → ${pct(b.saturation)}`;
    else if (control === 'colorPhase') numbers = `Average hue direction ${Math.round(a.hue)}° → ${Math.round(b.hue)}°`;
    else numbers = `Black ${pct(a.black)} → ${pct(b.black)}, midtone ${pct(a.mid)} → ${pct(b.mid)}, peak ${pct(a.peak)} → ${pct(b.peak)}, clipped ${a.clippedPercent.toFixed(1)}% → ${b.clippedPercent.toFixed(1)}%`;
    if (control === 'gain') numbers += `, trace thickness ${pct(traceThickness(before))} → ${pct(traceThickness(after))}`;
    const direction = to >= from ? 'up' : 'down';
    return `${change} ${numbers} on the generated 0–100 scale. ${CONTROL_INFO[control].effect[direction]}`;
  }

  function startDemo(input, control) {
    const state = normalizeState(input);
    if (!own(CONTROL_INFO, control)) return state;
    const scenario = scenarioFor(state.scenarioId);
    const referenceId = scenario.referenceCameraId;
    const targetId = scenario.targetCameraId;
    const baseline = normalizeControls(scenario.initial[cameraKey(referenceId)]);
    const sweep = DEMO_SWEEPS[control];
    const baseValue = baseline[control];
    const values = [];
    sweep.values.forEach(offset => {
      const value = normalizeControl(control, sweep.mode === 'scale' ? baseValue * offset : baseValue + offset);
      if (!values.includes(value)) values.push(value);
    });
    const baselinePair = { [referenceId]: { ...baseline }, [targetId]: { ...baseline } };
    const baselineState = withControls(state, baselinePair);
    const steps = values.map((value, index) => {
      const pair = { [referenceId]: { ...baseline }, [targetId]: { ...baseline, [control]: value } };
      const stepState = withControls(state, pair);
      return {
        label: index === 0 ? 'Baseline: cameras matched' : `${CONTROL_LABELS[control]} ${formatControl(control, value)}`,
        note: index === 0
          ? `Both cameras start at the exercise reference. The following steps change only ${CONTROL_LABELS[control]} on ${getCamera(state, targetId).label}. ${CONTROL_INFO[control].summary}`
          : demoNote(control, baselineState, stepState, targetId, baseValue, value),
        controls: pair,
        scope: CONTROL_INFO[control].scope,
        compare: 'side'
      };
    });
    const demo = {
      title: `${CONTROL_LABELS[control]}: one control, step by step`,
      focus: control,
      cameraId: targetId,
      compareWith: 'first',
      index: 0,
      steps: steps.map(step => ({ ...step, label: cleanText(step.label, LIMITS.label, 'Step'), note: cleanNote(step.note) })),
      resume: state.demo ? state.demo.resume : resumeOf(state)
    };
    return goToDemoStep({ ...state, demo }, 0);
  }

  function goToDemoStep(input, index) {
    const state = normalizeState(input);
    if (!state.demo) return state;
    const demo = state.demo;
    const target = clampInt(index, 0, demo.steps.length - 1, demo.index);
    const step = demo.steps[target];
    const loaded = withControls(state, step.controls);
    const compare = step.compare || loaded.view.compare;
    return {
      ...loaded,
      scope: step.scope,
      splitView: showsBothCameras(compare),
      view: { ...loaded.view, compare },
      selectedCameraId: demo.cameraId,
      demo: { ...demo, index: target },
      lastAction: `Demonstration step ${target + 1} of ${demo.steps.length}: ${step.label}`
    };
  }

  function captureDemoStep(input, action) {
    const state = normalizeState(input);
    if (!state.demo) {
      const scenario = scenarioFor(state.scenarioId);
      const demo = {
        title: cleanText(action.title, LIMITS.title, 'Instructor sequence'),
        focus: null,
        cameraId: CAMERA_IDS.includes(action.cameraId) ? action.cameraId : scenario.targetCameraId,
        compareWith: 'first',
        index: 0,
        steps: [stepFromState(state, action.label, action.note, 'Step 1')],
        resume: resumeOf(state)
      };
      return { ...state, demo, lastAction: 'Demonstration started from the current state' };
    }
    if (state.demo.steps.length >= LIMITS.demoSteps) return { ...state, lastAction: `A demonstration holds ${LIMITS.demoSteps} steps; remove one first` };
    const steps = [...state.demo.steps, stepFromState(state, action.label, action.note, `Step ${state.demo.steps.length + 1}`)];
    return { ...state, demo: { ...state.demo, steps, index: steps.length - 1 }, lastAction: `Captured demonstration step ${steps.length}` };
  }

  function updateDemoStep(input, action) {
    const state = normalizeState(input);
    if (!state.demo) return state;
    const demo = state.demo;
    const current = demo.steps[demo.index];
    const next = action.recapture ? stepFromState(state, current.label, current.note, current.label) : { ...current };
    if (action.label != null) next.label = cleanText(action.label, LIMITS.label, current.label);
    if (action.note != null) next.note = cleanNote(action.note);
    const steps = demo.steps.map((step, index) => index === demo.index ? next : step);
    return { ...state, demo: { ...demo, steps }, lastAction: `Updated demonstration step ${demo.index + 1}` };
  }

  function removeDemoStep(input) {
    const state = normalizeState(input);
    if (!state.demo || state.demo.steps.length <= 1) return state;
    const demo = state.demo;
    const steps = demo.steps.filter((_, index) => index !== demo.index);
    const removed = demo.index + 1;
    return { ...goToDemoStep({ ...state, demo: { ...demo, steps, index: Math.min(demo.index, steps.length - 1) } }, Math.min(demo.index, steps.length - 1)), lastAction: `Removed demonstration step ${removed}` };
  }

  function exitDemo(input) {
    const state = normalizeState(input);
    if (!state.demo) return state;
    const resume = state.demo.resume;
    const base = { ...state, demo: null, lastAction: 'Demonstration closed; practice restored' };
    if (!resume) return base;
    const restored = withControls(base, resume.controls);
    return { ...restored, demo: null, scope: resume.scope, selectedCameraId: resume.selectedCameraId, splitView: showsBothCameras(resume.compare), view: { ...restored.view, compare: resume.compare } };
  }

  // ---------- import / export ----------

  function exportPracticeJSON(input) {
    const state = normalizeState(input);
    return JSON.stringify({
      kind: 'shader-camera-practice-session',
      schema: SCHEMA,
      schemaVersion: SCHEMA_VERSION,
      exportedAt: null,
      state
    }, null, 2);
  }

  const MAX_IMPORT_CHARACTERS = 400000;

  function importPracticeJSON(value) {
    let parsed;
    if (typeof value === 'string' && value.length > MAX_IMPORT_CHARACTERS) throw new Error('Practice JSON is too large to be a practice session.');
    try {
      parsed = typeof value === 'string' ? JSON.parse(value) : copy(value);
    } catch (error) {
      throw new Error('Practice JSON is not valid JSON.');
    }
    const current = parsed && parsed.kind === 'shader-camera-practice-session' && parsed.schema === SCHEMA;
    const legacy = parsed && parsed.kind === 'throwline-camera-practice-session' && parsed.schema === LEGACY_SCHEMA;
    if ((!current && !legacy) || parsed.schemaVersion !== SCHEMA_VERSION || !parsed.state || typeof parsed.state !== 'object') {
      throw new Error(`Practice JSON must use ${SCHEMA}.`);
    }
    return normalizeState(parsed.state);
  }

  function scenarioList() {
    return Object.values(SCENARIOS).map(({ id, title, brief, objective, targetCameraId, referenceCameraId }) => ({ id, title, brief, objective, targetCameraId, referenceCameraId }));
  }

  function troubleshootingList() {
    return Object.values(TROUBLESHOOTING).map(item => ({ ...item }));
  }

  return Object.freeze({
    SCHEMA, LEGACY_SCHEMA, SCHEMA_VERSION, CAMERA_IDS: [...CAMERA_IDS], SCOPES: [...SCOPES], COMPARE_MODES: [...COMPARE_MODES],
    SCOPE_LAYOUTS: [...SCOPE_LAYOUTS], LIMITS, PASS_RULE, CONTROL_LIMITS, DEFAULT_CONTROLS, CONTROL_LABELS, CONTROL_INFO,
    OBJECTIVE_CONTROLS, SCENARIOS, TROUBLESHOOTING, DEMO_SWEEPS, WORKFLOW,
    createPracticeState, normalizeState, normalizeControls, getCamera, applyIntent, injectTrouble, revertInjection,
    generateFrame, analyzeCamera, evaluatePractice, exportPracticeJSON, importPracticeJSON, scenarioList, troubleshootingList,
    hashSeed, seededUnit, lumaOf, formatControl, controlsPair, withControls, startControls, bandFor, progressBands,
    exerciseStatus, nextCorrection, debriefPractice, signalAlerts, workflowSteps, comparisonSources, demoStepModified
  });
});
