(() => {
  'use strict';

  const STORE = 'avCalculator.v1';
  const DEFAULTS = {
    delayDistance: 72,
    delayUnit: 'ft',
    delayTemp: 68,
    delayFrameRate: 30,
    screenWidth: 16,
    aspectRatio: 1.7777777778,
    throwRatio: 1.5,
    throwDistance: 24,
    bitrate: 50,
    recordHours: 2,
    cameraCount: 3,
    storageHeadroom: 20,
    powerMethod: 'amps',
    deviceAmps: 0,
    deviceWatts: 350,
    powerFactor: 0,
    deviceCount: 4,
    voltage: 120,
    circuitAmps: 20,
    dropAmps: 12,
    dropLength: 100,
    dropGauge: '10',
    dropVoltage: 120,
    splRef: 100,
    splRefDist: 3,
    splTargetDist: 50,
    ledMode: 'layout',
    ledProductName: 'Custom P2.9 500 mm',
    ledPitchMm: 2.9,
    ledCabinetWidthMm: 500,
    ledCabinetHeightMm: 500,
    ledCabinetPixelsWide: 172,
    ledCabinetPixelsHigh: 172,
    ledCabinetRotation: '0',
    ledCabinetsWide: 8,
    ledCabinetsHigh: 5,
    ledTargetWidthFt: 16,
    ledTargetHeightFt: 9,
    ledTargetWidthPx: 1920,
    ledTargetHeightPx: 1080,
    ledContentWidthPx: 1920,
    ledContentHeightPx: 1080,
    ledFitPolicy: 'contain',
    ledRefreshHz: 60,
    ledBitDepth: 8,
    ledPortBasePixels: 650000,
    ledPortSafetyPercent: 80,
    ledProcessorPortCount: null,
    ledReceiverPixelsWide: null,
    ledReceiverPixelsHigh: null,
    ledMaxWattsEach: 180,
    ledTypicalWattsEach: 65,
    ledVoltage: 120,
    ledCircuitAmps: 20,
    ledContinuousPercent: 80,
    ledPhaseMode: 'singlePhase',
    ledPowerFactor: 0.95,
    ledCabinetsPerHomeRun: null,
    ledClosestViewer: 15,
    ledClosestViewerUnit: 'ft'
  };

  const fields = Array.from(document.querySelectorAll('[data-key]'));
  const isLedPage = document.documentElement.dataset.avTool === 'led-wall-calculator';
  const activeKeys = new Set(fields.map(field => field.dataset.key));
  const els = {
    delayMs: document.getElementById('delayMs'),
    delayFrames: document.getElementById('delayFrames'),
    delaySamples: document.getElementById('delaySamples'),
    delayHint: document.getElementById('delayHint'),
    screenHeight: document.getElementById('screenHeight'),
    screenDiagonal: document.getElementById('screenDiagonal'),
    idealThrow: document.getElementById('idealThrow'),
    projectionHint: document.getElementById('projectionHint'),
    baseStorage: document.getElementById('baseStorage'),
    totalStorage: document.getElementById('totalStorage'),
    perHourStorage: document.getElementById('perHourStorage'),
    storageHint: document.getElementById('storageHint'),
    powerMethodBadge: document.getElementById('powerMethodBadge'),
    nameplateAmpsField: document.getElementById('nameplateAmpsField'),
    wattsField: document.getElementById('wattsField'),
    powerFactorField: document.getElementById('powerFactorField'),
    deviceAmps: document.getElementById('deviceAmps'),
    deviceWatts: document.getElementById('deviceWatts'),
    powerFactor: document.getElementById('powerFactor'),
    powerInputLabel: document.getElementById('powerInputLabel'),
    powerCurrentLabel: document.getElementById('powerCurrentLabel'),
    powerWarningLabel: document.getElementById('powerWarningLabel'),
    powerWarningText: document.getElementById('powerWarningText'),
    totalWatts: document.getElementById('totalWatts'),
    totalAmps: document.getElementById('totalAmps'),
    circuitPercent: document.getElementById('circuitPercent'),
    voltageDrop: document.getElementById('voltageDrop'),
    dropPercent: document.getElementById('dropPercent'),
    dropResult: document.getElementById('dropResult'),
    dropEndV: document.getElementById('dropEndV'),
    dropHint: document.getElementById('dropHint'),
    splOut: document.getElementById('splOut'),
    splLoss: document.getElementById('splLoss'),
    splDoublings: document.getElementById('splDoublings'),
    splHint: document.getElementById('splHint'),
    ledProfileSelect: document.getElementById('ledProfileSelect'),
    ledLayoutFields: document.getElementById('ledLayoutFields'),
    ledTargetSizeFields: document.getElementById('ledTargetSizeFields'),
    ledTargetRasterFields: document.getElementById('ledTargetRasterFields'),
    ledModeNote: document.getElementById('ledModeNote'),
    ledPowerFactorField: document.getElementById('ledPowerFactorField'),
    ledPowerFactor: document.getElementById('ledPowerFactor'),
    ledWallResult: document.getElementById('ledWallResult'),
    ledRasterResult: document.getElementById('ledRasterResult'),
    ledContentResult: document.getElementById('ledContentResult'),
    ledProcessingResult: document.getElementById('ledProcessingResult'),
    ledPowerResult: document.getElementById('ledPowerResult'),
    ledWallPreview: document.getElementById('ledWallPreview'),
    ledPreviewRows: document.getElementById('ledPreviewRows'),
    ledPreviewColumns: document.getElementById('ledPreviewColumns'),
    ledPreviewArray: document.getElementById('ledPreviewArray'),
    ledPreviewCanvas: document.getElementById('ledPreviewCanvas'),
    ledPreviewPortRail: document.getElementById('ledPreviewPortRail'),
    ledPreviewPort: document.getElementById('ledPreviewPort'),
    ledPreviewViewerRail: document.getElementById('ledPreviewViewerRail'),
    ledPreviewViewer: document.getElementById('ledPreviewViewer'),
    ledPreviewIsoBtn: document.getElementById('ledPreviewIsoBtn'),
    ledPreviewFrontBtn: document.getElementById('ledPreviewFrontBtn'),
    ledWallDimensions: document.getElementById('ledWallDimensions'),
    ledWallDimensionsMetric: document.getElementById('ledWallDimensionsMetric'),
    ledNativeRaster: document.getElementById('ledNativeRaster'),
    ledNativeMeta: document.getElementById('ledNativeMeta'),
    ledContentFit: document.getElementById('ledContentFit'),
    ledContentMeta: document.getElementById('ledContentMeta'),
    ledProcessing: document.getElementById('ledProcessing'),
    ledProcessingMeta: document.getElementById('ledProcessingMeta'),
    ledPower: document.getElementById('ledPower'),
    ledPowerMeta: document.getElementById('ledPowerMeta'),
    ledBuildArray: document.getElementById('ledBuildArray'),
    ledCabinetCount: document.getElementById('ledCabinetCount'),
    ledMetricSize: document.getElementById('ledMetricSize'),
    ledImperialSize: document.getElementById('ledImperialSize'),
    ledArea: document.getElementById('ledArea'),
    ledDiagonal: document.getElementById('ledDiagonal'),
    ledCabinetRaster: document.getElementById('ledCabinetRaster'),
    ledPitchDerivedRaster: document.getElementById('ledPitchDerivedRaster'),
    ledImpliedPitch: document.getElementById('ledImpliedPitch'),
    ledTargetOutcome: document.getElementById('ledTargetOutcome'),
    ledSourceToWall: document.getElementById('ledSourceToWall'),
    ledScaleFactors: document.getElementById('ledScaleFactors'),
    ledPixelUtilization: document.getElementById('ledPixelUtilization'),
    ledAspectMismatch: document.getElementById('ledAspectMismatch'),
    ledSuggestedCanvas: document.getElementById('ledSuggestedCanvas'),
    ledSourceBandwidth: document.getElementById('ledSourceBandwidth'),
    ledContentGuidance: document.getElementById('ledContentGuidance'),
    ledSafePixelsPerPort: document.getElementById('ledSafePixelsPerPort'),
    ledAveragePortLoad: document.getElementById('ledAveragePortLoad'),
    ledPortUtilization: document.getElementById('ledPortUtilization'),
    ledWallPayload: document.getElementById('ledWallPayload'),
    ledProcessorGuidance: document.getElementById('ledProcessorGuidance'),
    ledMaxLoad: document.getElementById('ledMaxLoad'),
    ledTypicalLoad: document.getElementById('ledTypicalLoad'),
    ledCircuitPlan: document.getElementById('ledCircuitPlan'),
    ledHomeRuns: document.getElementById('ledHomeRuns'),
    ledViewingRange: document.getElementById('ledViewingRange'),
    ledAudienceCheck: document.getElementById('ledAudienceCheck'),
    ledWarnings: document.getElementById('ledWarnings'),
    saveLedPresetBtn: document.getElementById('saveLedPresetBtn'),
    copyLedSummaryBtn: document.getElementById('copyLedSummaryBtn'),
    downloadLedSummaryBtn: document.getElementById('downloadLedSummaryBtn'),
    sendLedTypicalPowerBtn: document.getElementById('sendLedTypicalPowerBtn'),
    sendLedMaxPowerBtn: document.getElementById('sendLedMaxPowerBtn'),
    summaryOutput: document.getElementById('summaryOutput'),
    saveStatus: document.getElementById('saveStatus'),
    actionStatus: document.getElementById('actionStatus'),
    resetBtn: document.getElementById('resetBtn'),
    copyButtons: [document.getElementById('copySummaryBtn'), document.getElementById('copySummaryBtn2')],
    downloadSummaryBtn: document.getElementById('downloadSummaryBtn')
  };

  let storageLoadState = 'defaults';
  let calculationStatusTimer = 0;
  let latestLedSummary = '';
  let latestLedPower = null;
  let previewMotion = null;
  const LED_PROFILE_STORE = 'avCalculator.ledProfiles.v1';
  const LED_PROFILE_KEYS = [
    'ledProductName', 'ledPitchMm', 'ledCabinetWidthMm', 'ledCabinetHeightMm',
    'ledCabinetPixelsWide', 'ledCabinetPixelsHigh', 'ledMaxWattsEach',
    'ledTypicalWattsEach', 'ledVoltage', 'ledPortBasePixels',
    'ledReceiverPixelsWide', 'ledReceiverPixelsHigh', 'ledCabinetsPerHomeRun'
  ];

  const storage = (() => {
    try {
      const probe = 'avCalculator.storage.probe';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return {
        available: true,
        get: key => {
          try {
            return window.localStorage.getItem(key);
          } catch (error) {
            return null;
          }
        },
        set: (key, value) => {
          try {
            window.localStorage.setItem(key, value);
            return true;
          } catch (error) {
            return false;
          }
        },
        remove: key => {
          try {
            window.localStorage.removeItem(key);
            return true;
          } catch (error) {
            return false;
          }
        }
      };
    } catch (error) {
      return {
        available: false,
        get: () => null,
        set: () => false,
        remove: () => {}
      };
    }
  })();

  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = storage.get('av-theme-mode.v1');
  if (!['light', 'dark', 'system'].includes(savedTheme)) document.documentElement.dataset.avTheme = 'light';
  function syncThemeToggle() {
    const chosen = document.documentElement.dataset.avTheme;
    const dark = chosen === 'dark' || (chosen === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const next = dark ? 'Light mode' : 'Dark mode';
    themeToggle.textContent = next;
    themeToggle.setAttribute('aria-label', `Switch to ${next.toLowerCase()}`);
  }
  syncThemeToggle();
  themeToggle.addEventListener('click', () => {
    const next = themeToggle.textContent === 'Dark mode' ? 'dark' : 'light';
    document.documentElement.dataset.avTheme = next;
    storage.set('av-theme-mode.v1', next);
    syncThemeToggle();
  });
  const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
  if (colorScheme.addEventListener) colorScheme.addEventListener('change', syncThemeToggle);

  let state = loadState();
  let ledProfiles = loadLedProfiles();

  function loadState() {
    const saved = storage.get(STORE);
    if (!saved) return { ...DEFAULTS };
    try {
      const parsed = JSON.parse(saved);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new TypeError('Saved calculator state must be an object.');
      }
      if (!Object.prototype.hasOwnProperty.call(parsed, 'powerMethod')) {
        storageLoadState = 'migrated';
        return { ...DEFAULTS, ...parsed, powerMethod: 'watts', powerFactor: 0 };
      }
      storageLoadState = 'loaded';
      return { ...DEFAULTS, ...parsed };
    } catch (error) {
      storageLoadState = 'invalid';
      return { ...DEFAULTS };
    }
  }

  function loadLedProfiles() {
    const saved = storage.get(LED_PROFILE_STORE);
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(profile => profile && typeof profile === 'object' && typeof profile.id === 'string' && typeof profile.name === 'string').slice(0, 20);
    } catch (error) {
      return [];
    }
  }

  function refreshLedProfileOptions(selectedId = '') {
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Current custom profile';
    const options = ledProfiles.map(profile => {
      const option = document.createElement('option');
      option.value = profile.id;
      option.textContent = profile.name;
      return option;
    });
    els.ledProfileSelect.replaceChildren(defaultOption, ...options);
    els.ledProfileSelect.value = selectedId;
  }

  function saveLedPreset() {
    const normalizationMessages = normalizeFields();
    const name = String(state.ledProductName || DEFAULTS.ledProductName).trim();
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 56) || `led-profile-${Date.now()}`;
    const values = Object.fromEntries(LED_PROFILE_KEYS.map(key => [key, state[key]]));
    const profile = { id, name, values };
    const existingIndex = ledProfiles.findIndex(item => item.id === id);
    if (existingIndex >= 0) ledProfiles.splice(existingIndex, 1, profile);
    else ledProfiles.unshift(profile);
    ledProfiles = ledProfiles.slice(0, 20);
    const saved = storage.set(LED_PROFILE_STORE, JSON.stringify(ledProfiles));
    refreshLedProfileOptions(saved ? id : '');
    const normalization = normalizationMessages.length ? ` ${normalizationMessages.join(' ')}` : '';
    announceAction(saved ? `LED profile “${name}” saved.${normalization}` : 'LED profile could not be saved because browser storage is unavailable.', saved ? 'success' : 'error');
    pulse(els.saveLedPresetBtn, saved ? 'success' : 'error');
  }

  function applyLedPreset() {
    const profile = ledProfiles.find(item => item.id === els.ledProfileSelect.value);
    if (!profile || !profile.values || typeof profile.values !== 'object') return;
    LED_PROFILE_KEYS.forEach(key => {
      if (Object.prototype.hasOwnProperty.call(profile.values, key)) state[key] = profile.values[key];
    });
    setFieldValues();
    syncLedModeUI();
    syncLedPowerModeUI();
    const normalizationMessages = normalizeFields();
    const saved = saveState();
    calculate();
    const normalized = normalizationMessages.length ? ` ${normalizationMessages.join(' ')}` : '';
    announceAction(`LED profile “${profile.name}” loaded.${normalized}${saved ? '' : ' Calculator storage is unavailable.'}`, saved ? 'success' : 'error');
  }

  function saveState(extraKeys = []) {
    // Both calculator pages share the original key. Refresh fields owned by the
    // other page before writing so an open tab does not erase its newer values.
    const current = storage.get(STORE);
    if (current) {
      try {
        const parsed = JSON.parse(current);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          Object.keys(DEFAULTS).forEach(key => {
            if (!activeKeys.has(key) && !extraKeys.includes(key) && Object.prototype.hasOwnProperty.call(parsed, key)) state[key] = parsed[key];
          });
        }
      } catch (error) {
        // Invalid saved data is replaced by the normalized current state.
      }
    }
    const saved = storage.set(STORE, JSON.stringify(state));
    els.saveStatus.textContent = saved ? 'Saved' : 'Storage blocked';
    return saved;
  }

  function numberValue(key) {
    const value = Number(state[key]);
    return Number.isFinite(value) ? value : Number(DEFAULTS[key]);
  }

  function optionalNumberValue(key) {
    if (state[key] === null || state[key] === undefined || state[key] === '') return null;
    const value = Number(state[key]);
    return Number.isFinite(value) ? value : null;
  }

  function fieldLabel(field) {
    const label = Array.from(document.querySelectorAll('label')).find(candidate => candidate.htmlFor === field.id);
    return label ? label.textContent.trim() : field.dataset.key;
  }

  function decimalPlaces(value) {
    const text = String(value);
    const dot = text.indexOf('.');
    return dot === -1 ? 0 : text.length - dot - 1;
  }

  function normalizeNumericField(field) {
    const key = field.dataset.key;
    const raw = field.value.trim();
    if (field.dataset.optional === 'true' && raw === '') {
      field.removeAttribute('aria-invalid');
      return { value: null, message: '' };
    }
    const fallback = Number(DEFAULTS[key]);
    const min = field.min === '' ? Number.NEGATIVE_INFINITY : Number(field.min);
    const max = field.max === '' ? Number.POSITIVE_INFINITY : Number(field.max);
    const step = field.step === '' || field.step === 'any' ? 0 : Number(field.step);
    const label = fieldLabel(field);
    let value = Number(raw);
    let normalization = '';

    if (raw === '' || !Number.isFinite(value)) {
      value = fallback;
      normalization = 'fallback';
    } else if (value < min) {
      value = min;
      normalization = 'minimum';
    } else if (value > max) {
      value = max;
      normalization = 'maximum';
    }

    if (Number.isFinite(step) && step > 0) {
      const base = Number.isFinite(min) ? min : 0;
      const stepOffset = (value - base) / step;
      const roundingNudge = Number.EPSILON * Math.max(1, Math.abs(stepOffset)) * 8;
      const stepped = base + (Math.round(stepOffset + roundingNudge) * step);
      const tolerance = Math.max(1, Math.abs(value)) * Number.EPSILON * 16;
      if (!normalization && Math.abs(stepped - value) > tolerance) {
        normalization = 'step';
      }
      value = stepped;
    }

    value = Math.min(max, Math.max(min, value));
    const precision = Math.min(8, Math.max(decimalPlaces(step), Number.isFinite(min) ? decimalPlaces(min) : 0));
    value = Number(value.toFixed(precision));
    const displayValue = String(value);
    field.value = displayValue;
    field.removeAttribute('aria-invalid');

    if (normalization === 'fallback') return { value, message: `${label} was blank or invalid and reset to ${displayValue}.` };
    if (normalization === 'minimum') return { value, message: `${label} was below ${min} and clamped to ${displayValue}.` };
    if (normalization === 'maximum') return { value, message: `${label} was above ${max} and clamped to ${displayValue}.` };
    if (normalization === 'step') return { value, message: `${label} was normalized to ${displayValue} to match ${step} increments.` };
    return { value, message: '' };
  }

  function normalizeFields() {
    const messages = [];
    fields.forEach(field => {
      if (field.disabled) return;
      const key = field.dataset.key;
      if (field.dataset.kind === 'text') {
        const maximumLength = field.maxLength > 0 ? field.maxLength : 120;
        const fallback = String(DEFAULTS[key] || 'Custom LED profile');
        const displayText = field.value.replace(/\s+/g, ' ').slice(0, maximumLength);
        const storedText = displayText.trim() || fallback;
        field.value = displayText || fallback;
        state[key] = storedText;
        field.removeAttribute('aria-invalid');
        return;
      }
      if (field.tagName === 'SELECT') {
        const allowed = Array.from(field.options, option => option.value);
        if (!allowed.includes(field.value)) {
          field.value = String(DEFAULTS[key]);
          messages.push(`${fieldLabel(field)} was invalid and reset to ${field.options[field.selectedIndex].text}.`);
        }
        state[key] = field.value;
        return;
      }

      const normalized = normalizeNumericField(field);
      state[key] = normalized.value;
      if (normalized.message) messages.push(normalized.message);
    });
    return messages;
  }

  function setFieldValues() {
    fields.forEach(field => {
      const key = field.dataset.key;
      if (state[key] === undefined) return;
      field.value = state[key] === null ? '' : String(state[key]);
    });
  }

  function syncPowerMethodUI() {
    const wattsMode = state.powerMethod === 'watts';
    els.nameplateAmpsField.hidden = wattsMode;
    els.wattsField.hidden = !wattsMode;
    els.powerFactorField.hidden = !wattsMode;
    els.deviceAmps.disabled = wattsMode;
    els.deviceAmps.required = !wattsMode;
    els.deviceWatts.disabled = !wattsMode;
    els.powerFactor.disabled = !wattsMode;
    els.powerFactor.required = wattsMode;
    els.powerMethodBadge.textContent = wattsMode ? 'Watts + PF estimate' : 'Nameplate current';
  }

  function syncLedModeUI() {
    const mode = ['layout', 'targetSize', 'targetRaster', 'custom'].includes(state.ledMode)
      ? state.ledMode
      : 'layout';
    const layoutMode = mode === 'layout' || mode === 'custom';
    const groups = [
      [els.ledLayoutFields, layoutMode],
      [els.ledTargetSizeFields, mode === 'targetSize'],
      [els.ledTargetRasterFields, mode === 'targetRaster']
    ];
    groups.forEach(([group, active]) => {
      group.hidden = !active;
      Array.from(group.querySelectorAll('[data-key]')).forEach(field => {
        field.disabled = !active;
      });
    });
    if (mode === 'targetSize') {
      els.ledModeNote.textContent = 'Columns and rows are independently rounded up from the requested physical size. Actual build dimensions and overbuild stay visible.';
    } else if (mode === 'targetRaster') {
      els.ledModeNote.textContent = 'Columns and rows are independently rounded up from the requested raster. The result is the nearest whole-cabinet canvas at or above the target.';
    } else if (mode === 'custom') {
      els.ledModeNote.textContent = 'Custom panel layout uses the entered cabinet geometry, raster, pitch, and whole-cabinet array without requiring a product database.';
    } else {
      els.ledModeNote.textContent = 'Cabinet layout uses the entered whole-cabinet array directly.';
    }
  }

  function syncLedPowerModeUI() {
    const threePhase = state.ledPhaseMode === 'threePhase';
    els.ledPowerFactorField.hidden = !threePhase;
    els.ledPowerFactor.disabled = !threePhase;
  }

  function readFields() {
    const normalizationMessages = normalizeFields();
    if (isLedPage) {
      syncLedModeUI();
      syncLedPowerModeUI();
    } else {
      syncPowerMethodUI();
    }
    const saved = saveState();
    calculate();
    queueCalculationStatus(normalizationMessages, saved);
  }

  function calculate() {
    if (isLedPage) {
      calculateLedWall();
      return;
    }
    const audio = calculateDelay();
    const projection = calculateProjection();
    const storageCalc = calculateStorage();
    const power = calculatePower();
    const drop = calculateVoltageDrop();
    const spl = calculateSpl();
    renderSummary(audio, projection, storageCalc, power, drop, spl);
  }

  function calculateDelay() {
    const distanceInput = numberValue('delayDistance');
    const unit = state.delayUnit === 'm' ? 'm' : 'ft';
    const tempF = numberValue('delayTemp');
    const tempC = (tempF - 32) * 5 / 9;
    const speedMps = 331.3 + (0.606 * tempC);
    const speedFps = speedMps * 3.28084;
    const distanceFt = unit === 'm' ? distanceInput * 3.28084 : distanceInput;
    const delayMs = speedFps > 0 ? distanceFt / speedFps * 1000 : 0;
    const frameRate = numberValue('delayFrameRate');
    const frames = delayMs / 1000 * frameRate;
    const samples = delayMs / 1000 * 48000;
    els.delayMs.textContent = `${format(delayMs, 1)} ms`;
    els.delayFrames.textContent = `${format(frames, 2)} fr`;
    els.delaySamples.textContent = String(Math.round(samples));
    els.delayHint.textContent = delayMs > 35
      ? 'This is beyond a Haas range. Treat it as a real delay zone.'
      : 'Short delay range. Check alignment by ear in the room.';
    return { delayMs, frames, samples, distanceInput, unit, tempF };
  }

  function calculateProjection() {
    const widthFt = numberValue('screenWidth');
    const aspect = numberValue('aspectRatio');
    const throwRatio = numberValue('throwRatio');
    const actualDistance = numberValue('throwDistance');
    const heightFt = widthFt / aspect;
    const diagonalIn = Math.sqrt((widthFt * 12) ** 2 + (heightFt * 12) ** 2);
    const idealThrowFt = widthFt * throwRatio;
    const requiredRatio = actualDistance / widthFt;
    const varianceFt = actualDistance - idealThrowFt;
    els.screenHeight.textContent = `${format(heightFt, 2)} ft`;
    els.screenDiagonal.textContent = `${format(diagonalIn, 0)} in`;
    els.idealThrow.textContent = `${format(idealThrowFt, 1)} ft`;
    els.projectionHint.textContent = `Actual distance needs a ${format(requiredRatio, 2)}:1 lens. Variance from selected ratio is ${format(varianceFt, 1)} ft.`;
    return { widthFt, heightFt, diagonalIn, throwRatio, idealThrowFt, actualDistance, requiredRatio, varianceFt };
  }

  function calculateStorage() {
    const bitrate = numberValue('bitrate');
    const hours = numberValue('recordHours');
    const feeds = numberValue('cameraCount');
    const headroom = numberValue('storageHeadroom');
    const baseGb = bitrate * hours * 3600 / 8 / 1000 * feeds;
    const totalGb = baseGb * (1 + headroom / 100);
    const perHourGb = bitrate * 3600 / 8 / 1000 * feeds;
    els.baseStorage.textContent = `${format(baseGb, 1)} GB`;
    els.totalStorage.textContent = `${format(totalGb, 1)} GB`;
    els.perHourStorage.textContent = `${format(perHourGb, 1)} GB`;
    els.storageHint.textContent = totalGb >= 1000
      ? `Plan about ${format(totalGb / 1000, 2)} TB with headroom.`
      : `Plan about ${format(totalGb, 1)} GB with headroom.`;
    return { bitrate, hours, feeds, headroom, baseGb, totalGb, perHourGb };
  }

  function calculatePower() {
    const method = state.powerMethod === 'watts' ? 'watts' : 'amps';
    const ampsEach = numberValue('deviceAmps');
    const wattsEach = numberValue('deviceWatts');
    const powerFactor = numberValue('powerFactor');
    const count = numberValue('deviceCount');
    const voltage = numberValue('voltage');
    const circuitAmps = numberValue('circuitAmps');
    const totalWatts = wattsEach * count;
    const complete = method === 'amps' ? ampsEach > 0 : wattsEach > 0 && powerFactor > 0;
    const ampsEstimate = method === 'amps'
      ? ampsEach * count
      : complete && voltage > 0 ? totalWatts / (voltage * powerFactor) : 0;
    const referenceAmps = circuitAmps * 0.8;
    const percentOfReference = complete && referenceAmps > 0 ? ampsEstimate / referenceAmps * 100 : 0;

    if (method === 'amps') {
      els.powerInputLabel.textContent = 'Per Device Current';
      els.powerCurrentLabel.textContent = 'Total Nameplate';
      els.totalWatts.textContent = complete ? `${format(ampsEach, 2)} A` : '—';
      els.totalAmps.textContent = complete ? `${format(ampsEstimate, 2)} A` : '—';
      els.powerWarningLabel.textContent = 'Planning reference:';
      els.powerWarningText.textContent = 'Sum equipment nameplate current, include startup or inrush demand, and verify the distribution before assigning circuits.';
    } else {
      els.powerInputLabel.textContent = 'Total Real Power';
      els.powerCurrentLabel.textContent = 'Estimated Current';
      els.totalWatts.textContent = complete ? `${format(totalWatts, 0)} W` : '—';
      els.totalAmps.textContent = complete ? `~${format(ampsEstimate, 2)} A` : '—';
      els.powerWarningLabel.textContent = complete ? 'Single-phase estimate:' : 'Power factor required:';
      els.powerWarningText.textContent = complete
        ? `Current uses watts ÷ (${format(voltage, 0)} V × ${format(powerFactor, 2)} PF). Include startup or inrush demand and verify the distribution.`
        : 'Enter the manufacturer power factor; the calculator will not silently assume PF 1. Include startup or inrush demand before assigning circuits.';
    }

    els.circuitPercent.textContent = complete ? `${format(percentOfReference, 0)}%` : '—';
    return { method, complete, ampsEach, wattsEach, powerFactor, count, voltage, circuitAmps, totalWatts, ampsEstimate, referenceAmps, percentOfReference };
  }

  function calculateVoltageDrop() {
    const OHMS_PER_KFT = { '14': 2.525, '12': 1.588, '10': 0.999, '8': 0.628, '6': 0.395, '4': 0.249, '2': 0.156 };
    const amps = numberValue('dropAmps');
    const lengthFt = numberValue('dropLength');
    const gauge = String(state.dropGauge || DEFAULTS.dropGauge);
    const voltage = numberValue('dropVoltage');
    const ohmsPerFt = (OHMS_PER_KFT[gauge] || OHMS_PER_KFT['10']) / 1000;
    const dropV = 2 * lengthFt * amps * ohmsPerFt;
    const percent = voltage > 0 ? dropV / voltage * 100 : 0;
    const endV = voltage - dropV;
    els.voltageDrop.textContent = `${format(dropV, 2)} V`;
    els.dropPercent.textContent = `${format(percent, 1)}%`;
    els.dropEndV.textContent = `${format(endV, 1)} V`;
    els.dropResult.classList.remove('good', 'warn', 'bad');
    els.dropResult.classList.add(percent <= 3 ? 'good' : percent <= 5 ? 'warn' : 'bad');
    els.dropHint.textContent = percent <= 3
      ? 'Drop is within the 3 percent target for sensitive gear.'
      : percent <= 5
        ? 'Acceptable for general loads but high for sensitive gear. Consider a heavier gauge.'
        : 'Drop is too high. Use a heavier gauge, a shorter run, or higher voltage.';
    return { amps, lengthFt, gauge, voltage, dropV, percent, endV };
  }

  function calculateSpl() {
    const refSpl = numberValue('splRef');
    const refDist = numberValue('splRefDist');
    const targetDist = numberValue('splTargetDist');
    const ratio = refDist > 0 ? targetDist / refDist : 1;
    const loss = 20 * Math.log10(ratio);
    const splAt = refSpl - loss;
    const doublings = Math.log2(ratio);
    els.splOut.textContent = `${format(splAt, 1)} dB`;
    els.splLoss.textContent = `${loss >= 0 ? '-' : '+'}${format(Math.abs(loss), 1)} dB`;
    els.splDoublings.textContent = format(doublings, 2);
    els.splHint.textContent = targetDist >= refDist
      ? `Free field: about 6 dB lost per distance doubling (${format(doublings, 1)} doublings here).`
      : 'Target is closer than the reference, so the level rises above the reference SPL.';
    return { refSpl, refDist, targetDist, loss, splAt, doublings };
  }

  function calculateLedWall() {
    const mode = ['layout', 'targetSize', 'targetRaster', 'custom'].includes(state.ledMode)
      ? state.ledMode
      : 'layout';
    const productName = String(state.ledProductName || DEFAULTS.ledProductName);
    const pitchMm = numberValue('ledPitchMm');
    const enteredCabinetWidthMm = numberValue('ledCabinetWidthMm');
    const enteredCabinetHeightMm = numberValue('ledCabinetHeightMm');
    const providedCabinetPixelsWide = optionalNumberValue('ledCabinetPixelsWide');
    const providedCabinetPixelsHigh = optionalNumberValue('ledCabinetPixelsHigh');
    const rasterIncomplete = Boolean(providedCabinetPixelsWide) !== Boolean(providedCabinetPixelsHigh);
    const enteredRasterProvided = Boolean(providedCabinetPixelsWide && providedCabinetPixelsHigh);
    const pitchDerivedEnteredWide = enteredCabinetWidthMm / pitchMm;
    const pitchDerivedEnteredHigh = enteredCabinetHeightMm / pitchMm;
    const enteredCabinetPixelsWide = enteredRasterProvided ? providedCabinetPixelsWide : Math.round(pitchDerivedEnteredWide);
    const enteredCabinetPixelsHigh = enteredRasterProvided ? providedCabinetPixelsHigh : Math.round(pitchDerivedEnteredHigh);
    const impliedPitchWideMm = enteredCabinetWidthMm / enteredCabinetPixelsWide;
    const impliedPitchHighMm = enteredCabinetHeightMm / enteredCabinetPixelsHigh;
    const rotated = String(state.ledCabinetRotation) === '90';
    const cabinetWidthMm = rotated ? enteredCabinetHeightMm : enteredCabinetWidthMm;
    const cabinetHeightMm = rotated ? enteredCabinetWidthMm : enteredCabinetHeightMm;
    const cabinetPixelsWide = rotated ? enteredCabinetPixelsHigh : enteredCabinetPixelsWide;
    const cabinetPixelsHigh = rotated ? enteredCabinetPixelsWide : enteredCabinetPixelsHigh;
    const targetWidthFt = numberValue('ledTargetWidthFt');
    const targetHeightFt = numberValue('ledTargetHeightFt');
    const targetWidthPx = numberValue('ledTargetWidthPx');
    const targetHeightPx = numberValue('ledTargetHeightPx');
    const ceilCabinets = value => Math.max(1, Math.ceil(value - 1e-10));

    let cabinetsWide = numberValue('ledCabinetsWide');
    let cabinetsHigh = numberValue('ledCabinetsHigh');
    let targetOutcome = 'The entered whole-cabinet layout is used directly.';
    if (mode === 'targetSize') {
      cabinetsWide = ceilCabinets((targetWidthFt * 304.8) / cabinetWidthMm);
      cabinetsHigh = ceilCabinets((targetHeightFt * 304.8) / cabinetHeightMm);
    } else if (mode === 'targetRaster') {
      cabinetsWide = ceilCabinets(targetWidthPx / cabinetPixelsWide);
      cabinetsHigh = ceilCabinets(targetHeightPx / cabinetPixelsHigh);
    }

    const cabinetsTotal = cabinetsWide * cabinetsHigh;
    const wallWidthMm = cabinetWidthMm * cabinetsWide;
    const wallHeightMm = cabinetHeightMm * cabinetsHigh;
    const wallWidthPx = cabinetPixelsWide * cabinetsWide;
    const wallHeightPx = cabinetPixelsHigh * cabinetsHigh;
    const totalPixels = wallWidthPx * wallHeightPx;
    const aspectRatio = wallWidthPx / wallHeightPx;
    const wallWidthM = wallWidthMm / 1000;
    const wallHeightM = wallHeightMm / 1000;
    const wallWidthFt = wallWidthMm / 304.8;
    const wallHeightFt = wallHeightMm / 304.8;
    const areaM2 = wallWidthM * wallHeightM;
    const areaFt2 = wallWidthFt * wallHeightFt;
    const diagonalM = Math.hypot(wallWidthM, wallHeightM);
    const diagonalFt = Math.hypot(wallWidthFt, wallHeightFt);

    if (mode === 'targetSize') {
      const widthOverMm = wallWidthMm - (targetWidthFt * 304.8);
      const heightOverMm = wallHeightMm - (targetHeightFt * 304.8);
      targetOutcome = `Requested ${format(targetWidthFt, 1)} × ${format(targetHeightFt, 1)} ft; independent column and row ceiling produces ${cabinetsWide} × ${cabinetsHigh} cabinets, adding ${format(widthOverMm, 0)} mm width and ${format(heightOverMm, 0)} mm height.`;
    } else if (mode === 'targetRaster') {
      targetOutcome = `Requested ${format(targetWidthPx, 0)} × ${format(targetHeightPx, 0)} px; independent column and row ceiling produces ${cabinetsWide} × ${cabinetsHigh} cabinets and ${format(wallWidthPx - targetWidthPx, 0)} × ${format(wallHeightPx - targetHeightPx, 0)} extra pixels.`;
    } else if (mode === 'custom') {
      targetOutcome = 'Custom panel mode uses the entered cabinet geometry, raster, pitch, rotation, and whole-cabinet array directly.';
    }

    const pitchDerivedWide = rotated ? pitchDerivedEnteredHigh : pitchDerivedEnteredWide;
    const pitchDerivedHigh = rotated ? pitchDerivedEnteredWide : pitchDerivedEnteredHigh;
    const pitchMismatchWide = enteredRasterProvided ? Math.abs(enteredCabinetPixelsWide - pitchDerivedEnteredWide) / pitchDerivedEnteredWide * 100 : 0;
    const pitchMismatchHigh = enteredRasterProvided ? Math.abs(enteredCabinetPixelsHigh - pitchDerivedEnteredHigh) / pitchDerivedEnteredHigh * 100 : 0;
    const pitchMismatchPercent = Math.max(pitchMismatchWide, pitchMismatchHigh);
    const pitchFraction = Math.max(
      Math.abs(pitchDerivedEnteredWide - Math.round(pitchDerivedEnteredWide)),
      Math.abs(pitchDerivedEnteredHigh - Math.round(pitchDerivedEnteredHigh))
    );

    const content = calculateLedContentFit({ wallWidthPx, wallHeightPx, totalPixels, aspectRatio });
    const processing = calculateLedProcessing({ wallWidthPx, wallHeightPx, totalPixels, cabinetPixelsWide, cabinetPixelsHigh });
    const power = calculateLedPower({ cabinetsTotal, areaM2 });
    const viewing = calculateLedViewing(pitchMm);
    const warnings = [];

    if (pitchFraction > 0.05) {
      const rasterAuthority = enteredRasterProvided
        ? 'The entered cabinet raster remains authoritative.'
        : 'A whole-pixel pitch-derived raster is being used; verify it against the product specification.';
      warnings.push({ severity: 'warn', label: 'PITCH', text: `Cabinet dimensions ÷ P${format(pitchMm, 2)} do not land on whole pixels (${format(pitchDerivedWide, 2)} × ${format(pitchDerivedHigh, 2)}). ${rasterAuthority}` });
    }
    if (rasterIncomplete) {
      warnings.push({ severity: 'warn', label: 'RASTER', text: 'Enter both cabinet raster dimensions or leave both blank. Pitch-derived width and height are being used together for this calculation.' });
    }
    if (pitchMismatchPercent > 1) {
      warnings.push({ severity: 'bad', label: 'RASTER', text: `Entered cabinet raster differs from the pitch-derived check by up to ${format(pitchMismatchPercent, 1)}%. Verify the exact product specification.` });
    }
    if (content.aspectMismatchPercent > 1) {
      warnings.push({ severity: 'warn', label: 'CONTENT', text: `Source and wall aspect ratios differ by ${format(content.aspectMismatchPercent, 1)}%. ${content.fitLabel} requires deliberate scaling, crop, or letterbox review.` });
    }
    if (content.sourceLarger) {
      warnings.push({ severity: 'info', label: 'SOURCE', text: 'Source raster is larger than the native wall raster, so the processor or playback chain must downscale it. This is not inherently an error.' });
    }
    if (!content.standardNativeRaster) {
      warnings.push({ severity: 'info', label: 'CANVAS', text: 'Native wall raster is nonstandard. Confirm playback, switcher-scaling, graphics-canvas, and IMAG workflows at the exact native resolution.' });
    }
    if (processing.processorPortCount && processing.portsRequired > processing.processorPortCount) {
      warnings.push({ severity: 'bad', label: 'PORTS', text: `${processing.portsRequired} estimated data ports exceed the ${processing.processorPortCount} physical ports entered for the processor.` });
    } else if (processing.portUtilization > 80) {
      warnings.push({ severity: 'bad', label: 'PORTS', text: `Average estimated port loading is ${format(processing.portUtilization, 1)}% of adjusted capacity. Add a port or use a product-specific loading plan.` });
    } else if (processing.portUtilization > 70) {
      warnings.push({ severity: 'warn', label: 'PORTS', text: `Average estimated port loading is ${format(processing.portUtilization, 1)}%. Preserve practical cabinet-chain boundaries and verify the map in the manufacturer software.` });
    }
    if (processing.receiverIncomplete) {
      warnings.push({ severity: 'warn', label: 'RECEIVER', text: 'Enter both receiver-card width and height limits to validate cabinet loading.' });
    } else if (processing.receiverExceeded) {
      warnings.push({ severity: 'bad', label: 'RECEIVER', text: `The ${cabinetPixelsWide} × ${cabinetPixelsHigh} cabinet raster exceeds the entered ${processing.receiverPixelsWide} × ${processing.receiverPixelsHigh} receiver-card limit.` });
    }
    if (viewing.status === 'bad') {
      warnings.push({ severity: 'bad', label: 'VIEWING', text: viewing.message });
    } else if (viewing.status === 'warn') {
      warnings.push({ severity: 'warn', label: 'VIEWING', text: viewing.message });
    }
    if (!warnings.length) {
      warnings.push({ severity: 'info', label: 'CHECK', text: 'No generic planning thresholds are exceeded. Product-specific verification is still required.' });
    }

    renderLedWall({
      mode, productName, pitchMm, rotated, cabinetWidthMm, cabinetHeightMm,
      cabinetPixelsWide, cabinetPixelsHigh, cabinetsWide, cabinetsHigh, cabinetsTotal,
      wallWidthMm, wallHeightMm, wallWidthM, wallHeightM, wallWidthFt, wallHeightFt,
      wallWidthPx, wallHeightPx, totalPixels, aspectRatio, areaM2, areaFt2, diagonalM,
      diagonalFt, pitchDerivedWide, pitchDerivedHigh, targetOutcome, content, processing,
      power, viewing, warnings, enteredRasterProvided, rasterIncomplete,
      impliedPitchWideMm, impliedPitchHighMm
    });

    const ledWall = {
      mode, productName, pitchMm, rotated, cabinetWidthMm, cabinetHeightMm,
      cabinetPixelsWide, cabinetPixelsHigh, cabinetsWide, cabinetsHigh, cabinetsTotal,
      wallWidthMm, wallHeightMm, wallWidthM, wallHeightM, wallWidthFt, wallHeightFt,
      wallWidthPx, wallHeightPx, totalPixels, aspectRatio, areaM2, areaFt2, diagonalM,
      diagonalFt, pitchDerivedWide, pitchDerivedHigh, targetOutcome, content, processing,
      power, viewing, warnings, enteredRasterProvided, rasterIncomplete,
      impliedPitchWideMm, impliedPitchHighMm
    };
    latestLedPower = power;
    latestLedSummary = buildLedSummary(ledWall);
    return ledWall;
  }

  function calculateLedContentFit(ledWall) {
    const sourceWidthPx = numberValue('ledContentWidthPx');
    const sourceHeightPx = numberValue('ledContentHeightPx');
    const sourceAspect = sourceWidthPx / sourceHeightPx;
    const scaleX = ledWall.wallWidthPx / sourceWidthPx;
    const scaleY = ledWall.wallHeightPx / sourceHeightPx;
    const aspectMismatchPercent = Math.abs(ledWall.aspectRatio - sourceAspect) / sourceAspect * 100;
    const fitPolicy = ['contain', 'cover', 'stretch'].includes(state.ledFitPolicy) ? state.ledFitPolicy : 'contain';
    const exactRaster = sourceWidthPx === ledWall.wallWidthPx && sourceHeightPx === ledWall.wallHeightPx;
    const sourceLarger = sourceWidthPx > ledWall.wallWidthPx || sourceHeightPx > ledWall.wallHeightPx;
    const uniformScale = fitPolicy === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
    const activeWidth = fitPolicy === 'stretch' ? ledWall.wallWidthPx : Math.min(ledWall.wallWidthPx, sourceWidthPx * uniformScale);
    const activeHeight = fitPolicy === 'stretch' ? ledWall.wallHeightPx : Math.min(ledWall.wallHeightPx, sourceHeightPx * uniformScale);
    const activePixelUtilization = fitPolicy === 'cover' || fitPolicy === 'stretch'
      ? 100
      : activeWidth * activeHeight / ledWall.totalPixels * 100;
    let fitLabel = exactRaster ? 'Native' : sourceLarger ? 'Downscale' : 'Upscale';
    if (aspectMismatchPercent > 1) {
      fitLabel = fitPolicy === 'cover' ? 'Crop / scale review' : fitPolicy === 'stretch' ? 'Non-uniform scale' : 'Letterbox review';
    }
    const standardNativeRaster = new Set(['1280x720', '1920x1080', '2560x1440', '3840x2160', '7680x4320'])
      .has(`${ledWall.wallWidthPx}x${ledWall.wallHeightPx}`);
    const bitsPerPixel = 3 * numberValue('ledBitDepth');
    const sourceBandwidthGbps = sourceWidthPx * sourceHeightPx * numberValue('ledRefreshHz') * bitsPerPixel / 1e9 / 0.95;
    return {
      sourceWidthPx, sourceHeightPx, sourceAspect, scaleX, scaleY, aspectMismatchPercent,
      fitPolicy, fitLabel, exactRaster, sourceLarger, activePixelUtilization,
      standardNativeRaster, sourceBandwidthGbps
    };
  }

  function calculateLedProcessing(ledWall) {
    const refreshHz = numberValue('ledRefreshHz');
    const bitDepth = numberValue('ledBitDepth');
    const nominalPixelsPerPort = numberValue('ledPortBasePixels');
    const planningUtilization = numberValue('ledPortSafetyPercent') / 100;
    const processorPortCount = optionalNumberValue('ledProcessorPortCount');
    const receiverPixelsWide = optionalNumberValue('ledReceiverPixelsWide');
    const receiverPixelsHigh = optionalNumberValue('ledReceiverPixelsHigh');
    const usablePayload = 0.95;
    const bitsPerPixel = 3 * bitDepth;
    const theoreticalPixelsPerPort = 1_000_000_000 * usablePayload / (refreshHz * bitsPerPixel);
    const adjustedNominalPixelsPerPort = nominalPixelsPerPort * (60 / refreshHz) * (8 / bitDepth);
    const cappedPixelsPerPort = Math.min(theoreticalPixelsPerPort, adjustedNominalPixelsPerPort);
    const safePixelsPerPort = cappedPixelsPerPort * planningUtilization;
    const portsRequired = Math.max(1, Math.ceil(ledWall.totalPixels / safePixelsPerPort));
    const averagePixelsPerPort = ledWall.totalPixels / portsRequired;
    const portUtilization = averagePixelsPerPort / cappedPixelsPerPort * 100;
    const rawPayloadGbps = ledWall.totalPixels * refreshHz * bitsPerPixel / 1e9;
    const plannedPayloadGbps = rawPayloadGbps / usablePayload;
    const receiverIncomplete = Boolean(receiverPixelsWide) !== Boolean(receiverPixelsHigh);
    const receiverExceeded = Boolean(receiverPixelsWide && receiverPixelsHigh) && (
      ledWall.cabinetPixelsWide > receiverPixelsWide || ledWall.cabinetPixelsHigh > receiverPixelsHigh
    );
    return {
      refreshHz, bitDepth, nominalPixelsPerPort, planningUtilization, processorPortCount,
      receiverPixelsWide, receiverPixelsHigh, theoreticalPixelsPerPort,
      adjustedNominalPixelsPerPort, cappedPixelsPerPort, safePixelsPerPort,
      portsRequired, averagePixelsPerPort, portUtilization, rawPayloadGbps,
      plannedPayloadGbps, receiverIncomplete, receiverExceeded
    };
  }

  function calculateLedPower(ledWall) {
    const maxWattsEach = numberValue('ledMaxWattsEach');
    const typicalWattsEach = numberValue('ledTypicalWattsEach');
    const voltage = numberValue('ledVoltage');
    const breakerAmps = numberValue('ledCircuitAmps');
    const continuousFactor = numberValue('ledContinuousPercent') / 100;
    const phaseMode = state.ledPhaseMode === 'threePhase' ? 'threePhase' : 'singlePhase';
    const powerFactor = numberValue('ledPowerFactor');
    const cabinetsPerHomeRun = optionalNumberValue('ledCabinetsPerHomeRun');
    const maxWatts = ledWall.cabinetsTotal * maxWattsEach;
    const typicalWatts = ledWall.cabinetsTotal * typicalWattsEach;
    const usableCircuitAmps = breakerAmps * continuousFactor;
    const ampsFor = watts => phaseMode === 'threePhase'
      ? watts / (Math.sqrt(3) * voltage * powerFactor)
      : watts / voltage;
    const maxAmps = ampsFor(maxWatts);
    const typicalAmps = ampsFor(typicalWatts);
    const maxCircuits = maxWatts > 0 ? Math.max(1, Math.ceil(maxAmps / usableCircuitAmps)) : 0;
    const typicalCircuits = typicalWatts > 0 ? Math.max(1, Math.ceil(typicalAmps / usableCircuitAmps)) : 0;
    const homeRunsRequired = cabinetsPerHomeRun ? Math.ceil(ledWall.cabinetsTotal / cabinetsPerHomeRun) : null;
    return {
      maxWattsEach, typicalWattsEach, voltage, breakerAmps, continuousFactor,
      phaseMode, powerFactor, cabinetsPerHomeRun, maxWatts, typicalWatts,
      maxAmps, typicalAmps, usableCircuitAmps, maxCircuits, typicalCircuits,
      homeRunsRequired, maxPowerDensity: ledWall.areaM2 > 0 ? maxWatts / ledWall.areaM2 : 0
    };
  }

  function calculateLedViewing(pitchMm) {
    const closestDistance = numberValue('ledClosestViewer');
    const closestUnit = state.ledClosestViewerUnit === 'm' ? 'm' : 'ft';
    const minimumM = pitchMm;
    const optimalM = pitchMm * 3;
    const minimumFt = minimumM * 3.28084;
    const optimalFt = optimalM * 3.28084;
    const closestM = closestUnit === 'ft' ? closestDistance * 0.3048 : closestDistance;
    let status = 'good';
    let label = 'At or beyond optimal';
    let message = 'Closest viewing position is at or beyond the optimal rule-of-thumb distance.';
    if (closestM < minimumM) {
      status = 'bad';
      label = 'Inside minimum';
      message = 'Closest viewer is inside the minimum planning distance; individual pixels may be obvious.';
    } else if (closestM < optimalM) {
      status = 'warn';
      label = 'Between minimum and optimal';
      message = 'Closest viewer is between minimum and optimal planning distances; validate with the actual product, content, and sightlines.';
    }
    return { closestDistance, closestUnit, closestM, minimumM, optimalM, minimumFt, optimalFt, status, label, message };
  }

  function renderLedWall(led) {
    const viewerFill = Math.max(4, Math.min(100, led.viewing.closestM / led.viewing.optimalM * 100));
    els.ledWallPreview.style.setProperty('--wall-cols', led.cabinetsWide);
    els.ledWallPreview.style.setProperty('--wall-rows', led.cabinetsHigh);
    els.ledWallPreview.style.setProperty('--wall-ratio', led.wallWidthMm / led.wallHeightMm);
    els.ledWallPreview.setAttribute('aria-label', `${led.cabinetsWide} by ${led.cabinetsHigh} cabinet LED wall preview; ${format(led.wallWidthPx, 0)} by ${format(led.wallHeightPx, 0)} pixel native canvas.`);
    els.ledPreviewRows.textContent = `${led.cabinetsHigh} cabinet${led.cabinetsHigh === 1 ? '' : 's'} high`;
    els.ledPreviewColumns.textContent = `${led.cabinetsWide} cabinet${led.cabinetsWide === 1 ? '' : 's'} wide`;
    els.ledPreviewArray.textContent = `${led.cabinetsWide} × ${led.cabinetsHigh}`;
    els.ledPreviewCanvas.innerHTML = `${format(led.wallWidthPx, 0)} × ${format(led.wallHeightPx, 0)} native canvas<br>${format(led.wallWidthM, 2)} × ${format(led.wallHeightM, 2)} m build`;
    els.ledPreviewPortRail.style.setProperty('--rail-fill', `${Math.min(100, led.processing.portUtilization)}%`);
    els.ledPreviewPort.textContent = `${format(led.processing.portUtilization, 0)}%`;
    els.ledPreviewViewerRail.style.setProperty('--rail-fill', `${viewerFill}%`);
    els.ledPreviewViewer.textContent = led.viewing.status === 'good' ? 'Optimal' : led.viewing.status === 'warn' ? 'Review' : 'Too close';

    els.ledWallDimensions.textContent = `${format(led.wallWidthFt, 2)} × ${format(led.wallHeightFt, 2)} ft`;
    els.ledWallDimensionsMetric.textContent = `${format(led.wallWidthM, 2)} × ${format(led.wallHeightM, 2)} m`;
    els.ledNativeRaster.textContent = `${format(led.wallWidthPx, 0)} × ${format(led.wallHeightPx, 0)} px`;
    els.ledNativeMeta.textContent = `${format(led.totalPixels / 1e6, 2)} MP · ${format(led.aspectRatio, 3)}:1`;
    els.ledContentFit.textContent = led.content.fitLabel;
    els.ledContentMeta.textContent = `${format(led.content.sourceWidthPx, 0)} × ${format(led.content.sourceHeightPx, 0)} source`;
    els.ledProcessing.textContent = `${led.processing.portsRequired} data port${led.processing.portsRequired === 1 ? '' : 's'}`;
    els.ledProcessingMeta.textContent = `${format(led.processing.safePixelsPerPort, 0)} safe px / port estimate`;
    els.ledPower.textContent = `${format(led.power.maxWatts / 1000, 2)} kW max`;
    els.ledPowerMeta.textContent = `${format(led.power.typicalWatts / 1000, 2)} kW typical · ~${format(led.power.typicalAmps, 1)} A est.`;

    els.ledBuildArray.textContent = `${led.cabinetsWide} × ${led.cabinetsHigh} cabinets${led.rotated ? ' · rotated' : ''}`;
    els.ledCabinetCount.textContent = format(led.cabinetsTotal, 0);
    els.ledMetricSize.textContent = `${format(led.wallWidthM, 3)} × ${format(led.wallHeightM, 3)} m`;
    els.ledImperialSize.textContent = `${formatFeetInches(led.wallWidthMm)} × ${formatFeetInches(led.wallHeightMm)}`;
    els.ledArea.textContent = `${format(led.areaM2, 2)} m² · ${format(led.areaFt2, 2)} ft²`;
    els.ledDiagonal.textContent = `${format(led.diagonalM, 2)} m · ${format(led.diagonalFt, 2)} ft`;
    els.ledCabinetRaster.textContent = `${format(led.cabinetPixelsWide, 0)} × ${format(led.cabinetPixelsHigh, 0)} px · ${led.enteredRasterProvided ? 'entered' : 'pitch derived'}`;
    els.ledPitchDerivedRaster.textContent = `${format(led.pitchDerivedWide, 2)} × ${format(led.pitchDerivedHigh, 2)} px`;
    els.ledImpliedPitch.textContent = `${format(led.impliedPitchWideMm, 3)} × ${format(led.impliedPitchHighMm, 3)} mm`;
    els.ledTargetOutcome.textContent = led.targetOutcome;

    els.ledSourceToWall.textContent = `${format(led.content.sourceWidthPx, 0)} × ${format(led.content.sourceHeightPx, 0)} → ${format(led.wallWidthPx, 0)} × ${format(led.wallHeightPx, 0)}`;
    els.ledScaleFactors.textContent = `${format(led.content.scaleX, 3)}× / ${format(led.content.scaleY, 3)}×`;
    els.ledPixelUtilization.textContent = `${format(led.content.activePixelUtilization, 1)}%`;
    els.ledAspectMismatch.textContent = `${format(led.content.aspectMismatchPercent, 2)}%`;
    els.ledSuggestedCanvas.textContent = `${format(led.wallWidthPx, 0)} × ${format(led.wallHeightPx, 0)} px`;
    els.ledSourceBandwidth.textContent = `${format(led.content.sourceBandwidthGbps, 2)} Gbps uncompressed`;
    els.ledContentGuidance.textContent = led.content.exactRaster
      ? 'Source and wall rasters match exactly. Native wall raster remains the first-choice graphics canvas.'
      : `${led.content.fitLabel}: use the native ${format(led.wallWidthPx, 0)} × ${format(led.wallHeightPx, 0)} canvas when possible and confirm the selected fit policy end to end.`;

    els.ledSafePixelsPerPort.textContent = format(led.processing.safePixelsPerPort, 0);
    els.ledAveragePortLoad.textContent = format(led.processing.averagePixelsPerPort, 0);
    els.ledPortUtilization.textContent = `${format(led.processing.portUtilization, 1)}%`;
    els.ledWallPayload.textContent = `${format(led.processing.plannedPayloadGbps, 2)} Gbps planned payload`;
    els.ledProcessorGuidance.textContent = `${led.processing.portsRequired} generic 1 GbE output port(s) at ${format(led.processing.refreshHz, 2)} Hz / ${format(led.processing.bitDepth, 0)} bit. Do not turn this even pixel split into a cable map; allocate complete cabinets and verify the heaviest chain in the actual processor software.`;

    const phaseLabel = led.power.phaseMode === 'threePhase'
      ? `balanced 3-phase, PF ${format(led.power.powerFactor, 2)}`
      : 'single-phase watts ÷ volts estimate';
    els.ledMaxLoad.textContent = `${format(led.power.maxWatts / 1000, 2)} kW · ~${format(led.power.maxAmps, 1)} A estimate`;
    els.ledTypicalLoad.textContent = `${format(led.power.typicalWatts / 1000, 2)} kW · ~${format(led.power.typicalAmps, 1)} A estimate`;
    els.ledCircuitPlan.textContent = `${led.power.maxCircuits} max · ${led.power.typicalCircuits} typical (${format(led.power.breakerAmps, 0)} A)`;
    els.ledHomeRuns.textContent = led.power.homeRunsRequired
      ? `${led.power.homeRunsRequired} product run${led.power.homeRunsRequired === 1 ? '' : 's'} · ${format(led.power.cabinetsPerHomeRun, 0)} cabinets each`
      : 'Not specified';
    els.ledViewingRange.textContent = `${format(led.viewing.minimumFt, 1)}–${format(led.viewing.optimalFt, 1)} ft · ${format(led.viewing.minimumM, 1)}–${format(led.viewing.optimalM, 1)} m`;
    els.ledAudienceCheck.textContent = led.viewing.label;
    els.ledPowerResult.title = `${phaseLabel}; ${format(led.power.maxPowerDensity, 0)} W/m² maximum density`;

    setLedResultState(els.ledContentResult, led.content.exactRaster ? 'good' : led.content.aspectMismatchPercent > 1 ? 'warn' : 'good');
    const processingBad = led.processing.processorPortCount && led.processing.portsRequired > led.processing.processorPortCount;
    setLedResultState(els.ledProcessingResult, processingBad ? 'bad' : led.processing.portUtilization > 70 ? 'warn' : 'good');
    setLedResultState(els.ledPowerResult, '');
    setLedResultState(els.ledWallResult, '');
    setLedResultState(els.ledRasterResult, '');
    renderLedWarnings(led.warnings);
  }

  function setLedResultState(element, status) {
    element.classList.remove('good', 'warn', 'bad');
    if (status) element.classList.add(status);
  }

  function setLedPreviewView(view) {
    const front = view === 'front';
    els.ledWallPreview.parentElement.classList.toggle('front-view', front);
    els.ledPreviewFrontBtn.setAttribute('aria-pressed', String(front));
    els.ledPreviewIsoBtn.setAttribute('aria-pressed', String(!front));
    if (window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (previewMotion) previewMotion.kill();
      const details = [els.ledPreviewRows, els.ledPreviewColumns, els.ledPreviewArray, els.ledPreviewCanvas];
      previewMotion = window.gsap.timeline().fromTo(details,
        { opacity: 0.45, y: 5 },
        { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out', stagger: 0.045, clearProps: 'opacity,transform' });
    }
    announceAction(`LED cabinet map switched to ${front ? 'front' : 'isometric'} view.`, 'success');
  }

  function renderLedWarnings(warnings) {
    els.ledWarnings.replaceChildren(...warnings.map(item => {
      const row = document.createElement('li');
      row.dataset.severity = item.severity;
      row.dataset.label = item.label;
      row.textContent = item.text;
      return row;
    }));
  }

  function formatFeetInches(millimeters) {
    const totalInches = millimeters / 25.4;
    let feet = Math.floor(totalInches / 12);
    let inches = totalInches - feet * 12;
    if (inches >= 11.95) {
      feet += 1;
      inches = 0;
    }
    return `${feet} ft ${format(inches, 1)} in`;
  }

  function buildLedSummary(led) {
    const phaseLabel = led.power.phaseMode === 'threePhase'
      ? `balanced three-phase at PF ${format(led.power.powerFactor, 2)}`
      : 'single-phase watts-divided-by-volts estimate';
    return [
      `LED profile: ${led.productName}; P${format(led.pitchMm, 2)}, ${format(led.cabinetWidthMm, 0)} × ${format(led.cabinetHeightMm, 0)} mm effective cabinet, ${format(led.cabinetPixelsWide, 0)} × ${format(led.cabinetPixelsHigh, 0)} px${led.rotated ? ', rotated 90 degrees' : ''}.`,
      `LED wall: ${led.cabinetsWide} × ${led.cabinetsHigh} cabinets (${led.cabinetsTotal} total), ${format(led.wallWidthM, 2)} × ${format(led.wallHeightM, 2)} m / ${format(led.wallWidthFt, 2)} × ${format(led.wallHeightFt, 2)} ft, ${format(led.wallWidthPx, 0)} × ${format(led.wallHeightPx, 0)} px native raster (${format(led.totalPixels / 1e6, 2)} MP).`,
      `LED content: ${format(led.content.sourceWidthPx, 0)} × ${format(led.content.sourceHeightPx, 0)} source to ${format(led.wallWidthPx, 0)} × ${format(led.wallHeightPx, 0)} native is ${led.content.fitLabel.toLowerCase()}; ${format(led.content.aspectMismatchPercent, 2)} percent aspect difference.`,
      `NovaStar planning estimate: ${led.processing.portsRequired} generic 1 GbE data port(s) at ${format(led.processing.safePixelsPerPort, 0)} safe pixels per port; average adjusted-capacity loading ${format(led.processing.portUtilization, 1)} percent.`,
      `LED power planning estimate: ${format(led.power.maxWatts / 1000, 2)} kW maximum / ${format(led.power.maxAmps, 1)} A and ${format(led.power.typicalWatts / 1000, 2)} kW typical / ${format(led.power.typicalAmps, 1)} A at ${format(led.power.voltage, 0)} V ${phaseLabel}; ${led.power.maxCircuits} maximum-load and ${led.power.typicalCircuits} typical-load ${format(led.power.breakerAmps, 0)} A circuit(s) at a ${format(led.power.continuousFactor * 100, 0)} percent planning target.`,
      `LED viewing estimate: P${format(led.pitchMm, 2)} gives ${format(led.viewing.minimumFt, 1)} ft minimum and ${format(led.viewing.optimalFt, 1)} ft optimal rule-of-thumb distances; closest audience is ${format(led.viewing.closestDistance, 1)} ${led.viewing.closestUnit} (${led.viewing.label.toLowerCase()}).`,
      'LED verification required: confirm cabinet, receiver-card, processor, signal, power, daisy-chain, and venue distribution specifications against actual product documentation.'
    ].join('\n');
  }

  function renderSummary(audio, projection, storageCalc, power, drop, spl) {
    const powerSummary = power.method === 'amps'
      ? power.complete
        ? `Power planning: ${power.count} device(s) at ${format(power.ampsEach, 2)} nameplate A each total ${format(power.ampsEstimate, 2)} A, or ${format(power.percentOfReference, 0)} percent of an 80 percent circuit-rating reference. Include startup or inrush demand and verify the distribution.`
        : 'Power planning: enter the equipment nameplate current. Include startup or inrush demand and verify the distribution before assigning circuits.'
      : power.complete
        ? `Power estimate: ${power.count} device(s) at ${format(power.wattsEach, 0)} W each total ${format(power.totalWatts, 0)} W. Watts ÷ (${format(power.voltage, 0)} V × ${format(power.powerFactor, 2)} PF) estimates ~${format(power.ampsEstimate, 2)} A, or ${format(power.percentOfReference, 0)} percent of an 80 percent circuit-rating reference. Include startup or inrush demand and verify the distribution.`
        : 'Power estimate: enter the manufacturer power factor; the calculator will not silently assume PF 1. Include startup or inrush demand and verify the distribution before assigning circuits.';
    els.summaryOutput.textContent = [
      `Audio delay: ${format(audio.delayMs, 1)} ms for ${format(audio.distanceInput, 1)} ${audio.unit} at ${format(audio.tempF, 0)} F (${format(audio.frames, 2)} frames at ${state.delayFrameRate} fps).`,
      `Projection: ${format(projection.widthFt, 1)} ft wide screen is ${format(projection.heightFt, 2)} ft high, ${format(projection.diagonalIn, 0)} in diagonal. Ideal throw at ${format(projection.throwRatio, 2)}:1 is ${format(projection.idealThrowFt, 1)} ft. Actual distance needs ${format(projection.requiredRatio, 2)}:1.`,
      `Record storage: ${storageCalc.feeds} feed(s) at ${format(storageCalc.bitrate, 0)} Mbps for ${format(storageCalc.hours, 2)} hr needs ${format(storageCalc.totalGb, 1)} GB with ${format(storageCalc.headroom, 0)} percent headroom.`,
      powerSummary,
      `Voltage drop: ${format(drop.amps, 1)} A over ${format(drop.lengthFt, 0)} ft of ${drop.gauge} AWG at ${format(drop.voltage, 0)} V drops ${format(drop.dropV, 2)} V (${format(drop.percent, 1)} percent), ending at ${format(drop.endV, 1)} V.`,
      `SPL distance: ${format(spl.refSpl, 0)} dB at ${format(spl.refDist, 1)} ft is about ${format(spl.splAt, 1)} dB at ${format(spl.targetDist, 0)} ft (${format(spl.loss, 1)} dB loss).`
    ].join('\n');
  }

  function format(value, digits) {
    if (!Number.isFinite(value)) return '0';
    return value.toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  async function copySummary(button) {
    await copyText(button, els.summaryOutput.textContent, 'Summary copied.');
  }

  async function copyLedSummary() {
    await copyText(els.copyLedSummaryBtn, latestLedSummary, 'LED wall summary copied.');
  }

  async function copyText(button, text, successMessage) {
    try {
      await navigator.clipboard.writeText(text);
      announceAction(successMessage, 'success');
      pulse(button, 'success');
    } catch (error) {
      const area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      let copied = false;
      try {
        copied = document.execCommand('copy');
      } catch (copyError) {
        copied = false;
      }
      area.remove();
      announceAction(copied ? successMessage : 'Copy failed.', copied ? 'success' : 'error');
      pulse(button, copied ? 'success' : 'error');
    }
  }

  function downloadSummary() {
    downloadText(els.summaryOutput.textContent, 'av-calculator-summary.txt', 'Summary downloaded.');
  }

  function downloadLedSummary() {
    downloadText(latestLedSummary, 'led-wall-configuration.txt', 'LED wall summary downloaded.');
  }

  function downloadText(text, filename, successMessage) {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 250);
    announceAction(successMessage, 'success');
  }

  function sendLedPowerToPowerLoad(kind) {
    if (!latestLedPower) return;
    const maximum = kind === 'maximum';
    state.powerMethod = 'watts';
    state.deviceAmps = 0;
    state.deviceWatts = maximum ? latestLedPower.maxWatts : latestLedPower.typicalWatts;
    state.powerFactor = 0;
    state.deviceCount = 1;
    state.voltage = latestLedPower.voltage;
    state.circuitAmps = latestLedPower.breakerAmps;
    const saved = saveState(['powerMethod', 'deviceAmps', 'deviceWatts', 'powerFactor', 'deviceCount', 'voltage', 'circuitAmps']);
    if (!saved) {
      announceAction('Browser storage is unavailable. Power Load cannot receive this value.', 'error');
      return;
    }
    const destination = new URL('av-calculator.html', window.location.href);
    destination.search = window.location.search;
    destination.hash = 'powerCard';
    window.location.assign(destination.href);
  }

  function resetValues() {
    activeKeys.forEach(key => { state[key] = DEFAULTS[key]; });
    setFieldValues();
    if (isLedPage) {
      syncLedModeUI();
      syncLedPowerModeUI();
      refreshLedProfileOptions();
    } else {
      syncPowerMethodUI();
    }
    normalizeFields();
    const saved = saveState();
    calculate();
    announceAction(
      saved ? `${isLedPage ? 'LED planner' : 'Quick calculators'} reset. Default values saved in this browser.` : 'Calculator reset. Browser storage is unavailable, so defaults were not saved.',
      saved ? 'success' : 'error'
    );
    pulse(els.resetBtn, 'success');
  }

  function updateStatus(message, type) {
    els.actionStatus.textContent = message;
    els.actionStatus.classList.remove('success', 'error');
    if (type) els.actionStatus.classList.add(type);
  }

  function announceAction(message, type) {
    window.clearTimeout(calculationStatusTimer);
    updateStatus(message, type);
  }

  function queueCalculationStatus(normalizationMessages, saved) {
    window.clearTimeout(calculationStatusTimer);
    const normalization = normalizationMessages.length ? `${normalizationMessages.join(' ')} ` : '';
    const storageMessage = saved
      ? 'Calculations updated and values saved in this browser.'
      : 'Calculations updated. Browser storage is unavailable, so values were not saved.';
    calculationStatusTimer = window.setTimeout(() => {
      updateStatus(`${normalization}${storageMessage}`, saved ? 'success' : 'error');
    }, 250);
  }

  function pulse(element, type) {
    if (!element) return;
    const className = type === 'error' ? 'feedback-error' : 'feedback-success';
    element.classList.remove('feedback-error', 'feedback-success');
    void element.offsetWidth;
    element.classList.add(className);
    window.setTimeout(() => element.classList.remove(className), 220);
  }

  function attachPressFeedback(button) {
    button.addEventListener('pointerdown', () => button.classList.add('is-pressing'));
    ['pointerup', 'pointercancel', 'pointerleave', 'blur'].forEach(eventName => {
      button.addEventListener(eventName, () => button.classList.remove('is-pressing'));
    });
  }

  fields.forEach(field => {
    field.addEventListener('input', readFields);
    field.addEventListener('change', readFields);
  });
  els.resetBtn.addEventListener('click', resetValues);
  if (isLedPage) {
    els.saveLedPresetBtn.addEventListener('click', saveLedPreset);
    els.copyLedSummaryBtn.addEventListener('click', copyLedSummary);
    els.downloadLedSummaryBtn.addEventListener('click', downloadLedSummary);
    els.ledProfileSelect.addEventListener('change', applyLedPreset);
    els.sendLedTypicalPowerBtn.addEventListener('click', () => sendLedPowerToPowerLoad('typical'));
    els.sendLedMaxPowerBtn.addEventListener('click', () => sendLedPowerToPowerLoad('maximum'));
    els.ledPreviewIsoBtn.addEventListener('click', () => setLedPreviewView('isometric'));
    els.ledPreviewFrontBtn.addEventListener('click', () => setLedPreviewView('front'));
    window.addEventListener('pagehide', () => { if (previewMotion) previewMotion.kill(); }, { once: true });
  } else {
    els.copyButtons.forEach(button => button.addEventListener('click', () => copySummary(button)));
    els.downloadSummaryBtn.addEventListener('click', downloadSummary);
  }
  Array.from(document.querySelectorAll('button')).forEach(attachPressFeedback);

  if (!storage.available) {
    els.saveStatus.textContent = 'Storage blocked';
  }
  if (isLedPage) refreshLedProfileOptions();
  setFieldValues();
  if (isLedPage) {
    syncLedModeUI();
    syncLedPowerModeUI();
  } else {
    syncPowerMethodUI();
  }
  const initialNormalizations = normalizeFields();
  const initialSaved = saveState();
  calculate();
  if (!storage.available) {
    updateStatus('Calculators work, but browser storage is unavailable. Values will not persist.', 'error');
  } else if (storageLoadState === 'invalid') {
    updateStatus('Saved calculator data was invalid. Default values were restored, calculated, and saved.', 'error');
  } else if (storageLoadState === 'loaded') {
    const normalization = initialNormalizations.length ? `${initialNormalizations.join(' ')} ` : '';
    updateStatus(`${normalization}Saved calculator values loaded and calculations updated.`, initialNormalizations.length ? 'error' : 'success');
  } else if (storageLoadState === 'migrated') {
    updateStatus('Saved watts were migrated to Watts + Power Factor mode. Enter the manufacturer power factor to calculate current.', 'success');
  } else {
    updateStatus(initialSaved ? 'Default calculator values loaded, calculated, and saved.' : 'Default calculator values loaded and calculated, but storage is unavailable.', initialSaved ? 'success' : 'error');
  }
})();
