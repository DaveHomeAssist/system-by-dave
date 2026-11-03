import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { once } from 'node:events';
import { pulseDriver } from '../server/drivers/pulse.js';

test('Pulse requires a core reply, tolerates unsupported optional fields, and recovers', async (t) => {
  let mode = 'timeout';
  const sockets = new Set();
  const server = net.createServer((socket) => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket));
    let text = '';
    socket.on('data', (b) => {
      text += b;
      if (!text.includes('\n') || mode === 'timeout') return;
      const request = JSON.parse(text);
      const core = request.params.property === 'system.state';
      const reply = { jsonrpc: '2.0', id: request.id };
      if (core && mode === 'online') reply.result = 'on';
      else reply.error = { code: -32601, message: 'unsupported property' };
      // Actual Pulse replies have no newline. Preserve that supported framing.
      socket.end(JSON.stringify(reply));
    });
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { for (const socket of sockets) socket.destroy(); server.close(); });
  const driver = pulseDriver({ host: '127.0.0.1', port: server.address().port, timeoutMs: 40 });
  await assert.rejects(driver.getStatus(), /timeout/);
  mode = 'unsupported'; await assert.rejects(driver.getStatus(), /unsupported/);
  mode = 'online';
  const status = await driver.getStatus();
  assert.equal(status.online, true); assert.equal(status.power, 'on');
  assert.equal(status.shutter, 'unknown'); assert.equal(status.input, null);
  for (const socket of sockets) socket.destroy();
  await new Promise((resolve) => server.close(resolve));
  await assert.rejects(driver.getStatus(), /ECONNREFUSED/);
});
