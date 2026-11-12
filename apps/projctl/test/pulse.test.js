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
      const core = request.params?.property === 'system.state';
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

test('Pulse uses discovered inputs, validated picture ranges and waits for bounded lens movement', async (t) => {
  const values = { 'system.state': 'on', 'image.window.main.source': 'L1 HDMI', 'image.brightness': 0 };
  const requests = [];
  let running = false, position = 1000, target = 1000, hold = false, sourceChanged = false;
  const sockets = new Set();
  const server = net.createServer((socket) => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket)); let text = '';
    socket.on('data', (b) => {
      text += b; if (!text.includes('\n')) return;
      const r = JSON.parse(text); requests.push(r); let result, error;
      if (r.method === 'image.source.list') result = ['L1 HDMI', 'L1 SDI A'];
      else if (r.method === 'introspect') result = { properties: [{ name: 'brightness', access: 'READ_WRITE', type: { base: 'float', min: -1, max: 1, precision: 0.01 } }] };
      else if (r.method === 'property.get') {
        const p = r.params.property;
        result = p.endsWith('.minposition') ? 0 : p.endsWith('.maxposition') ? 65535 : p.endsWith('.safetooperate') ? true : p.endsWith('.state') && p !== 'system.state' ? (running ? 'Running' : 'Stopped') : p.endsWith('.position') ? position : values[p];
        if (result === undefined) error = { code: -32601, message: 'unsupported' };
      } else if (r.method === 'property.set') {
        if (r.params.property.endsWith('.target')) { target = r.params.value; running = true; if (!hold) setTimeout(() => { position = target; running = false; }, 70); }
        else { values[r.params.property] = r.params.value; if (r.params.property === 'image.window.main.source') sourceChanged = true; }
        result = true;
      } else if (r.method.endsWith('.stop')) { running = false; result = null; }
      const reply = () => socket.end(JSON.stringify({ jsonrpc: '2.0', id: r.id, ...(error ? { error } : { result }) }));
      if (r.params?.property === 'image.window.main.source' && (r.method === 'property.set' || sourceChanged)) { if (r.method === 'property.get') sourceChanged = false; setTimeout(reply, 70); } else reply();
    });
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { for (const s of sockets) s.destroy(); server.close(); });
  const d = pulseDriver({ host: '127.0.0.1', port: server.address().port, motionPollMs: 10, motionTimeoutMs: 200, motionSettleMs: 0 });
  await d.getStatus();
  assert.deepEqual(Object.keys(d.inputs), ['L1 HDMI', 'L1 SDI A']);
  await assert.rejects(d.input('HDMI'), /available/);
  const short = pulseDriver({ host: '127.0.0.1', port: server.address().port, timeoutMs: 30 });
  await short.getStatus();
  await short.input('L1 SDI A');
  await d.input('L1 SDI A'); assert.equal(values['image.window.main.source'], 'L1 SDI A');
  assert.equal(d.pictureSchema.brightness.step, 0.01);
  await assert.rejects(d.picture('brightness', 2), /range/);
  await assert.rejects(d.picture('iris', 0), /Unsupported/);
  await d.picture('brightness', 0.1); assert.equal(values['image.brightness'], 0.1);
  const start = Date.now(); await d.lens({ axis: 'focus', dir: '+', speed: 'slow' });
  assert.ok(Date.now() - start >= 70); assert.equal(position, 1128); assert.equal(running, false);
  assert.equal(requests.some((r) => /stepforward/.test(r.method)), false);
  for (const [speed, delta] of [['normal', 512], ['fast', 2048]]) { const before = position; await d.lens({ axis: 'focus', dir: '+', speed }); assert.equal(position, before + delta); }
  const mismatch = pulseDriver({ host: '127.0.0.1', port: server.address().port, motionPollMs: 10, motionSettleMs: 0 });
  await mismatch.recallLens({ focus: 2500 });
  assert.equal(position, 2500, 'fresh readback is the saved target in this fixture');
  hold = true;
  await assert.rejects(d.lens({ axis: 'focus', dir: '+', speed: 'slow' }), /timed out; stop requested/);
  assert.equal(running, false);
  values['system.state'] = 'ready';
  await assert.rejects(d.lens({ axis: 'zoom', dir: '-', speed: 'slow' }), /Power on/);
  await d.lens({ op: 'stop' });
  assert.equal(requests.filter((r) => r.method.endsWith('.stop')).length, 5);
});

