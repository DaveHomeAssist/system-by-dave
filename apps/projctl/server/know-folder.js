import fs from 'node:fs/promises';
import path from 'node:path';

// Diagrams and documents for the role pages, served from a private folder on the relay computer.
// The folder holds a manifest.json:
//   [{ "title": "Signal flow", "file": "signal-flow.svg", "kind": "diagram", "audience": ["show-backup"], "order": 1 }]
// Only files named in the manifest are served, only from inside the folder, only these types.
export const KNOW_AUDIENCES = Object.freeze(['show-backup', 'designer', 'power']);
export const KNOW_TYPES = Object.freeze({
  svg: 'image/svg+xml', png: 'image/png', pdf: 'application/pdf',
  // Text types are served as plain text so opening one directly never renders markup.
  md: 'text/plain; charset=utf-8', txt: 'text/plain; charset=utf-8', json: 'text/plain; charset=utf-8',
});
export const MAX_KNOW_FILE_BYTES = 25 * 1024 * 1024;
const MAX_MANIFEST_BYTES = 256 * 1024;
const MAX_ITEMS = 200;

export const knowType = file => { const ext = path.posix.extname(String(file)).slice(1).toLowerCase(); return Object.hasOwn(KNOW_TYPES, ext) ? ext : null; };

// A relative path with forward slashes, no "..", no hidden segment and an allowed type. Anything else is refused.
export function cleanKnowFile(value) {
  if (typeof value !== 'string' || !value || value.length > 200 || /[\u0000-\u001f\u007f\\]/.test(value) || value.startsWith('/')) return null;
  const parts = value.split('/');
  if (parts.some(part => !part || part.startsWith('.') || part !== part.trim())) return null;
  return knowType(value) ? parts.join('/') : null;
}

async function readManifest(folder) {
  const file = path.join(folder, 'manifest.json');
  const stat = await fs.lstat(file);
  if (!stat.isFile() || stat.size > MAX_MANIFEST_BYTES) throw Object.assign(new Error('manifest is not a small file'), { invalid: true });
  const data = JSON.parse(await fs.readFile(file, 'utf8'));
  if (!Array.isArray(data)) throw Object.assign(new Error('manifest is not a list'), { invalid: true });
  const items = [], seen = new Set();
  for (const entry of data.slice(0, MAX_ITEMS)) {
    const file = cleanKnowFile(entry?.file), title = typeof entry?.title === 'string' ? entry.title.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 120) : '';
    const audience = Array.isArray(entry?.audience) ? KNOW_AUDIENCES.filter(name => entry.audience.includes(name)) : [];
    if (!file || !title || !['diagram', 'doc'].includes(entry.kind) || !audience.length || seen.has(file)) continue;
    seen.add(file);
    items.push({ title, file, kind: entry.kind, type: knowType(file), audience, order: Number.isFinite(entry.order) ? entry.order : 1000 });
  }
  return items.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

// Resolve through symbolic links and require the result to stay inside the folder.
async function locate(folder, file) {
  try {
    const root = await fs.realpath(folder), real = await fs.realpath(path.join(root, ...file.split('/')));
    if (!real.startsWith(root + path.sep)) return null;
    const stat = await fs.stat(real);
    return stat.isFile() && stat.size <= MAX_KNOW_FILE_BYTES ? { path: real, bytes: stat.size } : null;
  } catch { return null; }
}

export async function readKnow(folder, { audience = KNOW_AUDIENCES, sample = false } = {}) {
  if (!folder) return { state: 'not-configured', sample: false, items: [] };
  let items;
  try {
    if (!(await fs.stat(folder)).isDirectory()) return { state: 'missing', sample, items: [] };
    items = await readManifest(folder);
  } catch (error) {
    return { state: error.code === 'ENOENT' ? 'missing' : error instanceof SyntaxError || error.invalid ? 'invalid' : 'unreadable', sample, items: [] };
  }
  const wanted = items.filter(item => item.audience.some(name => audience.includes(name)));
  const out = [];
  for (const item of wanted) {
    const found = await locate(folder, item.file);
    out.push({ ...item, available: !!found, bytes: found?.bytes ?? null });
  }
  return { state: 'configured', sample, items: out };
}

// The file to send for one manifest entry, or null. A name that is not in the manifest is never opened.
export async function resolveKnowFile(folder, name) {
  const file = cleanKnowFile(name);
  if (!folder || !file) return null;
  let items;
  try { items = await readManifest(folder); } catch { return null; }
  if (!items.some(item => item.file === file)) return null;
  const found = await locate(folder, file);
  return found ? { ...found, type: knowType(file), mime: KNOW_TYPES[knowType(file)], name: path.posix.basename(file) } : null;
}

// Headers that keep a served file inert: no sniffing, no script, no outside loads.
export function knowHeaders(found) {
  const headers = {
    'content-type': found.mime, 'content-length': String(found.bytes), 'x-content-type-options': 'nosniff',
    'cache-control': 'private, no-store', 'cross-origin-resource-policy': 'same-origin', 'referrer-policy': 'no-referrer',
    'content-disposition': `inline; filename="${found.name.replace(/[^A-Za-z0-9._ -]/g, '_')}"`,
  };
  // The browser's PDF viewer does not run inside a sandbox, so a PDF keeps only the other headers.
  if (found.type !== 'pdf') headers['content-security-policy'] = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; sandbox";
  return headers;
}
