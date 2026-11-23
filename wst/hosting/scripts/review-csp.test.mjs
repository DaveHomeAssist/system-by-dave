import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {withReviewCsp} from './review-csp.mjs';

test('review policy precedes and authorizes every exact inline script', () => {
  const scripts = ['window.appearance = "dark";', 'window.viewerReady = true;'];
  const html = withReviewCsp('<head><script>' + scripts[0] + '</script></head><body><script>' + scripts[1] + '</script></body>');
  assert(html.indexOf('Content-Security-Policy') < html.indexOf('<script>'));
  const scriptPolicy = html.match(/script-src ([^;]+)/)[1];
  for (const script of scripts) assert(scriptPolicy.includes("'sha256-" + createHash('sha256').update(script).digest('base64') + "'"));
  assert(!scriptPolicy.includes('unsafe-inline'));
  assert(!scriptPolicy.includes('unsafe-eval'));
  const changed = withReviewCsp('<head><script>window.viewerReady = false;</script></head>');
  assert.notEqual(changed.match(/script-src ([^;]+)/)[1], scriptPolicy);
});

test('review policy rejects absent scripts or an existing policy', () => {
  assert.throws(() => withReviewCsp('<head></head>'), /inline scripts/);
  assert.throws(() => withReviewCsp('<head><meta http-equiv="Content-Security-Policy"><script>x()</script></head>'), /already declares/);
});
