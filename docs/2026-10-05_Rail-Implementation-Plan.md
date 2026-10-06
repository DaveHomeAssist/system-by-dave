# 🧭 Rail: implementation plan (validated)

> 📌 **Goal:** a suite rail beside AV Video, driven by the registry, showing which consoles hold unsaved drafts. External products appear on it, and the old CueForge→Cue Sheet and PlotForge→StagePlotter saved-ID migration keeps working.

**Checked against:** `main` @ `66b3d66`, the v3 prototype data, and the v2 manifest. **Confidence:** 🟡 medium-high. The code facts below were read directly; the layout hasn't been tried in a browser yet.

---

## 🔎 What checking the code changed

| # | Finding | Evidence | Change to the plan |
| --- | --- | --- | --- |
| V1 | 🔴 AV Video doesn't load `sbd-nav.js`. It also has its own storage-event handling, so loading `sbd-nav.js` would also turn on that script's built-in save warnings, giving two "changed in another tab" warnings. Those warnings would also fire on layout and draft writes. | `av-video/index.html` loads only the registry; `App.tsx:123` | Put the rail in its own file, **`js/sbd-rail.js`**, with no save guard, instead of a new `sbd-nav` mode |
| V2 | 🔴 `av-suite-ui.v1` is documented as page-local ("no other tool page reads this key") | `app.js:85` | Rail choices go in a new key, **`sbd.rail.v1`**, not `av-suite-ui.v1` (the manifest said `av-suite-ui.v1`) |
| V3 | 🔴 `toolById('cueforge')` returns Cue Sheet, and a test depends on it: legacy `favorites:['cueforge']` must still become a Cue Sheet pin | `sbd-registry.js:107`, `probe_cue_sheet.js:552-574` | External products go in a separate **`externals`** list with `externalById()`. They never enter `tools`. The command menu uses a separate `external:` prefix. The migration stays exactly as it is |
| V4 | 🟡 Adding externals to `tools` would also change the public tool counts, the sitemap, the offline cache and the site-move data transfer | Counts are checked by `verify:public-consistency`; the transfer uses `tools[].storageKeys` (`test_domain_cutover.mjs:205`) | Same fix as V3: externals stay out of `tools` |
| V5 | 🟡 The draft index `sbd.consoleDrafts.v1` isn't carried over when saved data moves between domains, and it can go stale | Only tool storage keys transfer | The rail checks each console's **draft key directly** and treats the index only as a hint |
| V6 | 🟡 `av-suite.html` already has its own left rail (Pinned, Families, All tools) | `av-suite.html:108-121` | This PR doesn't touch the Toolbox page's rail. Rebuilding the landing page and Toolbox around the new rail stays at manifest step 6 |
| V7 | 🟡 Toolbox has no URL setting that opens it filtered to one family | `app.js:205` reads `entry` only | Add a **`family=`** link setting to Toolbox, as a small change to the doorway contract |
| V8 | 🟡 AV Video's page fills the screen exactly with no page scroll, and on phones it already has a bottom panel switcher | `styles.css:1` (`#root` = 100dvh − 44px) | The rail is a left column on desktop and icon-only on tablet. On phones it becomes an **Apps** button in the top nav that opens a dialog, so there's never a second bottom bar |
| V9 | 🔵 A per-tool `console` field would describe consoles that don't exist yet | Only AV Video exists; `consolidatedInto` already covers it | Add a `consoles` list instead. Each tool's owning console stays in `consolidatedInto` |
| V10 | 🔵 The research notes (`registry-consoles.md` and the others) are gone from the scratchpad because the container reset | `ls` of the research folder failed | The plan relies on the manifest and the v3 prototype data instead; neither needs the notes |

---

## 🧱 Steps

