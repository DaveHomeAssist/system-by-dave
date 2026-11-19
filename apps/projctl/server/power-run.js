import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { LANES } from '../public/lanes.js';

// The all-four power run. One run lives in the relay and every page reads the same state, so a
// second press from any page shows the run in progress instead of starting another. The run
// sends at most one power command to each projector, in a fixed order, and reads each unit before
// commanding it. It ends with one banner, and only when every lane's own reply supports it.
//
// Order and waits follow the manuals as gathered for the rig. They are untested on a rig here.
//   on:  C, B, A, D     off: A, D, B, C  (lamp units first, so their cooling overlaps the rest)
//   - a unit already in the target state is skipped
//   - one command per unit, never repeated (a second "off" pushes a resting laser unit deeper)
//   - nothing is sent to a Panasonic for 60 s after it lights
//   - a lamp unit is not powered on while cooling, nor inside 75 s of going off
//   - lamp units strike one at a time: the next waits until the last one reports ON
export const RUN_ORDER = Object.freeze({ on: Object.freeze(['C', 'B', 'A', 'D']), off: Object.freeze(['A', 'D', 'B', 'C']) });
export const RUN_BANNER = Object.freeze({ on: 'All four on', off: 'Safe to leave the building' });
export const RUN_RULES = Object.freeze({
  planMs: 10000,          // a reviewed plan waits this long for its confirm
  replyMs: 20000,         // a step waits this long for a current reply before giving up on that unit
  reportMs: 45000,        // a sent command waits this long for the unit's own report
  quietAfterLitMs: 60000, // Panasonic: nothing for a minute after it lights
  relightMs: 75000,       // lamp units: no power on inside 75 s of going off
  coolingMs: 240000,      // longest wait for a cooling unit before powering it on
  strikeMs: 120000,       // lamp units: longest wait for ON before the next unit goes
  settleMs: Object.freeze({ on: 300000, off: 360000 }), // longest wait for every unit to reach the end state
  tickMs: 500,
});
const UP = { on: 'ON', off: 'OFF', warming: 'WARMING', cooling: 'COOLING', unknown: 'not reported' };
const isPanasonic = p => p?.driver === 'panasonic';
const isLamp = p => isPanasonic(p) && /DW\d{3}/i.test(String(p.model || ''));
const fail = (status, message, extra = {}) => Object.assign(new Error(message), { status, ...extra });
const seconds = ms => Math.max(1, Math.ceil(ms / 1000));

