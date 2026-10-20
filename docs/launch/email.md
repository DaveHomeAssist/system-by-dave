# Email capture: "the next demo"

Status: **off**. The frame-sync demo's home is `demos/frame-sync.html`
(`https://avbydave.com/demos/frame-sync.html`, PR #360), and its email ask is the
post-completion form in `demos/demo-shell.js`. It stays hidden while
`emailFormAction` in `demos/config.js` is empty, and the site collects nothing.
Turning it on is Dave's decision and also needs the privacy-policy section in
`privacy-email-section.md`.

The provider-specific signup from the removed `frame-sync/` page
(`js/sbd-signup.js`: Kit/MailerLite background POST, Buttondown, beehiiv link)
is gone with that page.

## Turn it on (Dave)

1. Create the list with the chosen provider (decision 2026-10-19: beehiiv free).
2. Set `emailFormAction` (and `emailFieldName`, if not `email`) in
   `demos/config.js`. The form is a plain POST in a new tab.
3. Add the provider's form host to `form-action` in the Content Security
   Policy of `demos/index.html`, `demos/frame-sync.html` and
   `demos/fault-finding.html` (today it allows `https://buttondown.com`,
   `https://app.kit.com` and `https://app.convertkit.com`).
4. **beehiiv:** its embeds are iframes and its API needs a secret key, so a
   plain form POST from this static site isn't supported. Use its hosted
   subscribe page instead: that needs a small link mode in `demo-shell.js`
   (not built yet), or the subscribe link in `checklistUrl`/`checklistLabel`
   as a stopgap.
5. Test: one real signup from a phone, inside Instagram's in-app browser, with
   your own address. Confirm the double opt-in email arrives.
6. CHANGELOG entry ("Email signup on for the demos: <provider>").

## Turning it off again

Empty `emailFormAction`. Revert the privacy-policy section only after exporting
or deleting the collected list as that policy says.
