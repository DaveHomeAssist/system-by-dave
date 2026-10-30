# Email capture: "the next demo"

Status: **off**. The frame-sync demo's home is `demos/frame-sync.html`
(`https://systembydave.com/demos/frame-sync.html`, PR #360), and its email ask is the
post-completion panel in `demos/demo-shell.js`. Until `emailSubscribeUrl` (beehiiv)
or `emailFormAction` in `demos/config.js` is set, the panel only says the next demo
is coming, and the site collects nothing.
Turning it on is Dave's decision and also needs the privacy-policy section in
`privacy-email-section.md`.

The provider-specific signup from the removed `frame-sync/` page
(`js/sbd-signup.js`: Kit/MailerLite background POST, Buttondown, beehiiv link)
is gone with that page.

## Turn it on (Dave): beehiiv hosted subscribe page

Decision 2026-10-19: beehiiv free. beehiiv's embeds are iframes and its API needs
a secret key, so this static site links to beehiiv's hosted subscribe page instead
of posting a form.

1. In beehiiv, copy the publication's public subscribe page URL, e.g.
   `https://YOURPUB.beehiiv.com/subscribe`.
2. In `demos/config.js`, replace the placeholder
   `emailSubscribeUrl: '[DAVE: beehiiv subscribe URL]'` with that URL.
   Only an `https` link on a `beehiiv.com` host is accepted; anything else
   (the placeholder, `''`, a typo, a custom domain) leaves the ask as it is today.
3. What visitors get after finishing a demo: a "Send me the next demo" button that
   opens the subscribe page in a new tab (`rel="noopener"`). The link carries the
   visitor's own `utm_*` tags (e.g. from Instagram), or, without any,
   `utm_source=avbydave&utm_medium=demo&utm_campaign=demos&utm_content=<demo>`.
   It replaces the form, even if `emailFormAction` is also set. No CSP change: it's
   a plain link.
4. Review the privacy-policy section, already in `privacy-policy.html` (`#email-list`, from `privacy-email-section.md`), and set its "Updated" date to the publish date.
5. Test: `npm run probe:demo-subscribe` (mocked), then one real signup from a
   phone, inside Instagram's in-app browser, with your own address. Confirm the
   double opt-in email arrives and beehiiv shows the UTM source.
6. CHANGELOG entry ("Email signup on for the demos: beehiiv").

Other providers (Buttondown, Kit) use the form instead: set `emailFormAction`
(and `emailFieldName`) and add the form host to `form-action` in the demos' CSP
(today it allows `https://buttondown.com`, `https://app.kit.com` and
`https://app.convertkit.com`).

## Turning it off again

Put the placeholder back in `emailSubscribeUrl` (or empty `emailFormAction`). Revert the privacy-policy section only after exporting
or deleting the collected list as that policy says.
