import http from 'node:http';

const clean = html => String(html).replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/&deg;/gi, '°').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
const number = value => /^\d+(?:\.\d+)?$/.test(value || '') ? Number(value) : null;

function activeProperty(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const after = new RegExp(`<b>\\s*${escaped}\\s*</b>([\\s\\S]*?)(?=</TR>|$)`, 'i').exec(html)?.[1];
  return after?.match(/<font\b[^>]*color=["']?#00ff12["']?[^>]*>\s*<b>([\s\S]*?)<\/b>/i)?.[1]?.trim() || null;
}

export function parsePanasonicStatus(html) {
  if (!/PROJECTOR TYPE/i.test(html)) throw new Error('Unrecognized Panasonic status page');
  const inputSection = html.match(/<b>INPUT<\/b>([\s\S]*?)(?=INTAKE AIR TEMPERATURE|$)/i)?.[1] || '';
  const timing = clean(inputSection).match(/([^<>]*?)\s*\(([\d.]+)\s*kHz\s*\/\s*([\d.]+)\s*Hz\)/i);
  const lamps = [];
  for (const id of [1, 2]) {
    const section = html.match(new RegExp(`<b>LAMP${id}</b>([\\s\\S]*?)(?=<b>LAMP[12]</b>|<b>PROJECTOR RUNTIME</b>|$)`, 'i'))?.[1];
    if (!section) continue;
    const state = section.match(/<font\b[^>]*color=["']?#00ff12["']?[^>]*>\s*<b>(ON|OFF)<\/b>/i)?.[1] || null;
    const hours = clean(section).match(/RUNTIME\s+(\d+)\s*H/i);
    lamps.push({ id, state, hours: hours ? Number(hours[1]) : null });
  }
  const runtime = clean(html).match(/PROJECTOR RUNTIME\s+(\d+)\s*H/i);
  const selection = activeProperty(html, 'LAMP SELECT');
  const lampPower = activeProperty(html, 'LAMP POWER');
  const timingText = timing ? `${timing[1].trim()} (${timing[2]} kHz / ${timing[3]} Hz)` : null;
  return { signalTiming: timingText, horizontalKHz: number(timing?.[2]), verticalHz: number(timing?.[3]),
    lamps, lampSelection: selection, lampPower, runtimeHours: runtime ? Number(runtime[1]) : null };
}

export function parsePanasonicSelfTest(html) {
  const checks = [];
  for (const match of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(cell => clean(cell[1]));
    const result = cells[1]?.match(/^\[\s*(OK|FAILED|WARNING)\s*\]$/i);
    if (cells[0] && result) checks.push({ name: cells[0], result: result[1].toUpperCase() });
  }
  if (!checks.length) throw new Error('Unrecognized Panasonic Self Test page');
  const code = clean(html).match(/Error code\s+([0-9a-f ]+)\)/i)?.[1]?.trim() || null;
  return { checks, code, result: checks.some(c => c.result === 'FAILED') ? 'FAILED' : checks.some(c => c.result === 'WARNING') ? 'WARNING' : 'OK' };
}

// Fixed read-only endpoints. Redirects, oversized replies and arbitrary URLs are refused.
export function createPanasonicWebReader({ host, user, password, port = 80, timeoutMs = 2000, now = Date.now }) {
  function get(path, signal) {
    return new Promise((resolve, reject) => {
      const req = http.get({ hostname: host, port, path, method: 'GET', auth: `${user}:${password}`, signal }, response => {
        if (response.statusCode !== 200) { response.resume(); reject(new Error(`Web status HTTP ${response.statusCode}`)); return; }
        let size = 0, body = '';
        response.setEncoding('utf8');
        response.on('data', chunk => {
          size += Buffer.byteLength(chunk);
          if (size > 128 * 1024) req.destroy(new Error('Web status response too large'));
          else body += chunk;
        });
        response.on('end', () => resolve(body));
        response.on('error', reject);
        response.on('aborted', () => reject(new Error('Web status response interrupted')));
      });
      const timer = setTimeout(() => req.destroy(new Error('Web status timed out')), timeoutMs);
      req.on('close', () => clearTimeout(timer));
      req.on('error', reject);
    });
  }
  async function read(path, parse, signal) {
    try { return { state: 'reported', ...parse(await get(path, signal)), observedAt: new Date(now()).toISOString() }; }
    catch { return { state: 'unavailable', observedAt: null, reason: 'Panasonic web status could not be read.' }; }
  }
  return async ({ signal } = {}) => ({
    status: await read('/cgi-bin/projector_status.cgi?lang=e', parsePanasonicStatus, signal),
    selfTest: await read('/cgi-bin/selfcheck.cgi', parsePanasonicSelfTest, signal),
  });
}
