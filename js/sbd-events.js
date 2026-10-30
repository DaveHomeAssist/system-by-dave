/* System by Dave launch event dispatcher (docs/launch/analytics.md).
   A no-op unless a provider is registered with SBDEvents.setProvider().
   No provider is registered anywhere today: the site's privacy policy says it
   does not send usage data to an analytics service, and turning one on is
   Dave's decision together with a privacy-policy update.

   Without a provider, events stay in an in-memory list (never stored, never
   sent) and are announced as a same-page `sbd:event` DOM event, so local
   tests can check the order. UTM parameters from the landing URL are copied
   onto every event so routes can be compared once a provider exists. */
(function (global) {
  'use strict';

  var EVENTS = [
    'page_view', 'step_view', 'tear_triggered', 'fix_applied', 'demo_complete',
    'autoplay_started', 'signup_view', 'signup_submit', 'kit_click', 'affiliate_click'
  ];
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var MAX_LOG = 200;
  var provider = null;
  var disabled = false;
  var log = [];

  function readUtm(search) {
    var out = {};
    var params;
    try { params = new URLSearchParams(search || ''); } catch (error) { return out; }
    UTM_KEYS.forEach(function (key) {
      var value = params.get(key);
      // Keep values short and plain so a crafted URL cannot stuff an event.
      if (value) out[key] = String(value).replace(/[^\w.\-]/g, '').slice(0, 64);
    });
    return out;
  }

  var utm = readUtm(global.location ? global.location.search : '');

  function track(name, props) {
    if (EVENTS.indexOf(name) < 0) return false;
    var detail = {};
    Object.keys(utm).forEach(function (key) { detail[key] = utm[key]; });
    Object.keys(props || {}).forEach(function (key) { detail[key] = props[key]; });
    var event = {
      name: name,
      ts: Date.now(),
      path: global.location ? global.location.pathname : '',
      props: detail
    };
    log.push(event);
    if (log.length > MAX_LOG) log.shift();
    try { global.dispatchEvent(new CustomEvent('sbd:event', { detail: event })); } catch (error) {}
    if (disabled || typeof provider !== 'function') return false;
    try { provider(event); } catch (error) {}
    return true;
  }

  global.SBDEvents = {
    EVENTS: EVENTS.slice(),
    track: track,
    utm: function () { return JSON.parse(JSON.stringify(utm)); },
    log: function () { return log.slice(); },
    configured: function () { return typeof provider === 'function' && !disabled; },
    // Register exactly one sender, e.g. a privacy-friendly analytics adapter.
    setProvider: function (fn) { provider = typeof fn === 'function' ? fn : null; },
    // Capture/recording runs call this so they never reach a provider.
    disable: function () { disabled = true; }
  };
})(typeof window !== 'undefined' ? window : this);
