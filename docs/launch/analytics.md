# Launch analytics events

**Decision (2026-10-18): analytics stays OFF.** No provider is configured and
none is planned. The dispatcher stays a no-op and the privacy policy's
"no analytics" statement stays true. The rest of this page records what would be
needed if that ever changes.

Status: **dispatcher built, no provider.** `js/sbd-events.js` defines the launch
brief's events and is a no-op until a provider is registered. Nothing is sent
anywhere today, and no third-party script is loaded.

## Why it is off

The site's public claims say there is no analytics service:

- `privacy-policy.html`, "Cookies and Analytics": "System by Dave does not send
  link click counts to an analytics service … The site does not run advertising
  trackers or marketing pixels." The short version says link click counts stay in
  the browser.
- The homepage "Static by design" card links to that policy.

Turning on any provider makes those statements untrue, so it is **Dave's
decision**, and the policy must change in the same pull request.

## Events

Every event carries `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`
and `utm_term` when the landing URL had them (sanitized, 64 characters max), plus
the page path and a timestamp.

| Event | Fires when | Extra properties |
|---|---|---|
| `page_view` | Demo or Field Kit page loads | `mode` (`interactive`/`autoplay`) or `page` |
| `step_view` | A step is shown (1–7) | `step`, `mode` |
| `tear_triggered` | "Cause the tear" tapped, or auto-play reaches step 3 | `source` (`user`/`autoplay`) |
| `fix_applied` | "Apply the fix" tapped, or auto-play applies it | `source` |
| `demo_complete` | Step 7 shown (once per page load) | `mode` |
| `autoplay_started` | Auto-play starts (`?autoplay=1` or the button) | `order` |
| `signup_view` | The post-fix signup scrolls 40% into view (once) | — |
| `signup_submit` | Mailto fallback tapped, or the configured form submitted | `method` |
| `kit_click` | Field Kit link tapped (only shown once configured) | `placement` |
| `affiliate_click` | A link with `data-affiliate` tapped (none exist yet) | `id` |

Capture runs (`?capture=1`) disable the dispatcher so recordings never count.

## Dispatcher API

```js
SBDEvents.track(name, props)   // unknown names are ignored
SBDEvents.setProvider(fn)      // fn(event) receives { name, ts, path, props }
SBDEvents.configured()         // false today
SBDEvents.log()                // in-memory copy for local tests; never stored or sent
```

Without a provider each event is also dispatched on `window` as `sbd:event`;
`scripts/launch/probe_frame_sync.mjs` uses that to check the order.

## Turning a provider on (after Dave decides)

1. Pick a cookieless, privacy-friendly, static-site-compatible tool, and decide
   who holds the account. Candidates people commonly use for this: a hosted
   cookieless counter (e.g. Plausible, GoatCounter, Cloudflare Web Analytics) or
   self-hosted Umami. Prices and terms were not checked for this draft.
2. Update `privacy-policy.html` in the same change:
   - "Cookies and Analytics": name the tool, what is sent (page path, the events
     above, UTM tags, coarse device/browser data the tool records), that no
     cookies are set (if true), retention, and a link to the tool's policy.
   - Short version callout: drop "link click counts stay in your browser" or say
     which data leaves the browser.
   - "Third-Party Resources": add the tool's script/endpoint host.
   - Effective date.
3. Add the tool's host to the demo and Field Kit Content Security Policy
   (`script-src` if it loads a script, `connect-src` for its endpoint).
4. Register the adapter in `js/sbd-launch-config.js` (`analytics.provider`) and a
   tiny adapter that calls `SBDEvents.setProvider`. Keep event names unchanged so
   UTM reports stay comparable.
5. Re-read the homepage "Static by design" card and the privacy statements
   checked by `npm run verify:public-consistency`; add the new behavior marker
   there.
6. Record it in `CHANGELOG.md`.

The email signup has the same rule: an email tool collects addresses, so the
policy's "What This Site Collects" section must name it, the purpose (the next
demo), and how to unsubscribe before `email.endpoint` is set.
