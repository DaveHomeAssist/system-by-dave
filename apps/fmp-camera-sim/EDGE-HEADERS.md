# Camera Simulator — hosting edge security headers

**Status:** Plan + operator checklist (2026-09-24). GitHub Pages + Fastly currently serve `housevideo.app` **without** custom security headers. The simulator already sets a strong **meta** CSP (`connect-src 'none'`, no `'unsafe-inline'` / `'unsafe-eval'`), but meta CSP **cannot** set `frame-ancestors` or HSTS.

## Why this is not an app-only fix

| Control | Meta tag | HTTP response header |
| --- | --- | --- |
| `script-src` / `connect-src` / etc. | Yes (already on `/camera-sim/`) | Preferred (defense in depth) |
| `frame-ancestors` | **No** (ignored in meta) | Required to block clickjacking |
| `Strict-Transport-Security` | **No** | Required |
| `X-Content-Type-Options: nosniff` | No | Required |
| `Referrer-Policy` | Partial (`<meta name="referrer">` now on camera-sim) | Preferred site-wide |
| `Permissions-Policy` | No | Preferred |
| `X-Frame-Options` | No | Alternate / complement to `frame-ancestors` |

Live probes (2026-09-23): `server: GitHub.com`, `via: 1.1 varnish` (Fastly). No `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy` response headers.

GitHub Pages does **not** honour Netlify-style `_headers` or Cloudflare `_headers` files in the Pages repo.

## Recommended path

1. Put **Cloudflare** (or another reverse proxy) in front of the `housevideo.app` custom domain (DNS only / orange-cloud), keeping GitHub Pages as origin.
2. Add a **Transform Rule** (or Configuration Rule + Headers) for `housevideo.app/*` (or at least `/camera-sim/*` and `/fmp/*`):

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
```

3. Keep the existing **meta CSP** on camera-sim as defense-in-depth for script/connect. Align `/fmp/` pages to the same referrer meta (already present on hub).
4. Verify with `curl -sSI https://housevideo.app/camera-sim/` after DNS cutover.

## Out of scope for the SPA PR

Changing Cloudflare DNS or account settings is an ops step on the domain owner account. This document is the executable checklist; the SPA PR only adds the referrer meta and this note.

## Residual risk until the edge is configured

Cross-origin framing of the training UI remains possible. Impact is limited (no auth, no privileged server actions) but UI redressing of training controls is still possible.
