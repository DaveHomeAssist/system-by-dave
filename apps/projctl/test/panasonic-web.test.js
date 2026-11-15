import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { parsePanasonicStatus, parsePanasonicSelfTest, createPanasonicWebReader } from '../server/drivers/panasonic-web.js';
import { diagnosticsHTML } from '../public/panasonic-diagnostics.js';

const green = value => `<font color="#00ff12"><b>${value}</b></font>`;
const status = `<b>PROJECTOR TYPE</b>${green('DW830U')}<b>LAMP SELECT</b>${green('DUAL')}<b>LAMP POWER</b>${green('ECO')}<b>INPUT</b>${green('HDMI')}${green('WUXGA60RB-A2 (74.05kHz/59.96Hz)')}<b>INTAKE AIR TEMPERATURE</b><b>LAMP1</b>${green('ON')}<b>RUNTIME</b>${green('1096 H')}<b>LAMP2</b><font color="#999999"><b>ON</b></font>${green('OFF')}<b>RUNTIME</b>${green('1070 H')}<b>PROJECTOR RUNTIME</b>${green('4841 H')}`;
const selfTest = '<table><tr><td>FAN</td><td>[ OK ]</td></tr><tr><td>LAMP2 STATUS</td><td>[FAILED]</td></tr><tr><td>HORIZONTAL TILT</td><td>[WARNING]</td></tr></table><p>(Error code 00 22)</p>';

test('Panasonic pages preserve timing, separate lamps and explicit Self Test failures', () => {
  const parsed = parsePanasonicStatus(status);
  assert.equal(parsed.verticalHz, 59.96);
  assert.equal(parsed.horizontalKHz, 74.05);
  assert.deepEqual(parsed.lamps, [{ id: 1, state: 'ON', hours: 1096 }, { id: 2, state: 'OFF', hours: 1070 }]);
  assert.equal(parsed.lampSelection, 'DUAL'); assert.equal(parsed.lampPower, 'ECO');
  assert.equal(parsed.runtimeHours, 4841);
  assert.equal(parsePanasonicSelfTest(selfTest).result, 'FAILED');
  assert.throws(() => parsePanasonicSelfTest('<html>Login</html>'));
  assert.throws(() => parsePanasonicStatus('<html>Login</html>'));
});

test('web reader only GETs the two status paths and refuses redirects without leaking secrets', async () => {
  const requests = [];
  let redirect = false;
  const server = http.createServer((req, res) => {
    requests.push([req.method, req.url]);
    assert.equal(req.headers.authorization, 'Basic ' + Buffer.from('fixture:private').toString('base64'));
    if (redirect) { res.writeHead(302, { location: '/control' }); res.end(); return; }
    res.end(req.url.includes('selfcheck') ? selfTest : status);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const read = createPanasonicWebReader({ host: '127.0.0.1', port: server.address().port, user: 'fixture', password: 'private', now: () => 1000 });
    const result = await read();
    assert.equal(result.status.state, 'reported'); assert.equal(result.selfTest.state, 'reported');
    assert.deepEqual(requests, [['GET', '/cgi-bin/projector_status.cgi?lang=e'], ['GET', '/cgi-bin/selfcheck.cgi']]);
    redirect = true;
    const failed = await read();
    assert.equal(failed.status.state, 'unavailable');
    assert.doesNotMatch(JSON.stringify(failed), /private|Authorization|control/);
    assert.equal(requests.length, 4);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('diagnostic presentation distinguishes fresh, stale, failed and missing pages', () => {
  const p = { driver: 'panasonic', webDiagnostics: { status: { state: 'reported', observedAt: new Date(1000).toISOString(), ...parsePanasonicStatus(status) }, selfTest: { state: 'reported', observedAt: new Date(1000).toISOString(), ...parsePanasonicSelfTest(selfTest) } } };
  assert.match(diagnosticsHTML(p, true, 2000), /Reported.*Lamp 2 · OFF · 1070 h/s);
  assert.match(diagnosticsHTML(p, true, 200000), /Last known/);
  assert.match(diagnosticsHTML(p, false, 2000), /Last known/);
  assert.match(diagnosticsHTML({ driver: 'panasonic' }, true), /Unavailable/);
  assert.equal(diagnosticsHTML({ driver: 'pulse' }, true), '');
});
