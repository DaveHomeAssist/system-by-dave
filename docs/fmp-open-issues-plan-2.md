# [SPEC] FMP Open Issues Plan 2

October 3, 2026. This follows `docs/fmp-open-issues-plan.md` (Phases A, B and C).
Source: a read-only survey of fmp-suite, system-by-dave and housevideo (open PRs and
issues, CI since October 1, branches), a live run of `npm run hygiene:fmp`, a live
page-scroll and theme measurement of every housevideo.app page, backend preflight
checks, the release, reliability and catalog docs, and the open gates in the FMP
Development Console. Every item has a verdict. Owners: **fmp-suite** means fix the
canonical source and re-export; **sbd** means this repository; **agent** means
repository or dashboard housekeeping; **Dave** means a console, credential, account
or hardware step that an agent cannot do.

## Where the first plan stands

| # | Status, October 3 |
| --- | --- |
| A1–A8 | Done (see the first plan). The A5 console half is now C6 below |
| B1 | Superseded by fmp-suite #53, which replaced the narrow route strip with a 44 px station selector inside the paged no-scroll walk. #49 and #50 closed |
| B5 | In flight: fmp-suite #54 ports the parts of #47 that still apply to the paged walk (record first, end-of-route counts, the "Faults" label) |
| B2–B4, B6–B9 | Done and live |
| C1–C5 | Still open; current detail in Phase C below |

The live probe on October 3 was Yellow: 30 pass, 0 fail, 1 grey (L3, the
aviewfrommyseat bot challenge accepted in A7) and 1 warning (P4, which is D1).

## Phase D: small fixes, no hardware

