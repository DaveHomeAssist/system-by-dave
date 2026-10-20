// Shared shell for the AV by Dave demo pages: layout around the public breadcrumb and the
// completion panel, analytics (Umami, optional), and the post-completion email ask.
// Does nothing in capture mode (?drive or ?auto), so rendered frames are unchanged.
(() => {
  const cfg = window.SBD_DEMOS || {};
  const params = new URLSearchParams(location.search);
  const capture = params.has('drive') || params.has('auto');
  const $ = (id) => document.getElementById(id);

  // ---------- analytics ----------
  // umami.track(name, data) once the script has loaded; a no-op before that or without an ID.
  const queue = [];
  window.sbdTrack = (name, data) => {
    if (capture) return;
    if (window.umami && typeof window.umami.track === 'function') window.umami.track(name, data);
    else queue.push([name, data]);
  };
  if (!capture && cfg.umamiWebsiteId) {
    const s = document.createElement('script');
    s.defer = true; s.src = cfg.umamiScript || 'https://cloud.umami.is/script.js';
    s.setAttribute('data-website-id', cfg.umamiWebsiteId);
    s.setAttribute('data-exclude-search', 'false');   // keep utm_* so campaigns can be told apart
    s.addEventListener('load', () => { while (queue.length) { const [n, d] = queue.shift(); window.sbdTrack(n, d); } });
    document.head.appendChild(s);
  }
  if (!capture) {
    const utm = {};
    for (const [k, v] of params) if (k.startsWith('utm_')) utm[k] = v;
    window.sbdTrack('demo_view', { demo: document.body.dataset.demo || location.pathname, ...utm });
  }

  // ---------- layout: the stage sits between the breadcrumb bar and the completion panel ----------
  const fit = $('fit');
  // Size against the layout viewport (documentElement.clientWidth/Height), not
  // innerWidth/innerHeight: on a phone those report the zoomed-out visual viewport, so
  // a page that ever overflowed (the unscaled 1080 px stage before this runs) kept
  // scaling the stage to the inflated width and laid out 446-501 px wide on a 390 px phone.
  const vw = () => document.documentElement.clientWidth || innerWidth;
  const vh = () => document.documentElement.clientHeight || innerHeight;
  function layout() {
    if (!fit) return;
    if (capture) { fit.style.top = '50%'; fit.style.transform = `translate(-50%,-50%) scale(${Math.min(vw() / 1080, vh() / 1920)})`; return; }
    const bar = document.querySelector('.sbd-site-return');
    const panel = $('sbd-after');
    const top = bar ? bar.offsetHeight : 0;
    const bottom = panel && !panel.hidden ? panel.offsetHeight : 0;
    const avail = Math.max(200, vh() - top - bottom);
    const s = Math.min(vw() / 1080, avail / 1920);
    fit.style.top = `${top + avail / 2}px`;
    fit.style.transform = `translate(-50%,-50%) scale(${s})`;
  }
  window.sbdLayout = layout;
  addEventListener('resize', layout);

  // ---------- hosted subscribe link (beehiiv) ----------
  // A plain link out, so it needs no CSP change. Only https links on beehiiv.com
  // hosts count; the placeholder in config.js, '' or a typo return null.
  const SUBSCRIBE_HOST = /^([a-z0-9-]+\.)*beehiiv\.com$/i;
  function subscribeHref() {
    const raw = typeof cfg.emailSubscribeUrl === 'string' ? cfg.emailSubscribeUrl.trim() : '';
    if (!raw) return null;
    let url;
    try { url = new URL(raw); } catch (error) { return null; }
    if (url.protocol !== 'https:' || !SUBSCRIBE_HOST.test(url.hostname) || url.username || url.password) return null;
    // beehiiv records utm_* on its subscribe page as the signup's source. Pass the
    // visitor's own tags through (e.g. from Instagram); without any, tag the demo.
    const tags = {};
    for (const [k, v] of params) if (/^utm_(source|medium|campaign|content|term)$/.test(k)) tags[k] = v;
    if (!Object.keys(tags).length) {
      tags.utm_source = 'avbydave';
      tags.utm_medium = 'demo';
      tags.utm_campaign = 'demos';
      tags.utm_content = document.body.dataset.demo || 'demo';
    }
    for (const [k, v] of Object.entries(tags)) if (!url.searchParams.has(k)) url.searchParams.set(k, v);
    return url.toString();
  }
  window.sbdSubscribeHref = subscribeHref;

  // ---------- completion panel ----------
  // Shown once the viewer has reached the last step: the ask comes after the payoff, never before.
  function buildPanel() {
    if (capture || $('sbd-after')) return null;
    const next = document.body.dataset.nextDemo || '';
    const panel = document.createElement('aside');
    panel.id = 'sbd-after'; panel.hidden = true; panel.setAttribute('aria-label', 'After the demo');
    const subscribe = subscribeHref();
    const form = subscribe ? `
      <div class="sbd-after__form">
        <p class="sbd-after__label" id="sbd-subscribe-label">Want the next AV problem to play with?</p>
        <div class="sbd-after__row">
          <a class="sbd-after__cta" id="sbd-subscribe" target="_blank" rel="noopener" aria-describedby="sbd-subscribe-label" data-umami-event="email_subscribe_click">Send me the next demo</a>
        </div>
      </div>` : cfg.emailFormAction ? `
      <form class="sbd-after__form" method="post" action="${cfg.emailFormAction}" target="_blank" data-umami-event="email_submit">
        <label class="sbd-after__label" for="sbd-email">Want the next AV problem to play with?</label>
        <div class="sbd-after__row">
          <input id="sbd-email" type="email" name="${cfg.emailFieldName || 'email'}" required autocomplete="email" placeholder="you@show.site">
          ${cfg.emailTag ? `<input type="hidden" name="tag" value="${cfg.emailTag}">` : ''}
          <button type="submit">Send me the next demo</button>
        </div>
      </form>` : `<p class="sbd-after__label">You just fixed it. The next demo is coming.</p>`;
    const checklist = cfg.checklistUrl ? `<a class="sbd-after__alt" href="${cfg.checklistUrl}" data-umami-event="checklist_interest">${cfg.checklistLabel || 'Get the checklist'}</a>` : '';
    const nextLink = next ? `<a class="sbd-after__alt" href="${next}" data-umami-event="next_demo_click">Try the next demo</a>` : '';
    panel.innerHTML = `<div class="sbd-after__inner">${form}<div class="sbd-after__links">${nextLink}${checklist}</div><button class="sbd-after__close" type="button" aria-label="Close">×</button></div>`;
    const cta = panel.querySelector('#sbd-subscribe');
    if (cta) cta.href = subscribe;   // set as a property, never through innerHTML
    document.body.appendChild(panel);
    panel.querySelector('.sbd-after__close').addEventListener('click', () => { panel.hidden = true; layout(); });
    panel.querySelector('form')?.addEventListener('submit', () => window.sbdTrack('email_submit', { demo: document.body.dataset.demo }));
    return panel;
  }
  window.sbdComplete = () => {
    if (capture) return;
    window.sbdTrack('demo_complete', { demo: document.body.dataset.demo });
    const panel = buildPanel(); if (!panel) return;
    panel.hidden = false; layout();
  };

  document.addEventListener('DOMContentLoaded', layout);
  layout();
})();
