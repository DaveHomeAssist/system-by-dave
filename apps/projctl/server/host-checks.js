import fs from 'node:fs/promises';

// Checks on the relay computer that the relay cannot make itself. Each one reads "cannot check"
// until a provider answers it. A provider is { name, read() } where read() resolves to
//   { [checkId]: { state: 'pass' | 'fail', reading: string, at: epoch ms } }
// and may leave out any check it cannot answer. A provider never turns a guess into a pass:
// an answer without a state of pass or fail, or without a time, is dropped.
export const HOST_CHECKS = Object.freeze([
  { id: 'playback-app', label: 'Playback app running with its fullscreen outputs' },
  { id: 'midi-interface', label: 'MIDI interface present' },
  { id: 'computer-awake', label: 'Computer awake and unlocked' },
]);
export const REPORT_STALE_MS = 120000;
const MAX_REPORT_BYTES = 16 * 1024;
const text = value => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 200) : '';
const ageWords = ms => ms < 90000 ? `${Math.round(ms / 1000)} s` : `${Math.round(ms / 60000)} min`;

// The one provider that ships: a small JSON report written by a helper on the relay computer.
//   { "unixSeconds": 1795049476, "checks": [ { "id": "playback-app", "state": "pass", "reading": "…" } ] }
export function reportFileProvider(file) {
  return {
    name: 'report-file',
    async read() {
      const stat = await fs.lstat(file);
      if (!stat.isFile() || stat.size > MAX_REPORT_BYTES) throw new Error('report is not a small file');
      const report = JSON.parse(await fs.readFile(file, 'utf8'));
      const reportAt = Number(report?.unixSeconds) * 1000, out = {};
      for (const item of Array.isArray(report?.checks) ? report.checks.slice(0, 32) : []) {
        const at = Number.isFinite(Number(item?.unixSeconds)) ? Number(item.unixSeconds) * 1000 : reportAt;
        if (!item || typeof item.id !== 'string' || !['pass', 'fail'].includes(item.state) || !Number.isFinite(at) || at <= 0) continue;
        out[item.id] = { state: item.state, reading: text(item.reading), at };
      }
      return out;
    },
  };
}

export async function readHostChecks(providers = [], { now = Date.now } = {}) {
  const answers = new Map(), failed = [];
  for (const provider of providers) {
    try {
      const found = await provider.read();
      for (const [id, answer] of Object.entries(found && typeof found === 'object' ? found : {})) {
        if (!answers.has(id) && answer && ['pass', 'fail'].includes(answer.state) && Number.isFinite(answer.at)) answers.set(id, { ...answer, provider: provider.name });
      }
    } catch { failed.push(provider.name); }
  }
  const at = now();
  const checks = HOST_CHECKS.map(({ id, label }) => {
    const answer = answers.get(id), cannot = reading => ({ id, label, state: 'cannot-check', reading, at: null, provider: answer?.provider ?? null });
    if (!providers.length) return cannot('No provider is configured for this check.');
    if (!answer) return cannot(failed.length ? 'The provider could not be read.' : 'The provider did not report this check.');
    const age = at - answer.at;
    if (age > REPORT_STALE_MS) return cannot(`The last report is ${ageWords(age)} old.`);
    if (age < -5000) return cannot('The last report is dated in the future.');
    return { id, label, state: answer.state, reading: text(answer.reading) || (answer.state === 'pass' ? 'Reported good.' : 'Reported not good.'), at: new Date(answer.at).toISOString(), provider: answer.provider };
  });
  return { checkedAt: new Date(at).toISOString(), providers: providers.length, checks };
}
