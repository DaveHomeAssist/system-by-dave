import { createHmac, randomBytes } from 'node:crypto';

export function createCommandBinding() {
  const secret = randomBytes(32);
  const revision = projector => createHmac('sha256', secret).update(JSON.stringify([
    projector.slot, projector.driver, projector.ip, projector.mac, projector.model,
    projector.lane, projector.user, projector.password, projector.inputs,
  ])).digest('hex');
  const reject = message => { throw Object.assign(new Error(message), { status: 409 }); };

  function guard(expected, getProjectors, slot) {
    if (expected === undefined) return () => {};
    if (!Array.isArray(expected) || !expected.length || expected.length > 64) reject('Invalid reviewed target list. Review the targets again.');
    const reviewed = new Map();
    for (const target of expected) {
      if (!target || typeof target.slot !== 'string' || !/^[a-f0-9]{64}$/.test(target.revision || '') || reviewed.has(target.slot)) {
        reject('Invalid reviewed target list. Review the targets again.');
      }
      reviewed.set(target.slot, target.revision);
    }
    const check = requestedSlot => {
      const projectors = getProjectors();
      const slots = slot === 'all' ? projectors.map(p => p.slot) : [slot];
      if (slots.length !== reviewed.size || slots.some(id => !reviewed.has(id))) reject('Projector list changed. Review the targets again.');
      const targets = requestedSlot ? projectors.filter(p => p.slot === requestedSlot) : projectors.filter(p => reviewed.has(p.slot));
      if (!targets.length || targets.some(p => revision(p) !== reviewed.get(p.slot))) reject('Projector configuration changed. Review the targets again.');
    };
    check();
    return check;
  }
  return { revision, guard };
}
