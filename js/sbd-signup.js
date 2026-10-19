/* "Get the next demo" email signup (docs/launch/email.md).
   One config block (window.SBD_LAUNCH.email) picks the provider; with nothing
   configured the section keeps its mailto fallback and nothing is collected.
   The signup is always optional: it never blocks, covers or delays the demo,
   and every failure ends in an inline message plus a way to finish elsewhere.

   Strategies, by provider:
   - post:  standard form POST into a new tab (Buttondown asks for this so its
            CAPTCHA and confirmation pages work).
   - fetch: background POST with mode 'no-cors' (Kit, MailerLite, custom). The
            provider's reply can't be read, so success means "sent"; the
            provider's confirmation email is the real check. A network failure
            shows an error and a button that finishes the signup in a new tab.
   - link:  a button to the provider's hosted subscribe page (Beehiiv, whose
            embeds can't take a custom form without a server). */
(function (global) {
  'use strict';

  var PROVIDERS = {
    buttondown: {
      label: 'Buttondown',
      strategy: 'post',
      field: 'email',
      extra: { embed: '1' },
      passUtm: true,
      resolve: function (id) {
        return /^[A-Za-z0-9_-]{1,64}$/.test(id) ? 'https://buttondown.com/api/emails/embed-subscribe/' + id : '';
      }
    },
    kit: {
      label: 'Kit',
      strategy: 'fetch',
      field: 'email_address',
      extra: {},
      resolve: function (id) { return /^\d{3,12}$/.test(id) ? 'https://app.kit.com/forms/' + id + '/subscriptions' : ''; }
    },
    mailerlite: {
      label: 'MailerLite',
      strategy: 'fetch',
      field: 'fields[email]',
      extra: { 'ml-submit': '1', anticsrf: 'true' },
      resolve: function (id) {
        return /^https:\/\/assets\.mailerlite\.com\/jsonp\/\d+\/forms\/\d+\/subscribe$/.test(id) ? id : '';
      }
    },
    beehiiv: {
      label: 'beehiiv',
      strategy: 'link',
      resolve: function (id) {
        return /^https:\/\/[a-z0-9-]+\.beehiiv\.com\/subscribe\/?(\?[^\s"'<>]*)?$/i.test(id) ? id : '';
      }
    },
    custom: {
      label: 'form',
      strategy: 'fetch',
      field: 'email',
      extra: {},
      resolve: function (id) { return /^https:\/\/[^\s"'<>]+$/.test(id) ? id : ''; }
    }
  };

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function resolve(email) {
    email = email || {};
    var p = PROVIDERS[email.provider];
    var id = typeof email.id === 'string' ? email.id.trim() : '';
    if (!p || !id) return null;
    var action = p.resolve(id);
    if (!action) return null;
    return { name: email.provider, def: p, action: action };
  }

  function mount(opts) {
    var email = opts.config || {};
    var track = opts.track || function () {};
    var utm = opts.utm || {};
    var $ = function (id) { return document.getElementById(id); };
    var form = $(opts.formId || 'fs-signup-form');
    var fallback = $(opts.fallbackId || 'fs-signup-fallback');
    var mailto = $(opts.mailtoId || 'fs-mailto');
    var hosted = $(opts.linkId || 'fs-signup-link');
    var address = typeof email.fallbackMailto === 'string' && EMAIL_RE.test(email.fallbackMailto) ? email.fallbackMailto : 'avbydave@gmail.com';

    if (mailto) {
      mailto.href = 'mailto:' + address + '?subject=' + encodeURIComponent('Next demo, please') +
        '&body=' + encodeURIComponent('Send me the next AV by Dave demo when it is ready.');
      mailto.addEventListener('click', function () { track('signup_submit', { method: 'mailto' }); });
    }

    var chosen = resolve(email);
    if (!chosen) return { mode: 'mailto' };

    if (chosen.def.strategy === 'link') {
      if (!hosted) return { mode: 'mailto' };
      hosted.href = chosen.action;
      hosted.hidden = false;
      if (fallback) fallback.hidden = true;
      hosted.addEventListener('click', function () { track('signup_submit', { method: chosen.name }); });
      return { mode: 'link', provider: chosen.name };
    }
    if (!form) return { mode: 'mailto' };

    var input = form.querySelector('input[type="email"]');
    var trap = form.querySelector('[data-honeypot]');
    var button = form.querySelector('button[type="submit"]');
    var status = form.querySelector('[role="status"]');
    var retry = form.querySelector('[data-retry]');

    input.name = chosen.def.field;
    form.action = chosen.action;
    form.method = 'post';
    form.target = '_blank';
    Object.keys(chosen.def.extra || {}).forEach(function (key) { addHidden(key, chosen.def.extra[key]); });
    if (chosen.def.passUtm) Object.keys(utm).forEach(function (key) { addHidden(key, utm[key]); });
    form.hidden = false;
    if (fallback) fallback.hidden = true;

    function addHidden(name, value) {
      var el = document.createElement('input');
      el.type = 'hidden';
      el.name = name;
      el.value = value;
      form.appendChild(el);
    }
    function setState(kind, text) {
      form.setAttribute('data-state', kind);
      status.textContent = text;
      button.disabled = kind === 'sending';
      if (retry) retry.hidden = kind !== 'error';
    }
    function done() {
      setState('success', 'Thanks. Check your inbox and confirm, and the next demo comes to you.');
      input.disabled = true;
      button.hidden = true;
    }

    if (retry) {
      retry.addEventListener('click', function () {
        // Direct user tap, so the new tab isn't treated as a pop-up.
        if (trap) trap.disabled = true;
        HTMLFormElement.prototype.submit.call(form);
        setState('success', 'Finish signing up in the tab that just opened.');
      });
    }

    form.addEventListener('submit', function (event) {
      var value = (input.value || '').trim();
      if (trap && trap.value) { event.preventDefault(); done(); return; } // likely a bot: say thanks, send nothing
      if (!EMAIL_RE.test(value)) {
        event.preventDefault();
        setState('error-input', 'Enter an email address, like name@example.com.');
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        return;
      }
      input.removeAttribute('aria-invalid');
      input.value = value;
      track('signup_submit', { method: chosen.name });
      if (chosen.def.strategy === 'post') {
        // Let the browser post into a new tab; the demo stays where it is.
        if (trap) trap.disabled = true;
        setState('success', 'Opened ' + chosen.def.label + ' in a new tab. Confirm there, then check your inbox.');
        return;
      }
      event.preventDefault();
      setState('sending', 'Sending…');
      var body = new FormData(form);
      if (trap) body.delete(trap.name);
      var timer = null;
      var settled = false;
      function fail() {
        if (settled) return;
        settled = true;
        setState('error', 'That didn\u2019t go through (connection problem). The demo still works; you can try again or finish on the sign-up page.');
      }
      if (typeof global.fetch !== 'function') { fail(); return; }
      timer = setTimeout(fail, 12000);
      global.fetch(chosen.action, { method: 'POST', mode: 'no-cors', body: body, headers: { Accept: 'application/json' }, credentials: 'omit' })
        .then(function () { if (settled) return; settled = true; clearTimeout(timer); done(); })
        .catch(function () { clearTimeout(timer); fail(); });
    });
    return { mode: chosen.def.strategy, provider: chosen.name };
  }

  global.SBDSignup = { mount: mount, resolve: resolve, PROVIDERS: Object.keys(PROVIDERS) };
})(typeof window !== 'undefined' ? window : this);
