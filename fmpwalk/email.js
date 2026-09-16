import { SENDER, CLIENT_ID, SEND_SCOPE, SCOPES, recipients, snapshot, subjectFor, fingerprint, buildMessage, sendFailure } from './mail.js?v=b045f5b092b5a95b';
import { initializePhotos, ensurePhotosReady, photoFiles } from './photos.js?v=cd1feeb0fd50c5df';

const $ = id => document.getElementById(id);
const LIST_KEY = 'fmpEmailListsV1';
const RECEIPT_KEY = 'fmpEmailReceiptsV1';
const DEFAULT_LIST = { name: 'Personal copy', to: SENDER, cc: '', bcc: '' };
let lists = [DEFAULT_LIST];
let token = null; // Memory only: never localStorage, report state, URL, or logs.
let expiresAt = 0;
let expiryTimer;
let authTimer;
let authAttempt = 0;
let authenticating = false;
let sending = false;
let googleLoading = false;
let googleFailed = false;
let retryKey = null;

function status(message, error = false) {
  $('emailStatus').textContent = message;
  $('emailStatus').className = error ? 'note crit' : 'note info';
}
function controls() {
  const connected = Boolean(token && expiresAt > Date.now());
  $('emailConnect').disabled = sending || authenticating || googleLoading || !navigator.onLine;
  $('emailConnect').textContent = googleLoading ? 'Loading Google sign-in…' : authenticating ? 'Waiting for Google…' : connected ? 'Reconnect Gmail' : googleFailed ? 'Retry Google sign-in' : 'Connect Gmail';
  $('emailSend').disabled = sending || authenticating || !connected || !navigator.onLine;
  $('emailSend').textContent = sending ? 'Sending snapshot…' : 'Send report';
  $('emailDisconnect').hidden = !connected && !authenticating;
  $('emailDisconnect').textContent = authenticating ? 'Cancel sign-in' : 'Disconnect this tab';
  $('emailDisconnect').disabled = sending;
  $('emailFields').disabled = sending;
  $('emailRetry').hidden = !retryKey;
  $('emailRetry').disabled = sending;
}
function clearConnection() {
  token = null;
  expiresAt = 0;
  authenticating = false;
  authAttempt++;
  clearTimeout(expiryTimer);
  clearTimeout(authTimer);
  controls();
}
function readReceipts() {
  const records = JSON.parse(localStorage.getItem(RECEIPT_KEY) || '[]');
  if (!Array.isArray(records) || records.some(row => !row || typeof row.key !== 'string' || typeof row.state !== 'string')) {
    throw new Error('Email history cannot be read. Check Gmail Sent and export your walk before clearing browser data.');
  }
  return records;
}
function saveReceipts(records) {
  // Never discard an unresolved send. Keep the newest 100 settled receipts.
  const pending = records.filter(row => row.state === 'sending' || row.state === 'unknown');
  const settled = records.filter(row => row.state !== 'sending' && row.state !== 'unknown').slice(-100);
  try {
    localStorage.setItem(RECEIPT_KEY, JSON.stringify([...settled, ...pending]));
  } catch {
    throw new Error('Email history could not be saved in this browser. Download the report instead.');
  }
}
function receiptSummary() {
  try {
    const row = readReceipts().sort((a, b) => String(a.at).localeCompare(String(b.at))).at(-1);
    if (!row) { $('emailReceipt').textContent = 'No email submissions recorded in this browser.'; return; }
    const state = { submitted: 'Submitted to Gmail', sending: 'Outcome unconfirmed — check Gmail Sent', unknown: 'Outcome unknown — check Gmail Sent', failed: 'Rejected by Gmail', acknowledged: 'Resend explicitly allowed' }[row.state] || 'Unconfirmed';
    $('emailReceipt').textContent = `Last attempt: ${state} · ${row.subject} · ${row.at}${row.messageId ? ` · Gmail ID ${row.messageId}` : ''}`;
  } catch { $('emailReceipt').textContent = 'Email history unavailable. Sending requires working browser storage to guard against duplicates.'; }
}
function formRecipients() {
  return recipients({ to: $('emailTo').value, cc: $('emailCc').value, bcc: $('emailBcc').value });
}
function selectList(index) {
  const item = lists[index] || DEFAULT_LIST;
  $('emailTo').value = item.to;
  $('emailCc').value = item.cc || '';
  $('emailBcc').value = item.bcc || '';
  $('emailListName').value = item.name;
}
function paintLists(selected = 0) {
  $('emailPreset').replaceChildren(...lists.map((item, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = item.name;
    return option;
  }));
  $('emailPreset').value = String(selected);
  selectList(selected);
}
$('emailPreset').addEventListener('change', () => selectList(Number($('emailPreset').value)));
$('emailSaveList').addEventListener('click', () => {
  try {
    const name = $('emailListName').value.trim();
    if (!name || name.length > 60 || /[\x00-\x1f\x7f]/.test(name)) throw new Error('Give this recipient list a name of 1–60 characters.');
    const target = formRecipients();
    const item = { name, ...Object.fromEntries(Object.entries(target).map(([key, value]) => [key, value.join(', ')])) };
    const index = lists.findIndex(list => list.name.toLowerCase() === name.toLowerCase());
    if (index < 0 && lists.length >= 30) throw new Error('Up to 30 recipient lists can be saved. Use an existing list name to update it.');
    const next = lists.slice();
    if (index >= 0) next[index] = item; else next.push(item);
    localStorage.setItem(LIST_KEY, JSON.stringify(next));
    lists = next;
    paintLists(index >= 0 ? index : lists.length - 1);
    status('Recipient list saved in this browser. No email sent.');
  } catch (error) { status(error instanceof DOMException ? 'Browser storage is unavailable; the recipient list was not saved.' : error.message, true); }
});

