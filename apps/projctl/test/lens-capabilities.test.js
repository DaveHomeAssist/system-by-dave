import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDriver } from '../server/drivers/index.js';

test('lens metadata distinguishes implemented jogs from unsupported PJLink methods without connecting', () => {
  for (const driver of ['pulse', 'simulator', 'panasonic', 'pjlink']) {
    const d = makeDriver({ driver, ip: '192.0.2.1' });
    assert.deepEqual(d.lensJog.axes, driver === 'pjlink' ? [] : ['h', 'v', 'focus', 'zoom']);
    assert.deepEqual(d.lensJog.speeds, driver === 'pjlink' ? [] : ['slow', 'normal', 'fast']);
    assert.equal(d.lensJog.mode, driver === 'pjlink' ? 'unsupported' : driver === 'panasonic' ? 'native-jog' : 'bounded-step');
    assert.equal(d.lensJog.stop, ['pulse', 'simulator'].includes(driver));
    assert.equal(d.lensJog.positionReadback, ['pulse', 'simulator'].includes(driver));
  }
});


test('simulated fine, normal and coarse steps use distinct bounded increments', async () => {
  const d = makeDriver({ driver: 'simulator' });
  for (const [speed, increment] of [['slow', 128], ['normal', 512], ['fast', 2048]]) {
    const before = (await d.getStatus()).lens.focus;
    await d.lens({ axis: 'focus', dir: '+', speed });
    assert.equal((await d.getStatus()).lens.focus, before + increment);
  }
});
