/* Frame sync demo (docs/launch/README.md).
   Interactive by default; ?autoplay=1 plays every step (4-6 s each, set with
   &step_s=, order with &order=3,4,1,...); ?capture=1 adds a virtual clock and
   a 9:16 layout for scripts/launch/capture_frame_sync_reel.mjs.
   The screen is a simplified single-display model: each refresh pass scans
   rows top to bottom during the active part of the period, then blanks. */
(function () {
  'use strict';

  var root = document.documentElement;
  var params = new URLSearchParams(location.search);
  var CAPTURE = params.get('capture') === '1';
  var AUTOPLAY_PARAM = CAPTURE || params.get('autoplay') === '1';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cfg = window.SBD_LAUNCH || {};
  var events = window.SBDEvents || { track: function () { return false; }, disable: function () {} };
  if (CAPTURE) {
    events.disable();
    root.classList.add('fs-capture');
    if (params.get('aspect') === '4x5') root.classList.add('fs-capture--4x5');
  }

  var screen = document.getElementById('fs-screen');
  var strip = document.getElementById('fs-strip');
  if (!screen || !strip || !screen.getContext) return;
  root.classList.add('is-enhanced');
  document.body.classList.add('is-enhanced');
  var noscript = document.getElementById('fs-noscript');
  if (noscript) noscript.hidden = true;

  var sctx = screen.getContext('2d');
  var tctx = strip.getContext('2d');
  var stepItems = Array.prototype.slice.call(document.querySelectorAll('#fs-steps li'));
  var progress = Array.prototype.slice.call(document.querySelectorAll('#fs-progress li'));
  var chip = document.getElementById('fs-chip');
  var btnAction = document.getElementById('fs-action');
  var btnPrev = document.getElementById('fs-prev');
  var btnNext = document.getElementById('fs-next');
  var btnPlay = document.getElementById('fs-play');
  var btnAuto = document.getElementById('fs-auto');
  var signup = document.getElementById('fs-signup');
  var kit = document.getElementById('fs-kit');

  var STEP_COUNT = 7;
  var ACTIVE = 0.82;          // share of each refresh period spent scanning
  var FIX_AT = 1.2;           // seconds into step 4 when auto-play applies the fix
  var LOCK_AT = 0.5;          // share of step 6 before auto-play locks to reference
  var STEP_DEFAULT_S = 5;
  var BASE = {
    1: { Td: 2.4, speed: 0.03, paint: 'progressive', span: 2 },
    2: { Td: 1.1, speed: 0.08, paint: 'progressive', span: 3 },
    3: { Td: 0.6, speed: 0.11, paint: 'pass', span: 3, tearY: 0.45 },
    4: { Td: 0.6, speed: 0.11, paint: 'pass', span: 3, tearY: 0.45 },
    5: { Td: 0.5, speed: 0.11, paint: 'pass', span: 3, drift: 1 / 6 },
    6: { Td: 0.5, speed: 0.11, paint: 'pass', span: 3, drift: 1 / 7 },
    7: { Td: 0.6, speed: 0.08, paint: 'pass', span: 3 }
  };
  var ACTIONS = {
    3: { flag: 'tearOn', label: 'Cause the tear', cls: 'fs-btn--break', event: 'tear_triggered' },
    4: { flag: 'fixed', label: 'Apply the fix', cls: '', event: 'fix_applied' },
    6: { flag: 'locked', label: 'Lock everything to reference', cls: '', event: null }
  };

  /* ---------- state ---------- */
  var state = { step: 1, tearOn: false, fixed: false, locked: false };
  var simTime = 0;            // seconds of animation time
  var paused = reduceMotion && !AUTOPLAY_PARAM;
  var autoplay = null;        // { schedule, total, t0, offset }
  var lastShownStep = 0;
  var fired = {};
  var signupShown = false;

  function clampStepSeconds(value) {
    var n = parseFloat(value);
    if (!isFinite(n)) return STEP_DEFAULT_S;
    return Math.min(6, Math.max(4, n));
  }

  function buildSchedule() {
    var order = (params.get('order') || '1,2,3,4,5,6,7').split(',').map(function (v) { return parseInt(v, 10); })
      .filter(function (v) { return v >= 1 && v <= STEP_COUNT; });
    if (!order.length) order = [1, 2, 3, 4, 5, 6, 7];
    var perStep = clampStepSeconds(params.get('step_s'));
    var durations = (params.get('durations') || '').split(',').map(parseFloat);
    var at = 0;
    return order.map(function (step, i) {
      var dur = isFinite(durations[i]) && durations[i] > 0 ? durations[i] : perStep;
      var entry = { step: step, start: at, dur: dur };
      at += dur;
      return entry;
    });
  }

  function scheduleTotal(schedule) {
    var last = schedule[schedule.length - 1];
    return last.start + last.dur;
  }

  // Auto-play state at time t: which step, and which actions have happened.
  function autoplayState(schedule, t) {
    var entry = schedule[schedule.length - 1];
    for (var i = 0; i < schedule.length; i += 1) {
      if (t < schedule[i].start + schedule[i].dur) { entry = schedule[i]; break; }
    }
    var local = Math.max(0, t - entry.start);
    return {
      step: entry.step,
      tearOn: entry.step === 3 || (entry.step === 4 && local < FIX_AT),
      fixed: entry.step === 4 ? local >= FIX_AT : true,
      locked: entry.step === 6 ? local >= entry.dur * LOCK_AT : true,
      local: local
    };
  }

  /* ---------- simulation ---------- */
  function sim(st) {
    var base = BASE[st.step];
    var out = { Td: base.Td, Ts: base.Td, phase: 0, speed: base.speed, paint: base.paint, span: base.span, mode: 'vsync', badge: 'In sync', tone: 'ok', beam: true };
    if ((st.step === 3 && st.tearOn) || (st.step === 4 && !st.fixed)) {
      out.mode = 'free';
      out.phase = base.tearY * ACTIVE * base.Td;
      out.badge = 'Torn';
      out.tone = 'bad';
    } else if (st.step === 5 || (st.step === 6 && !st.locked)) {
      out.mode = 'free';
      out.Ts = base.Td + ACTIVE * base.Td * base.drift;
      out.phase = 0.3 * base.Td;
      out.badge = st.step === 5 ? 'Drifting (sped up)' : 'Free-running';
      out.tone = 'warn';
    } else if (st.step === 4) {
      out.badge = 'Fixed: swaps in the pause';
    } else if (st.step === 6) {
      out.badge = 'Locked to reference';
    }
    if (st.step >= 5) out.beam = false;
    return out;
  }

  function frameAt(tau, s) {
    if (s.mode === 'free') return Math.floor((tau - s.phase) / s.Ts);
    var m = Math.floor((tau - ACTIVE * s.Td) / s.Td);
    var vb = m * s.Td + ACTIVE * s.Td;
    return Math.floor((vb - s.phase) / s.Ts);
  }

  // When row y (0 top .. 1 bottom) was last drawn, as seen at time t.
  function rowTime(t, y, s) {
    if (s.paint === 'progressive') {
      var n = Math.floor((t - y * ACTIVE * s.Td) / s.Td);
      return n * s.Td + y * ACTIVE * s.Td;
    }
    // "pass": show the last complete pass, the way the eye sees a real display.
    var p = Math.floor(t / s.Td);
    var inActive = (t - p * s.Td) < ACTIVE * s.Td;
    var pass = inActive ? p - 1 : p;
    return pass * s.Td + y * ACTIVE * s.Td;
  }

  function frac(x) { return x - Math.floor(x); }

  /* ---------- drawing ---------- */
  function fitCanvas(canvas) {
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    var w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    var h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    return dpr;
  }

  var TONES = { ok: '#58c38b', bad: '#f08d7d', warn: '#f0c36f' };

  function drawPattern(ctx, w, y0, y1, offset) {
    var bars = 5;
    var bw = w * 0.07;
    for (var j = 0; j < bars; j += 1) {
      var x = frac(j / bars + offset) * w;
      ctx.fillStyle = j === 0 ? '#f0a46f' : '#ece6dc';
      ctx.fillRect(x - bw / 2, y0, bw, y1 - y0);
      if (x + bw / 2 > w) ctx.fillRect(x - w - bw / 2, y0, bw, y1 - y0);
      if (x - bw / 2 < 0) ctx.fillRect(x + w - bw / 2, y0, bw, y1 - y0);
    }
  }

  function drawScreen(t, st) {
    var dpr = fitCanvas(screen);
    var w = screen.width;
    var h = screen.height;
    var s = sim(st);
    var ctx = sctx;
    var grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#16202c');
    grad.addColorStop(1, '#0b1118');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    var bands = 160;
    var segments = [];
    for (var i = 0; i < bands; i += 1) {
      var y = (i + 0.5) / bands;
      var k = frameAt(rowTime(t, y, s), s);
      var last = segments[segments.length - 1];
      if (last && last.k === k) last.end = i + 1;
      else segments.push({ k: k, start: i, end: i + 1 });
    }
    segments.forEach(function (seg) {
      drawPattern(ctx, w, Math.floor(seg.start / bands * h), Math.ceil(seg.end / bands * h), frac(seg.k * s.speed));
    });

    // Tear markers: a seam inside one complete pass.
    if (s.paint === 'pass') {
      for (var j = 1; j < segments.length; j += 1) {
        var ty = Math.round(segments[j].start / bands * h);
        ctx.fillStyle = '#ff5a47';
        ctx.fillRect(0, ty - 2 * dpr, 18 * dpr, 4 * dpr);
        ctx.fillRect(w - 18 * dpr, ty - 2 * dpr, 18 * dpr, 4 * dpr);
        ctx.font = '800 ' + Math.round(12 * dpr) + 'px "DM Sans", sans-serif';
        ctx.textBaseline = 'bottom';
        var label = 'TEAR';
        var lw = ctx.measureText(label).width + 10 * dpr;
        ctx.fillStyle = 'rgba(255,90,71,.92)';
        ctx.fillRect(w - 22 * dpr - lw, ty - 20 * dpr, lw, 17 * dpr);
        ctx.fillStyle = '#1d0703';
        ctx.fillText(label, w - 17 * dpr - lw, ty - 4 * dpr);
      }
    }

    // Where the display is drawing now.
    var phaseInPeriod = frac(t / s.Td);
    if (s.beam) {
      if (phaseInPeriod < ACTIVE) {
        var by = phaseInPeriod / ACTIVE * h;
        if (s.paint === 'progressive') {
          ctx.fillStyle = 'rgba(114,184,255,.25)';
          ctx.fillRect(0, by - 6 * dpr, w, 12 * dpr);
          ctx.fillStyle = '#bfe0ff';
          ctx.fillRect(0, by - 1.5 * dpr, w, 3 * dpr);
        } else {
          ctx.fillStyle = '#72b8ff';
          ctx.beginPath();
          ctx.moveTo(0, by - 7 * dpr);
          ctx.lineTo(10 * dpr, by);
          ctx.lineTo(0, by + 7 * dpr);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = 'rgba(114,184,255,.18)';
        ctx.fillRect(0, h - 22 * dpr, w, 22 * dpr);
        ctx.font = '700 ' + Math.round(11 * dpr) + 'px "DM Sans", sans-serif';
        ctx.textBaseline = 'middle';
        var pauseLabel = 'PAUSE (BLANKING)';
        ctx.fillStyle = 'rgba(5,7,10,.85)';
        ctx.fillRect(4 * dpr, h - 20 * dpr, ctx.measureText(pauseLabel).width + 10 * dpr, 18 * dpr);
        ctx.fillStyle = '#bfe0ff';
        ctx.fillText(pauseLabel, 9 * dpr, h - 11 * dpr);
      }
    }

    // State badge.
    ctx.font = '800 ' + Math.round(12 * dpr) + 'px "DM Sans", sans-serif';
    ctx.textBaseline = 'middle';
    var text = s.badge.toUpperCase();
    var tw = ctx.measureText(text).width;
    ctx.fillStyle = 'rgba(5,7,10,.82)';
    ctx.fillRect(8 * dpr, 8 * dpr, tw + 26 * dpr, 22 * dpr);
    ctx.fillStyle = TONES[s.tone];
    ctx.beginPath();
    ctx.arc(17 * dpr, 19 * dpr, 4 * dpr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(text, 26 * dpr, 19.5 * dpr);
    return s;
  }

  function inBlank(time, Td) { return frac(time / Td) >= ACTIVE - 1e-6; }

  function drawStrip(t, st, s) {
    var dpr = fitCanvas(strip);
    var w = strip.width;
    var h = strip.height;
    var ctx = tctx;
    ctx.clearRect(0, 0, w, h);
    var labelW = 62 * dpr;
    var x0 = labelW;
    var x1 = w - 6 * dpr;
    var span = s.span * s.Td;
    var tStart = t - span;
    function X(time) { return x0 + (time - tStart) / span * (x1 - x0); }
    ctx.font = '700 ' + Math.round(9.5 * dpr) + 'px "DM Sans", sans-serif';
    ctx.textBaseline = 'middle';

    if (st.step === 6) {
      var lanes = [['REF', 0, 0], ['CAMERA', 0.03, 0.31], ['MEDIA', -0.02, 0.62], ['LED', 0.045, 0.12]];
      var laneH = h / lanes.length;
      lanes.forEach(function (lane, i) {
        var cy = laneH * (i + 0.5);
        ctx.fillStyle = '#b4ac9f';
        ctx.fillText(lane[0], 6 * dpr, cy);
        var locked = st.locked || i === 0;
        var period = locked ? s.Td : s.Td * (1 + lane[1]);
        var phase = locked ? 0 : lane[2] * s.Td;
        ctx.fillStyle = 'rgba(255,255,255,.06)';
        ctx.fillRect(x0, cy - 0.5 * dpr, x1 - x0, dpr);
        ctx.fillStyle = i === 0 ? '#72b8ff' : (locked ? '#58c38b' : '#f0c36f');
        var kStart = Math.ceil((tStart - phase) / period);
        for (var k = kStart; k * period + phase <= t; k += 1) {
          var x = X(k * period + phase);
          ctx.fillRect(x - 1.5 * dpr, cy - laneH * 0.32, 3 * dpr, laneH * 0.64);
        }
      });
      return;
    }

    var laneTop = h * 0.3;
    var laneBot = h * 0.75;
    ctx.fillStyle = '#b4ac9f';
    ctx.fillText('PASSES', 6 * dpr, laneTop);
    ctx.fillText('SWAPS', 6 * dpr, laneBot);
    // Display passes: scanning (filled) then the pause (gap).
    for (var n = Math.floor(tStart / s.Td) - 1; n * s.Td <= t; n += 1) {
      var a = Math.max(X(n * s.Td), x0);
      var b = Math.min(X(n * s.Td + ACTIVE * s.Td), X(t));
      if (b > a) {
        ctx.fillStyle = 'rgba(114,184,255,.38)';
        ctx.fillRect(a, laneTop - 7 * dpr, b - a, 14 * dpr);
      }
    }
    // Source swaps: green when they land in the pause, red mid-pass.
    var swaps = [];
    if (s.mode === 'free') {
      for (var k2 = Math.ceil((tStart - s.phase) / s.Ts); k2 * s.Ts + s.phase <= t; k2 += 1) swaps.push(k2 * s.Ts + s.phase);
    } else {
      for (var m = Math.floor(tStart / s.Td) - 1; m * s.Td <= t; m += 1) {
        var vb = m * s.Td + ACTIVE * s.Td;
        if (vb >= tStart && vb <= t && frameAt(vb + 1e-6, s) !== frameAt(vb - 1e-6, s)) swaps.push(vb);
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.fillRect(x0, laneBot - 0.5 * dpr, x1 - x0, dpr);
    swaps.forEach(function (time) {
      var x = X(time);
      if (x < x0) return;
      var ok = s.mode === 'vsync' || inBlank(time, s.Td);
      ctx.fillStyle = ok ? '#58c38b' : '#ff5a47';
      ctx.fillRect(x - 1.5 * dpr, laneBot - 9 * dpr, 3 * dpr, 18 * dpr);
      ctx.beginPath();
      ctx.arc(x, laneBot - 9 * dpr, 3.5 * dpr, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /* ---------- UI ---------- */
  function track(name, props) {
    if (CAPTURE) return;
    events.track(name, props || {});
  }

  function showStep(st) {
    if (st.step !== lastShownStep) {
      stepItems.forEach(function (li) { li.classList.toggle('is-current', Number(li.getAttribute('data-step')) === st.step); });
      progress.forEach(function (li, i) {
        li.classList.toggle('is-current', i + 1 === st.step);
        li.classList.toggle('is-done', i + 1 < st.step);
      });
      if (chip) chip.textContent = st.step + ' / ' + STEP_COUNT;
      btnPrev.disabled = st.step === 1;
      btnNext.disabled = st.step === STEP_COUNT;
      lastShownStep = st.step;
      track('step_view', { step: st.step, mode: autoplay ? 'autoplay' : 'interactive' });
      if (st.step === STEP_COUNT && !fired.demo_complete) {
        fired.demo_complete = true;
        track('demo_complete', { mode: autoplay ? 'autoplay' : 'interactive' });
      }
    }
    var action = ACTIONS[st.step];
    if (action && !st[action.flag] && !autoplay) {
      btnAction.hidden = false;
      btnAction.textContent = action.label;
      btnAction.className = 'fs-btn fs-btn--primary ' + action.cls;
    } else {
      btnAction.hidden = true;
    }
    if ((st.step === 4 && st.fixed) || st.step >= 5) revealSignup();
  }

  function revealSignup() {
    if (signupShown || CAPTURE || !signup) return;
    signupShown = true;
    signup.hidden = false;
    var once = function () {
      if (fired.signup_view) return;
      fired.signup_view = true;
      track('signup_view', {});
    };
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) { once(); io.disconnect(); }
      }, { threshold: 0.4 });
      io.observe(signup);
    } else {
      once();
    }
  }

  function render() {
    var st;
    if (autoplay) {
      st = autoplayState(autoplay.schedule, autoplay.t);
      simTime = autoplay.t;
    } else {
      st = state;
    }
    var s = drawScreen(simTime, st);
    drawStrip(simTime, st, s);
    showStep(st);
    if (autoplay) {
      var prev = autoplay.last || {};
      if (st.step === 3 && prev.step !== 3) track('tear_triggered', { source: 'autoplay' });
      if (st.step === 4 && st.fixed && !(prev.step === 4 && prev.fixed)) track('fix_applied', { source: 'autoplay' });
      autoplay.last = st;
    }
    if (CAPTURE) renderOverlays(autoplay ? autoplay.t : 0);
  }

  /* ---------- clock ---------- */
  var lastFrame = 0;
  var rafId = 0;
  function loop(now) {
    rafId = 0;
    var dt = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 0;
    lastFrame = now;
    if (autoplay) {
      autoplay.t = (now - autoplay.t0) / 1000;
      if (autoplay.t >= autoplay.total) { finishAutoplay(); }
    } else if (!paused) {
      simTime += dt;
    }
    render();
    if (autoplay || !paused) rafId = requestAnimationFrame(loop);
  }
  function kick() {
    if (CAPTURE) return;
    if (!rafId) { lastFrame = 0; rafId = requestAnimationFrame(loop); }
  }

  function startAutoplay() {
    var schedule = buildSchedule();
    autoplay = { schedule: schedule, total: scheduleTotal(schedule), t0: performance.now(), t: 0, last: null };
    paused = false;
    syncPlayButton();
    btnAuto.textContent = 'Stop auto-play';
    track('autoplay_started', { order: schedule.map(function (e) { return e.step; }).join('-') });
    kick();
  }

  function stopAutoplay() {
    if (!autoplay) return;
    var at = autoplayState(autoplay.schedule, autoplay.t);
    state = { step: at.step, tearOn: at.tearOn || at.step > 3, fixed: at.fixed, locked: at.locked };
    if (at.step === 4 && !at.fixed) state.fixed = false;
    simTime = autoplay.t;
    autoplay = null;
    btnAuto.textContent = 'Auto-play all steps';
    render();
  }

  function finishAutoplay() {
    autoplay.t = autoplay.total - 1e-3;
    stopAutoplay();
    kick();
  }

  function go(step) {
    stopAutoplay();
    state.step = Math.min(STEP_COUNT, Math.max(1, step));
    if (state.step === 3) state.tearOn = false;
    if (state.step === 4) state.fixed = false;
    if (state.step === 6) state.locked = false;
    render();
    kick();
  }

  function syncPlayButton() {
    btnPlay.textContent = paused ? 'Play motion' : 'Pause motion';
    btnPlay.setAttribute('aria-pressed', paused ? 'true' : 'false');
  }

  btnPrev.addEventListener('click', function () { go(lastShownStep - 1); });
  btnNext.addEventListener('click', function () { go(lastShownStep + 1); });
  btnAction.addEventListener('click', function () {
    var action = ACTIONS[state.step];
    if (!action) return;
    state[action.flag] = true;
    if (action.event) track(action.event, { source: 'user' });
    render();
    kick();
    btnNext.focus();
  });
  btnPlay.addEventListener('click', function () {
    if (autoplay) stopAutoplay();
    paused = !paused;
    syncPlayButton();
    render();
    kick();
  });
  btnAuto.addEventListener('click', function () {
    if (autoplay) { stopAutoplay(); return; }
    startAutoplay();
  });

  /* ---------- signup, kit, affiliate ---------- */
  (function setupSignup() {
    var email = cfg.email || {};
    var form = document.getElementById('fs-signup-form');
    var fallback = document.getElementById('fs-signup-fallback');
    var mailto = document.getElementById('fs-mailto');
    var status = document.getElementById('fs-signup-status');
    var address = email.fallbackMailto || 'avbydave@gmail.com';
    if (mailto) {
      mailto.href = 'mailto:' + address + '?subject=' + encodeURIComponent('Next demo, please') +
        '&body=' + encodeURIComponent('Send me the next AV by Dave demo when it is ready.');
      mailto.addEventListener('click', function () { track('signup_submit', { method: 'mailto' }); });
    }
    var endpoint = typeof email.endpoint === 'string' && /^https:\/\//.test(email.endpoint) ? email.endpoint : '';
    if (!endpoint || !form) return;
    // A provider is configured: show the real form. Submitting never blocks the demo.
    form.hidden = false;
    if (fallback) fallback.hidden = true;
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var input = document.getElementById('fs-email');
      if (!input.value || !input.checkValidity()) { status.textContent = 'Enter an email address.'; input.focus(); return; }
      track('signup_submit', { method: email.provider || 'form' });
      status.textContent = 'Sending…';
      fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (res) { status.textContent = res.ok ? 'Thanks. Check your inbox to confirm.' : 'That didn\u2019t go through. Try again later.'; })
        .catch(function () { status.textContent = 'That didn\u2019t go through. Try again later.'; });
    });
  })();

  (function setupKit() {
    var url = cfg.fieldKit && typeof cfg.fieldKit.url === 'string' ? cfg.fieldKit.url : '';
    if (!kit || !url || CAPTURE) return;
    var link = document.getElementById('fs-kit-link');
    link.href = url;
    kit.hidden = false;
    link.addEventListener('click', function () { track('kit_click', { placement: 'demo' }); });
  })();

  // Affiliate links must be for gear shown on the page and carry a disclosure.
  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a[data-affiliate]');
    if (link) track('affiliate_click', { id: link.getAttribute('data-affiliate') });
  });

  /* ---------- capture API (local reel runner only) ---------- */
  var overlays = [];
  var ovEls = {};
  Array.prototype.forEach.call(document.querySelectorAll('[data-ov]'), function (el) { ovEls[el.getAttribute('data-ov')] = el; });
  function renderOverlays(t) {
    ['top', 'bottom', 'end'].forEach(function (slot) {
      var el = ovEls[slot];
      if (!el) return;
      var item = null;
      for (var i = 0; i < overlays.length; i += 1) {
        var o = overlays[i];
        if (o.slot === slot && t >= o.from && t < o.to) { item = o; break; }
      }
      var key = item ? JSON.stringify(item) : '';
      if (el.getAttribute('data-key') === key) return;
      el.setAttribute('data-key', key);
      el.hidden = !item;
      el.textContent = '';
      if (!item) return;
      if (slot === 'end') {
        ['strong', 'span', 'small'].forEach(function (tag, n) {
          var text = [item.title, item.text, item.sub][n];
          if (!text) return;
          var node = document.createElement(tag);
          node.textContent = text;
          el.appendChild(node);
        });
      } else {
        el.textContent = item.text;
      }
    });
  }

  if (CAPTURE) {
    var captureSchedule = buildSchedule();
    autoplay = { schedule: captureSchedule, total: scheduleTotal(captureSchedule), t0: 0, t: 0, last: null };
    window.FrameSync = {
      schedule: captureSchedule,
      total: autoplay.total,
      setOverlays: function (list) { overlays = Array.isArray(list) ? list : []; },
      seek: function (t) { autoplay.t = Math.max(0, t); render(); return autoplayState(captureSchedule, autoplay.t); },
      stateAt: function (t) { return autoplayState(captureSchedule, t); }
    };
    render();
    return;
  }

  track('page_view', { mode: AUTOPLAY_PARAM ? 'autoplay' : 'interactive' });
  syncPlayButton();
  if (AUTOPLAY_PARAM) startAutoplay();
  else { render(); kick(); }
  window.addEventListener('resize', function () { render(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
})();
