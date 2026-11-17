// Publish the Rehearsal Review favicons under /run-review/ so relative icon URLs resolve.
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

export const REVIEW_PAGE = '/run-review/';

export function iconReferences(html) {
  const refs = new Set();
  for (const match of html.matchAll(/(?:href|src)\s*=\s*["']([^"']+)["']/g)) {
    const url = match[1].split(/[?#]/)[0];
    if (url === 'frozen-favicon.js' || url.startsWith('favicons/')) refs.add(url);
  }
  for (const match of html.matchAll(/favicons\/favicon-\d{2}-[a-z]+\.(?:svg|png)/g)) refs.add(match[0]);
  return [...refs].sort();
}

function bytesFor(file, reviewRoot, shellRoot) {
  const reviewFile = path.join(reviewRoot, file.relativePath);
  const shellFile = path.join(shellRoot, 'favicons', path.basename(file.relativePath));
  const reviewBytes = fs.existsSync(reviewFile) ? fs.readFileSync(reviewFile) : null;
  const shellBytes = fs.existsSync(shellFile) ? fs.readFileSync(shellFile) : null;
  if (reviewBytes && shellBytes && reviewBytes.equals(shellBytes)) return shellBytes;
  if (!reviewBytes && file.relativePath.endsWith('.svg') && shellBytes) return shellBytes;
  if (!reviewBytes) throw new Error('Missing review favicon ' + file.relativePath);
  return reviewBytes;
}

export function publishReviewFavicons(assets, binary, { reviewRoot, shellRoot }) {
  const manifest = JSON.parse(fs.readFileSync(path.join(reviewRoot, 'favicon-publish.json'), 'utf8'));
  if (manifest.page !== REVIEW_PAGE) throw new Error('Review favicons must be published at /run-review/');
  for (const file of manifest.files) {
    const bytes = bytesFor(file, reviewRoot, shellRoot);
    if (file.workerMap === 'BINARY') binary[file.publicPath] = gzipSync(bytes).toString('base64');
    else if (file.workerMap === 'ASSETS') assets[file.publicPath] = bytes.toString('utf8');
    else throw new Error('Unknown worker map for ' + file.publicPath);
  }
  return manifest.files;
}

export function installReviewPage(assets, html) {
  assets[REVIEW_PAGE] = html;
  assets['/run-review/index.html'] = html;
}

export function missingServed(html, assets, binary) {
  return iconReferences(html).filter(ref => {
    const pub = REVIEW_PAGE + ref.replace(/^\//, '');
    return assets[pub] === undefined && binary[pub] === undefined;
  });
}
