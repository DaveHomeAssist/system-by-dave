// PJLink Class 1/2 driver over TCP 4352.
// Protocol: on connect the projector sends "PJLINK 0\r" (no auth) or
// "PJLINK 1 <8 hex>\r" (auth). Commands are "%1CMD param\r". Replies are
// "%1CMD=value\r" where value may be OK, ERR1..ERR4, or ERRA.

import net from 'node:net';
import { createHash } from 'node:crypto';
import { POWER, SHUTTER, NotSupported } from './base.js';
import { throwIfAborted, transportFailure } from './transport.js';

const ERR = {
  ERR1: 'Undefined command', ERR2: 'Invalid parameter',
  ERR3: 'Unavailable at this time', ERR4: 'Projector failure', ERRA: 'Authentication failed',
};

export function pjlinkDriver({ host, port = 4352, password = '', timeoutMs = 5000 }) {
  async function send(cmd, { guard, signal } = {}) {
    throwIfAborted(signal);
    return new Promise((resolve, reject) => {
      const sock = net.createConnection({ host, port });
      let buf = '', prefix = null, done = false;
      const cleanup = () => { clearTimeout(t); signal?.removeEventListener('abort', abort); };
      const fail = (e) => { if (!done) { done = true; cleanup(); sock.destroy(); reject(e); } };
      const abort = () => fail(signal.reason || new Error('Projector poll cancelled'));
      const t = setTimeout(() => fail(new Error('timeout')), timeoutMs);
      signal?.addEventListener('abort', abort, { once: true });
      sock.on('error', fail);
      sock.on('end', () => fail(new Error('connection closed before PJLink reply')));
      sock.on('close', () => fail(new Error('connection closed before PJLink reply')));
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
            try { throwIfAborted(signal); guard?.(); sock.write(prefix + '%1' + cmd + '\r'); } catch (error) { return fail(error); }
          } else {
            cleanup(); done = true; sock.end();
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
    async getStatus({ signal } = {}) {
      const read = (cmd) => send(cmd, { signal });
      const optional = async (fn, fallback) => { try { return await fn(); } catch (e) { throwIfAborted(signal); if (transportFailure(e)) throw e; return fallback; } };
      const power = powerMap[await read('POWR ?')] ?? POWER.UNKNOWN;
      const s = { power, online: true };
      s.shutter = await optional(async () => { const a = await read('AVMT ?'); return (a === '11' || a === '31') ? SHUTTER.CLOSED : SHUTTER.OPEN; }, SHUTTER.UNKNOWN);
      s.input = await optional(() => read('INPT ?'), null);
      await optional(async () => {
        const e = await read('ERST ?');
        const [fan, lamp, temp, cover, filter, other] = e.split('').map(Number);
        s.errors = { fan, lamp, temp, cover, filter, other };
      });
      await optional(async () => { const l = await read('LAMP ?'); s.lightHours = Number(l.split(' ')[0]); });
      await optional(async () => { s.name = await read('NAME ?'); });
      throwIfAborted(signal);
      return s;
    },
    power: (on, options) => send(`POWR ${on ? 1 : 0}`, options),
    shutter: (closed) => send(`AVMT ${closed ? 31 : 30}`),
    input: (id) => send(`INPT ${id}`),
    async lens() { throw new NotSupported('lens'); },
  };
}

// Class 2 discovery: broadcast "%2SRCH\r" on UDP 4352, collect "%2ACKN=<MAC>" replies.
import dgram from 'node:dgram';
export function pjlinkSearch({ broadcast = '255.255.255.255', waitMs = 2000 } = {}) {
  return new Promise((resolve, reject) => {
    const found = []; // {mac, ip}
    const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    let timer, done = false;
    const finish = (error) => {
      if (done) return; done = true; clearTimeout(timer);
      try { sock.close(); } catch {}
      if (error) reject(new Error('Manual discovery socket failed; saved-address retries remain active.'));
      else resolve(found);
    };
    sock.on('error', finish);
    sock.on('message', (msg, rinfo) => {
      const m = msg.toString('latin1').match(/%2ACKN=([0-9A-Fa-f:]{17})/);
      if (m) found.push({ mac: m[1].toLowerCase(), ip: rinfo.address });
    });
    sock.bind(4352, () => {
      try {
        sock.setBroadcast(true);
        timer = setTimeout(() => finish(), waitMs);
        sock.send(Buffer.from('%2SRCH\r', 'latin1'), 4352, broadcast, (error) => { if (error) finish(error); });
      } catch (error) { finish(error); }
    });
  });
}
