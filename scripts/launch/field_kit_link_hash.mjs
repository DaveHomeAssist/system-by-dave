#!/usr/bin/env node
// SHA-256 of the Field Kit share link, for fieldKit.download.sha256 in
// js/sbd-launch-config.js (docs/launch/checkout.md). The link itself stays in
// Stripe's Payment Link settings; only this hash is committed, and
// field-kit/thanks/thanks.js shows the download button only for a link that
// matches it. Pass the link as the argument or, to keep it out of shell
// history, on standard input:
//   npm run hash:field-kit-link -- 'https://drive.google.com/drive/folders/…'
//   pbpaste | npm run --silent hash:field-kit-link
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Same host list and normalisation as field-kit/thanks/thanks.js; the Field Kit
// probe (scripts/launch/probe_field_kit.mjs) fails if the two disagree.
export const FILE_HOSTS = /^(drive\.google\.com|docs\.google\.com|www\.dropbox\.com|dropbox\.com|dl\.dropboxusercontent\.com|onedrive\.live\.com|1drv\.ms|[a-z0-9-]+\.sharepoint\.com)$/i;

export function fieldKitLinkHash(raw) {
  let url;
  try { url = new URL(String(raw || '').trim()); } catch { throw new Error('That is not a link.'); }
  if (url.protocol !== 'https:' || !FILE_HOSTS.test(url.hostname) || url.username || url.password) {
    throw new Error('The download page only accepts an HTTPS link on Google Drive/Docs, Dropbox, OneDrive or SharePoint.');
  }
  return createHash('sha256').update(url.toString(), 'utf8').digest('hex');
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const input = process.argv[2] || (process.stdin.isTTY ? '' : fs.readFileSync(0, 'utf8'));
  if (!input.trim()) {
    console.error("Usage: npm run hash:field-kit-link -- '<share link to the kit files>'");
    process.exit(2);
  }
  try {
    console.log(fieldKitLinkHash(input));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
