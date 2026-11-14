// Automatic projector health reports: power on, hourly while lit, at power off
// and when the relay stops. Readings are read-only queries; no projector command
// is sent, changed or delayed. See docs/health-reports.md.
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { abortable } from './drivers/transport.js';

export const KIND = { POWER_ON: 'power-on', HOURLY: 'hourly', POWER_OFF: 'power-off', RELAY_STOP: 'relay-stop', MANUAL: 'manual' };
const KIND_LABEL = { 'power-on': 'Power on', hourly: 'Hourly', 'power-off': 'Power off', 'relay-stop': 'Relay stop', manual: 'Manual' };
export const TIME_ZONE = 'America/New_York';
const HOUR = 3600000;

export const isLit = (power) => power === 'on' || power === 'warming';

// Rated maximum operating ambient by model, from the manufacturers' specifications.
// Override per slot (for example a portrait limit) in health-reports.json.
const MODEL_RATED_C = [[/UDM[\s-]*4K22/i, 40], [/RZ970/i, 45], [/DW830/i, 45]];
export function ratedAmbientC(p, overrides = {}) {
  const override = overrides?.[p.slot];
  if (Number.isFinite(override)) return override;
  for (const [pattern, c] of MODEL_RATED_C) if (pattern.test(`${p.model || ''} ${p.label || ''}`)) return c;
  return null;
}

export const DEFAULTS = Object.freeze({ enabled: true, titlePrefix: 'Projectors | Health Log', watchHeadroomC: 5 });

