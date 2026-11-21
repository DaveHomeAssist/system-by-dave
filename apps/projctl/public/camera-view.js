// Camera tab: embeds the local Stage PTZ console (ptz-control, http://127.0.0.1:8766).
// The console loads only while this tab is open. Leaving the tab unloads it, which
// releases any held camera movement and closes the camera's live stream.
// First installed on the show Mac by hand on 2026-11-17; carried into source on 2026-11-19.
const CONSOLE = 'http://127.0.0.1:8766';
const panel = document.getElementById('tab-camera');
const frame = document.getElementById('camera-frame');
const message = document.getElementById('camera-message');
const text = message.querySelector('p');
const retry = document.getElementById('camera-retry');
const onControlMac = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
let shown = false;
let attempt = 0;

function say(words, canRetry) {
  text.textContent = words;
  retry.hidden = !canRetry;
  message.hidden = false;
  frame.hidden = true;
}

async function open() {
  const current = ++attempt;
  if (!onControlMac) {
    say('Camera control runs on the control Mac. Open Projctl at http://localhost:8080 on that Mac to use it.', false);
    return;
  }
  say('Connecting to the Stage PTZ console…', false);
  try {
    // Reachability only: the console sends no CORS headers, so the response is opaque.
    await fetch(CONSOLE + '/api/status', { mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(2000) });
  } catch {
    if (current === attempt) say('The Stage PTZ console is not running. On this Mac, open “Launch PTZ.command” in WalnutStreetTheater-CodeResources › ptz-control, then press Retry.', true);
    return;
  }
  if (current !== attempt) return;
  frame.src = CONSOLE + '/?embed=1';
  frame.hidden = false;
  message.hidden = true;
}

function close() {
  attempt++;
  if (frame.getAttribute('src') && frame.getAttribute('src') !== 'about:blank') frame.src = 'about:blank';
  frame.hidden = true;
}

// Projctl's tab code sets `hidden` on every panel at each switch; act only on real changes.
function sync() {
  const now = !panel.hidden;
  if (now === shown) return;
  shown = now;
  if (now) void open();
  else close();
}

new MutationObserver(sync).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
retry.addEventListener('click', () => void open());
sync();
