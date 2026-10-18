# AV by Dave launch: frame-sync demo

The reversible, on-site parts of the frame-sync Reel launch (launch brief §2–§6).
Nothing here posts, signs up or spends anything; every external service is off
until Dave picks it.

## Pages

| Route | Published at | Indexing | Purpose |
|---|---|---|---|
| `av/frame-sync/` | `https://avbydave.com/av/frame-sync/` | Indexed (avbydave.com sitemap) | The free, open interactive demo the Reel points to |
| `av/field-kit/` | `https://avbydave.com/av/field-kit/` | `noindex,nofollow`, not linked from navigation | Draft product page; price TBD, checkout closed |

Both live under `av/`, so `scripts/domain-sites.json` publishes them on
avbydave.com and the systembydave.com path becomes a redirect stub that keeps the
query string (UTM tags survive). **Proposed Reel URL:**
`https://avbydave.com/av/frame-sync/`. Linking the systembydave.com path also
works but adds a redirect hop in Instagram's in-app browser. Dave approves the
final URL before anything is posted.

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
| `analytics.provider` | `null` (no-op dispatcher) | See `analytics.md`; privacy policy first |
| `email.endpoint` | empty → mailto link to avbydave@gmail.com | HTTPS endpoint from Dave's email tool; the email form appears and posts there. Add the host to the page CSP `connect-src` and update the privacy policy |
| `fieldKit.url` | empty → kit block hidden | The kit page or checkout URL; the block appears below the signup and records `kit_click` |
| `fieldKit.priceLabel` | `Price TBD` | Dave's price, shown on the Field Kit page |

Affiliate links: none. Add them only for gear the page actually shows, with a
disclosure next to them, using `data-affiliate="<id>"`.

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

## Probe (local only)

```sh
npm run probe:frame-sync -- --screens /path/outside/repo
```

Phone 390×844 and desktop 1280×800: console errors, horizontal scroll, the
interactive break/fix flow, event order with UTM tags, auto-play timing (4 s
steps, fix 1.2 s into step 4), the step_s clamp, that the signup never blocks the
controls (also with a configured provider whose request fails), the hidden kit
slot, reduced motion, no-JavaScript content, the skip link, and the Field Kit
draft (noindex, price TBD).

## Copy

`reel-copy.md` holds the draft overlay text, captions, pinned comment, DM 1/2,
UTM link table, bio and Story text and the voice-variant script. All of it
needs Dave's approval. Field Kit contents are kept out of this public repository
because they are the paid product.

## Dave decides

Final demo URL · analytics provider and the privacy-policy change · email tool
and account · DM tool and Instagram professional account · Field Kit price,
checkout and where the kit files are hosted · affiliate sign-ups · posting all
copy · the voice or music variant.