export function readHealthConfig(file) {
  let raw = {}, error = null;
  try { raw = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { if (e.code !== 'ENOENT') error = 'health-reports.json is unreadable; reports are saved locally only'; raw = {}; }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { raw = {}; error ||= 'health-reports.json must hold an object'; }
  const id = String(raw.notion?.databaseId || '').replace(/-/g, '');
  return {
    enabled: raw.enabled !== false,
    titlePrefix: typeof raw.titlePrefix === 'string' && raw.titlePrefix.trim() ? raw.titlePrefix.trim().slice(0, 120) : DEFAULTS.titlePrefix,
    watchHeadroomC: Number.isFinite(raw.watchHeadroomC) ? raw.watchHeadroomC : DEFAULTS.watchHeadroomC,
    ratedAmbientC: Object.fromEntries(Object.entries(raw.ratedAmbientC || {}).filter(([, v]) => Number.isFinite(v))),
    notion: error || !/^[0-9a-f]{32}$/i.test(id) ? {} : { databaseId: id },
    error,
  };
}

function zoned(ms, timeZone) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });
  return Object.fromEntries(f.formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
}
export function localStamp(ms, timeZone = TIME_ZONE) { const p = zoned(ms, timeZone); return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`; }
export function localTime(ms, timeZone = TIME_ZONE) { const p = zoned(ms, timeZone); return `${p.hour}:${p.minute}:${p.second} ${p.timeZoneName}`; }

const round1 = (n) => Math.round(n * 10) / 10;
const num = (n) => (Number.isFinite(n) ? String(round1(n)) : '—');
const level = (v) => (v === 2 ? 'error' : 'warning');
const lanePart = (u) => (u.lane ? `lane ${u.lane}, ` : '');
const who = (u) => `${u.slot} (${lanePart(u)}${u.model || 'unknown model'}, ${u.ip})`;

function assessmentGaps(unit) {
  if (!unit.online) return ['device reply'];
  const gaps = [];
  if (!Number.isFinite(unit.intakeC)) gaps.push('temperature');
  if (!unit.flagSource) gaps.push('alarm feedback');
  if (!Number.isFinite(unit.ratedC)) gaps.push('rated limit');
  return gaps;
}

export function unitRow(p, st = {}, conn = {}, readings = null, readError = null, config = DEFAULTS) {
  const sensors = Array.isArray(readings?.sensors) ? readings.sensors : [];
  const intake = sensors.find((s) => s.role === 'intake' && Number.isFinite(s.c));
  const internal = sensors.filter((s) => s.role === 'internal' && Number.isFinite(s.c)).map((s) => s.c);
  const rated = ratedAmbientC(p, config.ratedAmbientC);
  const headroom = intake && rated != null ? round1(rated - intake.c) : null;
  const errors = st?.errors && typeof st.errors === 'object' ? st.errors : null; // PJLink ERST; null for Pulse
  const alarm = readings?.alarm == null ? null : String(readings.alarm).trim() || null;
  const completeErrors = errors && ['fan', 'lamp', 'temp', 'cover', 'filter', 'other'].every((key) => [0, 1, 2].includes(errors[key]));
  const online = !!st?.online;
  const flags = [], warnings = [];
  if (online && errors) {
    if (errors.temp) flags.push(`temperature ${level(errors.temp)}`);
    if (errors.fan) flags.push(`fan ${level(errors.fan)}`);
    for (const k of ['other', 'lamp', 'cover', 'filter']) if (errors[k]) warnings.push(`${k} ${level(errors[k])}`);
  }
  if (online && alarm && !/^ok$/i.test(alarm)) flags.push(`alarm ${alarm}`);
  const watchAt = Number.isFinite(config.watchHeadroomC) ? config.watchHeadroomC : DEFAULTS.watchHeadroomC;
  const row = {
    slot: p.slot, lane: p.lane || null, model: [p.make, p.model].filter(Boolean).join(' ') || p.label || null, ip: p.ip || null, owner: p.owner || null,
    power: st?.power || 'unknown', online, lastContact: conn?.lastSuccessAt || null, lightHours: Number.isFinite(st?.lightHours) ? st.lightHours : null,
    intakeC: intake ? intake.c : null, intakeLabel: intake?.label || null, internalC: internal, ratedC: rated, headroomC: headroom,
    flags, warnings, alarm, flagSource: completeErrors ? 'PJLink' : alarm != null ? 'Pulse' : null,
    readError: readError || readings?.readError ? String(readError || readings.readError).slice(0, 200) : null,
  };
  row.verdict = !online ? 'unreachable' : flags.length ? 'flag' : headroom != null && headroom <= watchAt ? 'watch' : assessmentGaps(row).length ? 'incomplete' : 'ok';
  return row;
}

export function summarize(units) {
  const n = units.length;
  const reached = units.filter((u) => u.online);
  const flagged = units.filter((u) => u.verdict === 'flag');
  const watch = units.filter((u) => u.verdict === 'watch');
  const unreachable = units.filter((u) => u.verdict === 'unreachable');
  const warned = units.filter((u) => u.warnings.length);
  const notRead = reached.filter((u) => !Number.isFinite(u.intakeC));
  const alarmRead = reached.filter((u) => u.flagSource);
  const temperatureRead = reached.filter((u) => Number.isFinite(u.intakeC));
  const limits = units.filter((u) => Number.isFinite(u.ratedC));
  const incomplete = units.filter((u) => assessmentGaps(u).length);
  const least = reached.filter((u) => Number.isFinite(u.headroomC)).sort((a, b) => a.headroomC - b.headroomC)[0];
  const findings = [];
  if (!n) findings.push('No assigned projectors.');
  else if (!reached.length) findings.push(`No units reachable; 0 of ${n} read.`);
  else if (flagged.length) findings.push(`${flagged.length} of ${n} units flagged: ${flagged.map((u) => `${who(u)} ${u.flags.join(', ')}`).join('; ')}.`);
  else if (alarmRead.length) findings.push(`No temperature, fan or alarm flags reported by ${alarmRead.length} of ${n} units with alarm feedback.`);
  else findings.push(`Alarm feedback unavailable for all ${n} units.`);
  if (incomplete.length) findings.push(`Assessment incomplete for ${incomplete.length} of ${n} units: ${incomplete.map((u) => `${u.slot} (${assessmentGaps(u).map((gap) => `${gap} unavailable`).join(', ')})`).join('; ')}.`);
  if (n) findings.push(`Coverage: temperature ${temperatureRead.length}/${n}, alarm feedback ${alarmRead.length}/${n}, rated limit ${limits.length}/${n}.`);
  if (least) findings.push(`Least headroom: ${who(least)} ${num(least.headroomC)} °C (${num(least.intakeC)} °C intake, ${least.ratedC} °C limit).`);
  if (warned.length) findings.push(`PJLink warnings: ${warned.map((u) => `${u.slot} ${u.warnings.join(', ')}`).join('; ')}.`);
  if (unreachable.length && reached.length) findings.push(`Not reached: ${unreachable.map(who).join(', ')}.`);
  if (notRead.length) findings.push(`Temperatures not read: ${notRead.map((u) => u.slot).join(', ')}.`);
  const follow = [];
  for (const u of flagged) follow.push(`${u.slot} (${lanePart(u)}${u.ip}): check ${u.flags.join(', ')} on the projector.`);
  for (const u of watch) follow.push(`${u.slot} (${lanePart(u)}${u.ip}): inspect intake clearance and exhaust path, ${num(u.headroomC)} °C headroom.`);
  const other = warned.filter((u) => u.warnings.some((w) => w.startsWith('other')));
  if (other.length) follow.push(`${other.map((u) => u.slot).join(', ')}: read the Self Test screen for the "other" warning.`);
  for (const u of incomplete.filter((u) => u.online)) follow.push(`${u.slot} (${lanePart(u)}${u.ip}): check ${assessmentGaps(u).map((gap) => `${gap} unavailable`).join(', ')} before assessing health.`);
  for (const u of unreachable) follow.push(`${u.slot} (${lanePart(u)}${u.ip}): not reachable at report time; check network and power.`);
  return {
    findings: findings.join(' '), followUp: follow.length ? follow.join(' ') : 'None.',
    counts: { units: n, reached: reached.length, flagged: flagged.length, watch: watch.length, unreachable: unreachable.length, incomplete: incomplete.length },
  };
}

export function buildReport({ kind, reason = '', startedAt, finishedAt, units, events = [], config = DEFAULTS, timeZone = TIME_ZONE }) {
  const iso = new Date(startedAt).toISOString();
  return {
    id: `${iso.replace(/[:.]/g, '-')}-${kind}`, kind, reason,
    title: `${config.titlePrefix} | ${localStamp(startedAt, timeZone)} | ${KIND_LABEL[kind] || kind}`,
    startedAt: iso, finishedAt: new Date(finishedAt).toISOString(), timeZone,
    ...summarize(units), units, events, notion: { state: 'local-only' },
  };
}

const UNIT_HEADER = ['Unit', 'Lane', 'Model', 'Address', 'Power', 'Intake or ambient (°C)', 'Limit (°C)', 'Headroom (°C)', 'Internal (°C)', 'Flags', 'Light hours (h)', 'Last contact'];
function flagCell(u) {
  if (!u.online) return 'Not reached';
  const parts = [...u.flags, ...u.warnings];
  if (u.flagSource === 'Pulse' && !u.flags.length) parts.unshift(`Alarm ${u.alarm}`);
  if (!parts.length) parts.push(u.flagSource ? `None (${u.flagSource})` : 'Not reported');
  const gaps = assessmentGaps(u);
  if (gaps.length) parts.push(`Assessment incomplete (${gaps.map((gap) => `${gap} unavailable`).join(', ')})`);
  if (u.readError) parts.push(`readings: ${u.readError}`);
  return parts.join('; ');
}
export function unitTable(report) {
  return [UNIT_HEADER, ...report.units.map((u) => [
    u.slot, u.lane || '—', u.model || '—', u.ip || '—', u.power, num(u.intakeC), u.ratedC == null ? '—' : String(u.ratedC), num(u.headroomC),
    u.internalC.length ? u.internalC.join(', ') : '—', flagCell(u), u.lightHours == null ? '—' : u.lightHours.toLocaleString('en-US'),
    u.lastContact ? localTime(Date.parse(u.lastContact), report.timeZone) : '—',
  ])];
}
export function eventTable(report) {
  return [['Time', 'Unit', 'Event'], ...report.events.map((e) => [localTime(Date.parse(e.at), report.timeZone), e.slot || '—', e.text])];
}
const NOTE = 'Read-only status queries; no settings changed. Intake: Panasonic QTM:0, Barco outside-ambient sensor. Internal QTM:1 and QTM:2 names are unconfirmed. Headroom is the rated maximum ambient minus the intake or ambient reading.';

const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const mdTable = (rows) => [rows[0], rows[0].map(() => '---'), ...rows.slice(1)].map((r) => `| ${r.map(cell).join(' | ')} |`).join('\n');
export function renderMarkdown(report) {
  const window = `${localTime(Date.parse(report.startedAt), report.timeZone)} to ${localTime(Date.parse(report.finishedAt), report.timeZone)}`;
  return [`# ${report.title}`, '', `Check window: ${window}. Trigger: ${report.reason || report.kind}.`, '', report.findings, '',
    `Follow-up: ${report.followUp}`, '', '## Unit data', '', mdTable(unitTable(report)), '', '## Events since the previous report', '',
    report.events.length ? mdTable(eventTable(report)) : 'No controller events.', '', NOTE, ''].join('\n');
}

