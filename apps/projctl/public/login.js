let signingIn = false;
document.getElementById('f').onsubmit = async (e) => {
  e.preventDefault();
  if (signingIn) return;
  signingIn = true;
  const submit = e.currentTarget.querySelector('[type=submit]');
  submit.disabled = true; submit.textContent = 'Signing in…'; const err = document.getElementById('err'); err.textContent = '';
  try {
    const r = await fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: document.getElementById('code').value }), signal: AbortSignal.timeout(8000) });
    const j = await r.json(); if (!r.ok) throw new Error(j.error || 'sign in failed');
    const next = new URL(new URLSearchParams(location.search).get('next') || '/', location.origin);
    location.href = next.origin === location.origin ? next.pathname + next.search + next.hash : '/';
  } catch (x) { err.textContent = x.name === 'TimeoutError' || x instanceof TypeError ? 'Controller did not respond. Check the connection and try again.' : x.message; }
  finally { signingIn = false; submit.disabled = false; submit.textContent = 'Sign in'; }
};