| # | Issue | Evidence | Verdict and fix | Owner | Size |
| --- | --- | --- | --- | --- | --- |
| D1 | Probe P4 warns that the release is behind main when it is not | "fmp-suite main is 1 commit ahead of released 20d23c6". Main `5619910` is the merge commit of #53, and its tree is identical to `20d23c6` | **Fix the probe.** Pass P4 when main's tree equals the released commit's tree. Releases cut from a PR head will otherwise warn every time | sbd | S |
| D2 | Commissioning gates 1 and 4 describe a Gmail send the walk no longer does | fmp-suite #51 (live): the walk opens a Gmail compose window, and `email.js` states "No OAuth, send request, or submission receipt". `docs/fmp-public-release.md` still lists `walk.housevideo.app` for "walk Gmail send" and asks gate 4 for a Gmail Sent receipt from the app | **Rewrite both gates.** Gate 1: `walk.housevideo.app` is needed for the Notion sign-in only. Gate 4: the compose window opens with the right recipients and body, the operator sends it, the message appears in Gmail Sent, and the Notion record reads back. Gates 3 and 4 also gain a console step: keep the browser console open through sign-in, account selection, save and sign-out, and record any Google Identity warnings or errors | sbd | S |
| D3 | The walk's Content Security Policy still allows the Gmail API | The walk's `connect-src` includes `https://gmail.googleapis.com`; nothing has called it since #51 | **Remove it.** Keep `accounts.google.com` and `openidconnect.googleapis.com` for sign-in, and check that the sign-in button still renders in the browser suite | fmp-suite | S |
| D4 | The camera backend still allows `https://systembydave.com`, but nothing there can call it | The October 3 preflight returns a matching allow-origin. That origin's `/fmp/` and `/fmpwalk/` pages are now move notices whose policy is `default-src 'none'`, so they cannot make a request. The saved-data move uses browser storage, not the backend | **Retire it** together with `davehomeassist.github.io`. Remove it from the `backend/server.js` default and the docs, and from the gate 1 origin list. The console step is C6 | fmp-suite, sbd | S |
| D5 | The model catalog contract still says Gear Reference links each part to the interactive model | `docs/fmp-model-catalog-contract.md`: "Gear Reference links each part to the interactive model at `#part=<component_id>`". Since #202, no sheet in `data/gear/` links to FMP | **Correct the sentence.** `component_id` stays stable for the release gate and the explorers' own `#part=` links. Public sheets carry no FMP links | sbd | S |
| D6 | Leftover branches stay on the fmp-suite remote | Checked October 3: the tips of `claude/atem-deck-console-evidence` (#11) and `codex/superjoy-explorer` (#6) are already on main. The three later commits on `claude/atem-photos-and-rear-evidence` (#10) were superseded by `e643c91` (WebP photos) and the restored walk. `claude/tender-fermi-t3a94c` (#35) duplicated #34. 42 merged branches are also undeleted. `claude/fmp-walk-end-card-faults-20261001` (`04a4e04`, no PR) is carried into fmp-suite #54. system-by-dave deletes head branches on merge; fmp-suite does not | **Delete them.** Every commit stays reachable through its PR. Delete the Faults branch only after #54 merges, and record its SHA in the deletion note, since it has no PR. Turn on "Automatically delete head branches" for fmp-suite | agent; Dave approves the setting | S |
| D7 | housevideo#2 edits a publish target | `DaveHomeAssist/housevideo` is overwritten by every system-by-dave release. #2 (September 23, 57 commits) conflicts. Its moves (Back Focus under `/fmp/`, retiring the switcher guide) were never adopted in the source repositories | **Close it**, pointing to fmp-suite and system-by-dave. No port, since nothing currently asks for those moves | agent | S |
| D8 | The FMP Development Console is stale and carries obsolete gates | Snapshot October 1, 2:48 AM ET. g11 (leftover branches) is D6. g21 (an embed mode for four explorers) is obsolete because #202 removed FMP links and frames from Gear Reference. For g10 (keep the Show Console links?): they return 200 and pass only venue and phase, and since fmp-suite #14 the Operator field gets no position codes | **After the Phase B release:** refresh projects, PRs and the provenance chain. Close g21 with that reason and g10 as "keep the links", citing this evidence. Add gates for C6 and E1 | agent | S |
| D9 | No check reports page scroll, so WEB-2 drift is invisible | Probe W3 checks horizontal overflow only; the debt in E1 passed every probe lane | **Add probe check W8:** page scroll at 1440×900 or 375×812 warns. Pages listed in E1 report as recorded debt rather than a warning until they are fixed | sbd | S |
| D10 | Three walk choices still lead with a status emoji | fmp-suite `docs/walk-ux-audit-outcomes.md` ("Partly done"): #43 hid the emoji in body copy, but the fault severity option "🔴 Revenue or show critical" still leads with one. The Route to options "ConcertVision 🔴", "Videri 🔴" and "Live Nation facility 🔴" end with one, and there it means "contact unknown" (the contacts table says so in words). An `<option>` cannot hide part of its text from a screen reader | **Replace the emoji with words.** Drop it from the severity option, where the words already say it. Write "(contact unknown)" in the three route options | fmp-suite | S |

## Phase E: larger agent work

| # | Issue | Evidence | Verdict and fix | Owner | Size |
| --- | --- | --- | --- | --- | --- |
| E1 | Several housevideo.app pages scroll, and three have no theme control | Measured live October 3, document height over viewport height. Page scroll at both 1440×900 and 375×812: `/fmp/build/` (1381, 2803), `/fmp/gear/` (1695, 3731), `/fmp/ptz/` (1530, 2890), `/switcher/` (3453, 5189), `/switcher/guide/` (957, 1334), `/shader/` (3519, 5582) and `/ursa-broadcast-g2/` (7082, 10246). Phone only: `/fmp/models/ccu4.html` (1456). The rig falls back to page scroll at short heights (October 1 check). No theme control on `/backfocus/`, `/shader/` or `/ursa-broadcast-g2/`. The hub, camera, house, guide, Camera Simulator, shader practice and walk fit | **Fix each page the next time it changes** (WEB-4), not as a sweep. Use the walk's paged pattern from #53: topic tabs and Back/Next pages, panel scrolling only for long tables. Measure the other two model pages when the work starts | fmp-suite (FMP pages); sbd (switcher, shader, URSA, Back Focus) | M per page |
| E2 | The paged walk has had no screen-reader or automated accessibility pass | `docs/walk-reliability.md`: "Physical-device and screen-reader acceptance remain separate". #53 replaced the layout after the B8 accessibility work | **Add an axe-core scan** of every walk page at phone and desktop sizes to `tests/walk-pages-browser.mjs`, and fix what it finds. The VoiceOver spot check joins C3 | fmp-suite | M |
| E3 | 290 public Gear Reference part descriptions are marked pending | #202 marks a description pending when any of its sources is FMP evidence. Console gate g20: 26 parts cite FMP evidence directly | **Split the field.** Add an `equipment_description` to the fmp-suite catalogs, so the adapter can publish equipment-only text. Then fill descriptions from manufacturer manuals in batches. Low priority: all 444 parts still list their identity | fmp-suite, then sbd | M, then L |

## Phase C: needs Dave or hardware

| # | Issue | Verdict |
| --- | --- | --- |
| C1 | Commissioning gates 1–4 have no pass date in `docs/fmp-public-release.md` (console gates g06–g09) | **Dave**, in order, after D2 lands: check the Google client's JavaScript origins (gate 1); share the five Notion pages with the FMP Walk connection (gate 2); then run gates 3 and 4 signed in and record the date. Gate 4 is now a compose window that Dave sends, not a send by the app |
| C2 | Camera Simulator device baseline, monitor delay and Camera 4 timing | **Dave**, one iPad session with `?diagnostics=1`; the venue timing needs a site visit. The agent reads the first scheduled WebKit smoke, due Monday, October 5 at 5:23 AM ET |
| C3 | Physical phone and iPad checks (console gate g22) | **Dave**, about 10 minutes. Rig drag and pinch; the paged walk on a phone, including typing a note with the keyboard open; the #54 record-first flow once released; and a short VoiceOver pass on one walk page |
| C4 | The backend still allows the old ChatGPT Site origin | **Dave** confirms no pending work remains on that Site. The agent then removes it from the code default and docs |
| C5 | `Verify FMP suite` is not a required check | **Dave**: fmp-suite `main` has no branch protection (the API answers "Branch not protected"). Add a rule that requires `Verify FMP suite` |
| C6 | The live backend still allows `https://davehomeassist.github.io` and `https://systembydave.com` | **Dave**, in Cloud Run: if `FMP_ALLOWED_ORIGINS` is set, it overrides the code default, so a redeploy alone may not help. Set it to `https://housevideo.app,https://walk.housevideo.app` (plus the ChatGPT Site until C4), redeploy, and remove both retired origins from the Google client. The agent then rechecks the preflight |
| C7 | Display positions that appear only on a paper list (console gate g16) | **Dave**, on the next site visit |

## Closed without work

- **An embed mode for the ATEM, CCU, P240 and SuperJoy explorers (g21):** obsolete. Public Gear Reference no longer links to or frames FMP pages (#202).
- **The Show Console links from FMP (g10):** keep them. Evidence is under D8.
- **WEB-1 on FMP pages:** probe W6 confirms a theme control and a light first visit on every FMP page. The remaining gaps are outside `/fmp/` (E1).
- **Google Identity console noise on the walk, signed out (left from B9):** checked live October 3. `walk.housevideo.app/fmpwalk/#/report` loads the sign-in client, style and button with no console warnings or errors at 1440×900 or 390×844. The signed-in half stays open: D2 adds a console step to gates 3 and 4, and Dave runs it in C1.
- **The aviewfrommyseat links:** still behind a bot challenge, which the probe reports grey as A7 intended.

## Order and verification

1. Let Phase B finish first (fmp-suite #54 and its release); it moves the walk and the release pin.
2. One fmp-suite PR for D3, D4 and D10, and one system-by-dave PR for D1, D2, D4, D5 and D9. Then re-export and run `npm run verify:fmp`, `npm run test:domain-cutover` and, after deploy, `npm run hygiene:fmp`. Expect Grey, not Green: the probe's light is Grey while any check is grey, and L3 stays grey behind the bot challenge. Every other check should pass, and W8 should list only the E1 debt pages.
3. D6–D8 housekeeping, then C6 and C1 as Dave's time allows; the agent rechecks the preflight after C6.
4. Each E item gets its own pull request with a browser check. E1 work starts with the page being changed.
5. Phase C items stay here until Dave records a date.
