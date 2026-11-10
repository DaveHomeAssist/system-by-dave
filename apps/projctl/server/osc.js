import dgram from 'node:dgram';
import net from 'node:net';

function readPadded(buf, off) {
  if (off >= buf.length) throw new Error('missing OSC string');
  const end = buf.indexOf(0, off), next = (end + 4) & ~3;
  if (end < off || next > buf.length || buf.subarray(end, next).some(b => b !== 0)) throw new Error('invalid OSC string padding');
  return [buf.toString('utf8', off, end), next];
}
export function parseOsc(buf) {
  try {
    if (!buf.length || buf.length % 4) return [];
    if (buf.toString('latin1', 0, 7) === '#bundle') return [];
    let [addr, off] = readPadded(buf, 0);
    if (!addr.startsWith('/')) return [];
    const args = [];
    if (buf[off] === 0x2c) {
      let tags; [tags, off] = readPadded(buf, off);
      for (const t of tags.slice(1)) {
        if ((t === 'i' || t === 'f') && off + 4 > buf.length) return [];
        if (t === 'i') { args.push(buf.readInt32BE(off)); off += 4; }
        else if (t === 'f') { args.push(buf.readFloatBE(off)); off += 4; }
        else if (t === 's') { let s; [s, off] = readPadded(buf, off); args.push(s); }
        else if (t === 'T') args.push(1);
        else if (t === 'F') args.push(0);
        else return [];
      }
    }
    if (off !== buf.length || args.some(a => typeof a === 'number' && !Number.isFinite(a))) return [];
    return [{ addr, args }];
  } catch { return []; }
}

export function startOsc({ port, onMessage, host, maxPacketBytes = 4096, maxInFlight = 64 }) {
  const sock = dgram.createSocket('udp4');
  let active = 0;
  sock.on('message', (msg, rinfo) => {
    if (msg.length > maxPacketBytes || active >= maxInFlight) return;
    for (const m of parseOsc(msg)) {
      active++;
      Promise.resolve().then(() => onMessage(m.addr, m.args, `osc ${rinfo.address}`))
        .catch(e => console.error('[osc]', e?.message || 'cue failed'))
        .finally(() => { active--; });
    }
  });
  sock.on('error', e => console.error('[osc]', e.message));
  sock.bind(port, host, () => console.log(`[osc] listening udp ${sock.address().port}`));
  return sock;
}

export function startTcpLines({ port, onMessage, host, maxLineBytes = 4096, maxConnections = 64, maxInFlight = 64, idleTimeoutMs = 300000 }) {
  let active = 0;
  const srv = net.createServer(sock => {
    let buf = Buffer.alloc(0);
    sock.setTimeout(idleTimeoutMs, () => sock.destroy());
    sock.on('data', data => {
      let start = 0;
      for (let i = 0; i < data.length; i++) {
        if (data[i] !== 10 && data[i] !== 13) continue;
        if (buf.length + i - start > maxLineBytes) { sock.destroy(); return; }
        const line = Buffer.concat([buf, data.subarray(start, i)]).toString('utf8').trim();
        buf = Buffer.alloc(0); start = i + 1;
        if (!line) continue;
        if (active >= maxInFlight || sock.writableLength > 16384) { sock.destroy(); return; }
        const [addr, ...rest] = line.split(/\s+/);
        active++;
        Promise.resolve().then(() => onMessage(addr, rest.map(x => isNaN(Number(x)) ? x : Number(x)), `tcp ${sock.remoteAddress}`))
          .catch(e => console.error('[tcp]', e?.message || 'cue failed'))
          .finally(() => { active--; });
        sock.write('OK\n'); // Receipt only, not execution acknowledgement.
      }
      if (buf.length + data.length - start > maxLineBytes) { sock.destroy(); return; }
      if (start < data.length) buf = Buffer.concat([buf, data.subarray(start)]);
    });
    sock.on('error', () => {});
  });
  srv.maxConnections = maxConnections;
  srv.listen(port, host, () => console.log(`[tcp] listening ${srv.address().port}`));
  return srv;
}
