# AV by Dave launch: frame-sync demo

The reversible, on-site parts of the frame-sync Reel launch (launch brief §2–§6).
Nothing here posts, signs up or spends anything; every external service is off
until Dave picks it.

## Pages

| Route | Published at | Indexing | Purpose |
|---|---|---|---|
| `frame-sync/` | `https://avbydave.com/frame-sync/` | Indexed (avbydave.com sitemap) | The free, open interactive demo the Reel points to |
| `field-kit/` | `https://avbydave.com/field-kit/` | `noindex,nofollow`, not linked from navigation | Draft product page; price TBD, checkout closed |

Both are listed in the avbydave site's `pages` in `scripts/domain-sites.json`,
so they publish on avbydave.com, and the systembydave.com paths become redirect
stubs that keep the query string (UTM tags survive). They are top-level routes,
not under `av/`, because `av/` is the AV Suite build output (`npm run
build:av-suite` empties it). **Proposed Reel URL:**
`https://avbydave.com/frame-sync/`. Linking the systembydave.com path also works
but adds a redirect hop in Instagram's in-app browser. Dave approves the final URL
before anything is posted.

Neither page is in the AV offline cache, so no cache generation bump is needed.

## Demo behavior

- Seven steps; step 3 causes the tear, step 4 fixes it (vsync / frame sync),
  then drift (5), genlock (6) and a field check (7). Fully open, no gate.
- Works without JavaScript as a written seven-step explainer.
- `?autoplay=1` plays every step at 5 s; `&step_s=4..6` changes the pace,
  `&order=3,4,1,2,5,6,7` the order. Any control press stops auto-play.
- Reduced motion starts paused, with a Play control. There's always a Pause control.
- After the fix, an optional "Get the next demo" block appears inline below the
  controls. It never covers or blocks the demo.
- `?capture=1` is the recording layout used by the reel runner (virtual clock,
  9:16 or `&aspect=4x5`, events disabled).

## Configuration hooks (`js/sbd-launch-config.js`)

| Key | Today | When set |
|---|---|---|
| `analytics.provider` | `null`: **OFF by decision (2026-10-18)**, no-op dispatcher | Not planned; `analytics.md` lists what would be needed |
| `email` | `provider: null` → mailto link to avbydave@gmail.com | One block per provider (Buttondown, Kit, MailerLite, beehiiv, custom): see `email.md`; privacy section in `privacy-email-section.md` first |
| `fieldKit.checkout` | `provider: null` → checkout disabled, demo kit block hidden | One block per provider (Gumroad, Lemon Squeezy, Stripe Payment Links): see `checkout.md`. Stays closed while `[DAVE]` placeholders remain |
| `fieldKit.priceLabel` | `Price TBD` | Dave's price, shown on the Field Kit page |

Affiliate links: none, and none planned for now (decision 2026-10-18).

## Reel capture (local only, not in CI)

```sh
npm run capture:frame-sync-reel -- --out /path/outside/repo
```

`scripts/launch/capture_frame_sync_reel.mjs` renders the capture layout frame by
frame at 1080×1920 / 30 fps (no dropped frames), encodes H.264 + silent AAC
(no watermark), and writes the main cut (41 s, opens on the step-3 tear, fix at
6.2 s), the 15 s cut (steps 3→4, fix at 7.2 s), seven 4:5 carousel loops, the
cover (step-3 tear) with its 3:4 grid crop and a safe-area check image, and a
`manifest.json`. Overlay copy and timing live in `scripts/launch/reel-plan.json`;
the run fails if any overlay leaves the Instagram safe area, overlaps the screen,
the cut doesn't open on the tear, the fix lands after 10 s, or the cover text
falls outside the 3:4 crop. Videos are never committed.

Music (decision: music, no voice):

```sh
npm run mix:frame-sync-reel-music -- --reel /path/outside/repo [--track licensed.wav]
```

`scripts/launch/mix_reel_music.sh` trims the track to each cut, fades it in
(0.4 s) and out (2 s), normalizes to −14 LUFS integrated / −1.5 dBTP with a
two-pass `loudnorm`, copies the video stream untouched, and re-measures the
result. It fails if the result is more than 1 LU off target. Without `--track`
it synthesizes a clearly named `PLACEHOLDER-synth-bed-NOT-FINAL` test bed (pure
tones, nothing downloaded), and the outputs are named `*-MUSIC-PLACEHOLDER.mp4`.
They're not for posting. Dave picks the real track, or posts the silent master
and adds a song from Instagram's music library.

## Probe (local only)

```sh
npm run probe:frame-sync -- --screens /path/outside/repo
```

Phone 390×844 and desktop 1280×800: console errors, horizontal scroll, the
interactive break/fix flow, event order with UTM tags, auto-play timing (4 s
steps, fix 1.2 s into step 4), the step_s clamp, that the signup never blocks the
controls, every email provider against local mocks (success, network error, honeypot, bad config), the checkout interlock and providers, the hidden kit
slot, reduced motion, no-JavaScript content, the skip link, and the Field Kit
draft (noindex, price TBD).

## Copy

`reel-copy.md` holds the draft overlay text, captions, pinned comment, DM 1/2,
UTM link table, bio and Story text and the music notes. All of it
needs Dave's approval. Field Kit contents are kept out of this public repository
because they are the paid product.

## Decisions so far (2026-10-18)

Analytics OFF (no provider) · Reel uses music, not voice · no affiliate
programs · no Meta One subscription.

## Dave decides

Final demo URL · email tool and account (then `email.md`) · Field Kit price,
checkout provider, terms and where the kit files are hosted (then
`checkout.md`) · DM tool and Instagram professional account · the music track ·
posting all copy.
