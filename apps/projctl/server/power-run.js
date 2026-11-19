import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { LANES } from '../public/lanes.js';

// The all-four power run. One run lives in the relay and every page reads the same state, so a
// second press from any page shows the run in progress instead of starting another. The run
// sends at most one power command to each projector, in a fixed order, and reads each unit before
// commanding it. It ends with one banner, and only when every lane's own reply supports it.
//
// Order and waits follow the manufacturers' documents as researched for the rig (the rig's daily
// order of operations, November 19). Researched, not yet tested on a rig.
//   on:  C, B, A, D     off: A, D, B, C  (lamp units first, so their cooling overlaps the rest)
//   - a unit already in the target state is skipped
//   - one command per unit, never repeated (a second "off" pushes the Barco into deep standby,
//     where its network is down and the morning power on cannot reach it)
//   - the run asks for a fresh read of every unit it is waiting on every 10 s
//   - nothing is sent to a Panasonic for 60 s after it lights, or to a lamp unit for 60 s after
//     its on command (not even a read from the run)
//   - a lamp unit is not powered on while cooling, nor inside 75 s of reading off
//   - morning: the second lamp unit goes about 10 s after the first; then both are watched for
//     3 minutes. A lamp unit that reads COOLING inside that window has shut itself off: the run
//     waits for OFF plus 75 s and tries once more, then stops and alerts. This is the one case
//     where a unit gets a second command.
//   - night: the run waits up to 240 s for every unit to read OFF and names any that does not
// Show Lock blocks an off run, as it blocks every power off. An on run is allowed under it.
export const RUN_ORDER = Object.freeze({ on: Object.freeze(['C', 'B', 'A', 'D']), off: Object.freeze(['A', 'D', 'B', 'C']) });
export const RUN_BANNER = Object.freeze({ on: 'All four on', off: 'Safe to leave the building' });
export const RUN_RULES = Object.freeze({
  planMs: 10000,          // a reviewed plan waits this long for its confirm
  replyMs: 20000,         // a step waits this long for a current reply before giving up on that unit
  reportMs: 45000,        // a sent command waits this long for the unit's own report
  readEveryMs: 10000,     // a fresh read of each unit the run is waiting on, this often
  quietAfterLitMs: 60000, // Panasonic: nothing for a minute after it lights, or after a lamp unit's on command
  relightMs: 75000,       // lamp units: no power on inside 75 s of reading off
  coolingMs: 240000,      // longest wait for a cooling unit before powering it on
  strikeMs: 120000,       // a warming unit: longest wait for ON before an off is sent to it
  staggerMs: 10000,       // morning: the next lamp unit goes this long after the last one's on command
  lampWatchMs: 180000,    // morning: reading COOLING inside this window after an on command means the lamp shut itself off
  lampRetries: 1,         // one more try after a lamp shut itself off, then stop and alert
  settleMs: Object.freeze({ on: 300000, off: 240000 }), // longest wait for every unit to reach the end state
  tickMs: 500,
});
const UP = { on: 'ON', off: 'OFF', warming: 'WARMING', cooling: 'COOLING', unknown: 'not reported' };
const isPanasonic = p => p?.driver === 'panasonic';
const isLamp = p => isPanasonic(p) && /DW\d{3}/i.test(String(p.model || ''));
const isBarco = p => p?.driver === 'pulse' || /UD[MX]/i.test(String(p?.model || ''));
// Barco Pulse states after an off: READY can be woken from the network; STANDBY and ECO cannot.
export const DEEP_STANDBY = Object.freeze(['standby', 'eco']);
const ACTIVE = ['sending', 'watching', 'fault'];
const lampText = errors => !errors || typeof errors !== 'object' || ![0, 1, 2].includes(errors.lamp) ? 'lamp state not reported'
  : errors.lamp === 0 ? 'no lamp error' : errors.lamp === 1 ? 'lamp WARNING reported' : 'lamp ERROR reported';
const fail = (status, message, extra = {}) => Object.assign(new Error(message), { status, ...extra });
const seconds = ms => Math.max(1, Math.ceil(ms / 1000));

