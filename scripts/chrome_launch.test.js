'use strict';

const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const test = require('node:test');

const { launchChrome } = require('./chrome_launch');

/* A stand-in for the pieces launchChrome touches. `behaviour[n]` says what the
   n-th start does: 'answers', 'silent' (never opens the port) or 'exits'. */
function harness(behaviour) {
  const started = [];
  const removed = [];
  const logged = [];
  let waits = 0;
  const options = {
    chromeBin: '/fake/chrome',
    args: ['--headless=new'],
    profilePrefix: 'probe-',
    portBase: 9500,
    portSpan: 300,
    timeoutMs: 1000,
    pollMs: 250,
    log: (line) => logged.push(line),
    random: () => started.length / 300,
    makeProfile: (prefix) => `/tmp/${prefix}${started.length + 1}`,
    removeProfile: (profile) => removed.push(profile),
    wait: async () => { waits += 1; },
    spawn: (bin, args, spawnOptions) => {
      const chrome = new EventEmitter();
      chrome.stderr = new EventEmitter();
      chrome.killed = [];
      chrome.kill = (signal) => { chrome.killed.push(signal); };
      const start = { bin, args, spawnOptions, chrome, mode: behaviour[started.length] };
      started.push(start);
      if (start.mode === 'exits') {
        setImmediate(() => {
          chrome.stderr.emit('data', 'first line\nMissing X server\ncannot open display\nlast line\n');
          chrome.emit('exit', 1, null);
        });
      }
      return chrome;
    },
    fetchVersion: async (port) => {
      const start = started.find((entry) => entry.args.includes(`--remote-debugging-port=${port}`));
      if (start.mode === 'exits') await new Promise((resolve) => setImmediate(resolve));
      if (start.mode !== 'answers') throw new Error('connection refused');
      return { ok: true, json: async () => ({ Browser: 'Chrome/Fake' }) };
    }
  };
  return { options, started, removed, logged, waits: () => waits };
}

test('a first start that answers is used as it is', async () => {
  const run = harness(['answers']);
  const result = await launchChrome(run.options);
  assert.equal(result.attempt, 1);
  assert.equal(result.port, 9500);
  assert.equal(result.profile, '/tmp/probe-1');
  assert.deepEqual(result.version, { Browser: 'Chrome/Fake' });
  assert.equal(result.chrome, run.started[0].chrome);
  assert.deepEqual(run.started[0].args, ['--headless=new', '--remote-debugging-port=9500', '--user-data-dir=/tmp/probe-1', 'about:blank']);
  assert.deepEqual(run.started[0].spawnOptions, { stdio: ['ignore', 'ignore', 'pipe'] });
  assert.deepEqual(run.logged, [], 'a clean start says nothing');
  assert.deepEqual(run.removed, []);
  assert.deepEqual(run.started[0].chrome.killed, []);
});

test('a start that never opens its port is killed and tried again on a fresh port and profile', async () => {
  const run = harness(['silent', 'answers']);
  const result = await launchChrome(run.options);
  assert.equal(result.attempt, 2);
  assert.equal(result.port, 9501);
  assert.equal(result.profile, '/tmp/probe-2');
  assert.equal(result.chrome, run.started[1].chrome);
  assert.deepEqual(run.started[0].chrome.killed, ['SIGKILL'], 'the silent Chrome is killed');
  assert.deepEqual(run.started[1].chrome.killed, [], 'the working Chrome is left running');
  assert.deepEqual(run.removed, ['/tmp/probe-1'], 'only the failed profile is removed');
  assert.match(run.logged[0], /Attempt 1: no DevTools endpoint on port 9500 after 1 s\./);
  assert.equal(run.logged[1], 'Chrome started on attempt 2 of 3.');
});

test('a Chrome that exits is retried at once, without waiting out the timeout', async () => {
  const run = harness(['exits', 'answers']);
  const result = await launchChrome(run.options);
  assert.equal(result.attempt, 2);
  assert.ok(run.waits() <= 3, `waited ${run.waits()} polls for a Chrome that had already exited`);
  assert.match(run.logged[0], /Attempt 1: Chrome exited \(code 1, signal null\); Chrome said: Missing X server \| cannot open display \| last line\./);
});

test('when every start fails the error says what happened on each attempt', async () => {
  const run = harness(['silent', 'exits', 'silent']);
  await assert.rejects(launchChrome(run.options), (error) => {
    assert.match(error.message, /^Chrome DevTools endpoint did not start in 3 attempts\./);
    assert.match(error.message, /Attempt 1: no DevTools endpoint on port 9500 after 1 s\./);
    assert.match(error.message, /Attempt 2: Chrome exited \(code 1, signal null\); Chrome said: .*last line\./);
    assert.match(error.message, /Attempt 3: no DevTools endpoint on port 9502 after 1 s\./);
    return true;
  });
  assert.equal(run.started.length, 3);
  assert.deepEqual(run.started.map((start) => start.chrome.killed), [['SIGKILL'], ['SIGKILL'], ['SIGKILL']]);
  assert.deepEqual(run.removed, ['/tmp/probe-1', '/tmp/probe-2', '/tmp/probe-3']);
});

test('a binary that cannot be started is reported, not waited on', async () => {
  const run = harness(['silent']);
  const spawn = run.options.spawn;
  run.options.attempts = 1;
  run.options.spawn = (...args) => {
    const chrome = spawn(...args);
    setImmediate(() => chrome.emit('error', new Error('spawn /fake/chrome ENOENT')));
    return chrome;
  };
  run.options.fetchVersion = async () => { await new Promise((resolve) => setImmediate(resolve)); throw new Error('connection refused'); };
  await assert.rejects(launchChrome(run.options), /did not start in 1 attempts\. Attempt 1: Chrome could not be started \(spawn \/fake\/chrome ENOENT\)\./);
});

test('a profile that cannot be removed does not hide the start failure', async () => {
  const run = harness(['silent', 'answers']);
  run.options.removeProfile = () => { throw new Error('EBUSY'); };
  const result = await launchChrome(run.options);
  assert.equal(result.attempt, 2);
});
