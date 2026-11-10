// PJLink Class 1 commands over TCP 4352; Class 2 discovery over UDP.
import net from 'node:net';
import dgram from 'node:dgram';
import { createHash } from 'node:crypto';
import { POWER, SHUTTER, NotSupported } from './base.js';
import { throwIfAborted, transportFailure } from './transport.js';
const ERR = { ERR1: 'Undefined command', ERR2: 'Invalid parameter', ERR3: 'Unavailable at this time', ERR4: 'Projector failure', ERRA: 'Authentication failed' };
export function pjlinkDriver({ host, port = 4352, password = '', timeoutMs = 5000 }) {
  async function send(cmd, { guard, signal } = {}) {
    if (!/^(?:POWR [01?]|AVMT (?:30|31|\?)|INPT (?:[1-6][1-9]|\?)|ERST \?|LAMP \?|NAME \?)$/.test(cmd)) throw new Error('Invalid PJLink command');
    throwIfAborted(signal);
    return new Promise((resolve, reject) => {
      const sock = net.createConnection({ host, port });
      let buf = '', bytes = 0, prefix = null, done = false;
      const cleanup = () => { clearTimeout(t); signal?.removeEventListener('abort', abort); };
      const fail = e => { if (!done) { done = true; cleanup(); sock.destroy(); reject(e); } };
      const abort = () => fail(signal.reason || new Error('Projector poll cancelled'));
      const t = setTimeout(() => fail(new Error('timeout')), timeoutMs);
      signal?.addEventListener('abort', abort, { once: true });
      sock.on('error', fail);
      sock.on('end', () => fail(new Error('connection closed before PJLink reply')));
      sock.on('close', () => fail(new Error('connection closed before PJLink reply')));
      sock.on('data', data => {
        if (done) return;
        bytes += data.length;
        if (bytes > 8192) return fail(new Error('PJLink response exceeds size limit'));
        buf += data.toString('latin1');
        let idx;
        while (!done && (idx = buf.indexOf('\r')) >= 0) {
          const line = buf.slice(0, idx); buf = buf.slice(idx + 1);
          if (prefix === null) {
            if (line === 'PJLINK 0') prefix = '';
            else if (/^PJLINK 1 [0-9a-fA-F]{8}$/.test(line)) prefix = createHash('md5').update(line.slice(9) + password).digest('hex');
            else return fail(new Error('Invalid PJLink handshake'));
            try { throwIfAborted(signal); guard?.(); sock.write(prefix + '%1' + cmd + '\r'); } catch (error) { return fail(error); }
          } else {
            if (line === 'PJLINK ERRA') return fail(Object.assign(new Error('auth failed: PJLink password wrong or not set (Setup tab)'), { code: 'ERRA' }));
            const match = line.match(/^%1([A-Z]{4})=(.*)$/);
            if (!match || match[1] !== cmd.slice(0, 4)) return fail(new Error('Mismatched or malformed PJLink reply'));
            const value = match[2];
            if (Object.hasOwn(ERR, value)) return fail(Object.assign(new Error(ERR[value]), { code: value }));
            if (!cmd.endsWith(' ?') && value !== 'OK') return fail(new Error('Invalid PJLink command acknowledgement'));
            done = true; cleanup(); sock.end(); resolve(value);
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
      const read = cmd => send(cmd, { signal });
      const optional = async (fn, fallback) => { try { return await fn(); } catch (error) { throwIfAborted(signal); if (transportFailure(error)) throw error; return fallback; } };
      const power = await read('POWR ?');
      if (!Object.hasOwn(powerMap, power)) throw new Error('Invalid PJLink power status');
      const s = { power: powerMap[power], online: true, errors: null, lightHours: null, name: null };
      s.shutter = await optional(async () => { const value = await read('AVMT ?'); if (!['10', '11', '20', '21', '30', '31'].includes(value)) throw new Error('Invalid PJLink shutter status'); return value === '11' || value === '31' ? SHUTTER.CLOSED : SHUTTER.OPEN; }, SHUTTER.UNKNOWN);
      s.input = await optional(async () => { const value = await read('INPT ?'); if (!/^[1-6][1-9]$/.test(value)) throw new Error('Invalid PJLink input status'); return value; }, null);
      await optional(async () => { const value = await read('ERST ?'); if (!/^[012]{6}$/.test(value)) throw new Error('Invalid PJLink alarm status'); const [fan, lamp, temp, cover, filter, other] = [...value].map(Number); s.errors = { fan, lamp, temp, cover, filter, other }; });
      await optional(async () => { const value = await read('LAMP ?'); if (!/^\d+ [01](?: \d+ [01])*$/.test(value)) throw new Error('Invalid PJLink lamp status'); const hours = Number(value.split(' ')[0]); if (!Number.isSafeInteger(hours)) throw new Error('Invalid PJLink lamp hours'); s.lightHours = hours; });
      await optional(async () => { s.name = await read('NAME ?'); });
      throwIfAborted(signal); return s;
    },
    power: (on, options) => send(`POWR ${on ? 1 : 0}`, options),
    shutter: (closed, options) => send(`AVMT ${closed ? 31 : 30}`, options),
    input: (id, options) => send(`INPT ${id}`, options),
    async lens() { throw new NotSupported('lens'); },
  };
}
export function pjlinkSearch({ broadcast = '255.255.255.255', waitMs = 2000 } = {}) {
  return new Promise((resolve, reject) => {
    const found = [], seen = new Set();
    const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    let timer, done = false;
    const finish = error => {
      if (done) return; done = true; clearTimeout(timer);
      try { sock.close(); } catch {}
      if (error) reject(new Error('Manual discovery socket failed; saved-address retries remain active.')); else resolve(found);
    };
    sock.on('error', finish);
    sock.on('message', (msg, rinfo) => {
      if (msg.length > 128 || found.length >= 256) return;
      const match = msg.toString('latin1').match(/^%2ACKN=((?:[0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2})\r?$/);
      if (!match) return;
      const mac = match[1].toLowerCase(), key = `${mac}|${rinfo.address}`;
      if (!seen.has(key)) { seen.add(key); found.push({ mac, ip: rinfo.address }); }
    });
    sock.bind(4352, () => {
      try { sock.setBroadcast(true); timer = setTimeout(() => finish(), waitMs); sock.send(Buffer.from('%2SRCH\r', 'latin1'), 4352, broadcast, error => { if (error) finish(error); }); }
      catch (error) { finish(error); }
    });
  });
}
