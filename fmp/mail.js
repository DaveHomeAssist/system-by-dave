// Pure report packaging. No Google credentials or browser storage in this module.
import { photoRefs, validatePhoto, MAX_PHOTOS } from './photos.js?v=20260915camera';
export const SENDER = 'avbydave@gmail.com';
export const CLIENT_ID = '1055607889332-6seksmcrl3n06euvf127514fp5qg6t66.apps.googleusercontent.com';
export const SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
export const SCOPES = `${SEND_SCOPE} openid email`;

export function addresses(value, label = 'Recipients') {
  if (typeof value !== 'string' || /[\r\n\x00-\x1f\x7f]/.test(value)) {
    throw new Error(`${label}: use a single line of email addresses only.`);
  }
  const list = value.split(/[,;]/).map(item => item.trim()).filter(Boolean);
  for (const email of list) {
    const [local, domain] = email.split('@');
    if (email.length > 254 || !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/.test(email) ||
        local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..') ||
        domain.includes('..') || domain.split('.').some(part => part.startsWith('-') || part.endsWith('-') || part.length > 63)) {
      throw new Error(`${label}: enter plain email addresses, without names or angle brackets.`);
    }
  }
  const seen = new Set();
  return list.filter(email => {
    const key = email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function recipients(fields) {
  const result = { to: addresses(fields.to, 'To'), cc: addresses(fields.cc || '', 'CC'), bcc: addresses(fields.bcc || '', 'BCC') };
  if (!result.to.length) throw new Error('Add at least one To address.');
  const seen = new Set();
  for (const key of ['to', 'cc', 'bcc']) {
    result[key] = result[key].filter(email => {
      const normalized = email.toLowerCase();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  }
  if (seen.size > 50) throw new Error('Use no more than 50 recipients per report.');
  return result;
}

export function snapshot(state, markdown, now = new Date(), id = crypto.randomUUID()) {
  if (!markdown || markdown === 'Nothing to report yet.') throw new Error('Record a show or walk result before sending.');
  // Explicit allowlist prevents UI state, drafts, recipients, or future credentials leaking into attachments.
  const walk = JSON.parse(JSON.stringify({ meta: state.meta, res: state.res, faults: state.faults }));
  walk.rotationBlock = 'All zones';
  delete walk.meta.block;
  delete walk.meta.nextBlock;
  delete walk.meta.rotationBlock;
  return {
    schemaVersion: 1, reportId: id, capturedAt: now.toISOString(),
    walk,
    markdown
  };
}

export function subjectFor(record) {
  const clean = value => String(value || '').replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim();
  return Array.from(`FMP Walk | ${clean(record.walk.meta.date) || 'Undated'} | ${clean(record.walk.meta.show) || 'Untitled'}`).slice(0, 180).join('');
}

export async function fingerprint(record, to) {
  const canonical = value => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
    return value;
  };
  const lists = Object.fromEntries(Object.entries(to).map(([key, list]) => [key, list.map(email => email.toLowerCase()).sort()]));
  // Opening a station in the existing app materializes empty reading fields.
  // Those placeholders must not make an unchanged report eligible for another send.
  const res = Object.fromEntries(Object.entries(record.walk.res || {}).map(([key, reading]) => [key,
    Object.fromEntries(Object.entries(reading).filter(([, value]) => value !== '' && value != null))
  ]).filter(([, reading]) => Object.keys(reading).length));
  const normalizePhotos = owner => {
    if (!owner || !Array.isArray(owner.photos) || owner.photos.length) return owner;
    const copy = { ...owner }; delete copy.photos; return copy;
  };
  const walk = { ...record.walk, res, meta: normalizePhotos(record.walk.meta), faults: (record.walk.faults || []).map(normalizePhotos) };
  const input = JSON.stringify(canonical({ walk, markdown: record.markdown, ...(record.photos?.length ? { photos: record.photos } : {}), recipients: lists }));
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

function base64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
function folded(text) { return base64(text).match(/.{1,76}/g)?.join('\r\n') || ''; }
function encodedSubject(subject) {
  // Keep each RFC 2047 encoded word below 75 characters, including for emoji.
  const chunks = [];
  let part = '';
  for (const char of subject) {
    if (new TextEncoder().encode(part + char).length > 42) { chunks.push(part); part = ''; }
    part += char;
  }
  if (part) chunks.push(part);
  return chunks.map(chunk => `=?UTF-8?B?${base64(chunk)}?=`).join('\r\n ');
}

export function buildMessage(record, target) {
  const to = recipients(Object.fromEntries(Object.entries(target).map(([key, list]) => [key, list.join(', ')])));
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(record.reportId)) throw new Error('Invalid report identifier.');
  const boundary = `fmp_${record.reportId}`;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(record.walk.meta.date) ? record.walk.meta.date : 'undated';
  const basename = `fmp-walk-${date}-${record.reportId}`;
  const photos = record.photos || [];
  const refs = photoRefs(record.walk);
  if (photos.length > MAX_PHOTOS || photos.length !== refs.length || new Set(photos.map(photo => photo.id)).size !== photos.length) throw new Error('Photo attachments do not match this report. Reopen the report and try again.');
  for (const photo of photos) {
    validatePhoto(photo);
    const ref = refs.find(ref => ref.id === photo.id);
    if (!ref || ref.name !== photo.name || ref.size !== photo.size || ref.type !== photo.type) throw new Error('Photo attachments do not match this report.');
  }
  const body = `FMP Walk report snapshot\nReport ID: ${record.reportId}\nCaptured: ${record.capturedAt}\n\n${record.markdown}\n\nAttached: Markdown report, JSON snapshot, and ${photos.length} photos. Unsubmitted fault drafts are not attached.\n`;
  const headers = [
    `From: ${SENDER}`, `To: ${to.to.join(',\r\n ')}`,
    ...(to.cc.length ? [`Cc: ${to.cc.join(',\r\n ')}`] : []),
    ...(to.bcc.length ? [`Bcc: ${to.bcc.join(',\r\n ')}`] : []),
    `Subject: ${encodedSubject(subjectFor(record))}`,
    `Date: ${new Date(record.capturedAt).toUTCString()}`,
    `Message-ID: <${record.reportId}@davehomeassist.github.io>`,
    'MIME-Version: 1.0', `Content-Type: multipart/mixed; boundary="${boundary}"`, ''
  ];
  const part = (type, text, filename) => [
    `--${boundary}`, `Content-Type: ${type}; charset=UTF-8`,
    'Content-Transfer-Encoding: base64',
    ...(filename ? [`Content-Disposition: attachment; filename="${filename}"`] : []), '', folded(text)
  ].join('\r\n');
  const mime = [headers.join('\r\n'), part('text/plain', body),
    part('text/markdown', record.markdown, `${basename}.md`),
    part('application/json', JSON.stringify(record, null, 2), `${basename}.json`),
    ...photos.map(photo => [`--${boundary}`, 'Content-Type: image/jpeg', 'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${photo.name}"`, '', photo.base64.match(/.{1,76}/g).join('\r\n')].join('\r\n')),
    `--${boundary}--`, ''
  ].join('\r\n');
  const limit = photos.length ? 20 : 5;
  if (new TextEncoder().encode(mime).length > limit * 1024 * 1024) throw new Error(`Report exceeds the ${limit} MB email limit. Download the files instead.`);
  return { raw: base64(mime).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') };
}

export function sendFailure(status) {
  if (status === 401) return { state: 'failed', message: 'Gmail authorization expired. Connect Gmail again, then retry.' };
  if (status === 403) return { state: 'failed', message: 'Google refused the send. Confirm Gmail API is enabled, avbydave@gmail.com is a test user, and Gmail send permission was granted. Quotas or account restrictions may also apply.' };
  if (status === 429) return { state: 'failed', message: 'Gmail rate limit reached. Wait before trying again; nothing was retried automatically.' };
  if (status >= 400 && status < 500 && status !== 408) return { state: 'failed', message: `Gmail rejected this request (HTTP ${status}). Download the report; nothing was retried automatically.` };
  return { state: 'unknown', message: 'Send outcome unknown. Check Gmail Sent before allowing another send; retrying could create a duplicate.' };
}
