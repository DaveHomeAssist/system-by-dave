// Every-state layout checker for a House Reference demo page.
// Inject into the running page (or run under Playwright). It drives every step, every control
// combination and a long soak, sampling the layout every `every` ms, and reports:
//   overlaps  : two visible text runs whose glyph boxes intersect
//   outside   : a visible text run outside the 1080x1920 stage
//   screenOut : text inside #screen that leaks past the screen's own box
//   console   : page errors seen during the run
// Usage in a page: const r = await runStateCheck({ every: 100, perState: 3000, soak: 60000 });

window.runStateCheck = async function runStateCheck(opts = {}) {
  const every = opts.every ?? 100, perState = opts.perState ?? 3000, soak = opts.soak ?? 60000;
  const $ = id => document.getElementById(id);
  const fit = $('fit');
  const findings = { overlaps: [], outside: [], screenOut: [], errors: [], samples: 0, states: [], hiddenSamples: 0, framesSeen: 0 };
  const framesSeen = new Set();
  const seen = new Set();
  window.addEventListener('error', e => findings.errors.push(e.message));

  const visible = el => {
    let n = el;
    while (n && n !== document.body) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.08) return false;
      n = n.parentElement;
    }
    return true;
  };
  // text runs: elements whose own direct text is non-empty
  const textRuns = () => [...fit.querySelectorAll('*')].filter(el => {
    if (!visible(el)) return false;
    return [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
  });
  const box = el => {
    // measure the glyphs, not the container: a flex-centred box is far wider than its text
    const range = document.createRange(); let r = null;
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { range.selectNodeContents(n); const rr = range.getBoundingClientRect(); r = r ? { left: Math.min(r.left, rr.left), top: Math.min(r.top, rr.top), right: Math.max(r.right, rr.right), bottom: Math.max(r.bottom, rr.bottom) } : { left: rr.left, top: rr.top, right: rr.right, bottom: rr.bottom }; }
    const fs = parseFloat(getComputedStyle(el).fontSize), ins = fs * 0.14;
    return { el, t: el.textContent.trim().slice(0, 24), x: r.left, y: r.top + ins, r: r.right, b: r.bottom - ins };
  };
  const inScreen = el => $('screen').contains(el);
  const isTile = el => el.classList.contains('frame');
  const key = (a, b) => [a.t, b.t].sort().join(' | ');

  function sample(state) {
    findings.samples++;
    if (document.visibilityState !== 'visible') findings.hiddenSamples++;
    for (const f of document.querySelectorAll('#machine .frame')) framesSeen.add(state + ':' + f.textContent);
    const fr = fit.getBoundingClientRect();
    const scr = $('screen').getBoundingClientRect();
    const runs = textRuns().map(box);
    for (const p of runs) {
      if (p.x < fr.left - 1 || p.r > fr.right + 1 || p.y < fr.top - 1 || p.b > fr.bottom + 1) {
        const k = 'out:' + p.t + ':' + state; if (!seen.has(k)) { seen.add(k); findings.outside.push({ state, text: p.t }); }
      }
      if (inScreen(p.el) && (p.x < scr.left - 1 || p.r > scr.right + 1)) {
        const k = 'scr:' + p.t + ':' + state; if (!seen.has(k)) { seen.add(k); findings.screenOut.push({ state, text: p.t, width: Math.round(p.r - p.x), screen: Math.round(scr.width) }); }
      }
    }
    for (let i = 0; i < runs.length; i++) for (let j = i + 1; j < runs.length; j++) {
      const p = runs[i], q = runs[j];
      if (p.el.contains(q.el) || q.el.contains(p.el)) continue;
      // a frame tile landing on the screen covers it on purpose; tiles passing the screen label too
      if ((isTile(p.el) && inScreen(q.el)) || (isTile(q.el) && inScreen(p.el))) continue;
      // the tear halves are the same number split on purpose
      if (inScreen(p.el) && inScreen(q.el)) continue;
      const w = Math.min(p.r, q.r) - Math.max(p.x, q.x), h = Math.min(p.b, q.b) - Math.max(p.y, q.y);
      if (w > 1 && h > 1) {
        const k = key(p, q) + ':' + state; if (!seen.has(k)) { seen.add(k); findings.overlaps.push({ state, a: p.t, b: q.t, px: Math.round(Math.min(w, h)) }); }
      }
    }
  }
  // with the page's manual clock (?drive), time is advanced exactly; otherwise fall back to real time
  const driven = !!window.hr;
  const wait = ms => driven ? window.hr.advance(ms) : new Promise(r => setTimeout(r, ms));
  async function hold(state, ms) {
    findings.states.push(state);
    if (driven) { for (let e = 0; e < ms; e += every) { sample(state); window.hr.advance(every); } return; }
    const end = performance.now() + ms;
    while (performance.now() < end) { sample(state); await wait(every); }
  }
  // advance the story the way a viewer does (the NEXT button), and prove the step label changed;
  // a page whose handler is missing must fail here, not pass by sitting on step 1 for the whole sweep
  findings.stuckSteps = [];
  const step = () => {
    const before = $('stepNum').textContent;
    const next = $('next'); if (next && !next.disabled && getComputedStyle(next).display !== 'none') next.click();
    else dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    if ($('stepNum').textContent === before) findings.stuckSteps.push(before);
  };

  // 0. observe-only mode: the page is already running a cut (?auto=...); just watch it for `observe` ms
  if (opts.observe) {
    const labels = new Set(); let tearAt = null; const labelTimes = {}; let last = null;
    const end = opts.observe; for (let e = 0; e < end; e += every) {
      sample('auto'); const lab = $('stepNum').textContent; labels.add(lab);
      if (lab !== last) { labelTimes[lab] = e; last = lab; }
      if (tearAt === null && $('tear') && parseFloat(getComputedStyle($('tear')).opacity) > 0.5) tearAt = e;
      await wait(every);
    }
    findings.labels = [...labels]; findings.labelTimes = labelTimes; findings.tearAtMs = tearAt; findings.framesSeen = framesSeen.size; findings.driven = driven;
    findings.done = !!(window.hr && window.hr.done); findings.finalText = $('stepText').textContent;
    return findings;
  }
  // 1. every story step
  for (let i = 1; i <= 7; i++) { if (i > 1) step(); await hold('step ' + i, perState); }
  // 2. free play, generic: press every control in #play one at a time, set every slider to min/mid/max,
  //    then soak with random presses so long-running states and counters get exercised
  const controls = [...document.querySelectorAll('#play button')].filter(b => !/restart|reload/i.test(b.textContent));
  const sliders = [...document.querySelectorAll('#play input[type=range]')];
  for (const b of controls) { b.click(); await hold('press ' + b.textContent.trim().toLowerCase(), perState); }
  for (const r of sliders) for (const v of [r.min, (parseFloat(r.min) + parseFloat(r.max)) / 2, r.max]) { r.value = v; r.dispatchEvent(new Event('input')); await hold('slider ' + v, perState); }
  // 3. soak: random control presses every 1.5 s
  const endSoak = soak; let elapsed = 0;
  while (elapsed < endSoak) {
    const b = controls[Math.floor(Math.random() * controls.length)]; if (b) b.click();
    await hold('soak', 1500); elapsed += 1500;
  }
  findings.framesSeen = framesSeen.size;
  findings.driven = driven;
  // a driven run advances an exact clock and cannot stall; a real-time run is invalid if the tab was hidden
  findings.stalled = !driven && findings.hiddenSamples > 0;
  findings.stuck = findings.stuckSteps.length > 0;
  return findings;
};
