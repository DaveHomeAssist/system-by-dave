// Driver interface. Every driver returns the same status shape and
// throws NotSupported for anything it can't do.

export class NotSupported extends Error {
  constructor(what) { super(`${what} not supported by this driver`); this.code = 'NOT_SUPPORTED'; }
}

export const POWER = { OFF: 'off', ON: 'on', COOLING: 'cooling', WARMING: 'warming', UNKNOWN: 'unknown' };
export const SHUTTER = { OPEN: 'open', CLOSED: 'closed', UNKNOWN: 'unknown' };

export function emptyStatus() {
  return {
    power: POWER.UNKNOWN,
    shutter: SHUTTER.UNKNOWN,
    input: null,
    lightHours: null,
    errors: { fan: 0, lamp: 0, temp: 0, cover: 0, filter: 0, other: 0 },
    online: false,
    name: null,
    pattern: null,
    updatedAt: null,
  };
}

/**
 * @typedef {Object} Driver
 * @property {() => Promise<Partial<ReturnType<typeof emptyStatus>>>} getStatus
 * @property {(on: boolean) => Promise<string>} power
 * @property {(closed: boolean) => Promise<string>} shutter
 * @property {(id: string) => Promise<string>} input
 * @property {(op: object) => Promise<string>} lens   // throws NotSupported until phase 5
 */
