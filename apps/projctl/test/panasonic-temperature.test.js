import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { once } from 'node:events';
import { panasonicDriver } from '../server/drivers/panasonic.js';
import { pulseDriver } from '../server/drivers/pulse.js';

// Loopback stand-ins for the projector's two control ports. Each driver command opens
// its own connection, as the real drivers do.
async function fakePanasonic({ qtm }) {
  const sockets = new Set();
  const pjlink = net.createServer((socket) => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket));
    let text = ''; socket.write('PJLINK 0\r');
    socket.on('data', (b) => {
      text += b; if (!text.includes('\r')) return;
      const cmd = text.slice(0, text.indexOf('\r')).replace(/^%1/, '').slice(0, 4);
      const reply = { POWR: '1', AVMT: '30', INPT: '31', ERST: '000000', LAMP: '100 1', NAME: 'Fake' }[cmd];
      socket.write(`%1${cmd}=${reply}\r`);
    });
  });
  const native = net.createServer((socket) => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket));
    let text = ''; socket.write('NTCONTROL 0\r');
    socket.on('data', (b) => {
      text += b; if (!text.includes('\r')) return;
      const cmd = text.slice(2, text.indexOf('\r'));
      socket.write(cmd === 'QTS' ? '0000\r' : cmd === 'QTM:0' ? `00${qtm()}\r` : '00ER401\r');
    });
  });
  for (const s of [pjlink, native]) { s.listen(0, '127.0.0.1'); await once(s, 'listening'); }
  return { pjlinkPort: pjlink.address().port, port: native.address().port, close() { for (const s of sockets) s.destroy(); pjlink.close(); native.close(); } };
}

test('Panasonic status carries intake air from QTM:0 and degrades to no reading', async (t) => {
  let reply = '023/073';
  const fake = await fakePanasonic({ qtm: () => reply }); t.after(fake.close);
  const driver = panasonicDriver({ host: '127.0.0.1', port: fake.port, pjlinkPort: fake.pjlinkPort, timeoutMs: 500, model: 'PT-DW830U' });
  assert.equal(driver.air, 'intake');
  let s = await driver.getStatus();
  assert.equal(s.online, true); assert.deepEqual(s.air, { c: 23, kind: 'intake', raw: '023/073' });
  reply = '037/099';
  assert.equal((await driver.getStatus()).air.c, 37);
  reply = 'garbled';
  s = await driver.getStatus();
  assert.equal(s.online, true, 'an unreadable temperature never takes the projector offline');
  assert.equal(s.air.c, null); assert.equal(s.air.raw, 'garbled');
  reply = 'ER401';
  s = await driver.getStatus();
  assert.equal(s.online, true); assert.equal(s.air, null, 'a refusal (for example in standby) means no reading');
});

test('Pulse reads ambient air only from a configured property and ignores implausible values', async (t) => {
  let value = 29.8; const asked = [];
  const sockets = new Set();
  const server = net.createServer((socket) => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket)); let text = '';
    socket.on('data', (b) => {
      text += b; if (!text.includes('\n')) return;
      const r = JSON.parse(text); asked.push(r.params?.property);
      const reply = { jsonrpc: '2.0', id: r.id };
      if (r.params?.property === 'system.state') reply.result = 'on';
      else if (r.params?.property === 'test.ambient') reply.result = value;
      else reply.error = { code: -32601, message: 'unsupported' };
      socket.end(JSON.stringify(reply));
    });
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { for (const s of sockets) s.destroy(); server.close(); });
  const port = server.address().port;
  const plain = pulseDriver({ host: '127.0.0.1', port, timeoutMs: 500 });
  assert.equal(plain.air, null); assert.equal((await plain.getStatus()).air, undefined);
  assert.equal(asked.includes('test.ambient'), false, 'no property is assumed');
  const driver = pulseDriver({ host: '127.0.0.1', port, timeoutMs: 500, ambientProperty: 'test.ambient' });
  assert.equal(driver.air, 'ambient');
  assert.deepEqual((await driver.getStatus()).air, { c: 29.8, kind: 'ambient', raw: '29.8' });
  value = 999; assert.equal((await driver.getStatus()).air, null);
  value = 'hot'; assert.equal((await driver.getStatus()).air, null);
  const missing = pulseDriver({ host: '127.0.0.1', port, timeoutMs: 500, ambientProperty: 'no.such.property' });
  const s = await missing.getStatus(); assert.equal(s.online, true); assert.equal(s.air, null);
});