const clip = (s, n = 2000) => { const t = String(s ?? ''); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
const rich = (s) => [{ type: 'text', text: { content: clip(s) || '—' } }];
const block = (type, value) => ({ object: 'block', type, [type]: value });
const notionTable = (rows) => block('table', {
  table_width: rows[0].length, has_column_header: true, has_row_header: false,
  children: rows.map((r) => block('table_row', { cells: r.map((c) => rich(c)) })),
});
export function notionPage(report, databaseId) {
  return {
    parent: { database_id: databaseId },
    properties: {
      Log: { title: rich(report.title) },
      'Check window': { date: { start: report.startedAt, end: report.finishedAt } },
      Findings: { rich_text: rich(report.findings) },
      'Follow-up': { rich_text: rich(report.followUp) },
    },
    children: [
      block('paragraph', { rich_text: rich(`${report.findings} Trigger: ${report.reason || report.kind}.`) }),
      block('heading_2', { rich_text: rich('Unit data') }),
      notionTable(unitTable(report)),
      block('heading_2', { rich_text: rich('Events since the previous report') }),
      report.events.length ? notionTable(eventTable(report)) : block('paragraph', { rich_text: rich('No controller events.') }),
      block('paragraph', { rich_text: rich(NOTE) }),
    ],
  };
}

// Token: PROJCTL_NOTION_TOKEN, else the macOS login Keychain (service projctl-notion,
// account health-reports). The token is never stored in settings or logged.
export function notionTokenReader({ env = process.env, platform = process.platform, keychain = true } = {}) {
  return () => {
    const fromEnv = String(env.PROJCTL_NOTION_TOKEN || '').trim();
    if (fromEnv) return Promise.resolve(fromEnv);
    if (!keychain || platform !== 'darwin') return Promise.resolve(null);
    return new Promise((resolve) => execFile('/usr/bin/security', ['find-generic-password', '-s', 'projctl-notion', '-a', 'health-reports', '-w'],
      { timeout: 5000 }, (error, stdout) => resolve(error ? null : String(stdout).trim() || null)));
  };
}

export function createNotionPublisher({ databaseId, token, fetch: send = globalThis.fetch, timeoutMs = 15000 }) {
  return async function publish(report) {
    const secret = await token();
    if (!secret) throw Object.assign(new Error('Notion token not found on this machine'), { code: 'NO_TOKEN', retry: true });
    let response;
    try {
      response = await send('https://api.notion.com/v1/pages', {
        method: 'POST', signal: AbortSignal.timeout(timeoutMs),
        headers: { authorization: `Bearer ${secret}`, 'notion-version': '2022-06-28', 'content-type': 'application/json' },
        body: JSON.stringify(notionPage(report, databaseId)),
      });
    } catch (e) { throw Object.assign(new Error(`Notion unreachable: ${e.name === 'TimeoutError' ? 'timed out' : e.message}`), { retry: true }); }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = String(body?.message || '').split(secret).join('[redacted]').slice(0, 200);
      throw Object.assign(new Error(`Notion ${response.status}${message ? `: ${message}` : ''}`), { status: response.status, retry: response.status === 429 || response.status >= 500 });
    }
    return { id: body.id || null, url: body.url || null };
  };
}

