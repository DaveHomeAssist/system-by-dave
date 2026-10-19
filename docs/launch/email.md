# Email capture: "Get the next demo"

Status: **off**. The block after the fix shows a mailto link to
avbydave@gmail.com and the site collects nothing. Turning it on is Dave's
decision. It takes one config block plus the privacy-policy section in
`privacy-email-section.md`.

Code: `js/sbd-signup.js` (provider logic), markup in `frame-sync/index.html`
(`#fs-signup`), config in `js/sbd-launch-config.js` (`email`).

## What the visitor gets

- The block appears only after the fix (step 4) or from step 5 on. It sits in
  the page flow below the controls, never fixed or covering the demo.
- Inline states: "Sending…", a confirmation, or an inline error. A connection
  error offers "Finish on the sign-up page", which posts the same form in a new
  tab. The demo keeps working in every state (checked by the probe).
- Spam: a hidden honeypot field. If a bot fills it, the visitor sees the
  thank-you and nothing is sent. The honeypot is never sent to the provider.
- No JavaScript: the page shows a mailto line under the steps. The provider form
  needs JavaScript because the config lives in JS.
- Not configured, or a value that doesn't validate: the mailto fallback.
- Events (no-op dispatcher, analytics OFF): `signup_view`, `signup_submit`
  with `method` = the provider or `mailto`.

## Turn it on (Dave)

1. Create the account with the provider you pick, set **double opt-in** on, and
   write the confirmation and welcome email.
2. Apply the privacy-policy section (`privacy-email-section.md`) with the
   provider name filled in. Do this before step 3 goes live.
3. Paste **one** block into `js/sbd-launch-config.js`, replacing `email`:

| Provider | Paste | Where to find the value | How it submits |
|---|---|---|---|
| Buttondown | `email: { provider: 'buttondown', id: 'YOUR_USERNAME', fallbackMailto: 'avbydave@gmail.com' }` | The last part of `buttondown.com/YOUR_USERNAME` | Standard form POST to `https://buttondown.com/api/emails/embed-subscribe/YOUR_USERNAME` in a new tab, with `embed=1` and the visitor's UTM tags. Buttondown asks for a real form POST (not fetch) so its CAPTCHA and confirmation pages work |
| Kit (ConvertKit) | `email: { provider: 'kit', id: '1234567', fallbackMailto: 'avbydave@gmail.com' }` | Form → Embed → HTML: the digits in `action="https://app.kit.com/forms/1234567/subscriptions"` | Background POST (`email_address`), inline confirmation |
| MailerLite | `email: { provider: 'mailerlite', id: 'https://assets.mailerlite.com/jsonp/ACCOUNT/forms/FORM/subscribe', fallbackMailto: 'avbydave@gmail.com' }` | Forms → Embedded forms → Overview → HTML code: the whole `action` URL | Background POST (`fields[email]`, `ml-submit=1`, `anticsrf=true`), inline confirmation |
| beehiiv | `email: { provider: 'beehiiv', id: 'https://YOURPUB.beehiiv.com/subscribe', fallbackMailto: 'avbydave@gmail.com' }` | Your publication's public subscribe page | A "Sign up for the next demo" button to that page. beehiiv's embeds are iframes and its API needs a secret key on a server, so a custom form isn't possible on this static site |
| Other | `email: { provider: 'custom', id: 'https://…', fallbackMailto: 'avbydave@gmail.com' }` | Any HTTPS endpoint that accepts a POSTed `email` field | Background POST. **Also** add its origin to `connect-src` and `form-action` in the `frame-sync/index.html` CSP |

The `frame-sync/index.html` CSP already allows `https://app.kit.com` and
`https://assets.mailerlite.com` (`connect-src`, `form-action`) and
`https://buttondown.com` (`form-action`). Those addresses only receive a POST
after a visitor submits; no script or tracker loads from them. beehiiv is a
plain link and needs no CSP change.

"Background POST" uses `fetch` with `mode: 'no-cors'`. The provider's reply
can't be read, so "sent" is shown on delivery. The provider's double opt-in
email is the real confirmation. A failed connection shows the inline error.

4. Test before merging:
   `npm run probe:frame-sync -- --screens /tmp/screens` checks every provider
   against local mocks. Then do one real signup from a phone, in Instagram's
   in-app browser, with your own address: confirm the double opt-in email arrives
   and the address lands in the right list.
5. CHANGELOG entry ("Email signup on for the frame sync demo: <provider>").

## Turning it off again

Set `provider: null`. The mailto fallback returns. Revert the privacy-policy
section only after exporting or deleting the collected list as that policy says.