function loadGoogle(retry = false) {
  if (window.google?.accounts?.oauth2?.initTokenClient) { googleFailed = false; return true; }
  if (googleFailed && !retry) return false;
  if (googleLoading || !navigator.onLine) return false;
  googleLoading = true;
  googleFailed = false;
  controls();
  status('Loading Google sign-in. No email is being sent.');
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  const timer = setTimeout(() => finish(false), 15000);
  let settled = false;
  function finish(ok) {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    script.onload = script.onerror = null;
    googleLoading = false;
    googleFailed = !ok;
    if (!ok) script.remove();
    controls();
    status(ok ? 'Ready. Connect Gmail as avbydave@gmail.com before sending.' : 'Google sign-in could not load. Click Retry Google sign-in to try again. If it still fails, open the site in Safari or Chrome and check your connection or content blocker. Downloads still work.', !ok);
  }
  script.onload = () => finish(Boolean(window.google?.accounts?.oauth2?.initTokenClient));
  script.onerror = () => finish(false);
  document.head.appendChild(script);
  return false;
}

async function googleRequest(url, accessToken, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, {
      ...options, credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal,
      headers: { ...options.headers, Authorization: `Bearer ${accessToken}` }
    });
    return { ok: response.ok, status: response.status, data: response.ok ? await response.json() : null };
  } finally { clearTimeout(timeout); }
}

