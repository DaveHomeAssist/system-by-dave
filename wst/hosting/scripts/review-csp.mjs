import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

// The self-contained viewer has an early appearance script and its application script.
export function withReviewCsp(html) {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert(scripts.length, 'Review viewer must contain its inline scripts');
  assert(html.includes('<head>'), 'Review viewer must contain a head');
  assert(!/http-equiv=["']Content-Security-Policy/i.test(html), 'Review viewer already declares a script policy');
  const hashes = [...new Set(scripts.map(([, script]) => "'sha256-" + createHash('sha256').update(script).digest('base64') + "'"))];
  const policy = `default-src 'self'; script-src ${hashes.join(' ')}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-src 'none'`;
  return html.replace('<head>', `<head>\n<meta http-equiv="Content-Security-Policy" content="${policy}">`);
}
