# AV by Dave launch: frame-sync demo

The reversible, on-site parts of the frame-sync Reel launch (launch brief §2–§6).
Nothing here posts, signs up or spends anything; every external service is off
until Dave picks it.

## Pages

| Route | Published at | Indexing | Purpose |
|---|---|---|---|
| `demos/frame-sync.html` (PR #360) | `https://systembydave.com/demos/frame-sync.html` | Indexed (systembydave.com sitemap) | The free, open interactive demo the Reel points to. Its single home; see `demos/README.md` |
| `field-kit/` | `https://avbydave.com/field-kit/` | `noindex,nofollow`, not linked from navigation | Draft product page; $12, checkout closed |
| `field-kit/thanks/` | `https://avbydave.com/field-kit/thanks/` | `noindex,nofollow,noarchive` | Buyers-only download page Stripe's after-payment redirect lands on |

`field-kit/` is listed in the avbydave site's `pages` in `scripts/domain-sites.json`,
so it publishes on avbydave.com, and the systembydave.com path becomes a redirect
stub that keeps the query string (UTM tags survive). It is a top-level route, not
under `av/`, because `av/` is the AV Suite build output (`npm run build:av-suite`
empties it). **Reel URL:** `https://systembydave.com/demos/frame-sync.html`. Dave
approves the final URL before anything is posted.

The page is not in the AV offline cache, so no cache generation bump is needed.

An earlier draft of this branch carried a second frame-sync demo at
`frame-sync/`. It was never on `main` or live, and was removed so the demo has one
home; no redirect is needed.

## Configuration

| Where | Key | Today |
|---|---|---|
| `demos/config.js` | `emailSubscribeUrl` | `[DAVE: beehiiv subscribe URL]` placeholder: no signup link yet. Set → UTM-tagged button to beehiiv's hosted page (`email.md`) |
| `demos/config.js` | `umamiWebsiteId`, `emailFormAction`, `checklistUrl` | No analytics (demo CSP has no `cloud.umami.is` since 2026-10-30; re-adding needs a CSP + privacy-policy change), no email form; `checklistUrl` is the absolute, UTM-tagged Field Kit link on avbydave.com (see `demos/README.md`) |
| `js/sbd-launch-config.js` | `analytics.provider` | `null`: **OFF by decision (2026-10-18)**, no-op dispatcher (`analytics.md`) |
| `js/sbd-launch-config.js` | `fieldKit.checkout` | `provider: 'stripe'`, `url: '[DAVE: Stripe Payment Link]'`: checkout disabled. After payment, Stripe redirects to the noindex `field-kit/thanks/` download page. One block per provider (Gumroad, Lemon Squeezy, Stripe Payment Links): see `checkout.md`. Stays closed while `[DAVE]` placeholders remain |
| `js/sbd-launch-config.js` | `fieldKit.priceLabel` | `$12` (Dave, 2026-10-30); checkout stays closed until the Payment Link is real |

Affiliate links: none, and none planned for now (decision 2026-10-18).

## Reel

The existing reel files (`/workspace/launch/reel/`, never committed) were rendered
from the removed `frame-sync/` page. They still show the same seven-step story,
but the page a viewer lands on is `demos/frame-sync.html`, which looks different.
Re-render from the landing page with `demos/capture.mjs` (`demos/README.md`) if
the reel should match it. Overlay copy and timing for the existing cuts are
recorded in `scripts/launch/reel-plan.json`.

Music (decision: music, no voice):

```sh
npm run mix:frame-sync-reel-music -- --reel /path/outside/repo [--track licensed.wav]
```

`scripts/launch/mix_reel_music.sh` trims the track to each cut, fades it in
(0.4 s) and out (2 s), normalizes to −14 LUFS integrated / −1.5 dBTP with a
two-pass `loudnorm`, copies the video stream untouched, and re-measures the
result. Without `--track` it synthesizes a clearly named
`PLACEHOLDER-synth-bed-NOT-FINAL` test bed and names the outputs
`*-MUSIC-PLACEHOLDER.mp4`. They're not for posting.

## Probe (local only)

```sh
npm run probe:field-kit -- --screens /path/outside/repo
```

Phone 390×844 and desktop 1280×800: the Field Kit draft (noindex, $12 shown, no
console errors or horizontal scroll) and the checkout interlock and providers
against local mocks, and the `field-kit/thanks/` download page. The demo itself is
checked by `demos/check-states.js`; its email ask by
`npm run probe:demo-subscribe` (placeholder, beehiiv link, UTM tags, bad URLs).

## Copy

`reel-copy.md` holds the draft overlay text, captions, pinned comment, DM 1/2,
UTM link table, bio and Story text and the music notes. All of it needs Dave's
approval. Field Kit contents are kept out of this public repository because they
are the paid product.

## Decisions so far

Analytics OFF (no provider, 2026-10-18) · Reel uses music, not voice · no
affiliate programs · no Meta One subscription · email: beehiiv free; Field Kit
checkout: Stripe Payment Links (2026-10-19) · the demo's single home is
`demos/frame-sync.html` (2026-10-20).

## Dave decides

Email account (then `email.md`) · Field Kit price, terms and where the kit files
are hosted (then `checkout.md`) · DM tool and Instagram professional account ·
the music track · whether to re-render the reel from the landing page · posting
all copy.
