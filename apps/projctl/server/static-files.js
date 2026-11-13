// Static files for the relay UI. A directory, a vanished file, or a bad path
// must answer with an HTTP error. It must not emit an unhandled stream error.
import fs from 'node:fs';
import path from 'node:path';

export function resolvePublicPath(root, pathname) {
  if (typeof pathname !== 'string' || !pathname.startsWith('/') || pathname.includes('\0')) return null;
  let decoded = pathname;
  try { decoded = decodeURIComponent(pathname); } catch { return null; }
  if (decoded.includes('\0') || decoded.includes('\\')) return null;
  const base = path.resolve(root);
  const resolved = path.resolve(base, decoded.replace(/^\/+/, ''));
  if (resolved !== base && !resolved.startsWith(base + path.sep)) return null;
  return resolved;
}

function fail(res, status, message) {
  if (res.headersSent || res.writableEnded) { res.destroy(); return; }
  res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(message);
}

// Attach the error handler before any read. A directory is not a file: callers
// stat first, and this still refuses a non-file if one is passed in.
export function guardStream(res, stream) {
  stream.on('error', () => fail(res, 500, 'not available'));
  return stream;
}
export function pipeFile(res, file, headers) {
  let stat;
  try { stat = fs.statSync(file); } catch { return fail(res, 404, 'not found'); }
  if (!stat.isFile()) return fail(res, 404, 'not found');
  const stream = guardStream(res, fs.createReadStream(file));
  res.writeHead(200, headers);
  stream.pipe(res);
}

export function servePublic(res, pathname, { root, mime, indexHtml }) {
  const file = resolvePublicPath(root, pathname);
  if (!file) return fail(res, 400, 'bad path');
  let stat;
  try { stat = fs.statSync(file); } catch { return fail(res, 404, 'not found'); }
  if (stat.isDirectory()) {
    const index = path.join(file, 'index.html');
    try {
      if (fs.statSync(index).isFile()) return servePublic(res, pathname.replace(/\/?$/, '/') + 'index.html', { root, mime, indexHtml });
    } catch { /* no directory index */ }
    return fail(res, 404, 'not found');
  }
  if (!stat.isFile()) return fail(res, 404, 'not found');
  if (indexHtml && file === path.join(path.resolve(root), 'index.html')) return indexHtml(res, file);
  const type = mime[path.extname(file)] || 'application/octet-stream';
  return pipeFile(res, file, { 'content-type': type });
}
