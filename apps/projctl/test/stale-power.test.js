import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { EventEmitter } from 'node:events';
import { pjlinkDriver } from '../server/drivers/pjlink.js';
import { panasonicDriver } from '../server/drivers/panasonic.js';
import { pulseDriver } from '../server/drivers/pulse.js';
import { createPoller } from '../server/polling.js';

// In-memory transport only: exercise public driver APIs without opening sockets.
test('fresh core survives optional failures through public driver APIs', async t => {
  const original = net.createConnection;
  let mode, raw, kind, calls, open, active;
  net.createConnection = ({ port }) => {
    const socket = new EventEmitter(); socket.dead = false; open.add(socket);
    socket.unref = () => socket;
    socket.destroy = () => { if (!socket.dead) { socket.dead = true; open.delete(socket); socket.emit('close'); } };
    socket.end = socket.destroy;
    socket.write = text => {
      calls.push(text);
      const core = kind === 'pulse' ? JSON.parse(text).params?.property === 'system.state' : text.includes('POWR ?');
      const query = kind === 'pulse' ? JSON.parse(text).method === 'property.get' : text.includes('?') || text.includes('QTS');
      if (!query) assert.equal(active, false, 'control must wait for active exchange');
      active = true;
      queueMicrotask(() => {
        if (socket.dead) return;
        if ((mode === 'core-stall' && core) || (mode === 'stall' && !core) || (mode === 'native-stall' && port === 1024)) return;
        active = false;
        if (mode === 'close' && !core) { socket.destroy(); return; }
        let reply;
        if (kind === 'pulse') {
          const r = JSON.parse(text);
          reply = JSON.stringify({ jsonrpc: '2.0', id: r.id, ...(!query ? { result: true } : core ? { result: raw } : { error: { code: -1, message: 'unsupported' } }) });
        } else if (port === 1024) reply = '00ER401\r';
        else {
          const name = text.slice(2, 6);
          const values = { POWR: raw, AVMT: '30', INPT: '31', ERST: '000000', LAMP: '10 1', NAME: 'fixture' };
          reply = `%1${name}=${core || mode !== 'unsupported' ? values[name] : 'ERR1'}\r`;
          if (!query) reply = `%1${name}=OK\r`;
        }
        socket.emit('data', Buffer.from(reply));
      });
    };
    socket.on('close', () => { active = false; });
    queueMicrotask(() => { socket.emit('connect'); if (kind !== 'pulse') socket.emit('data', Buffer.from(port === 1024 ? 'NTCONTROL 0\r' : 'PJLINK 0\r')); });
    return socket;
  };
  t.after(() => { net.createConnection = original; });
  for (const [name, factory] of [['pjlink', pjlinkDriver], ['panasonic', panasonicDriver], ['pulse', pulseDriver]]) {
    await t.test(name, async () => {
      kind = name; calls = []; open = new Set(); active = false;
      const driver = factory({ host: 'fixture.invalid', timeoutMs: 12 });
      try {
        for (mode of ['close', 'stall', 'unsupported']) {
          raw = name === 'pulse' ? 'on' : '1';
          const s = await driver.getStatus();
          assert.equal(s.power, 'on'); assert.equal(s.shutter, 'unknown'); assert.ok(s.stale.includes('shutter'));
          assert.equal(open.size, mode === 'unsupported' && name !== 'pulse' ? 1 : 0);
        }
        if (name === 'panasonic') {
          mode = 'native-stall'; const s = await driver.getStatus();
          assert.equal(s.power, 'on'); assert.equal(s.shutter, 'open'); assert.equal(s.pattern, null); assert.ok(s.stale.includes('pattern'));
        }
        mode = 'normal';
        assert.equal((await driver.getStatus()).power, 'on', 'recovers after transport failure');
        for (raw of name === 'pulse' ? ['ready', 'boot', 'deconditioning'] : ['0', '3', '2']) {
          calls.length = 0; const s = await driver.getStatus();
          assert.ok(['off', 'warming', 'cooling'].includes(s.power)); assert.equal(calls.length, 1);
        }
        raw = 'garbage'; await assert.rejects(driver.getStatus(), /power status/);
        mode = 'core-stall'; await assert.rejects(driver.getStatus(), /timeout/);
        const aborted = new AbortController(); aborted.abort(new Error('pre-aborted'));
        const count = calls.length;
        await assert.rejects(driver.getStatus({ signal: aborted.signal }), /pre-aborted/); assert.equal(calls.length, count);
        raw = name === 'pulse' ? 'on' : '1'; mode = 'stall';
        const successes = [], failures = [];
        const poller = createPoller({ target: () => ({ slot: 'P1', ip: 'fixture.invalid' }),
          timeoutMs: 4, intervalMs: 1000, read: (_, options) => driver.getStatus(options),
          succeeded: (_, s) => successes.push(s), failed: (_, e) => failures.push(e) });
        await poller.poll('P1');
        assert.equal(successes[0]?.power, 'on'); assert.ok(successes[0].stale.includes('shutter')); assert.equal(failures.length, 0);
        poller.close();
        const stopped = createPoller({ target: () => ({ slot: 'P1', ip: 'fixture.invalid' }), timeoutMs: 100,
          read: (_, options) => driver.getStatus(options), succeeded: () => assert.fail('stop must not publish core') });
        const stopping = stopped.poll('P1');
        await new Promise(resolve => setTimeout(resolve, 2)); stopped.close(); await stopping;
        // Wait for abort cleanup and issue exactly one control behind the cancelled poll.
        mode = 'normal'; await driver.power(false);
        assert.equal(calls.filter(x => name === 'pulse' ? JSON.parse(x).method === 'system.poweroff' : x === '%1POWR 0\r').length, 1);
        driver.close?.(); assert.equal(open.size, 0);
      } finally { driver.close?.(); for (const socket of open) socket.destroy(); }
    });
  }
});
