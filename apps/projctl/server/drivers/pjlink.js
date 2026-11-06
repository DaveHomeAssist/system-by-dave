// PJLink Class 1/2 driver over TCP 4352.
// Protocol: on connect the projector sends "PJLINK 0\r" (no auth) or
// "PJLINK 1 <8 hex>\r" (auth). Commands are "%1CMD param\r". Replies are
// "%1CMD=value\r" where value may be OK, ERR1..ERR4, or ERRA.

import net from 'node:net';
import { createHash } from 'node:crypto';
import { POWER, SHUTTER, NotSupported } from './base.js';

const ERR = {
  ERR1: 'Undefined command', ERR2: 'Invalid parameter',
  ERR3: 'Unavailable at this time', ERR4: 'Projector failure', ERRA: 'Authentication failed',
};

export function pjlinkDriver({ host, port = 4352, password = '', timeoutMs = 5000 }) {
  async function send(cmd) {
    return new Promise((resolve, reject) => {
      const sock = net.createConnection({ host, port });
      let buf = '', prefix = null, done = false;
      const fail = (e) => { if (!done) { done = true; sock.destroy(); reject(e); } };
      const t = setTimeout(() => fail(new Error('timeout')), timeoutMs);
      sock.on('error', fail);
      sock.on('data', (d) => {
        buf += d.toString('latin1');
        let idx;
        while ((idx = buf.indexOf('\r')) >= 0) {
          const line = buf.slice(0, idx); buf = buf.slice(idx + 1);
          if (prefix === null) {
            if (!line.startsWith('PJLINK ')) return fail(new Error('not a PJLink device: ' + line));
            if (line[7] === '0') prefix = '';
            else if (line[7] === '1') {
              const rnd = line.slice(9, 17);
              prefix = createHash('md5').update(rnd + password).digest('hex');
            } else return fail(new Error('bad handshake: ' + line));
            sock.write(prefix + '%1' + cmd + '\r');
          } else {
            clearTimeout(t); done = true; sock.end();
            if (line.startsWith('PJLINK ERRA')) return reject(Object.assign(new Error('auth failed: PJLink password wrong or not set (Setup tab)'), { code: 'ERRA' }));
            const m = line.match(/^%\d([A-Z]{4})=(.*)$/);
            if (!m) return reject(new Error('bad reply: ' + line));
            const val = m[2];
            if (ERR[val]) return reject(Object.assign(new Error(ERR[val]), { code: val }));
            resolve(val);
          }
        }
      });
    });
  }

  const powerMap = { '0': POWER.OFF, '1': POWER.ON, '2': POWER.COOLING, '3': POWER.WARMING };

  return {
    kind: 'pjlink',
    lensJog: { axes: [], speeds: [], mode: 'unsupported', stop: false, positionReadback: false },
    async getStatus() {
      const power = powerMap[await send('POWR ?')] ?? POWER.UNKNOWN;
      const s = { power, online: true };
      try { const a = await send('AVMT ?'); s.shutter = (a === '11' || a === '31') ? SHUTTER.CLOSED : SHUTTER.OPEN; } catch { s.shutter = SHUTTER.UNKNOWN; }
      try { s.input = await send('INPT ?'); } catch { s.input = null; }
      try {
        const e = await send('ERST ?');
        const [fan, lamp, temp, cover, filter, other] = e.split('').map(Number);
        s.errors = { fan, lamp, temp, cover, filter, other };
      } catch {}
      try { const l = await send('LAMP ?'); s.lightHours = Number(l.split(' ')[0]); } catch {}
      try { s.name = await send('NAME ?'); } catch {}
      return s;
    },
    power: (on) => send(`POWR ${on ? 1 : 0}`),
    shutter: (closed) => send(`AVMT ${closed ? 31 : 30}`),
    input: (id) => send(`INPT ${id}`),
    async lens() { throw new NotSupported('lens'); },
  };
}

// Class 2 discovery: broadcast "%2SRCH\r" on UDP 4352, collect "%2ACKN=<MAC>" replies.
import dgram from 'node:dgram';
export function pjlinkSearch({ broadcast = '255.255.255.255', waitMs = 2000 } = {}) {
  return new Promise((resolve) => {
    const found = []; // {mac, ip}
    const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    sock.on('error', () => { try { sock.close(); } catch {} resolve(found); });
    sock.on('message', (msg, rinfo) => {
      const m = msg.toString('latin1').match(/%2ACKN=([0-9A-Fa-f:]{17})/);
      if (m) found.push({ mac: m[1].toLowerCase(), ip: rinfo.address });
    });
    sock.bind(4352, () => {
      sock.setBroadcast(true);
      sock.send(Buffer.from('%2SRCH\r', 'latin1'), 4352, broadcast);
      setTimeout(() => { try { sock.close(); } catch {} resolve(found); }, waitMs);
    });
  });
}