const summaryOf = (r) => ({ id: r.id, kind: r.kind, title: r.title, startedAt: r.startedAt, finishedAt: r.finishedAt, findings: r.findings, followUp: r.followUp, counts: r.counts, notion: { state: r.notion?.state, url: r.notion?.url || null, error: r.notion?.error || null } });

export function createHealthReports({
  dir, config = { ...DEFAULTS, ratedAmbientC: {}, notion: {} }, projectors, status, connection, events = () => [],
  readTelemetry = null, describeError = (p, e) => String(e?.message || e), publish = null,
  now = Date.now, timer = setTimeout, cancelTimer = clearTimeout, timeZone = TIME_ZONE,
  powerOnDelayMs = 120000, telemetryTimeoutMs = 12000, hourlyQuietMs = 15 * 60000, powerOffWindowMs = 30000,
  // Retries cover a venue without internet for up to 7 days (1008 tries at 10 minutes).
  stopQuietMs = 5 * 60000, stopTimeoutMs = 6000, retryMs = 10 * 60000, maxAttempts = 1008, keep = 500, log = console,
}) {
  const lastPower = new Map(), pending = new Map(), recent = [];
  let session = null, powerOnTimer = null, hourlyTimer = null, retryTimer = null, nextHourlyAt = null;
  let lastReportAt = null, lastPowerOffAt = -Infinity, chain = Promise.resolve(), closed = false, lastPublishError = null;
  const enabled = () => config.enabled && !closed;
  const assigned = () => projectors().filter((p) => p.ip);
  const anyLitNow = () => assigned().some((p) => status(p.slot)?.online && isLit(status(p.slot)?.power));
  const clearPowerOn = () => { if (powerOnTimer) cancelTimer(powerOnTimer); powerOnTimer = null; };

  function writeAtomic(file, text) {
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, text, { mode: 0o600 }); fs.renameSync(tmp, file);
  }
  function save(report, { markdown = false } = {}) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    writeAtomic(path.join(dir, `${report.id}.json`), JSON.stringify(report, null, 2) + '\n');
    if (markdown) writeAtomic(path.join(dir, `${report.id}.md`), renderMarkdown(report));
  }
  function prune() {
    let files; try { files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort(); } catch { return; }
    for (const f of files.slice(0, Math.max(0, files.length - keep))) {
      const id = f.slice(0, -5);
      if (pending.has(id)) continue;
      for (const ext of ['.json', '.md']) fs.rmSync(path.join(dir, id + ext), { force: true });
    }
  }
  function remember(report) {
    const i = recent.findIndex((r) => r.id === report.id);
    if (i >= 0) recent.splice(i, 1);
    recent.unshift(summaryOf(report)); recent.sort((a, b) => b.startedAt.localeCompare(a.startedAt)); recent.length = Math.min(recent.length, 20);
  }
  function load() {
    let files; try { files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort(); } catch { return; }
    for (const f of files) {
      try {
        const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        if (r?.id !== f.slice(0, -5)) continue;
        if (r.notion?.state === 'pending') pending.set(r.id, r);
        remember(r);
        const done = Date.parse(r.finishedAt); if (Number.isFinite(done)) lastReportAt = Math.max(lastReportAt ?? done, done);
      } catch { /* unreadable report files are left as they are */ }
    }
  }

  async function publishReport(report) {
    if (!publish || !config.notion?.databaseId) { report.notion = { state: 'local-only', reason: 'Notion is not configured' }; save(report); remember(report); return; }
    const attempts = (report.notion?.attempts || 0) + 1, at = new Date(now()).toISOString();
    try {
      const out = await publish(report);
      report.notion = { state: 'published', id: out.id, url: out.url, attempts, publishedAt: at };
      pending.delete(report.id); lastPublishError = null;
    } catch (e) {
      const message = String(e?.message || e).slice(0, 240);
      const retry = e?.retry === true && attempts < maxAttempts;
      report.notion = { state: retry ? 'pending' : 'failed', attempts, lastAttemptAt: at, error: message };
      lastPublishError = { at, message };
      if (retry) { pending.set(report.id, report); scheduleRetry(); } else pending.delete(report.id);
      log.error?.(`[health] Notion ${retry ? 'deferred' : 'failed'} for ${report.title}: ${message}`);
    }
    save(report); remember(report);
  }
  function scheduleRetry() {
    if (retryTimer || closed || !pending.size) return;
    retryTimer = timer(() => {
      retryTimer = null;
      chain = chain.then(async () => { for (const r of [...pending.values()].sort((a, b) => a.startedAt.localeCompare(b.startedAt))) await publishReport(r); })
        .catch((e) => log.error?.(`[health] retry failed: ${e.message}`)).finally(scheduleRetry);
    }, retryMs);
    retryTimer?.unref?.();
  }

  function statusSnapshot() {
    return assigned().map((p) => ({ p: { ...p }, st: { ...(status(p.slot) || {}) }, conn: { ...(connection(p.slot) || {}) } }));
  }
  function recentEvents(since, until) {
    return events().filter((e) => { const t = Date.parse(e.at); return t > since && t <= until; }).slice(-30).reverse()
      .map((e) => ({ at: e.at, slot: e.slot || null, text: clip([e.command, e.result, e.detail].filter(Boolean).join(' · '), 160) }));
  }
  async function capture(kind, reason, snapshot, { attempts = 3, timeoutMs = telemetryTimeoutMs } = {}) {
    const startedAt = now();
    const since = lastReportAt ?? startedAt - HOUR;
    const units = await Promise.all(snapshot.map(async ({ p, st, conn }) => {
      let readings = null, readError = null;
      if (st.online && readTelemetry) {
        const controller = new AbortController();
        const deadline = timer(() => controller.abort(Object.assign(new Error('health reading timed out'), { code: 'POLL_TIMEOUT' })), timeoutMs);
        deadline?.unref?.();
        try { readings = await abortable(Promise.resolve().then(() => readTelemetry(p, { signal: controller.signal, attempts, onPartial: (partial) => { readings = partial; } })), controller.signal); }
        catch (e) { readError = describeError(p, e); }
        finally { cancelTimer(deadline); }
      }
      return unitRow(p, st, conn, readings, readError, config);
    }));
    const finishedAt = now();
    const report = buildReport({ kind, reason, startedAt, finishedAt, units, events: recentEvents(since, finishedAt), config, timeZone });
    save(report, { markdown: true }); remember(report); prune();
    lastReportAt = finishedAt;
    await publishReport(report);
    log.log?.(`[health] ${report.title}: ${report.findings} (Notion ${report.notion.state})`);
    return summaryOf(report);
  }
  function trigger(kind, reason, reading) {
    if (!enabled()) return Promise.resolve(null);
    let snapshot; // taken now, before any queued work or power transition
    try { snapshot = statusSnapshot(); } catch (e) { log.error?.(`[health] ${kind} report skipped: ${e.message}`); return Promise.resolve(null); }
    const job = chain.then(() => capture(kind, reason, snapshot, reading)).catch((e) => { log.error?.(`[health] ${kind} report failed: ${e.message}`); return null; });
    chain = job;
    return job;
  }

  function scheduleHourly() {
    if (closed) return;
    const t = now(), next = Math.floor(t / HOUR) * HOUR + HOUR; // whole-hour offsets: UTC hour = local hour
    nextHourlyAt = new Date(next).toISOString();
    hourlyTimer = timer(() => {
      hourlyTimer = null;
      try { if (enabled() && anyLitNow() && !(lastReportAt != null && now() - lastReportAt < hourlyQuietMs)) trigger(KIND.HOURLY, 'on the hour while lit'); }
      catch (e) { log.error?.(`[health] hourly check skipped: ${e.message}`); }
      scheduleHourly();
    }, next - t + 50);
    hourlyTimer?.unref?.();
  }

  // The relay calls observe() from status polling and powerOff() on the power-off path:
  // a reporting fault is logged and must never interrupt either.
  const guarded = (name, fn) => (...args) => { try { return fn(...args); } catch (e) { log.error?.(`[health] ${name} ignored: ${e.message}`); return null; } };

  return {
    start() { load(); if (config.enabled) { scheduleHourly(); scheduleRetry(); } return this; },
    // Poll results. A unit seen going from not lit to lit starts the power-on report
    // once per lit session; units already lit when the relay starts are not a power-on.
    observe: guarded('observe', (slot, power) => {
      if (!enabled()) return;
      if (power == null) { lastPower.delete(slot); return; }
      const had = lastPower.has(slot), prev = lastPower.get(slot);
      lastPower.set(slot, power);
      if (![...lastPower.values()].some(isLit)) { session = null; clearPowerOn(); return; }
      session ||= { since: now(), powerOn: false };
      if (had && !isLit(prev) && isLit(power) && !session.powerOn) {
        session.powerOn = true;
        powerOnTimer = timer(() => { powerOnTimer = null; trigger(KIND.POWER_ON, `${slot} seen lit`); }, powerOnDelayMs);
        powerOnTimer?.unref?.();
      }
    }),
    // Called as a power-off command is about to be sent. Never awaited by the caller.
    powerOff: guarded('powerOff', (slot, source = 'ui') => {
      if (!enabled() || !anyLitNow()) return null;
      const t = now();
      if (t - lastPowerOffAt < powerOffWindowMs) return null; // one report per batch power-off
      lastPowerOffAt = t; clearPowerOn();
      return trigger(KIND.POWER_OFF, `power off from ${source} (${slot})`);
    }),
    run(kind = KIND.MANUAL, reason = 'requested from the API') {
      if (!config.enabled) throw Object.assign(new Error('health reports are disabled in health-reports.json'), { status: 409 });
      return trigger(kind, reason);
    },
    async stop() {
      if (closed) return;
      clearPowerOn(); for (const t of [hourlyTimer, retryTimer]) if (t) cancelTimer(t);
      hourlyTimer = retryTimer = null;
      const t = now();
      if (config.enabled && anyLitNow() && !(lastReportAt != null && t - lastReportAt < stopQuietMs) && t - lastPowerOffAt >= powerOffWindowMs) trigger(KIND.RELAY_STOP, 'relay stopping', { attempts: 1, timeoutMs: Math.min(telemetryTimeoutMs, Math.max(0, stopTimeoutMs - 2000)) });
      closed = true;
      let cap;
      await Promise.race([chain, new Promise((resolve) => { cap = timer(resolve, stopTimeoutMs); cap?.unref?.(); })]);
      cancelTimer(cap);
    },
    view() {
      return {
        engine: {
          state: !config.enabled ? 'disabled' : closed ? 'stopped' : 'running', configError: config.error || null, timeZone,
          nextHourlyAt: config.enabled && !closed ? nextHourlyAt : null, litSince: session ? new Date(session.since).toISOString() : null,
          notion: { databaseConfigured: !!config.notion?.databaseId, pending: pending.size, lastError: lastPublishError },
        },
        reports: recent.slice(0, 20),
      };
    },
  };
}
