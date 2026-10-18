# Frame-sync launch copy (drafts for Dave's approval)

Status: **draft, nothing posted.** Every line below needs Dave's approval before it goes anywhere public. Demo URL in the links is the proposed one (`https://avbydave.com/frame-sync/`); swap it if Dave picks another.

Copy rules used: recognition hook first, no greeting or title card, fix by 8–10 s, one share prompt, one CTA keyword (SYNC), all text as on-screen overlays (no speech, so the Captions sticker has nothing to transcribe). Claims match the demo: it's a simplified single-display model.

## 1. Reel overlay text

Overlay timings are baked into the captured files (`scripts/launch/reel-plan.json`). Top line = large headline; bottom line = smaller follow-up. All text sits inside the Instagram safe area (top 252 px, bottom 420 px, right 108 px clear at 1080×1920), and the runner fails the capture if any line leaves it.

### Main cut (41 s): steps 3 → 4 → 1 → 2 → 5 → 6 → 7, then end card

| Time | Top overlay | Bottom overlay |
|---|---|---|
| 0–5 s (step 3, tear on frame 0) | Ever seen a line rip across a live feed? | (1.5 s) That's a tear. Here's the fix. |
| 5–10 s (step 4, fix lands at 6.2 s) | Fix: only swap frames in the pause | (6.2 s) Clean. Same screen, same source. |
| 10–15 s (step 1) | Why? A screen paints top to bottom | |
| 15–20 s (step 2) | New frames belong in the pause | |
| 20–26 s (step 5) | Almost-matching clocks make it crawl | 59.94 vs 60 fps slips a frame about every 17 s |
| 26–32 s (step 6) | The rig-wide fix: one reference | That's genlock. |
| 32–37 s (step 7) | Next time a line rips: check sync | Send this to whoever blamed the cable. |
| 37–41 s (end card) | **Comment SYNC** · I'll DM you the demo where you can cause the tear yourself. · or tap the link in bio | |

### 15 s cut (Trial Reel): steps 3 → 4

| Time | Top overlay | Bottom overlay |
|---|---|---|
| 0–6 s (tear on frame 0) | Ever seen a line rip across a live feed? | (1.5 s) That's a tear. Here's the fix. |
| 6–15 s (fix lands at 7.2 s) | Fix: only swap frames in the pause | 8–11.5 s: Send this to whoever blamed the cable. · 11.5–15 s: Comment SYNC and I'll DM you the demo. |

### Carousel loops (4:5, one per step)

1/7 A screen paints one line at a time · 2/7 New frames arrive in the pause · 3/7 Swap mid-pass and it tears · 4/7 Fix: only swap in the pause · 5/7 Almost-matching clocks make it crawl · 6/7 The rig-wide fix: one reference · 7/7 Line rips? Check sync first

Carousel caption: "Save this for the next time a screen tears. Seven steps, one per slide. Comment SYNC for the interactive version." (Add music in the app if Dave wants it eligible for the Reels tab; that rule is from Oct 2024 and unconfirmed for 2026.)

### Cover

Step-3 tear frame with "Ever seen a line rip across a live feed?" Checked against the 3:4 grid crop (y 240–1680 of 1080×1920): headline and screen both inside.

## 2. Caption (main Reel)

> Ever seen a line rip across a live feed? That's a tear: the source swapped frames while the screen was still drawing the last one.
>
> The fix is timing, not the cable. Swap only in the pause between passes (vsync, frame sync), and on a show, lock the gear to one reference (genlock).
>
> Send this to whoever blamed the cable.
>
> Comment SYNC and I'll DM you the demo where you can cause the tear yourself. Or tap the link in bio.

15 s Trial Reel caption: "That line ripping across the screen? Timing, not the cable. Send this to whoever blamed the cable. Comment SYNC and I'll DM you the demo where you can cause the tear yourself."

