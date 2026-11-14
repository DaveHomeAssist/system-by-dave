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
  // One PJLink session per projector stays open between status polls, so a
  // poll does not open a new connection every few seconds. The digest goes on
  // the first command of a session only, as PJLink specifies; a projector that
  // answers a later command with an authentication error gets it on every
  // command from then on. Gear that closes after each reply continues on a new
  // session instead of failing the poll. Every poll returns a complete status.
  const CLOSED = 'connection closed before PJLink reply';
  let live = null, digestEveryCommand = false, chain = Promise.resolve();
  const cancelled = signal => signal?.reason || new Error('Projector poll cancelled');
  function dropSession(session) {
    if (!session) return;
    if (!session.dead) session.dead = new Error(CLOSED);
    if (live === session) live = null;
    session.sock.destroy();
    session.wake?.();
  }
  function openSession() {
    const sock = net.createConnection({ host, port });
    sock.unref(); // an idle session must not keep the relay or a test alive
    const session = { sock, buf: '', bytes: 0, lines: [], dead: null, wake: null, prefix: null, first: true };
    const die = error => { if (!session.dead) session.dead = error; if (live === session) live = null; session.wake?.(); };
    sock.on('error', die);
    sock.on('end', () => die(new Error(CLOSED)));
    sock.on('close', () => die(new Error(CLOSED)));
    sock.on('data', data => {
      session.bytes += data.length;
      if (session.bytes > 8192) { die(new Error('PJLink response exceeds size limit')); sock.destroy(); return; }
      session.buf += data.toString('latin1');
      let idx;
      while ((idx = session.buf.indexOf('\r')) >= 0) { session.lines.push(session.buf.slice(0, idx)); session.buf = session.buf.slice(idx + 1); }
      session.wake?.();
    });
    return session;
  }
  // The next reply line, or the reason there will not be one. A line that arrived
  // before the projector closed is still delivered.
  function nextLine(session, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(cancelled(signal));
      let timer;
      const settle = (fn, value) => { clearTimeout(timer); signal?.removeEventListener('abort', onAbort); session.wake = null; fn(value); };
      const onAbort = () => settle(reject, cancelled(signal));
      const check = () => {
        if (session.lines.length) settle(resolve, session.lines.shift());
        else if (session.dead) settle(reject, session.dead);
      };
      timer = setTimeout(() => settle(reject, new Error('timeout')), timeoutMs);
      signal?.addEventListener('abort', onAbort, { once: true });
      session.wake = check;
      check();
    });
  }
  // 'end' is delivered after the reply's 'data'. A zero timer lets the close be
  // seen first, so a one-reply projector is not written to again.
  const letCloseArrive = () => new Promise(resolve => setTimeout(resolve, 0));
  async function runQuery(commands, { signal } = {}) {
    throwIfAborted(signal);
    const out = new Map();
    let pending = commands.slice(), retriedFresh = false;
    while (pending.length) {
      let session = live && !live.dead ? live : null;
      const reused = !!session;
      let consumed = 0, reopen = false;
      try {
        if (session) { session.lines.length = 0; session.buf = ''; }
        else {
          session = live = openSession();
          const greeting = await nextLine(session, signal);
          if (greeting === 'PJLINK 0') session.prefix = '';
          else if (/^PJLINK 1 [0-9a-fA-F]{8}$/.test(greeting)) session.prefix = createHash('md5').update(greeting.slice(9) + password).digest('hex');
          else throw new Error('Invalid PJLink handshake');
        }
        session.bytes = 0;
        for (const cmd of pending) {
          if (consumed) { await letCloseArrive(); if (session.dead && !session.lines.length) { reopen = true; break; } }
          throwIfAborted(signal);
          const withDigest = session.first || digestEveryCommand;
          session.sock.write((withDigest ? session.prefix : '') + '%1' + cmd + '\r');
          session.first = false;
          let line;
          try { line = await nextLine(session, signal); }
          catch (error) {
            // The command went into a socket the projector had already closed: after an
            // earlier reply (one-reply gear), or an idle session it dropped between polls.
            const staleSession = reused && !consumed && !retriedFresh;
            if (error.message === CLOSED && !signal?.aborted && (consumed || staleSession)) { if (!consumed) retriedFresh = true; reopen = true; break; }
            throw error;
          }
          if (line === 'PJLINK ERRA') {
            if (!withDigest && session.prefix) { digestEveryCommand = true; reopen = true; break; }
            throw Object.assign(new Error('auth failed: PJLink password wrong or not set (Setup tab)'), { code: 'ERRA' });
          }
          const match = line.match(/^%1([A-Z]{4})=(.*)$/);
          if (!match || match[1] !== cmd.slice(0, 4)) throw new Error('Mismatched or malformed PJLink reply');
          const value = match[2];
          if (Object.hasOwn(ERR, value)) out.set(cmd, { error: Object.assign(new Error(ERR[value]), { code: value }) });
          else if (!cmd.endsWith(' ?') && value !== 'OK') throw new Error('Invalid PJLink command acknowledgement');
          else out.set(cmd, { value });
          consumed += 1;
        }
      } catch (error) {
        dropSession(session);
        if (signal?.aborted) throw cancelled(signal);
        throw error;
      }
      pending = pending.slice(consumed);
      if (reopen) dropSession(session);
    }
    return out;
  }
  // Polls and commands take turns, so a command never overlaps a poll on this projector.
  function inTurn(work) {
    const run = chain.then(work);
    chain = run.catch(() => {});
    return run;
  }
  const query = (commands, options) => inTurn(() => runQuery(commands, options));
  // A command closes the held status session and uses its own connection, as it
  // always has. The next poll opens a new session.
  const command = (cmd, options) => inTurn(() => { options?.guard?.(); dropSession(live); return send(cmd, options); });
  const powerMap = { '0': POWER.OFF, '1': POWER.ON, '2': POWER.COOLING, '3': POWER.WARMING };
  return {
    kind: 'pjlink',
    lensJog: { axes: [], speeds: [], mode: 'unsupported', stop: false, positionReadback: false },
    async getStatus({ signal } = {}) {
      const got = await query(['POWR ?', 'AVMT ?', 'INPT ?', 'ERST ?', 'LAMP ?', 'NAME ?'], { signal });
      const read = cmd => {
        const entry = got.get(cmd);
        if (!entry) throw new Error(CLOSED);
        if (entry.error) throw entry.error;
        return entry.value;
      };
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
    power: (on, options) => command(`POWR ${on ? 1 : 0}`, options),
    shutter: (closed, options) => command(`AVMT ${closed ? 31 : 30}`, options),
    input: (id, options) => command(`INPT ${id}`, options),
    async lens() { throw new NotSupported('lens'); },
    // Close the held status session, for a driver that is being replaced or a relay that is stopping.
    close() { dropSession(live); },
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
