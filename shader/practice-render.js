(function (root) {
  'use strict';

  // Canvas drawing for the Shader practice console. It draws only analyses the
  // deterministic engine produced; it never samples real video. Scope glass is
  // dark in every theme, so these colors are fixed.

  const BUILD = 'v20260923-shader-practice-console';
  const GLASS = Object.freeze({
    background: '#04080c',
    minor: 'rgba(157, 162, 167, 0.12)',
    major: 'rgba(157, 162, 167, 0.34)',
    label: '#9da2a7',
    strong: '#e2e4e7',
    clip: '#ee2e2a'
  });
  // First series (reference / before) is a grey ghost; second (target / after)
  // is phosphor green. Parade channels keep their channel colors.
  const SERIES = Object.freeze([Object.freeze([157, 162, 167]), Object.freeze([184, 230, 180])]);
  const CHANNELS = Object.freeze({ r: Object.freeze([242, 102, 92]), g: Object.freeze([95, 211, 107]), b: Object.freeze([110, 168, 255]) });
  const PICTURE_ASPECT = 16 / 9;
  const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

  // 75% color-bar positions computed with the engine's own chroma formula.
  const VECTOR_TARGETS = Object.freeze([
    ['R', [0.75, 0, 0]], ['YL', [0.75, 0.75, 0]], ['G', [0, 0.75, 0]],
    ['CY', [0, 0.75, 0.75]], ['B', [0, 0, 0.75]], ['MG', [0.75, 0, 0.75]]
  ].map(([name, rgb]) => {
    const y = rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114;
    const clampChroma = value => Math.max(-0.5, Math.min(0.5, value));
    return Object.freeze({ name, u: clampChroma((rgb[2] - y) * 0.565), v: clampChroma((rgb[0] - y) * 0.713) });
  }));

  const rgba = (rgb, alpha) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
  const luma = rgb => Math.min(1, Math.max(0, rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114));
  const pct = value => Math.round(value * 100);

  let support = null;
  function canvasAvailable() {
    if (support !== null) return support;
    try {
      const probe = document.createElement('canvas');
      support = Boolean(probe.getContext && probe.getContext('2d'));
    } catch (error) {
      support = false;
    }
    return support;
  }

  // Match the backing store to the element box and device pixel ratio.
  function prepare(canvas) {
    if (!canvas || !canvasAvailable()) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return null;
    const ratio = Math.min(2, root.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    let ctx = null;
    try { ctx = canvas.getContext('2d'); } catch (error) { ctx = null; }
    if (!ctx) return null;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    return { ctx, width, height, ratio };
  }

  const images = new WeakMap();
  function frameImage(analysis) {
    if (images.has(analysis)) return images.get(analysis);
    const off = document.createElement('canvas');
    off.width = analysis.width;
    off.height = analysis.height;
    const octx = off.getContext('2d');
    const image = octx.createImageData(analysis.width, analysis.height);
    const data = image.data;
    analysis.samples.forEach((rgb, index) => {
      const offset = index * 4;
      data[offset] = Math.round(rgb[0] * 255);
      data[offset + 1] = Math.round(rgb[1] * 255);
      data[offset + 2] = Math.round(rgb[2] * 255);
      data[offset + 3] = 255;
    });
    octx.putImageData(image, 0, 0);
    images.set(analysis, off);
    return off;
  }

  // Letterbox or pillarbox a 16:9 picture inside any monitor box.
  function pictureRect(width, height) {
    let w = width;
    let h = width / PICTURE_ASPECT;
    if (h > height) {
      h = height;
      w = height * PICTURE_ASPECT;
    }
    return { x: (width - w) / 2, y: (height - h) / 2, w, h };
  }

  function frameMarks(ctx, rect, ratio) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = Math.max(1, ratio);
    ctx.strokeRect(rect.x + rect.w * 0.05, rect.y + rect.h * 0.05, rect.w * 0.9, rect.h * 0.9);
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const arm = 7 * ratio;
    ctx.beginPath();
    ctx.moveTo(cx - arm, cy); ctx.lineTo(cx + arm, cy);
    ctx.moveTo(cx, cy - arm); ctx.lineTo(cx, cy + arm);
    ctx.stroke();
    ctx.restore();
  }

  function drawPicture(canvas, analysis) {
    const surface = prepare(canvas);
    if (!surface || !analysis) return false;
    const { ctx, width, height, ratio } = surface;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    const rect = pictureRect(width, height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(frameImage(analysis), rect.x, rect.y, rect.w, rect.h);
    frameMarks(ctx, rect, ratio);
    return true;
  }

  function drawWipe(canvas, left, right, position) {
    const surface = prepare(canvas);
    if (!surface || !left || !right) return false;
    const { ctx, width, height, ratio } = surface;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    const rect = pictureRect(width, height);
    const split = rect.x + rect.w * Math.min(0.95, Math.max(0.05, position));
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    [[left, rect.x, split - rect.x], [right, split, rect.x + rect.w - split]].forEach(([analysis, x, w]) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, rect.y, w, rect.h);
      ctx.clip();
      ctx.drawImage(frameImage(analysis), rect.x, rect.y, rect.w, rect.h);
      ctx.restore();
    });
    frameMarks(ctx, rect, ratio);
    ctx.save();
    ctx.fillStyle = 'rgba(4, 8, 12, 0.85)';
    ctx.fillRect(split - 2 * ratio, rect.y, 4 * ratio, rect.h);
    ctx.fillStyle = GLASS.strong;
    ctx.fillRect(split - ratio, rect.y, 2 * ratio, rect.h);
    ctx.beginPath();
    ctx.arc(split, rect.y + rect.h / 2, 9 * ratio, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(4, 8, 12, 0.9)';
    ctx.fill();
    ctx.lineWidth = 2 * ratio;
    ctx.strokeStyle = GLASS.strong;
    ctx.stroke();
    ctx.restore();
    return true;
  }

  // ---------- scope helpers ----------

  function text(ctx, value, x, y, ratio, options = {}) {
    ctx.font = `${options.weight || 500} ${(options.size || 12) * ratio}px ${MONO}`;
    ctx.textAlign = options.align || 'left';
    ctx.textBaseline = options.baseline || 'middle';
    if (options.box) {
      // A backing plate keeps labels legible where they cross a trace.
      const width = ctx.measureText(value).width;
      const pad = 3 * ratio;
      const left = ctx.textAlign === 'right' ? x - width : ctx.textAlign === 'center' ? x - width / 2 : x;
      ctx.fillStyle = 'rgba(4, 8, 12, 0.82)';
      ctx.fillRect(left - pad, y - 8 * ratio, width + pad * 2, 16 * ratio);
    }
    ctx.fillStyle = options.color || GLASS.label;
    ctx.fillText(value, x, y);
  }

  function hLine(ctx, x, y, w, ratio, color, dash) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, ratio);
    if (dash) ctx.setLineDash(dash.map(value => value * ratio));
    ctx.beginPath();
    ctx.moveTo(x, Math.round(y) + 0.5);
    ctx.lineTo(x + w, Math.round(y) + 0.5);
    ctx.stroke();
    ctx.restore();
  }

  function clear(ctx, width, height) {
    ctx.fillStyle = GLASS.background;
    ctx.fillRect(0, 0, width, height);
  }

  function box(width, height, ratio, margins) {
    const left = margins[3] * ratio;
    const top = margins[0] * ratio;
    return { x: left, y: top, w: Math.max(10, width - left - margins[1] * ratio), h: Math.max(10, height - top - margins[2] * ratio) };
  }

  const levelY = (area, value) => area.y + area.h - Math.min(1, Math.max(0, value)) * area.h;

  // 0–100 generated scale: minor lines every 10, labelled majors.
  function levelGraticule(ctx, area, ratio, withLabels) {
    const compact = area.h < 90 * ratio;
    for (let level = 0; level <= 100; level += 10) hLine(ctx, area.x, levelY(area, level / 100), area.w, ratio, GLASS.minor);
    (compact ? [0, 50, 100] : [0, 25, 50, 75, 100]).forEach(level => {
      const y = levelY(area, level / 100);
      hLine(ctx, area.x, y, area.w, ratio, GLASS.major);
      if (withLabels) text(ctx, String(level), area.x - 6 * ratio, y, ratio, { align: 'right' });
    });
  }

  // Reference targets and the clip line, drawn over the graticule.
  function levelMarkers(ctx, area, ratio, options) {
    hLine(ctx, area.x, levelY(area, 1), area.w, ratio, GLASS.clip, [5, 4]);
    const markers = [];
    if (options.targets) {
      if (Number.isFinite(options.targets.peak)) markers.push({ value: options.targets.peak, label: `${options.targets.label} PEAK ${pct(options.targets.peak)}` });
      if (Number.isFinite(options.targets.black)) markers.push({ value: options.targets.black, label: `${options.targets.label} BLACK ${pct(options.targets.black)}` });
    }
    let lastY = -Infinity;
    markers.forEach(marker => {
      const y = levelY(area, marker.value);
      hLine(ctx, area.x, y, area.w, ratio, 'rgba(226, 228, 231, 0.7)', [2, 3]);
      const labelY = marker.value > 0.9 ? y + 9 * ratio : y - 9 * ratio;
      if (Math.abs(labelY - lastY) > 14 * ratio) {
        text(ctx, marker.label, area.x + area.w - 6 * ratio, labelY, ratio, { align: 'right', color: GLASS.strong, box: true });
        lastY = labelY;
      }
    });
    if (options.clipText) text(ctx, options.clipText, area.x + 6 * ratio, levelY(area, 1) + 10 * ratio, ratio, { color: GLASS.clip, weight: 700, box: true });
  }

  // Plot every generated sample at its column. Additive blending lets dense
  // levels glow brighter, the way a phosphor trace accumulates.
  function plotLevels(ctx, area, analysis, rgb, alpha, ratio, valueOf, additive) {
    const columns = analysis.width;
    const columnWidth = area.w / columns;
    const dot = Math.max(1.5 * ratio, Math.min(5 * ratio, area.h / 150));
    ctx.save();
    ctx.globalCompositeOperation = additive ? 'lighter' : 'source-over';
    ctx.fillStyle = rgba(rgb, alpha);
    const samples = analysis.samples;
    for (let index = 0; index < samples.length; index += 1) {
      const column = index % columns;
      const y = levelY(area, valueOf(samples[index]));
      ctx.fillRect(area.x + column * columnWidth, y - dot / 2, Math.max(dot, columnWidth + 0.5), dot);
    }
    ctx.restore();
  }

  // ---------- the four scopes ----------

  function drawWaveform(surface, data) {
    const { ctx, width, height, ratio } = surface;
    const area = box(width, height, ratio, [12, 10, 12, 34]);
    levelGraticule(ctx, area, ratio, true);
    // The grey ghost is laid down plainly; the target glows on top of it.
    data.series.forEach(series => plotLevels(ctx, area, series.analysis, SERIES[series.slot], series.slot ? 0.3 : 0.22, ratio, luma, Boolean(series.slot)));
    levelMarkers(ctx, area, ratio, data);
  }

  function drawParade(surface, data) {
    const { ctx, width, height, ratio } = surface;
    const outer = box(width, height, ratio, [16, 8, 12, 34]);
    const gap = 8 * ratio;
    const sectionWidth = (outer.w - gap * 2) / 3;
    ['r', 'g', 'b'].forEach((channel, channelIndex) => {
      const area = { x: outer.x + channelIndex * (sectionWidth + gap), y: outer.y, w: sectionWidth, h: outer.h };
      levelGraticule(ctx, area, ratio, channelIndex === 0);
      data.series.forEach(series => {
        const color = series.slot ? CHANNELS[channel] : SERIES[0];
        plotLevels(ctx, area, series.analysis, color, series.slot ? 0.34 : 0.22, ratio, rgb => rgb[channelIndex], Boolean(series.slot));
      });
      hLine(ctx, area.x, levelY(area, 1), area.w, ratio, GLASS.clip, [5, 4]);
      text(ctx, channel.toUpperCase(), area.x + 4 * ratio, area.y - 8 * ratio, ratio, { color: rgba(CHANNELS[channel], 1), weight: 700 });
    });
    if (data.clipText) text(ctx, data.clipText, outer.x + outer.w, outer.y - 8 * ratio, ratio, { align: 'right', color: GLASS.clip, weight: 700 });
  }

  function hueVector(metrics) {
    const du = metrics.rgbMean[2] - metrics.mean;
    const dv = metrics.rgbMean[0] - metrics.mean;
    return Math.hypot(du, dv) < 1e-6 ? null : Math.atan2(dv, du);
  }

  function drawVectorscope(surface, data) {
    const { ctx, width, height, ratio } = surface;
    const size = Math.max(40 * ratio, Math.min(width, height) - 28 * ratio);
    const cx = width / 2;
    const cy = height / 2;
    const radius = size / 2;
    const scale = (radius * 0.95) / 0.5;
    ctx.save();
    ctx.lineWidth = Math.max(1, ratio);
    [0.25, 0.5, 0.75, 1].forEach(fraction => {
      ctx.strokeStyle = fraction === 1 ? GLASS.major : GLASS.minor;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.95 * fraction, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.strokeStyle = GLASS.minor;
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy); ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy + radius);
    ctx.stroke();
    ctx.strokeStyle = GLASS.major;
    VECTOR_TARGETS.forEach(target => {
      const x = cx + target.u * scale;
      const y = cy - target.v * scale;
      const half = 6 * ratio;
      ctx.strokeRect(x - half, y - half, half * 2, half * 2);
      const angle = Math.atan2(-(y - cy), x - cx);
      text(ctx, target.name, x + Math.cos(angle) * 18 * ratio, y - Math.sin(angle) * 18 * ratio, ratio, { align: 'center', color: GLASS.label, weight: 600 });
    });
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    data.series.forEach(series => {
      ctx.fillStyle = rgba(SERIES[series.slot], series.slot ? 0.55 : 0.35);
      const dot = 2 * ratio;
      series.analysis.vectorscope.forEach(point => ctx.fillRect(cx + point.u * scale - dot / 2, cy - point.v * scale - dot / 2, dot, dot));
    });
    ctx.restore();
    // Average hue direction: the quantity the phase objective compares.
    data.series.forEach(series => {
      const angle = hueVector(series.metrics);
      if (angle === null) return;
      const length = radius * 0.88;
      const x = cx + Math.cos(angle) * length;
      const y = cy - Math.sin(angle) * length;
      ctx.save();
      ctx.strokeStyle = rgba(SERIES[series.slot], 0.95);
      ctx.lineWidth = 2 * ratio;
      if (!series.slot) ctx.setLineDash([5 * ratio, 4 * ratio]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.restore();
    });
    if (data.hueText) text(ctx, data.hueText, 8 * ratio, 12 * ratio, ratio, { color: GLASS.strong, weight: 600, box: true });
    text(ctx, '75% TARGETS', width - 8 * ratio, 12 * ratio, ratio, { align: 'right' });
  }

  function drawHistogram(surface, data) {
    const { ctx, width, height, ratio } = surface;
    const area = box(width, height, ratio, [20, 12, 24, 12]);
    [0, 25, 50, 75, 100].forEach(level => {
      const x = area.x + (level / 100) * area.w;
      ctx.save();
      ctx.strokeStyle = level % 50 === 0 ? GLASS.major : GLASS.minor;
      ctx.lineWidth = Math.max(1, ratio);
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, area.y);
      ctx.lineTo(Math.round(x) + 0.5, area.y + area.h);
      ctx.stroke();
      ctx.restore();
      text(ctx, String(level), x, area.y + area.h + 12 * ratio, ratio, { align: level === 0 ? 'left' : level === 100 ? 'right' : 'center' });
    });
    hLine(ctx, area.x, area.y + area.h, area.w, ratio, GLASS.major);
    const binWidth = area.w / 64;
    data.series.forEach(series => {
      const rgb = SERIES[series.slot];
      ctx.beginPath();
      ctx.moveTo(area.x, area.y + area.h);
      series.analysis.histogram.forEach((value, bin) => {
        const y = area.y + area.h - value * area.h * 0.92;
        ctx.lineTo(area.x + bin * binWidth, y);
        ctx.lineTo(area.x + (bin + 1) * binWidth, y);
      });
      ctx.lineTo(area.x + area.w, area.y + area.h);
      ctx.closePath();
      ctx.fillStyle = rgba(rgb, series.slot ? 0.34 : 0.2);
      ctx.fill();
      ctx.strokeStyle = rgba(rgb, 0.9);
      ctx.lineWidth = Math.max(1, ratio);
      ctx.stroke();
    });
    if (data.clipText) {
      ctx.fillStyle = 'rgba(238, 46, 42, 0.28)';
      ctx.fillRect(area.x + area.w - binWidth, area.y, binWidth, area.h);
      text(ctx, data.clipText, area.x + area.w, area.y - 10 * ratio, ratio, { align: 'right', color: GLASS.clip, weight: 700 });
    }
    if (data.crushText) {
      ctx.fillStyle = 'rgba(238, 46, 42, 0.28)';
      ctx.fillRect(area.x, area.y, binWidth, area.h);
      text(ctx, data.crushText, area.x, area.y - 10 * ratio, ratio, { color: GLASS.clip, weight: 700 });
    }
  }

  const DRAW = Object.freeze({ waveform: drawWaveform, parade: drawParade, vectorscope: drawVectorscope, histogram: drawHistogram });

  function drawScope(canvas, kind, data) {
    const surface = prepare(canvas);
    if (!surface || !DRAW[kind] || !data || !data.series.length) return false;
    clear(surface.ctx, surface.width, surface.height);
    DRAW[kind](surface, data);
    return true;
  }

  root.ShaderPracticeRender = Object.freeze({
    BUILD, canvasAvailable, drawPicture, drawWipe, drawScope, pictureRect, VECTOR_TARGETS, SERIES, CHANNELS
  });
})(typeof window !== 'undefined' ? window : this);
