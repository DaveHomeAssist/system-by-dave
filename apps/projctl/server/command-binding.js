import { createHmac, randomBytes } from 'node:crypto';

export function createCommandBinding() {
  const secret = randomBytes(32);
  const revision = projector => createHmac('sha256', secret).update(JSON.stringify([
    projector.slot, projector.driver, projector.ip, projector.mac, projector.model,
    projector.lane, projector.user, projector.password, projector.inputs, projector.reverseH, projector.reverseV,
  ])).digest('hex');
  const reject = (message, status = 409) => { throw Object.assign(new Error(message), { status, commandRejected: true }); };

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
  function commandGuard(slot, readState) {
    const initial = readState();
    const expected = initial.projector ? revision(initial.projector) : null;
    const lockAtCapture = initial.lockRevision;
    return (cmd, arg, { allowBusy = false } = {}) => {
      const current = readState();
      if (!expected || !current.projector) reject(`no projector ${slot}`, 404);
      if (revision(current.projector) !== expected) reject('Projector configuration changed. Review the target again.');
      if (!current.status?.online) reject(`${slot} is offline`);
      const stop = cmd === 'lens' && arg?.op === 'stop';
      const protectedCommand = cmd === 'power' && !arg || ['input', 'resetInput', 'pattern', 'picture'].includes(cmd) || cmd === 'lens' && !stop;
      if (protectedCommand && current.lock) reject('show lock is on', 423);
      if (protectedCommand && current.lockRevision !== lockAtCapture) reject('Show lock changed. Review the command again.', 423);
      if (cmd === 'power' && arg && current.status.power === 'cooling') reject(`${slot} is cooling, wait before power on`);
      if (current.busy && !allowBusy && !stop && cmd !== 'shutter') reject(`${slot}: lens is moving. Wait or use Stop lens.`);
    };
  }
  return { revision, guard, commandGuard };
}