export function createPowerRun({ projectors, status, power, refresh = null, revision, locked, changed = () => {}, now = Date.now, file = null,
  maxStatusAgeMs = 15000, rules = RUN_RULES, interval = setInterval, clearTimer = clearInterval }) {
  const seen = new Map();   // slot -> { power, since }: when the relay first saw the current power state
  const plans = new Map();  // token -> { direction, targets, expires }
  const askedAt = new Map(); // slot -> when the run last asked for a fresh read
  let run = restore(), ticker = null, lastKey = '', savedKey = '';

  const lanes = () => {
    const list = projectors();
    return Object.fromEntries(Object.keys(LANES).map(lane => { const found = list.filter(p => p.lane === lane); return [lane, found.length === 1 ? found[0] : null]; }));
  };
  function read(p) {
    if (!p?.ip) return { current: false, power: 'unknown' };
    const s = status(p.slot) || {}, age = now() - Date.parse(s.connection?.lastSuccessAt || '');
    const current = !!s.online && s.connection?.state === 'online' && Number.isFinite(age) && age >= -1000 && age <= maxStatusAgeMs;
    return { current, power: current && ['on', 'off', 'warming', 'cooling'].includes(s.power) ? s.power : 'unknown',
      raw: current && typeof s.rawState === 'string' ? s.rawState : null, lightHours: current && Number.isFinite(s.lightHours) ? s.lightHours : null, errors: current ? s.errors ?? null : null };
  }
  const deep = r => DEEP_STANDBY.includes(r.raw);
  // A fresh read through the relay's own poller. Never a command, and never inside a lamp unit's quiet minute.
  function ask(slot, at) {
    if (!refresh || !slot || at - (askedAt.get(slot) ?? -Infinity) < rules.readEveryMs) return;
    askedAt.set(slot, at);
    Promise.resolve().then(() => refresh(slot)).catch(() => { /* the poller records the failure */ });
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
    shown.steps = shown.steps.map(({ identity, startedAt, handedOn, faultAt, ...step }) => step);
    return { active: run.state === 'running', run: shown, order: RUN_ORDER, banners: RUN_BANNER };
  }

  // What the run would do with one lane right now. The same reading decides it again at send time.
  function intent(lane, direction) {
    const p = lanes()[lane], base = { lane, surface: LANES[lane].target, slot: p?.slot ?? null, model: p ? String(p.model || p.label || '').slice(0, 40) : '' };
    if (!p?.ip) return { ...base, intent: 'none', note: 'No projector on this lane' };
    const r = read(p), on = direction === 'on';
    if (!r.current) return { ...base, intent: 'no-reply', note: isBarco(p) && on ? 'No current reply. It may be in deep standby, which needs a wake at the unit. Nothing will be sent unless it answers' : 'No current reply. Nothing will be sent unless it answers' };
    if (r.power === 'unknown') return { ...base, intent: 'no-reply', note: 'Power not reported. Nothing will be sent unless it reports' };
    if (on && (r.power === 'on' || r.power === 'warming')) return { ...base, intent: 'already', note: `Already ${UP[r.power]}` };
    if (!on && (r.power === 'off' || r.power === 'cooling')) return { ...base, intent: 'already', note: `Already ${UP[r.power]}${deep(r) ? ' (deep standby)' : ''}. Nothing will be sent` };
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

  function plan(direction, { requireUnlocked = false } = {}) {
    if (!RUN_ORDER[direction]) throw fail(400, 'direction must be on or off');
    if (run?.state === 'running') throw fail(409, 'A run is already in progress.', { run: view() });
    if ((direction === 'off' || requireUnlocked) && locked()) throw fail(423, 'show lock is on');
    observe();
    for (const [token, entry] of plans) if (entry.expires <= now()) plans.delete(token);
    if (plans.size >= 64) plans.delete(plans.keys().next().value);
    const steps = RUN_ORDER[direction].map(lane => intent(lane, direction)), all = lanes();
    const token = randomUUID();
    plans.set(token, { direction, requireUnlocked, expires: now() + rules.planMs, targets: Object.values(all).filter(Boolean).map(p => ({ slot: p.slot, identity: revision(p) })) });
    return { direction, confirm: token, expiresInMs: rules.planMs, steps, banner: RUN_BANNER[direction] };
  }

  function start(direction, token) {
    if (!RUN_ORDER[direction]) throw fail(400, 'direction must be on or off');
    if (run?.state === 'running') throw fail(409, 'A run is already in progress.', { run: view() });
    const entry = plans.get(token);
    plans.delete(token); // one use, whatever happens next
    if (!entry || entry.direction !== direction || entry.expires <= now()) throw fail(409, 'Confirm expired. Review the run again.');
    if ((direction === 'off' || entry.requireUnlocked) && locked()) throw fail(423, 'show lock is on');
    const all = lanes();
    const same = entry.targets.every(target => { const p = Object.values(all).find(item => item?.slot === target.slot); return p && revision(p) === target.identity; })
      && Object.values(all).filter(Boolean).length === entry.targets.length;
    if (!same) throw fail(409, 'Projector configuration changed. Review the run again.');
    const at = now();
    run = { id: randomUUID(), direction, requireUnlocked: entry.requireUnlocked, state: 'running', phase: 'units', startedAt: new Date(at).toISOString(), endedAt: null, banner: null, message: '', cursor: 0,
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

  // Send one power command for a step. Its answer moves the step on; a lamp unit's on is then watched.
  function send(step, on, { retry = false } = {}) {
    Object.assign(step, { state: 'sending', note: retry ? 'Sending the one retry' : on ? 'Sending power on' : 'Sending power off' });
    const mine = run.id, lamp = on && isLamp(lanes()[step.lane]);
    const requireUnlocked = run.requireUnlocked;
    const guard = requireUnlocked ? () => {
      if (locked() || run?.id !== mine || run.state !== 'running') throw fail(423, 'Live power is locked or the run ended.');
    } : undefined;
    Promise.resolve().then(() => { guard?.(); return power(step.slot, on, guard); }).then(
      () => {
        if (run?.id !== mine || step.state !== 'sending') return;
        const at = now();
        if (lamp) Object.assign(step, { state: 'watching', sentAt: at, attempts: (step.attempts || 0) + 1, note: `${retry ? 'Retry sent' : 'Sent'}. Nothing more to it for ${seconds(rules.quietAfterLitMs)} s` });
        else Object.assign(step, { state: 'sent', sentAt: at, note: `Sent. Waiting for it to report ${on ? 'WARMING or ON' : 'COOLING or OFF'}` });
        publish({ save: true });
      },
      error => {
        if (run?.id !== mine || step.state !== 'sending') return;
        Object.assign(step, { state: 'failed', note: `${retry ? 'Retry not done' : 'Not done'}: ${String(error?.message || error).slice(0, 160)}` });
        if (!step.handedOn) { step.handedOn = true; run.cursor++; }
        publish({ save: true });
      });
  }

  // One unit's turn. Returns true when the turn is over and the next unit may go in the same pass.
  function turn(step, p, at, on, want) {
    const next = (state, note) => { Object.assign(step, { state, note, handedOn: true }); run.cursor++; return true; };
    if (step.state === 'pending') Object.assign(step, { state: 'checking', startedAt: at });
    const waited = at - step.startedAt, r = p ? read(p) : { current: false, power: 'unknown' };
    if (step.state === 'checking') {
      if (!p?.ip) return next('none', 'No projector on this lane');
      if (p.slot !== step.slot || revision(p) !== step.identity) return next('failed', 'Projector changed since the run was confirmed. Nothing sent.');
      ask(p.slot, at);
      if (!r.current) {
        if (waited >= rules.replyMs) return next('failed', on && isBarco(p) ? 'No current reply. It may be in deep standby, which needs a wake at the unit. Nothing sent.' : 'No current reply. Nothing sent.');
        step.note = 'Waiting for a current reply'; return false;
      }
      if (r.power === 'unknown') { if (waited >= rules.replyMs) return next('failed', 'Power not reported. Nothing sent.'); step.note = 'Waiting for its power reading'; return false; }
      if (want.includes(r.power)) return next('already', `Already ${UP[r.power]}${!on && deep(r) ? ' (deep standby)' : ''}. Nothing sent.`);
      const wait = hold(p, r, run.direction, waited);
      if (wait?.over) return next('failed', wait.gaveUp);
      if (wait) { step.note = wait.note; return false; }
      send(step, on);
      return false;
    }
    if (step.state === 'sent') {
      ask(p?.slot, at);
      if (r.current && want.includes(r.power)) return next('reported', `Reported ${UP[r.power]}`);
      return at - step.sentAt >= rules.reportMs ? next('unreported', 'Sent, not confirmed. Check by eye.') : false;
    }
    // A lamp unit's on was accepted: the next unit goes after the stagger; this one is watched apart.
    if (['watching', 'fault'].includes(step.state)) {
      if (at - step.sentAt < rules.staggerMs) return false;
      step.handedOn = true; run.cursor++; return true;
    }
    if (['reported', 'unreported', 'failed'].includes(step.state) && !step.handedOn) { step.handedOn = true; run.cursor++; return true; }
    return false; // sending: the command's answer moves it on
  }

  // Morning: watch each lamp unit for 3 minutes after its on command. Reading COOLING inside that
  // window means it shut itself off: wait for OFF plus 75 s, try once more, then stop and alert.
  function watchLamps(all, at) {
    for (const step of run.steps) {
      if (!['watching', 'fault'].includes(step.state)) continue;
      const p = all[step.lane];
      if (!p || p.slot !== step.slot || revision(p) !== step.identity) { Object.assign(step, { state: 'failed', note: 'Projector changed during the run. Nothing more sent.' }); continue; }
      const r = read(p), age = at - step.sentAt;
      if (step.state === 'watching') {
        if (age < rules.quietAfterLitMs) { step.note = `${step.attempts > 1 ? 'Retry sent' : 'Sent'}. Nothing more to it for ${seconds(rules.quietAfterLitMs - age)} s`; continue; }
        ask(p.slot, at);
        if (r.current && r.power === 'cooling' && age <= rules.lampWatchMs) {
          if ((step.attempts || 1) <= rules.lampRetries) Object.assign(step, { state: 'fault', faultAt: at, note: `Lamp fault: it turned itself off ${seconds(age)} s after the on command. Waiting for OFF, then ${seconds(rules.relightMs)} s, then one retry. Photograph any lamp message.` });
          else Object.assign(step, { state: 'failed', alert: true, note: 'Lamp fault again: it turned itself off after the retry. Stopped. Photograph any lamp message. This is a service call.' });
          continue;
        }
        if (age >= rules.lampWatchMs) {
          if (r.current && r.power === 'on') Object.assign(step, { state: 'reported', confirmed: true, note: `Reported ON and stayed on for 3 minutes. Lamp hours ${r.lightHours ?? 'not reported'}; ${lampText(r.errors)}.` });
          else Object.assign(step, { state: 'unreported', note: r.current ? `Sent, not confirmed: reports ${UP[r.power]} after 3 minutes. Check by eye.` : 'Sent, not confirmed: no current reply. Check by eye.' });
          continue;
        }
        step.note = !r.current ? 'Sent. Waiting for a current reply' : `Reports ${UP[r.power]}. Watching the lamp for ${seconds(rules.lampWatchMs - age)} s more; ${lampText(r.errors)}`;
        continue;
      }
      // fault: wait for OFF, then the relight wait, then the one retry. Never an on while it reads COOLING.
      ask(p.slot, at);
      if (r.current && r.power === 'off') {
        const off = since(p, 'off');
        if (off != null && off >= rules.relightMs) { send(step, true, { retry: true }); continue; }
        step.note = `Lamp fault. Reads OFF; one retry in ${seconds(rules.relightMs - (off ?? 0))} s. Photograph any lamp message.`;
      } else if (at - step.faultAt >= rules.coolingMs) Object.assign(step, { state: 'failed', alert: true, note: 'Lamp fault, and it has not read OFF in 4 minutes. Nothing more sent. Check by eye.' });
      else step.note = `Lamp fault. Waiting for OFF before one retry (reads ${r.current ? UP[r.power] : 'nothing current'}). Photograph any lamp message.`;
    }
  }

  function tick() {
    if (run?.state !== 'running') return;
    observe();
    const all = lanes(), on = run.direction === 'on', want = on ? ['on', 'warming'] : ['off', 'cooling'], final = on ? 'on' : 'off', at = now();
    if ((!on || run.requireUnlocked) && locked()) return end('stopped', 'Stopped: Show Lock was turned on. Nothing more was sent. Check each lane.');
    // A unit seen in its end state stays confirmed, even if it stops answering afterwards (a resting laser unit can).
    // A lamp unit in the morning is confirmed only once it has stayed on through its 3-minute watch.
    for (const step of run.steps) {
      const p = all[step.lane];
      if (!p || p.slot !== step.slot) continue;
      const r = read(p);
      if (!on && r.current && r.power === 'off' && isBarco(p)) step.deep = deep(r);
      if (step.confirmed || (on && isLamp(p) && step.state !== 'already')) continue;
      if (r.current && r.power === final) step.confirmed = true;
    }
    if (on) watchLamps(all, at);
    while (run.steps[run.cursor] && turn(run.steps[run.cursor], all[run.steps[run.cursor].lane], at, on, want)) { /* the next unit goes in the same pass */ }
    if (!run.steps[run.cursor]) {
      // Every unit has had its turn. Wait for each lane's own reply to reach the end state.
      if (run.phase !== 'settling') Object.assign(run, { phase: 'settling', settlingAt: at });
      const open = run.steps.filter(item => !item.confirmed);
      for (const item of run.steps) {
        if (item.confirmed) { delete item.waiting; continue; }
        const p = all[item.lane], r = p ? read(p) : null;
        if (p?.ip && !['none', 'failed'].includes(item.state) && !(item.state === 'watching' && at - item.sentAt < rules.quietAfterLitMs)) ask(p.slot, at);
        item.waiting = item.alert ? 'lamp fault, a service call' : !p?.ip ? 'no projector' : !r.current ? (isBarco(p) && !on ? 'no current reply; it may be in deep standby' : 'no current reply') : `reports ${UP[r.power]}`;
      }
      const sleepy = run.steps.filter(item => item.deep).map(item => item.lane);
      const caution = sleepy.length ? ` ${sleepy.join(', ')} ${sleepy.length > 1 ? 'are' : 'is'} in deep standby: the morning power on from this page cannot reach ${sleepy.length > 1 ? 'them' : 'it'}. Wake ${sleepy.length > 1 ? 'them' : 'it'} at the unit.` : '';
      if (!open.length) return end('done', on ? 'Every lane reports ON.' : `Every lane reports OFF.${caution}`);
      if (run.steps.some(item => ACTIVE.includes(item.state))) { run.message = `Waiting for ${open.map(item => item.lane).join(', ')}`; return publishTick(); }
      // A lane nothing was sent to gets a short wait for a late reply; a lane that is changing state gets the long one.
      const nothingSent = open.every(item => ['none', 'failed'].includes(item.state));
      if (open.every(item => item.state === 'none') || at - run.settlingAt >= (nothingSent ? rules.replyMs : rules.settleMs[run.direction])) return end('attention', `Not confirmed ${UP[final]}: ${open.map(item => `${item.lane} (${item.waiting})`).join(', ')}. Check by eye.`);
      run.message = `Waiting for ${open.map(item => item.lane).join(', ')} to report ${UP[final]}`;
    }
    publishTick();
  }
  function publishTick() {
    const stateKey = run.steps.map(item => item.state).join() + run.phase;
    publish({ save: stateKey !== savedKey });
    savedKey = stateKey;
  }

  const sampler = interval(observe, 1000);
  sampler?.unref?.();
  return { view, plan, start, stop, tick, observe, close() { clearTimer(sampler); if (ticker) clearTimer(ticker); } };
}
