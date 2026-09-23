(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ThrowlinePracticeState = api;
})(typeof window !== 'undefined' ? window : undefined, function () {
  'use strict';

  const SCHEMA = 'throwline.camera-practice.v1';
  const SCHEMA_VERSION = 1;
  const CAMERA_IDS = ['camera-a', 'camera-b'];
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

  const copy = value => JSON.parse(JSON.stringify(value));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));
  const round = (value, digits = 4) => Number(Number(value).toFixed(digits));
  const finite = value => Number.isFinite(Number(value));
  const cleanSeed = value => String(value == null ? 'throwline-demo-01' : value).trim().slice(0, 80) || 'throwline-demo-01';
  const cameraKey = cameraId => cameraId === 'camera-a' ? 'a' : 'b';

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
    const limits = CONTROL_LIMITS[name];
    if (!limits) return undefined;
    const fallback = DEFAULT_CONTROLS[name];
    const numeric = finite(value) ? Number(value) : fallback;
    const stepped = Math.round(numeric / limits[2]) * limits[2];
    return round(clamp(stepped, limits[0], limits[1]), name === 'whiteBalance' || name === 'colorPhase' ? 0 : 2);
  }

  function normalizeControls(input = {}) {
    return Object.keys(CONTROL_LIMITS).reduce((controls, name) => {
      controls[name] = normalizeControl(name, input[name]);
      return controls;
    }, {});
  }

  function scenarioFor(value) {
    return SCENARIOS[value] || SCENARIOS['match-cameras'];
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

  function createPracticeState(options = {}) {
    const scenario = scenarioFor(options.scenarioId);
    const seed = cleanSeed(options.seed);
    return {
      schema: SCHEMA,
      schemaVersion: SCHEMA_VERSION,
      scenarioId: scenario.id,
      seed,
      attempt: Math.max(1, Math.floor(Number(options.attempt) || 1)),
      selectedCameraId: CAMERA_IDS.includes(options.selectedCameraId) ? options.selectedCameraId : scenario.targetCameraId,
      splitView: options.splitView !== false,
      scope: ['waveform', 'parade', 'vectorscope', 'histogram'].includes(options.scope) ? options.scope : 'waveform',
      cameras: [
        createCamera('camera-a', scenario.initial.a, scenario.source, seed),
        createCamera('camera-b', scenario.initial.b, scenario.source, seed)
      ],
      injections: [],
      lastAction: 'Scenario loaded'
    };
  }

  function normalizeState(input = {}) {
    const base = createPracticeState(input);
    const inputCameras = Array.isArray(input.cameras) ? input.cameras : [];
    const cameras = base.cameras.map(camera => {
      const supplied = inputCameras.find(item => item && item.id === camera.id);
      if (!supplied) return camera;
      return {
        ...camera,
        controls: normalizeControls(supplied.controls),
        source: {
          sourceKelvin: clamp(supplied.source && finite(supplied.source.sourceKelvin) ? supplied.source.sourceKelvin : camera.source.sourceKelvin, 2400, 10000),
          exposureBias: clamp(supplied.source && finite(supplied.source.exposureBias) ? supplied.source.exposureBias : camera.source.exposureBias, -2, 2),
          blackBias: clamp(supplied.source && finite(supplied.source.blackBias) ? supplied.source.blackBias : camera.source.blackBias, 0, 0.15),
          contrast: clamp(supplied.source && finite(supplied.source.contrast) ? supplied.source.contrast : camera.source.contrast, 0.5, 1.8),
          noise: clamp(supplied.source && finite(supplied.source.noise) ? supplied.source.noise : camera.source.noise, 0, 0.08)
        }
      };
    });
    return {
      ...base,
      cameras,
      injections: Array.isArray(input.injections) ? input.injections.filter(id => TROUBLESHOOTING[id]).slice(0, 12) : [],
      lastAction: String(input.lastAction || base.lastAction).slice(0, 160)
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

  function applyIntent(input, intent = {}) {
    const state = normalizeState(input);
    switch (intent.type) {
      case 'set-control': {
        if (!CAMERA_IDS.includes(intent.cameraId) || !CONTROL_LIMITS[intent.control]) return state;
        const value = normalizeControl(intent.control, intent.value);
        return {
          ...updateCamera(state, intent.cameraId, camera => ({ ...camera, controls: { ...camera.controls, [intent.control]: value } })),
          selectedCameraId: intent.cameraId,
          lastAction: `${getCamera(state, intent.cameraId).label} ${CONTROL_LABELS[intent.control]} set to ${value}`
        };
      }
      case 'select-camera':
        return CAMERA_IDS.includes(intent.cameraId) ? { ...state, selectedCameraId: intent.cameraId, lastAction: `${getCamera(state, intent.cameraId).label} selected` } : state;
      case 'set-scope':
        return ['waveform', 'parade', 'vectorscope', 'histogram'].includes(intent.scope) ? { ...state, scope: intent.scope } : state;
      case 'set-split-view':
        return { ...state, splitView: Boolean(intent.value), lastAction: Boolean(intent.value) ? 'Split view enabled' : 'Single camera view enabled' };
      case 'load-scenario':
        return createPracticeState({ scenarioId: intent.scenarioId, seed: intent.seed == null ? state.seed : intent.seed, attempt: state.attempt + 1 });
      case 'replay':
        return createPracticeState({ scenarioId: state.scenarioId, seed: state.seed, attempt: state.attempt + 1 });
      case 'set-seed':
        return createPracticeState({ scenarioId: state.scenarioId, seed: intent.seed, attempt: state.attempt + 1 });
      case 'inject-trouble':
        return injectTrouble(state, intent.injectionId, intent.cameraId);
      default:
        return state;
    }
  }

  function injectTrouble(input, injectionId, cameraId = 'camera-b') {
    const state = normalizeState(input);
    const injection = TROUBLESHOOTING[injectionId];
    if (!injection || !CAMERA_IDS.includes(cameraId)) return state;
    const camera = getCamera(state, cameraId);
    const reference = getCamera(state, cameraId === 'camera-a' ? 'camera-b' : 'camera-a');
    const injectedControls = { ...injection.controls };
    if (injectionId === 'phase-error') injectedControls.colorPhase = reference.controls.colorPhase >= 0 ? -90 : 90;
    if (injectionId === 'warm-cast') injectedControls.whiteBalance = camera.source.sourceKelvin >= 5000 ? 2500 : 8000;
    const controls = { ...camera.controls, ...Object.fromEntries(Object.entries(injectedControls).map(([name,value]) => [name,normalizeControl(name,value)])) };
    return {
      ...updateCamera(state, cameraId, item => ({ ...item, controls })),
      selectedCameraId: cameraId,
      injections: [...state.injections, injectionId].slice(-12),
      lastAction: `${injection.label} injected on ${camera.label}`
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

  function percentile(values, fraction) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor(clamp(fraction, 0, 1) * Math.max(0, sorted.length - 1));
    return sorted[index] || 0;
  }

  function analyzeCamera(input, cameraId, options = {}) {
    const frame = generateFrame(input, cameraId, options);
    const bins = 64;
    const histogram = Array(bins).fill(0);
    const paradeColumns = Object.fromEntries(['r','g','b'].map(channel => [channel,Array.from({ length: frame.width }, () => [])]));
    const waveformColumns = Array.from({ length: frame.width }, () => []);
    const vectorscope = [];
    const lumas = [];
    const sums = [0, 0, 0];
    let saturationSum = 0;
    frame.samples.forEach((rgb, index) => {
      const y = clamp(rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114, 0, 1);
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
    const black = percentile(lumas, 0.05);
    const peak = percentile(lumas, 0.99);
    const mid = percentile(lumas, 0.5);
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

  function exportPracticeJSON(input) {
    const state = normalizeState(input);
    return JSON.stringify({
      kind: 'throwline-camera-practice-session',
      schema: SCHEMA,
      schemaVersion: SCHEMA_VERSION,
      exportedAt: null,
      state
    }, null, 2);
  }

  function importPracticeJSON(value) {
    let parsed;
    try {
      parsed = typeof value === 'string' ? JSON.parse(value) : copy(value);
    } catch (error) {
      throw new Error('Practice JSON is not valid JSON.');
    }
    if (!parsed || parsed.kind !== 'throwline-camera-practice-session' || parsed.schema !== SCHEMA || parsed.schemaVersion !== SCHEMA_VERSION || !parsed.state) {
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
    SCHEMA, SCHEMA_VERSION, CAMERA_IDS: [...CAMERA_IDS], CONTROL_LIMITS, DEFAULT_CONTROLS, CONTROL_LABELS,
    SCENARIOS, TROUBLESHOOTING, createPracticeState, normalizeState, normalizeControls, getCamera, applyIntent,
    injectTrouble, generateFrame, analyzeCamera, evaluatePractice, exportPracticeJSON, importPracticeJSON,
    scenarioList, troubleshootingList, hashSeed, seededUnit
  });
});