$('emailConnect').addEventListener('click', () => {
  if (sending || authenticating) return;
  if (!loadGoogle(true)) return; // A subsequent real click retains popup permission after slow SDK loading.
  clearConnection();
  const attempt = ++authAttempt;
  authenticating = true;
  status('Choose avbydave@gmail.com in Google and allow sending plus email identity access. If Google says “no registered origin”, see Google sign-in help below. No inbox reading is requested.');
  controls();
  const fail = message => {
    if (attempt !== authAttempt) return;
    clearConnection();
    status(message, true);
  };
  authTimer = setTimeout(() => fail('Google sign-in timed out. Close the popup, then connect again. No email was sent.'), 120000);
  try {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID, scope: SCOPES, include_granted_scopes: false,
      login_hint: SENDER, prompt: 'select_account',
      error_callback: error => fail(error.type === 'popup_closed' ? 'Google sign-in cancelled. No email sent.' : 'Google sign-in could not open. Allow popups for this site and try again.'),
      callback: async response => {
        if (attempt !== authAttempt) return;
        if (response.error || !response.access_token || !window.google.accounts.oauth2.hasGrantedAllScopes(response, SEND_SCOPE)) {
          fail('Google did not grant Gmail sending access. Check the FMP Walk test user and requested permissions, then reconnect.'); return;
        }
        try {
          const lifetime = Number(response.expires_in);
          if (!Number.isFinite(lifetime) || lifetime <= 60) throw new Error('Google returned an expired authorization. Connect again.');
          // Authoritative Google identity response; a login hint alone is not a sender check.
          const identityResponse = await googleRequest('https://openidconnect.googleapis.com/v1/userinfo', response.access_token);
          if (!identityResponse.ok) throw new Error('Could not verify the connected email address. Reconnect and allow email identity access.');
          const identity = identityResponse.data;
          if (attempt !== authAttempt) return;
          if (identity.email?.toLowerCase() !== SENDER || identity.email_verified !== true) {
            throw new Error('Wrong Google account. Connect as avbydave@gmail.com. No email was sent.');
          }
          token = response.access_token;
          expiresAt = Date.now() + (lifetime - 60) * 1000;
          authenticating = false;
          clearTimeout(authTimer);
          expiryTimer = setTimeout(() => { clearConnection(); status('Gmail permission expired in this tab. Reconnect before sending.'); }, expiresAt - Date.now());
          status('Connected as avbydave@gmail.com. Review the report and recipients, then click Send report.');
          controls();
        } catch (error) { fail(error.name === 'AbortError' || error instanceof TypeError ? 'Could not verify Google sign-in. Check your connection and try again.' : error.message); }
      }
    });
    client.requestAccessToken();
  } catch { fail('Google sign-in could not start. Reload this page and try again.'); }
});
$('emailDisconnect').addEventListener('click', () => {
  const cancelled = authenticating;
  clearConnection();
  status(cancelled ? 'Google sign-in cancelled in this tab. Close the Google popup. No email sent.' : 'Disconnected in this tab. Saved walks and recipient lists are unchanged.');
});

