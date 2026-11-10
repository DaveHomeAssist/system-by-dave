import dgram from 'node:dgram';
import net from 'node:net';

// IP restrictions are network controls, not authentication or encryption.
export function cuePolicy(protocol, options = {}, env = process.env) {
  if (!['OSC', 'TCP'].includes(protocol)) throw new Error('Unknown cue protocol');
  const flag = options.enabled ?? env[`PROJCTL_${protocol}_ENABLED`] ?? '1';
  if (![true, false, '0', '1'].includes(flag)) throw new Error('Cue enabled setting must be 0 or 1');
  const enabled = flag === true || flag === '1';
  const host = options.host ?? env.PROJCTL_CUE_HOST;
  if (host !== undefined && !net.isIP(host)) throw new Error('PROJCTL_CUE_HOST must be an IP address');
  const raw = options.allowlist ?? env.PROJCTL_CUE_ALLOWLIST ?? '';
  if (typeof raw !== 'string') throw new Error('Cue allowlist must be comma-separated IP addresses');
  const entries = raw.trim() ? raw.split(',').map(value => value.trim()) : [];
  if (entries.length > 256 || entries.some(value => !net.isIP(value))) throw new Error('Cue allowlist contains an invalid IP address');
  const block = new net.BlockList();
  const normalize = value => typeof value === 'string' && value.toLowerCase().startsWith('::ffff:') && net.isIP(value.slice(7)) === 4 ? value.slice(7) : value;
  for (const value of entries) { const ip = normalize(value); block.addAddress(ip, net.isIP(ip) === 4 ? 'ipv4' : 'ipv6'); }
  return { enabled, host, restricted: entries.length > 0, permits(address) {
    const ip = normalize(address), family = net.isIP(ip || '');
    return !!family && (!entries.length || block.check(ip, family === 4 ? 'ipv4' : 'ipv6'));
  } };
}
function warnExposure(protocol, policy) {
  if (!policy.restricted && !['127.0.0.1', '::1'].includes(policy.host)) console.warn(`[${protocol.toLowerCase()}] Cue listener has no source restriction; web login does not protect cues. Configure PROJCTL_CUE_HOST/PROJCTL_CUE_ALLOWLIST or disable this listener.`);
}
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
export function startOsc({ port, onMessage, host, enabled, allowlist, maxPacketBytes = 4096, maxInFlight = 64 }) {
  const policy = cuePolicy('OSC', { host, enabled, allowlist });
  if (!policy.enabled) { console.log('[osc] disabled'); return null; }
  warnExposure('OSC', policy);
  const sock = dgram.createSocket('udp4');
  let active = 0;
  sock.on('message', (msg, rinfo) => {
    if (!policy.permits(rinfo.address) || msg.length > maxPacketBytes || active >= maxInFlight) return;
    for (const m of parseOsc(msg)) {
      active++;
      Promise.resolve().then(() => onMessage(m.addr, m.args, `osc ${rinfo.address}`))
        .catch(e => console.error('[osc]', e?.message || 'cue failed'))
        .finally(() => { active--; });
    }
  });
  sock.on('error', e => console.error('[osc]', e.message));
  sock.bind(port, policy.host, () => console.log(`[osc] listening udp ${sock.address().port}`));
  return sock;
}
export function startTcpLines({ port, onMessage, host, enabled, allowlist, maxLineBytes = 4096, maxConnections = 64, maxInFlight = 64, idleTimeoutMs = 300000 }) {
  const policy = cuePolicy('TCP', { host, enabled, allowlist });
  if (!policy.enabled) { console.log('[tcp] disabled'); return null; }
  warnExposure('TCP', policy);
  let active = 0;
  const srv = net.createServer(sock => {
    if (!policy.permits(sock.remoteAddress)) { sock.destroy(); return; }
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
  srv.listen(port, policy.host, () => console.log(`[tcp] listening ${srv.address().port}`));
  return srv;
}