export function createPowerRun({ projectors, status, power, revision, locked, changed = () => {}, now = Date.now, file = null,
  maxStatusAgeMs = 15000, rules = RUN_RULES, interval = setInterval, clearTimer = clearInterval }) {
  const seen = new Map();   // slot -> { power, since }: when the relay first saw the current power state
  const plans = new Map();  // token -> { direction, targets, expires }
  let run = restore(), ticker = null, lastKey = '', savedKey = '';

  const lanes = () => {
    const list = projectors();
    return Object.fromEntries(Object.keys(LANES).map(lane => { const found = list.filter(p => p.lane === lane); return [lane, found.length === 1 ? found[0] : null]; }));
  };
  function read(p) {
    if (!p?.ip) return { current: false, power: 'unknown' };
    const s = status(p.slot) || {}, age = now() - Date.parse(s.connection?.lastSuccessAt || '');
    const current = !!s.online && s.connection?.state === 'online' && Number.isFinite(age) && age >= -1000 && age <= maxStatusAgeMs;
    return { current, power: current && ['on', 'off', 'warming', 'cooling'].includes(s.power) ? s.power : 'unknown' };
  }
  // Remember when each unit entered its current power state. A state first seen at startup counts from then.
  function observe() {
    try {
      for (const p of projectors()) {
        const r = read(p);
        if (!r.current || r.power === 'unknown') continue;
        if (seen.get(p.slot)?.power !== r.power) seen.set(p.slot, { power: r.power, since: now() });
      }
    } catch { /* the relay is still starting */ }
  }
  const since = (p, state) => { const s = seen.get(p.slot); return s && s.power === state ? now() - s.since : null; };

  function restore() {
    if (!file) return null;
    try {
      const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!saved || typeof saved !== 'object' || !RUN_ORDER[saved.direction] || !Array.isArray(saved.steps)) return null;
      // A run cannot survive a restart: whatever was left is not sent, and the page must say so.
      if (saved.state === 'running') Object.assign(saved, { state: 'interrupted', banner: null, endedAt: new Date(now()).toISOString(), message: 'The relay restarted during this run. Nothing more was sent. Check each lane.' });
      return saved;
    } catch { return null; }
  }
  function publish({ save = false } = {}) {
    const key = JSON.stringify(run);
    if (key === lastKey) return;
    lastKey = key;
    if (save && file) { try { fs.writeFileSync(file, key); } catch { /* the run still works without its record */ } }
    changed(view());
  }
  // What pages see: the run without the relay's own bookkeeping.
  function view() {
    if (!run) return { active: false, run: null, order: RUN_ORDER, banners: RUN_BANNER };
    const { cursor, settlingAt, ...shown } = structuredClone(run);
    shown.steps = shown.steps.map(({ identity, startedAt, ...step }) => step);
    return { active: run.state === 'running', run: shown, order: RUN_ORDER, banners: RUN_BANNER };
  }

  // What the run would do with one lane right now. The same reading decides it again at send time.
  function intent(lane, direction) {
    const p = lanes()[lane], base = { lane, surface: LANES[lane].target, slot: p?.slot ?? null, model: p ? String(p.model || p.label || '').slice(0, 40) : '' };
    if (!p?.ip) return { ...base, intent: 'none', note: 'No projector on this lane' };
    const r = read(p), on = direction === 'on';
    if (!r.current) return { ...base, intent: 'no-reply', note: 'No current reply. Nothing will be sent unless it answers' };
    if (r.power === 'unknown') return { ...base, intent: 'no-reply', note: 'Power not reported. Nothing will be sent unless it reports' };
    if (on && (r.power === 'on' || r.power === 'warming')) return { ...base, intent: 'already', note: `Already ${UP[r.power]}` };
    if (!on && (r.power === 'off' || r.power === 'cooling')) return { ...base, intent: 'already', note: `Already ${UP[r.power]}` };
    const wait = hold(p, r, direction);
    return wait ? { ...base, intent: 'hold', note: wait.note } : { ...base, intent: 'send', note: on ? 'Power on' : 'Power off' };
  }
  // A reason to wait before sending, or null. `over` marks a wait that has run out.
  function hold(p, r, direction, waited = 0) {
    if (direction === 'on') {
      if (r.power === 'cooling') return { note: 'Cooling. Waiting for it to finish before power on', over: waited >= rules.coolingMs, gaveUp: 'Still cooling. Nothing sent.' };
      const off = since(p, 'off');
      if (isLamp(p) && off != null && off < rules.relightMs) return { note: `Went off ${seconds(off)} s ago. Waiting ${seconds(rules.relightMs - off)} s before relight`, over: false };
      return null;
    }
    const lit = since(p, 'on');
    if (isPanasonic(p) && r.power === 'on' && lit != null && lit < rules.quietAfterLitMs) return { note: `Lit ${seconds(lit)} s ago. Waiting ${seconds(rules.quietAfterLitMs - lit)} s before any command`, over: false };
    if (r.power === 'warming') return { note: 'Warming up. Waiting for ON before power off', over: waited >= rules.strikeMs, gaveUp: 'Still warming. Nothing sent.' };
    return null;
  }

  function plan(direction) {
    if (!RUN_ORDER[direction]) throw fail(400, 'direction must be on or off');
    if (run?.state === 'running') throw fail(409, 'A run is already in progress.', { run: view() });
    if (locked()) throw fail(423, 'show lock is on');
    observe();
    for (const [token, entry] of plans) if (entry.expires <= now()) plans.delete(token);
    if (plans.size >= 64) plans.delete(plans.keys().next().value);
    const steps = RUN_ORDER[direction].map(lane => intent(lane, direction)), all = lanes();
    const token = randomUUID();
    plans.set(token, { direction, expires: now() + rules.planMs, targets: Object.values(all).filter(Boolean).map(p => ({ slot: p.slot, identity: revision(p) })) });
    return { direction, confirm: token, expiresInMs: rules.planMs, steps, banner: RUN_BANNER[direction] };
  }

  function start(direction, token) {
    if (!RUN_ORDER[direction]) throw fail(400, 'direction must be on or off');
    if (run?.state === 'running') throw fail(409, 'A run is already in progress.', { run: view() });
    if (locked()) throw fail(423, 'show lock is on');
    const entry = plans.get(token);
    plans.delete(token); // one use, whatever happens next
    if (!entry || entry.direction !== direction || entry.expires <= now()) throw fail(409, 'Confirm expired. Review the run again.');
    const all = lanes();
    const same = entry.targets.every(target => { const p = Object.values(all).find(item => item?.slot === target.slot); return p && revision(p) === target.identity; })
      && Object.values(all).filter(Boolean).length === entry.targets.length;
    if (!same) throw fail(409, 'Projector configuration changed. Review the run again.');
    const at = now();
    run = { id: randomUUID(), direction, state: 'running', phase: 'units', startedAt: new Date(at).toISOString(), endedAt: null, banner: null, message: '', cursor: 0,
      steps: RUN_ORDER[direction].map(lane => { const p = all[lane]; return { lane, surface: LANES[lane].target, slot: p?.slot ?? null, identity: p ? revision(p) : null, state: 'pending', note: 'Waiting for its turn', confirmed: false, startedAt: null, sentAt: null }; }) };
    publish({ save: true });
    if (!ticker) { ticker = interval(tick, rules.tickMs); ticker?.unref?.(); }
    tick();
    return view();
  }

  function end(state, message) {
    Object.assign(run, { state, phase: 'ended', endedAt: new Date(now()).toISOString(), message, banner: state === 'done' ? RUN_BANNER[run.direction] : null });
    if (ticker) { clearTimer(ticker); ticker = null; }
    publish({ save: true });
  }
  function stop() {
    if (run?.state !== 'running') return view();
    end('stopped', 'Stopped from a page. Nothing more was sent. Check each lane.');
    return view();
  }

  // One unit's turn. Returns true when the turn is over and the next unit may go in the same pass.
  function turn(step, p, at, on, want) {
    const next = (state, note) => { Object.assign(step, { state, note }); run.cursor++; return true; };
    if (step.state === 'pending') Object.assign(step, { state: 'checking', startedAt: at });
    const waited = at - step.startedAt, r = p ? read(p) : { current: false, power: 'unknown' };
    if (step.state === 'checking') {
      if (!p?.ip) return next('none', 'No projector on this lane');
      if (p.slot !== step.slot || revision(p) !== step.identity) return next('failed', 'Projector changed since the run was confirmed. Nothing sent.');
      if (!r.current) { if (waited >= rules.replyMs) return next('failed', 'No current reply. Nothing sent.'); step.note = 'Waiting for a current reply'; return false; }
      if (r.power === 'unknown') { if (waited >= rules.replyMs) return next('failed', 'Power not reported. Nothing sent.'); step.note = 'Waiting for its power reading'; return false; }
      if (want.includes(r.power)) return next('already', `Already ${UP[r.power]}. Nothing sent.`);
      const wait = hold(p, r, run.direction, waited);
      if (wait?.over) return next('failed', wait.gaveUp);
      if (wait) { step.note = wait.note; return false; }
      Object.assign(step, { state: 'sending', note: on ? 'Sending power on' : 'Sending power off' });
      const mine = run.id;
      Promise.resolve().then(() => power(step.slot, on)).then(
        () => { if (run?.id === mine && step.state === 'sending') { Object.assign(step, { state: 'sent', sentAt: now(), note: `Sent. Waiting for it to report ${UP[want[1]]} or ${UP[want[0]]}` }); publish({ save: true }); } },
        error => { if (run?.id === mine && step.state === 'sending') { Object.assign(step, { state: 'failed', note: `Not done: ${String(error?.message || error).slice(0, 160)}` }); run.cursor++; publish({ save: true }); } });
      return false;
    }
    if (step.state === 'sent') {
      if (r.current && want.includes(r.power)) {
        // Lamp units strike one at a time: hold the line until this one is lit.
        if (on && isLamp(p) && r.power !== 'on') { Object.assign(step, { state: 'striking', note: 'Reported WARMING. Waiting for ON before the next unit' }); return false; }
        return next('reported', `Reported ${UP[r.power]}`);
      }
      return at - step.sentAt >= rules.reportMs ? next('unreported', 'Sent, but it has not reported. Check by eye.') : false;
    }
    if (step.state === 'striking') {
      if (r.current && r.power === 'on') return next('reported', 'Reported ON');
      return at - step.sentAt >= rules.strikeMs ? next('unreported', 'Sent and warming, but not ON yet. Check by eye.') : false;
    }
    return false; // sending: the command's answer moves it on
  }

  function tick() {
    if (run?.state !== 'running') return;
    observe();
    const all = lanes(), on = run.direction === 'on', want = on ? ['on', 'warming'] : ['off', 'cooling'], final = on ? 'on' : 'off', at = now();
    if (locked()) return end('stopped', 'Stopped: Show Lock was turned on. Nothing more was sent. Check each lane.');
    // A unit seen in its end state stays confirmed, even if it stops answering afterwards (a resting laser unit can).
    for (const step of run.steps) { const p = all[step.lane]; if (p && p.slot === step.slot && !step.confirmed) { const r = read(p); if (r.current && r.power === final) step.confirmed = true; } }
    while (run.steps[run.cursor] && turn(run.steps[run.cursor], all[run.steps[run.cursor].lane], at, on, want)) { /* the next unit goes in the same pass */ }
    if (!run.steps[run.cursor]) {
      // Every unit has had its turn. Wait for each lane's own reply to reach the end state.
      if (run.phase !== 'settling') Object.assign(run, { phase: 'settling', settlingAt: at });
      const open = run.steps.filter(item => !item.confirmed);
      for (const item of run.steps) {
        if (item.confirmed) { delete item.waiting; continue; }
        const p = all[item.lane], r = p ? read(p) : null;
        item.waiting = !p?.ip ? 'no projector' : !r.current ? 'no current reply' : `reports ${UP[r.power]}`;
      }
      if (!open.length) return end('done', on ? 'Every lane reports ON.' : 'Every lane reports OFF.');
      // A lane nothing was sent to gets a short wait for a late reply; a lane that is changing state gets the long one.
      const nothingSent = open.every(item => ['none', 'failed'].includes(item.state));
      if (open.every(item => item.state === 'none') || at - run.settlingAt >= (nothingSent ? rules.replyMs : rules.settleMs[run.direction])) return end('attention', `Not confirmed ${UP[final]}: ${open.map(item => `${item.lane} (${item.waiting})`).join(', ')}. Check by eye.`);
      run.message = `Waiting for ${open.map(item => item.lane).join(', ')} to report ${UP[final]}`;
    }
    const stateKey = run.steps.map(item => item.state).join() + run.phase;
    publish({ save: stateKey !== savedKey });
    savedKey = stateKey;
  }

  const sampler = interval(observe, 1000);
  sampler?.unref?.();
  return { view, plan, start, stop, tick, observe, close() { clearTimer(sampler); if (ticker) clearTimer(ticker); } };
}
