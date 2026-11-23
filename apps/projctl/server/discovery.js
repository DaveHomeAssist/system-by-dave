// Manual discovery can move an existing unit only by its unique recorded MAC.
// It cannot assign an unknown projector or infer identity from its model/name.
const macKey = value => typeof value === 'string' ? value.toLowerCase() : '';
const identity = p => JSON.stringify([p.slot, p.mac, p.ip, p.driver, p.user, p.password, p.model, p.lane]);

export function discoveryPlan(before, current, found) {
  const updates = [], warnings = [];
  const addresses = new Map();
  for (const f of found) {
    const mac = macKey(f.mac);
    if (!addresses.has(mac)) addresses.set(mac, new Set());
    addresses.get(mac).add(f.ip);
  }
  for (const [mac, ips] of addresses) {
    const old = before.filter(p => mac && macKey(p.mac) === mac);
    const live = current.filter(p => mac && macKey(p.mac) === mac);
    if (!old.length) { warnings.push({ code: 'UNASSIGNED_DEVICE', message: 'An unassigned device was found; no lane was changed.' }); continue; }
    if (old.length !== 1 || live.length !== 1 || ips.size !== 1) {
      warnings.push({ code: 'AMBIGUOUS_IDENTITY', message: 'A repeated MAC or conflicting address needs operator review; no matching lane was changed.' }); continue;
    }
    const p = live[0], ip = [...ips][0];
    if (identity(old[0]) !== identity(p)) { warnings.push({ code: 'TARGET_CHANGED', slot: p.slot, message: 'Configuration changed during discovery; scan again.' }); continue; }
    if (p.ip === ip) continue;
    if (current.some(other => other.slot !== p.slot && other.ip === ip)) { warnings.push({ code: 'ADDRESS_IN_USE', slot: p.slot, message: 'The found address is already assigned to another slot; no lane was changed.' }); continue; }
    updates.push({ slot: p.slot, previousIp: p.ip, ip });
  }
  return { updates, warnings };
}

export function createManualDiscovery({ projectors, scan, apply }) {
  let active;
  return () => {
    if (active) return active;
    const before = projectors().map(p => ({ ...p }));
    active = Promise.resolve().then(scan).then(found => {
      const plan = discoveryPlan(before, projectors(), found);
      apply(plan.updates);
      return { ok: true, found, changed: plan.updates.length, ...plan,
        method: 'pjlink-class2-broadcast', exhaustive: false,
        note: 'Manual PJLink Class 2 discovery only. No response does not mean a projector is absent; saved-address retries continue automatically.' };
    }).finally(() => { active = null; });
    return active;
  };
}
