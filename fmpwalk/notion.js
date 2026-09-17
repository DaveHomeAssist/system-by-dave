import { CLIENT_ID, snapshot } from './mail.js?v=4a521185a33c8463';
import { ensurePhotosReady, photoFiles } from './photos.js?v=cd1feeb0fd50c5df';
import { NOTION_API_URL } from './notion-config.js?v=b675c734abe301f4';

const $ = id => document.getElementById(id);
const base = /^https:\/\/[a-z0-9-]+\.[a-z0-9.-]*run\.app$/.test(NOTION_API_URL) ? NOTION_API_URL : '';
let credential = null; // Google ID token, tab memory only. Never a Gmail token or a Notion secret.
let expires = 0, timer, busy = false, initialized = false, loading = false, generation = 0;
function message(text) { $('notionStatus').textContent = text; }
function controls() {
  $('notionSave').disabled = busy || !credential || expires <= Date.now() || !navigator.onLine;
  $('notionSave').textContent = busy ? 'Saving snapshot…' : 'Save to Notion';
  $('notionDisconnect').hidden = !credential;
  $('notionDisconnect').disabled = busy;
  $('notionSetupTest').disabled = busy;
}
function disconnect() {
  credential = null; expires = 0; generation++; clearTimeout(timer); controls();
}
async function api(path, options = {}) {
  if (!credential || expires <= Date.now()) throw new Error('Sign in to save to Notion.');
  const response = await fetch(base + path, {
    ...options, credentials: 'omit', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(290000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${credential}` }
  });
  const body = await response.json();
  if (response.status === 401 || response.status === 403) { disconnect(); message(body.error || 'Sign in again as the authorized FMP Walk account.'); }
  if (!response.ok) throw new Error(body.error || 'Notion save is unconfirmed. Preserve your export and check again.');
  return body;
}
function initialize() {
  if (!base) { message('Notion setup is not complete. Download or copy your report for now.'); return; }
  if (initialized || loading || !navigator.onLine) return;
  if (!window.google?.accounts?.id) {
    loading = true;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client'; script.async = true;
    const timeout = setTimeout(() => finish(false), 15000);
    let settled = false;
    function finish(ok) {
      if (settled) return; settled = true; clearTimeout(timeout); loading = false;
      script.onload = script.onerror = null;
      if (ok) initialize();
      else { script.remove(); message('Google sign-in could not load. Use Retry Notion sign-in when your connection is ready.'); }
    }
    script.onload = () => finish(Boolean(window.google?.accounts?.id));
    script.onerror = () => finish(false);
    document.head.appendChild(script);
    return;
  }
  initialized = true;
  window.google.accounts.id.initialize({ client_id: CLIENT_ID, auto_select: false,
    callback: async result => {
      if (busy) return;
      disconnect();
      const attempt = generation;
      try {
        if (typeof result.credential !== 'string') throw new Error('Google did not return a sign-in credential.');
        // Decoding controls local expiry only. The backend verifies signature, audience, issuer, expiry and account.
        const claims = JSON.parse(atob(result.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (!Number.isFinite(claims.exp) || claims.exp * 1000 <= Date.now() + 60000) throw new Error('Google sign-in has expired.');
        credential = result.credential; expires = claims.exp * 1000 - 60000;
        await api('/api/connection');
        if (attempt !== generation) return;
        timer = setTimeout(() => { disconnect(); message('Notion sign-in expired. Sign in again before saving.'); }, expires - Date.now());
        message('Connected for personal Notion records. Review the report, then choose Save to Notion.');
      } catch (error) { if (attempt === generation) { disconnect(); message(error.message); } }
      controls();
    }
  });
  window.google.accounts.id.renderButton($('notionGoogle'), { type: 'standard', theme: 'outline', size: 'large', text: 'signin_with' });
  message('Sign in as avbydave@gmail.com to save personal records. This does not connect Gmail or send an email.');
}
$('notionRetry').addEventListener('click', initialize);
$('notionDisconnect').addEventListener('click', () => { disconnect(); message('Notion sign-in cleared from this tab.'); });
$('notionSave').addEventListener('click', async () => {
  if (busy) return;
  busy = true; controls();
  try {
    if (!navigator.locks) throw new Error('This browser cannot coordinate saves across tabs. Use a current browser.');
    await navigator.locks.request('fmpNotionSaveV1', { ifAvailable: true }, async lock => {
      if (!lock) throw new Error('Another tab is saving. Wait for it to finish.');
      ensurePhotosReady();
      const record = snapshot(window.S, window.report());
      const route = window.stations().map(s => s.id);
      record.photos = await photoFiles(record.walk);
      const setupTest = $('notionSetupTest').checked;
      const warning = window.S.draft ? '\nUnsubmitted fault drafts are excluded.' : '';
      if (!confirm(`Save this ${setupTest ? 'SETUP TEST' : 'walk report'} to your personal FMP Walk Notion databases?\n\nIncludes the report, JSON archive, ${record.photos.length} photos, and ${record.walk.faults.length} linked fault observations.\nNo email will be sent.${warning}`)) {
        message('Notion save cancelled.'); return;
      }
      message('Saving the reviewed snapshot. Keep this tab open.');
      const result = await api('/api/reports', { method: 'POST', body: JSON.stringify({ record, route, setupTest }) });
      if (!/^[a-f0-9-]{36}$/.test(result.pageId || '')) throw new Error('The Notion response could not be verified.');
      const link = $('notionReceipt');
      link.href = `https://www.notion.so/${result.pageId.replaceAll('-', '')}`;
      link.hidden = false;
      message(`Saved to Notion: ${result.faults} linked faults, ${result.files} files. Report ID ${result.reportId}. Email status is separate.`);
    });
  } catch (error) {
    message(error.name === 'AbortError' || error.name === 'TimeoutError' || error instanceof TypeError ?
      'Notion save outcome is unconfirmed. Preserve this walk and retry the same snapshot to check for an existing record.' : error.message);
  } finally { busy = false; controls(); }
});
window.addEventListener('pagehide', disconnect);
window.addEventListener('beforeunload', event => { if (busy) { event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('online', controls);
window.addEventListener('offline', controls);
new MutationObserver(() => { if ($('p-rep').classList.contains('on')) initialize(); }).observe($('p-rep'), { attributes: true, attributeFilter: ['class'] });
controls();
if ($('p-rep').classList.contains('on')) initialize();