| # | Step | Files | Unblocks |
| --- | --- | --- | --- |
| 1 | **Registry.** Add `consoles: [{id:'av-video', toolId, draftKey, layoutKey, icon}]`; `rail: {defaultPinned:[...]}`; `externals` (see the table below); `externalById()`. Explain in a comment that `ID_ALIASES` only applies when reading old saved data. Bump the registry version | `js/sbd-registry.js` | 2, 3, 4 |
| 2 | **Registry checks.** No external id appears in `tools`. `toolById('cueforge')` still returns `cue-sheet`, and `externalById('cueforge')` returns CueForge. PlotForge points to `plotforge.html`, never StagePlotter. Every console's `draftKey` is also declared in its tool's `storageKeys` | `scripts/verify_av_suite.js` | Merging safely |
| 3 | **Rail script.** Renders into `[data-sbd-rail-slot]`. Contents:<br>• **Top:** Toolbox.<br>• **Pinned:** AV Video, then the console families as links to the Toolbox filtered to that family.<br>• **Bottom:** All apps (a dialog: consoles, families, specialists, external products with a status badge) and Customize (pin, unpin and reorder with buttons and the keyboard, saved to `sbd.rail.v1`).<br>• The current page is marked as current. A draft dot has a spoken label ("unsaved draft"). Dots update live when another tab changes a draft.<br>• Links keep the `sbd*` show parameters. Uses `textContent` only; 44px targets; reduced motion respected | `js/sbd-rail.js`, `css/sbd-rail.css` | 5 |
| 4 | **Toolbox `family=` link setting.** Only accepts known family ids, and never changes the saved show | `js/av-suite/app.js`, `docs/av-suite-doorway.md` | Family links in the rail |
| 5 | **AV Video uses the rail.** Add the slot, script and stylesheet. Lay the page out as rail + console. Keep the breadcrumb (Home / Toolbox / AV Video), which the public shell contract requires. Phones get the Apps button | `apps/av-video/index.html`, `styles.css`, rebuilt `av-video/` | 6 |
| 6 | **Offline.** Add the rail files to `BASE_ASSETS`, then run `sync:av-workspace`, update the Stage3D cache pin and regenerate the inventory | registry, Stage3D, inventory | Deploy |
| 7 | **Browser test.** New `probe_av_rail.mjs`:<br>• the rail renders and marks the current page;<br>• the keyboard reaches every item;<br>• Customize survives a reload;<br>• the draft dot appears when another tab writes a draft and clears when it's discarded;<br>• the external links go to the right places;<br>• the phone dialog works;<br>• no overflow at 375 / 680 / 1100 / 1440 / 3440.<br>Re-run `probe_cue_sheet` (the old-ID migration) and the existing AV Video tests | `scripts/`, `package.json`, `av-video.yml`, `deploy-pages.yml` | Merging |
| 8 | **Docs.** Rail section in `docs/av-console.md`; rail mode in `public-shell-contract.md`; `sbd.rail.v1` and `family=` in `av-suite-doorway.md`; a CLAUDE.md map line; CHANGELOG | docs | — |
| 9 | Open the PR, wait for green, merge, then read back avbydave `source.json` | — | Step 2 of the manifest (the next AV Video panels) |

### 🔗 External entries

| Product | Opens | Badge |
| --- | --- | --- |
| 🎛️ CueForge | `cueforge.html` (the existing page explaining that CueForge is a separate app; never Cue Sheet) | Desktop app |
| 💡 PlotForge | `plotforge.html` (handoff page) | Own app |
| 🏟️ House Video / FMP | `https://housevideo.app/` | Link out |
| 🖥️ Arena Ops | No link (status card) | API pending |
| 🎚️ DeckForge + Stream Deck | No link until a public URL is confirmed | Control surface |

---

## ⛓️ Dependencies

- Step 1 must come before steps 2–5. Steps 3 and 4 can be built side by side.
- Step 5 needs step 3. Step 6 comes after every new file exists. Step 7 needs steps 3–6.
- Nothing depends on Show Control, Audio or any other console that hasn't been built.

---

## ⚠️ Risks

| Risk | Level | Mitigation |
| --- | --- | --- |
| The rail squeezes AV Video's panel grid on 1100–1440px screens | 🟡 | Icon-only rail below 1440px; the panels already resize to their own width; the new test checks every width |
| `verify:public-navigation` or the shell contract rejects a new kind of navigation | 🟡 | Keep the Home / Toolbox / current-page breadcrumb; add a rail rule to the verifier |
| The "AV bounded workspaces" deploy check flakes again | 🟡 | It failed on the #264 deploy and passed when re-run; if it fails again, fix it, don't re-run |
| Two different things called a "rail" (the Toolbox page's and the new one) | 🔵 | The docs say which is which; they merge at manifest step 6 |
| The old-ID migration breaks | 🔴 if it happens | Covered by V3 and the step 2 checks; the existing `probe_cue_sheet` must pass |

---

## ❓ Choices for you

| # | Question | My recommendation |
| --- | --- | --- |
| R1 | What should the rail show for consoles that aren't built yet? | 🟢 **Today's families** (Audio, Run of show and so on), linking to the Toolbox filtered to that family. Each one is replaced when its console ships. No unbuilt product names appear in public copy |
| R2 | Should the rail appear on the 40-plus legacy tool pages now? | 🟢 **No, AV Video only.** Legacy pages keep their current navigation until each becomes a console |

---

## ✅ Done when

- AV Video at avbydave.com shows the rail. Toolbox is at the top, AV Video is marked current, and a draft dot appears when AV Video has an unsaved draft.
- An old saved `cueforge` pin still opens Cue Sheet, while the rail's CueForge entry opens the CueForge page.
- The tool count, sitemap and offline list are unchanged except for the new rail files.
- All gates are green: `verify:av`, `verify:public-navigation`, `verify:public-consistency`, `verify:domain-sites`, `test:av-video`, `test:av-video-browser` including the rail test, and `probe_cue_sheet`.
- The PR is merged and avbydave `source.json` shows its merge commit.

## 🕳️ Not checked

- The real layout at each width (I haven't built it yet).
- Whether DeckForge has a public URL.
- Touch on a real device.
