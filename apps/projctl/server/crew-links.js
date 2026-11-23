import fs from 'node:fs/promises';

// Optional links for the role pages, read from a private file beside the rig:
//   { "notes": { "url": "https://…" } }
// The relay never opens, checks or forwards the address; it only hands a validated string to a
// signed-in page. A missing or unusable file means "not configured", never an error for the page.
const MAX_FILE_BYTES = 4096;
const MAX_URL_LENGTH = 300;

// http or https only, no embedded credentials, no whitespace or control characters.
export function cleanLink(value) {
  if (typeof value !== 'string' || !value || value.length > MAX_URL_LENGTH || /[\s\u0000-\u001f\u007f]/.test(value)) return null;
  let url;
  try { url = new URL(value); } catch { return null; }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
  return url.href.length <= MAX_URL_LENGTH ? url.href : null;
}

export async function readCrewLinks(file) {
  let data;
  try {
    const stat = await fs.lstat(file);
    if (!stat.isFile() || stat.size > MAX_FILE_BYTES) return { notes: null, state: 'invalid' };
    data = JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    return { notes: null, state: error.code === 'ENOENT' ? 'not-configured' : error instanceof SyntaxError ? 'invalid' : 'unreadable' };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.notes == null) return { notes: null, state: 'not-configured' };
  const url = cleanLink(data.notes?.url);
  return url ? { notes: { url }, state: 'configured' } : { notes: null, state: 'invalid' };
}