Hashtags (optional, Dave's call): #avtech #videoengineering #liveevents #broadcastengineering #ledwall

## 3. Pinned comment (keyword only; links in comments aren't clickable)

> Comment SYNC and I'll DM you the interactive demo.

## 4. DM flow (ManyChat-type tool on Meta's Private Replies API)

**DM 1** (automatic reply to a SYNC comment, one button):

> Want the frame-sync demo? You can cause the tear yourself, then fix it. Works on your phone.
>
> Button: **Send it**

**DM 2** (after the tap, inside the 24 h window, one link):

> Here you go: {demo link with UTM for this Reel}
>
> Tap "Cause the tear", then fix it. If it clears something up, send it to whoever blamed the cable.

Use a distinct `utm_content` per Reel (table below). Rules from the brief: one private reply per comment, within 7 days; further messages only after the person replies. Week 3 (once the kit is live) DM 2 can add one line: "There's also a printable Field Kit: {kit link}".

## 5. UTM links

Scheme: `?utm_source=instagram&utm_medium={route}&utm_campaign=framesync_launch&utm_content={asset}`. The pinned comment drives the DM route, so it has no link of its own.

| Route (`utm_medium`) | Asset (`utm_content`) | Where it's used | Link |
|---|---|---|---|
| dm | reel_main | Auto-DM 2 for the main Reel (35–45 s cut) | https://avbydave.com/frame-sync/?utm_source=instagram&utm_medium=dm&utm_campaign=framesync_launch&utm_content=reel_main |
| dm | reel_15s | Auto-DM 2 for the 15 s Trial Reel | https://avbydave.com/frame-sync/?utm_source=instagram&utm_medium=dm&utm_campaign=framesync_launch&utm_content=reel_15s |
| dm | reel_voice | Auto-DM 2 for the music/voice variant (week 2) | https://avbydave.com/frame-sync/?utm_source=instagram&utm_medium=dm&utm_campaign=framesync_launch&utm_content=reel_voice |
| dm | carousel | Auto-DM 2 if the carousel also runs the SYNC keyword | https://avbydave.com/frame-sync/?utm_source=instagram&utm_medium=dm&utm_campaign=framesync_launch&utm_content=carousel |
| bio | profile | Single bio link (all weeks). `profile` is not in the brief's asset list; it marks clicks that aren't tied to one post | https://avbydave.com/frame-sync/?utm_source=instagram&utm_medium=bio&utm_campaign=framesync_launch&utm_content=profile |
| story | story_w1 | Story link sticker, Reel day (week 1) | https://avbydave.com/frame-sync/?utm_source=instagram&utm_medium=story&utm_campaign=framesync_launch&utm_content=story_w1 |
| story | story_w3 | Story link sticker, week 3 (Field Kit push) | https://avbydave.com/frame-sync/?utm_source=instagram&utm_medium=story&utm_campaign=framesync_launch&utm_content=story_w3 |
| carousel | carousel | Only if a carousel ever carries its own link (e.g. a Story re-share); otherwise unused | https://avbydave.com/frame-sync/?utm_source=instagram&utm_medium=carousel&utm_campaign=framesync_launch&utm_content=carousel |

The demo's event dispatcher copies these UTM values onto every event, so routes can be compared once Dave turns on an analytics provider (`docs/launch/analytics.md`).

## 6. Bio

Bio text (under 150 characters):

> Working AV tech. How screens and signals actually work.
> ↓ Cause a screen tear yourself (free demo)

Bio link title: **Frame sync demo** → bio row in the UTM table.

## 7. Stories

**Week 1, Reel day** (cover still or the 15 s cut as background):

> New: cause a screen tear yourself, then fix it.
> Link sticker: **Try the demo** (story_w1 link)
> Small text: or comment SYNC on the Reel

**Week 3** (only once the Field Kit is live):

> The free tear demo, plus a printable Field Kit for the rack.
> Link sticker: **Try the demo** (story_w3 link)
> Small text: Comment SYNC for the DM version

## 8. Voice variant (week 2, Dave records)

A 35–45 s voiceover over the main cut, for the Trial Reel test. Speech in the first 3 s:

> 0 s: "See that line? That's a tear, and it isn't the cable."
> 5 s: "The source swapped frames halfway down the screen. Make it wait for the pause between passes, and it's gone."
> 10 s: "A screen draws top to bottom, then pauses. New frames belong in that pause."
> 20 s: "If the two clocks almost match, say 59.94 and 60, the tear crawls."
> 26 s: "On a show, lock everything to one reference. That's genlock."
> 32 s: "Next time a line rips, check sync first. Send this to whoever blamed the cable."
> 37 s: "Comment SYNC and I'll send you the demo."

Music variant: same main cut file; add a track in Instagram's editor (the master has a silent audio track and no watermark).
