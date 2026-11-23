import fs from 'node:fs/promises';
import path from 'node:path';

// Private paths on the relay computer for the role pages, read from a file beside the rig:
//   { "cueObserver": "/abs/file-or-folder", "knowFolder": "/abs/folder", "hostChecks": "/abs/report.json" }
// Every key is optional. A missing or unusable file means "not configured", never an error for a page.
export const HOST_PATH_KEYS = Object.freeze(['cueObserver', 'knowFolder', 'hostChecks']);
const MAX_FILE_BYTES = 8192;
const MAX_PATH_LENGTH = 1024;

// Absolute paths only, with no control characters. The value is normalized, never resolved or opened here.
export function cleanPath(value) {
  if (typeof value !== 'string' || !value || value.length > MAX_PATH_LENGTH || /[\u0000-\u001f\u007f]/.test(value)) return null;
  return path.isAbsolute(value) ? path.normalize(value) : null;
}

export async function readHostPaths(file) {
  const none = Object.fromEntries(HOST_PATH_KEYS.map(key => [key, null]));
  let data;
  try {
    const stat = await fs.lstat(file);
    if (!stat.isFile() || stat.size > MAX_FILE_BYTES) return { ...none, state: 'invalid' };
    data = JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    return { ...none, state: error.code === 'ENOENT' ? 'not-configured' : error instanceof SyntaxError ? 'invalid' : 'unreadable' };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { ...none, state: 'invalid' };
  return { ...Object.fromEntries(HOST_PATH_KEYS.map(key => [key, cleanPath(data[key])])), state: 'configured' };
}