test('Stop cancels a pending target, and monitoring failure requests a stop', async (t) => {
  let mode = 'pending', moved = false, running = false, stops = 0, releaseQuery;
  const queryStarted = new Promise((resolve) => { releaseQuery = resolve; });
  const sockets = new Set();
  const server = net.createServer((socket) => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket)); let text = '';
    socket.on('data', (b) => {
      text += b; if (!text.includes('\n')) return;
      const r = JSON.parse(text), p = r.params?.property;
      let result = true, error;
      if (r.method === 'property.get') {
        result = p === 'system.state' ? 'on' : p.endsWith('.state') ? 'Stopped' : p.endsWith('.safetooperate') ? true : p.endsWith('.minposition') ? 0 : p.endsWith('.maxposition') ? 65535 : 1000;
        if (mode === 'monitor-error' && moved && p.endsWith('.state')) error = { code: -1, message: 'motor telemetry lost' };
      } else if (r.method === 'property.set') { moved = true; running = true; }
      else if (r.method.endsWith('.stop')) { stops++; running = false; }
      const reply = () => socket.end(JSON.stringify({ jsonrpc: '2.0', id: r.id, ...(error ? { error } : { result }) }));
      if (mode === 'pending' && p?.endsWith('.minposition')) { releaseQuery(); setTimeout(reply, 60); } else reply();
    });
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { for (const socket of sockets) socket.destroy(); server.close(); });
  const d = pulseDriver({ host: '127.0.0.1', port: server.address().port, motionPollMs: 10, motionSettleMs: 0 });
  const cancelled = assert.rejects(d.lens({ axis: 'focus', dir: '+' }), /cancelled by Stop lens/);
  await queryStarted;
  await d.lens({ op: 'stop' }); await cancelled;
  assert.equal(moved, false, 'a pending target must never start after Stop');
  assert.equal(stops, 4);
  mode = 'monitor-error';
  await assert.rejects(d.lens({ axis: 'focus', dir: '+' }), /motor telemetry lost; stop requested/);
  assert.equal(moved, true); assert.equal(running, false); assert.equal(stops, 5);
});

test('compound recall validates all axes before targets and stops all axes on a partial send failure', async (t) => {
  const requests = [], sockets = new Set(); let failZoom = false;
  const server = net.createServer(socket => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket)); let data = '';
    socket.on('data', bytes => {
      data += bytes; if (!data.includes('\n')) return;
      const request = JSON.parse(data.trim()); requests.push(request);
      const property = request.params?.property;
      let result = true, error;
      if (property === 'system.state') result = 'on';
      else if (property?.endsWith('.state')) result = 'Stopped';
      else if (property?.endsWith('.minposition')) result = 0;
      else if (property?.endsWith('.maxposition')) result = 100;
      else if (request.method === 'property.set' && property === 'optics.zoom.target' && failZoom) error = { message: 'fixture target refused' };
      socket.end(JSON.stringify({ jsonrpc: '2.0', id: request.id, ...(error ? { error } : { result }) }));
    });
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { for (const socket of sockets) socket.destroy(); server.close(); });
  const driver = pulseDriver({ host: '127.0.0.1', port: server.address().port });
  await assert.rejects(driver.recallLens({ focus: 10, zoom: 101 }), /travel limits/);
  assert.equal(requests.filter(r => r.method === 'property.set').length, 0);
  await assert.rejects(driver.recallLens({ focus: 10, bogus: 5 }), /Invalid/);
  failZoom = true;
  await assert.rejects(driver.recallLens({ focus: 10, zoom: 20 }), /stop requested/);
  assert.deepEqual(requests.filter(r => r.method.endsWith('.stop')).map(r => r.method), ['optics.focus.stop', 'optics.zoom.stop']);
});

test('Stop is not queued behind a slow status read, and one axis failure still stops the others', async (t) => {
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  const stops = [];
  const server = net.createServer((socket) => {
    let text = '';
    socket.on('data', (bytes) => {
      text += bytes;
      if (!text.includes('\n')) return;
      const request = JSON.parse(text);
      text = '';
      const method = String(request.method);
      if (method === 'property.get' && request.params?.property === 'system.state') {
        held.then(() => socket.end(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: 'on' })));
        return;
      }
      if (method.endsWith('.stop')) {
        stops.push(method);
        if (method.startsWith('optics.focus')) { socket.destroy(); return; }
        socket.end(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: null }));
        return;
      }
      socket.end(JSON.stringify({ jsonrpc: '2.0', id: request.id, error: { code: -32601, message: 'unsupported' } }));
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { release(); server.close(); });
  const driver = pulseDriver({ host: '127.0.0.1', port: server.address().port, timeoutMs: 1000 });
  const pending = driver.getStatus();
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(stops.length, 0);
  await assert.rejects(driver.lens({ op: 'stop' }), /did not acknowledge/);
  assert.equal(stops.length, 4);
  assert.ok(stops.includes('optics.focus.stop'));
  release();
  const status = await pending;
  assert.equal(status.power, 'on');
});
