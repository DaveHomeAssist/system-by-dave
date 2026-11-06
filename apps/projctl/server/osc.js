// Minimal OSC 1.0 parser (address + int/float/string args) on UDP, plus a
// plain-text TCP line listener that accepts the same "/proj/..." form.
import dgram from 'node:dgram';
import net from 'node:net';

function readPadded(buf, off) {
  const end = buf.indexOf(0, off); const s = buf.toString('utf8', off, end);
  return [s, (end + 4) & ~3];
}
export function parseOsc(buf) {
  if (buf.toString('latin1', 0, 7) === '#bundle') return []; // bundles not needed here
  let [addr, off] = readPadded(buf, 0);
  if (!addr.startsWith('/')) return [];
  let args = [];
  if (buf[off] === 0x2c) { // ','
    let tags; [tags, off] = readPadded(buf, off);
    for (const t of tags.slice(1)) {
      if (t === 'i') { args.push(buf.readInt32BE(off)); off += 4; }
      else if (t === 'f') { args.push(buf.readFloatBE(off)); off += 4; }
      else if (t === 's') { let s; [s, off] = readPadded(buf, off); args.push(s); }
      else if (t === 'T') args.push(1); else if (t === 'F') args.push(0);
    }
  }
  return [{ addr, args }];
}

export function startOsc({ port, onMessage }) {
  const sock = dgram.createSocket('udp4');
  sock.on('message', (msg, rinfo) => { for (const m of parseOsc(msg)) onMessage(m.addr, m.args, `osc ${rinfo.address}`); });
  sock.on('error', (e) => console.error('[osc]', e.message));
  sock.bind(port, () => console.log(`[osc] listening udp ${port}`));
  return sock;
}

export function startTcpLines({ port, onMessage }) {
  const srv = net.createServer((sock) => {
    let buf = '';
    sock.on('data', (d) => {
      buf += d.toString();
      let i; while ((i = buf.search(/[\r\n]/)) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line) continue;
        const [addr, ...rest] = line.split(/\s+/);
        onMessage(addr, rest.map((x) => (isNaN(Number(x)) ? x : Number(x))), `tcp ${sock.remoteAddress}`);
        sock.write('OK\n');
      }
    });
    sock.on('error', () => {});
  });
  srv.listen(port, () => console.log(`[tcp] listening ${port}`));
  return srv;
}
