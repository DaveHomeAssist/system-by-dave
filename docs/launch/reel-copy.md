# Frame-sync launch copy — READY FOR REVIEW (Dave approves before anything is posted)

Status: **ready for review, nothing posted.** Decisions applied (2026-10-18): music
variant (no voiceover), no affiliate links, no Meta One, analytics OFF. Links use
the demo URL `https://systembydave.com/demos/frame-sync.html` (PR #360's page, the single home for the demo).

Rules: the tear is on screen in frame 0, no greeting or title card, the fix lands
by 8–10 s, one share prompt, one CTA keyword (**SYNC**). All words are on-screen
text (music, no speech). Claims match the demo, which is a simplified
single-display model.

## 1. On-screen overlays (baked into the files by `scripts/launch/reel-plan.json`)

All text sits inside Instagram's safe area. The capture fails if any line leaves
it, overlaps the screen, or if the cover text falls outside the 3:4 grid crop.

### Main cut, 41 s (steps 3 → 4 → 1 → 2 → 5 → 6 → 7 → end card)

| Time | Headline | Follow-up |
|---|---|---|
| 0–5 s · tear on frame 0 | Ever seen a line rip across a live feed? | 1.5 s: That's a tear. Here's the fix. |
| 5–10 s · fix lands 6.2 s | Fix: only swap frames in the pause | 6.2 s: Clean. Same screen, same source. |
| 10–15 s | Why? A screen paints top to bottom | |
| 15–20 s | New frames belong in the pause | |
| 20–26 s | Almost-matching clocks make it crawl | 59.94 vs 60 fps slips a frame about every 17 s |
| 26–32 s | The rig-wide fix: one reference | That's genlock. |
| 32–37 s | Next time a line rips: check sync | Send this to whoever blamed the cable. |
| 37–41 s · end card | **Comment SYNC** | I'll DM you the demo where you can cause the tear yourself. · or tap the link in bio |

### 15 s Trial Reel (steps 3 → 4)

| Time | Headline | Follow-up |
|---|---|---|
| 0–6 s · tear on frame 0 | Ever seen a line rip across a live feed? | 1.5 s: That's a tear. Here's the fix. |
| 6–15 s · fix lands 7.2 s | Fix: only swap frames in the pause | 8–11.5 s: Send this to whoever blamed the cable. · 11.5–15 s: Comment SYNC and I'll DM you the demo. |

### Carousel (seven 4:5 loops, one per step)

1/7 A screen paints one line at a time · 2/7 New frames arrive in the pause ·
3/7 Swap mid-pass and it tears · 4/7 Fix: only swap in the pause · 5/7 Almost-matching
clocks make it crawl · 6/7 The rig-wide fix: one reference · 7/7 Line rips? Check sync first

### Cover

The step-3 tear frame with "Ever seen a line rip across a live feed?" Headline
and screen both sit inside the 3:4 profile-grid crop (re-checked; see
`reel/cover-step3-grid-3x4-1080x1440.png`).

## 2. Captions

**Main Reel**

> That line ripping across the screen? It's a tear, not a bad cable.
>
> The source swapped frames while the screen was still drawing the last one. Fix: only swap in the pause between passes (vsync, frame sync). On a show, lock the gear to one reference (genlock).
>
> Send this to whoever blamed the cable.
>
> Comment SYNC and I'll DM you the demo: cause the tear yourself, then fix it. Link in bio too.

**15 s Trial Reel**

> Line ripping across the screen? Timing, not the cable. Send this to whoever blamed the cable. Comment SYNC and I'll DM you the demo.

**Carousel**

> Save this for the next time a screen tears. One step per slide. Comment SYNC for the interactive version.

Hashtags (optional, Dave's call): #avtech #videoengineering #liveevents #broadcastengineering #ledwall

## 3. Pinned comment

> Comment SYNC and I'll DM you the interactive demo. 👇

(Links in comments aren't clickable, so the comment carries only the keyword.)

## 4. DMs (keyword auto-reply, Meta Private Replies)

**DM 1**, the automatic reply to a SYNC comment, with one button:

> Here's the frame-sync demo. Cause the tear yourself, then fix it. Works on your phone.
>
> Button: **Send it**

**DM 2**, after the tap (inside the 24 h window), with one link:

> {demo link with this Reel's UTM tag}
>
> Tap "Cause the tear", then fix it. If it clears something up, send it to whoever blamed the cable.

One private reply per comment, within 7 days; further messages only after the
person replies. Week 3, only if the Field Kit is on sale, DM 2 may add: "There's
also a printable Field Kit for the rack: {kit link}".

## 5. Links (UTM tags)

`?utm_source=instagram&utm_medium={route}&utm_campaign=framesync_launch&utm_content={asset}`.
Full table: `utm-links.csv`. Analytics is OFF, so the site doesn't record these.
They still show which route worked in the DM tool's click counts and, once email
signup is on, in the email list (Buttondown stores them with the signup).

| Route | Asset | Use |
|---|---|---|
| dm | reel_main | DM 2 for the main Reel |
| dm | reel_15s | DM 2 for the 15 s Trial Reel |
| dm | reel_music | DM 2 for a music re-cut, if you post a second version (week 2) |
| dm | carousel | DM 2 if the carousel runs the SYNC keyword |
| bio | profile | The bio link |
| story | story_w1 | Story link sticker, Reel day |
| story | story_w3 | Story link sticker, week 3 (Field Kit) |

## 6. Bio

> Working AV tech. How screens and signals actually work.
> ↓ Cause a screen tear yourself (free demo)

Link title: **Frame sync demo** (bio/profile link).

## 7. Stories

**Reel day:** the 15 s cut or the cover as the background.

> Cause a screen tear yourself, then fix it.
> Link sticker: **Try the demo** (story_w1)
> Small text: or comment SYNC on the Reel

**Week 3, only once the Field Kit is on sale:**

> The free tear demo, plus a printable Field Kit for the rack.
> Link sticker: **Try the demo** (story_w3)

## 8. Music (decided: music, no voice)

Two ways to do it. Both keep the on-screen text as the only words.

1. **Instagram's music library (simplest, licensed by Instagram):** upload the
   silent master `reel/frame-sync-main-1080x1920.mp4` (or the 15 s), then add a
   song in the editor. Pick something steady with no vocals over the first 10 s.
   Set it so the beat lands near the fix (6.2 s main, 7.2 s short) and keep it
   low enough that people read the text. Business accounts may see a smaller
   royalty-free library than Creator accounts (check in the app).
2. **Your own licensed track:** run
   `scripts/launch/mix_reel_music.sh --reel <reel output dir> --track /path/track.wav`.
   It trims and fades the track and normalizes to −14 LUFS (−1.5 dBTP), then
   writes `reel/music/frame-sync-{main,short15}-1080x1920-music.mp4`. Only use a
   track you have the rights to post.

The `reel/music/*-MUSIC-PLACEHOLDER.mp4` files use a synthesized test bed. They
show what the mix does but **aren't for posting**.