$('emailSend').addEventListener('click', async () => {
  if (sending) return;
  sending = true;
  controls();
  try {
    if (!navigator.onLine) throw new Error('You are offline. Download your report or reconnect before sending.');
    if (!token || expiresAt <= Date.now()) { clearConnection(); throw new Error('Connect Gmail before sending.'); }
    if (!navigator.locks) throw new Error('Use an up-to-date Safari, Chrome, Edge, or Firefox browser to safely coordinate email sends.');
    window.flush();
    ensurePhotosReady();
    const target = formRecipients();
    const prepared = window.prepareExport();
    const record = snapshot(prepared.walk, prepared.markdown);
    const attached = await photoFiles(record.walk);
    if (attached.length) record.photos = attached;
    const key = await fingerprint(record, target);
    const message = buildMessage(record, target);
    await navigator.locks.request('fmpEmailSendV1', { ifAvailable: true }, async lock => {
      if (!lock) throw new Error('Another FMP Walk tab is sending. Wait for it to finish.');
      const records = readReceipts();
      const prior = records.find(row => row.key === key && ['submitted', 'sending', 'unknown'].includes(row.state));
      if (prior) {
        retryKey = key;
        throw new Error('This exact report and recipient list already has a submitted or unconfirmed send. Check Gmail Sent first. Use “Allow another send” only if a second copy is needed.');
      }
      const details = ['From: ' + SENDER, 'To: ' + target.to.join(', '), ...(target.cc.length ? ['CC: ' + target.cc.join(', ')] : []), ...(target.bcc.length ? ['BCC: ' + target.bcc.join(', ')] : [])].join('\n');
      if (!confirm(`Send this report snapshot now?\n\n${details}\n\n${subjectFor(record)}\n\nIncludes Markdown and JSON attachments plus ${attached.length} photo${attached.length === 1 ? '' : 's'}. The report includes any skipped or unwalked positions.`)) {
        status('Send cancelled. No email sent.'); return;
      }
      if (!token || expiresAt <= Date.now()) { clearConnection(); throw new Error('Gmail authorization expired during review. Reconnect before sending.'); }
      const row = { key, reportId: record.reportId, at: new Date().toISOString(), subject: subjectFor(record), state: 'sending' };
      records.push(row);
      saveReceipts(records); // Persist intent before the network write, including if this tab closes mid-send.
      retryKey = null;
      status('Sending the reviewed snapshot to Gmail. Keep this tab open.');
      let result;
      let body;
      try {
        result = await googleRequest(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(SENDER)}/messages/send`, token, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(message)
        });
        if (result.ok) body = result.data;
      } catch { /* Ambiguous network errors are never retried automatically. */ }
      if (result?.ok && typeof body?.id === 'string' && body.id) {
        row.state = 'submitted';
        row.messageId = body.id;
        status(`Submitted to Gmail. The report, Markdown and JSON files, and ${attached.length} photo${attached.length === 1 ? '' : 's'} are in the email. Recipient delivery is not yet confirmed.`);
      } else {
        const failure = sendFailure(result?.status);
        row.state = failure.state;
        if (result?.status === 401) clearConnection();
        if (row.state === 'unknown') retryKey = key;
        status(failure.message, true);
      }
      try { saveReceipts(records); }
      catch { retryKey = key; status('The send was attempted, but its final receipt could not be saved. Check Gmail Sent before sending again.', true); }
    });
  } catch (error) { status(error.message || 'Email could not be prepared. Download the report instead.', true); }
  finally { sending = false; receiptSummary(); controls(); }
});

$('emailRetry').addEventListener('click', async () => {
  if (!retryKey || sending || !navigator.locks) return;
  try {
    await navigator.locks.request('fmpEmailSendV1', { ifAvailable: true }, lock => {
      if (!lock) throw new Error('Another tab is sending. Wait for it to finish.');
      if (!confirm('Check Gmail Sent first. A previous attempt may already have sent this report. Allowing another send can produce duplicate emails. Continue?')) return;
      const records = readReceipts();
      for (const row of records) if (row.key === retryKey) row.state = 'acknowledged';
      saveReceipts(records);
      retryKey = null;
      status('Another send is now allowed. Review recipients and click Send report when ready. Nothing was sent by this action.');
    });
  } catch (error) { status(error.message, true); }
  receiptSummary();
  controls();
});

window.addEventListener('online', () => { controls(); if ($('p-rep').classList.contains('on')) loadGoogle(); });
window.addEventListener('offline', () => { controls(); status(sending ? 'Connection lost during send. Wait for the result; do not retry until you check Gmail Sent.' : 'Offline. Walk capture and downloads still work; email needs internet.', true); });
window.addEventListener('storage', event => { if (event.key === RECEIPT_KEY) receiptSummary(); });
window.addEventListener('pagehide', clearConnection);
window.addEventListener('beforeunload', event => { if (sending) { event.preventDefault(); event.returnValue = ''; } });
new MutationObserver(() => {
  if ($('p-rep').classList.contains('on')) { loadGoogle(); receiptSummary(); controls(); }
}).observe($('p-rep'), { attributes: true, attributeFilter: ['class'] });

try {
  const saved = JSON.parse(localStorage.getItem(LIST_KEY) || 'null');
  if (Array.isArray(saved) && saved.length && saved.length <= 30) {
    for (const item of saved) {
      if (typeof item.name !== 'string' || !item.name.trim() || item.name.length > 60) throw new Error('Invalid list');
      recipients(item);
    }
    lists = saved;
  }
} catch { /* Invalid/unavailable settings fall back to the self-only list, never inferred colleagues. */ }
paintLists();
initializePhotos();
receiptSummary();
status('Connect Gmail to send as avbydave@gmail.com. Nothing is sent until you review and confirm.');
controls();
if ($('p-rep').classList.contains('on')) loadGoogle();
