import { pjlinkDriver } from './pjlink.js';
import { pulseDriver } from './pulse.js';
import { panasonicDriver } from './panasonic.js';
import { simulatorDriver } from './simulator.js';

export function makeDriver(proj) {
  const o = { host: proj.ip, password: proj.password || '', user: proj.user || 'admin1', model: proj.model || '' };
  switch (proj.driver) {
    case 'simulator': return simulatorDriver({ name: proj.label, inputs: Object.keys(proj.inputs || { '31': 'HDMI' }) });
    case 'pulse': return pulseDriver(o);
    case 'panasonic': return panasonicDriver(o);
    case 'pjlink':
    default: return pjlinkDriver(o);
  }
}
