# FMP hygiene routine

A recurring check of the FMP video operations suite in three areas: the live
website, navigation and architecture, and the Notion documentation behind it. The
routine finds and routes problems. It does not fix managed files or run
operational workflows.

Covered surfaces:

- `/fmp/`: the hub, four camera routes, `/fmp/house/`, `/fmp/guide/`, `/fmp/gear/`,
  `/fmp/build/`, `/fmp/ptz/`, and `/fmp/rig/`
- `/fmpwalk/`: the preshow venue walk
- `/backfocus/`: the public field guide, and the `/fmp-index/` and `/fmp-walk/` redirects
- The Notion databases and pages that the suite reads, writes, or documents

`docs/fmp-public-release.md` is the release contract. This routine checks that
the contract still holds after releases, edits, and time.

## Ground rules

1. **Read-only by default.** Never sign in, save, email, check in, or create
   Notion records during a hygiene pass. Signed-in SETUP TEST acceptance is a
   separate commissioning task, run only with explicit approval.
2. **Fix at the owner.** `fmp/` and `fmpwalk/` are managed artifacts from
   `DaveHomeAssist/fmpwalk`. Fix that repository, then re-export with
   `scripts/export-public-camera.mjs`. Never hand-edit a managed file here, even
   for a one-character link fix.
3. **Evidence, not proxies.** HTTP 200, a matching hash, or a healthy backend
   proves only that fact. It does not prove that a save, an email, or venue
   acceptance works (see `EVID-5` in the workspace rules).
4. **Keep private detail private.** This repository and its `docs/` and
   `reports/` folders are public on systembydave.com. Notion IDs, record
   counts, names, and operational data go to Notion or the private canonical
   repository, never here.

## Ownership map

| Problem location | Owner | How to fix |
| --- | --- | --- |
| Anything under `/fmp/` or `/fmpwalk/` | `DaveHomeAssist/fmpwalk` | Fix the source, pass `npm run check`, re-export, run `npm run verify:fmp` here |
| Aliases (including the `/fmp-index/` redirect), `404.html`, `robots.txt`, sitemap, `/backfocus/`, this probe | `DaveHomeAssist/system-by-dave` | Normal repository change and Pages release |
| Notion hub, docs, schemas, records | Notion workspace | Targeted edit with readback (`NOTION-1` to `NOTION-5`) |
| Notion API, Google client origins, Firestore | Google Cloud project for FMP Walk | Follow the canonical `docs/notion-setup.md` |

## Cadence

| Trigger | Scope | Time |
| --- | --- | --- |
| **Show day, before the walk** | Quick pass: `npm run hygiene:fmp -- --skip-external`. Any P0 blocks reliance on the suite that night. Open `/fmpwalk/` and the assigned camera route on the phone that will be used | 5 min |
| **After every FMP release** | Probe plus Area 2 checks A1–A4 for the changed routes. Release checks P1–P4 must pass | 10 min |
| **Weekly (Monday)** | Full pass: all three areas and the manual website checks | 30–45 min |
| **Season change** (the walk shows the summer rig ending on Oct 15, 2026) | Full pass plus a Notion archive review, rig/route configuration review, and retirement of legacy origins | 60 min |

## Severity

| Level | Meaning | Response |
| --- | --- | --- |
| **P0** | Blocks an operator on show day: a dead route or link in a workflow path, an open auth boundary, or a broken save path | Fix before the next show. Record the workaround in the show notes |
| **P1** | Wrong, broken, or a contract failure that operators can work around | File it and fix within the week |
| **P2** | Drift, fragility, missing documentation, or stale claims | File it and batch it with the next release |
| **P3** | Polish | Keep a list and fold it into planned work |

Traffic light for the run: 🔴 any P0 or failed probe check · 🟡 P1/P2 open or
warnings · 🟢 all checks pass with current evidence · ⚪ a source of truth was
unavailable.

## Area 1: Live website

### Automated probe

```bash
npm run hygiene:fmp -- --markdown=/tmp/fmp-hygiene.md --output=/tmp/fmp-hygiene.json
# Probes https://housevideo.app by default (the suite's canonical origin);
# pass --base=<origin> to probe another deployment.
```

The probe is read-only. It calls the backend only through unauthenticated GET
requests. It needs network access, Google Chrome for the rendered checks
(`--skip-browser` omits them), and an authenticated `gh` for the canonical drift
check. Add `--strict` to exit non-zero on any failure.

| ID | Check | Why it matters |
| --- | --- | --- |
| R1 | Every published FMP route returns 200 | Operators open these directly from QR codes and bookmarks |
| R2 | Typed or legacy addresses (`/fmp-walk`, `/fmp/walk/`) resolve | People type the hyphenated form. A 404 on show day is a P0 for that person |
| R3 | `404.html` recovery links work from a nested FMP path | A person who hits a dead FMP link needs a working way out |
| R4 | Legacy app origins are retired or show a moved notice | Old bookmarks otherwise open a second, unguarded copy of the suite |
| P1 | Live `source_provenance.json` matches `main` | Pages deploy completed and nothing stale is served |
| P2 | Every live managed file matches its provenance SHA-256 | No partial deploy or cache poisoning |
| P3 | `?v=` cache-bust tokens match the files they load | A stale token lets a phone keep an old module after a release |
| P4 | The released commit is current with canonical `fmpwalk` `main` | Shows unreleased fixes waiting on export |
| P5 | Both releases pin the same source commit | `fmp/` and `fmpwalk/` must ship from one export |
| I1–I3 | Noindex on every FMP page, robots disallow, sitemap exclusion | Discovery policy (not access control) |
| L1 | Same-origin links, assets, and script-built routes resolve | Catches broken links, including ones built at runtime from `./camera/` |
| L2 | No links to legacy or private origins | Legacy origins need a retirement date |
| L3 | External references respond | Some sites block bots with 403. Confirm in a browser before filing |
| L4 | In-page `#` links stay on pages that use `<base>` | With `<base>`, a skip link resolves to another document and leaves the page |
| S1 | Pages link home and back to `/fmp/` | Shell contract: home, parent, and return |
| S2 | Public FMP files carry no personal contact details | Reports counts and file names only, never the values |
| C1 | Rig part and component counts agree | Stale counts erode trust in the reference |
| S3 | Public FMP pages link no Notion pages | Crews have no Notion account; the walk's own Save to Notion receipt is the one exception. Replaced C2, the index snapshot age, when `/fmp-index/` became a redirect on 2026-09-18 |
| B1–B2 | Notion API health responds and unsigned requests get 401 | The backend is up and its auth boundary holds |
| W1–W2 | No console errors or failed requests on load | Runtime regressions |
| W3 | No horizontal overflow at 390px or 1440px | Phone use at the venue |
| W4 | Skip link, one `h1`, named controls | Public-shell and accessibility baseline |
| W5 | Phone controls at least 44px | Gloved and one-handed use |
| W6 | Theme control present, and the first visit defaults to light | `WEB-1` in the workspace rules |
| W7 | The rig explorer renders a 3D canvas | Three.js runtime is intact |

### Manual website checks (weekly)

1. On a real phone, open `/fmp/`, one camera route, `/fmpwalk/`, and `/fmp/rig/`.
   Rotate the rig, change a component, and confirm the page stays usable in
   sunlight (light) and at FOH (dark).
2. From `/fmpwalk/`, press every navigation control that leaves the walk and
   confirm each one lands on a real page.
3. Confirm the SETUP TEST footer and the "not venue accepted" language are
   present until the commissioning gates in `docs/fmp-public-release.md` pass.
4. Open each external reference that L3 flagged in a normal browser. File only
   the ones that are actually gone.
5. Reload `/fmpwalk/` after a partial walk and confirm local state survives. Do
   not clear real walk data.

## Area 2: Navigation and architecture

Run after releases (A1–A4) and in the weekly pass (all).

- **A1 Hub and spoke.** Every FMP surface is reachable from `/fmp/` in one step,
  and every surface returns to `/fmp/`. No dead ends and no one-way links.
- **A2 Public shell.** Home, parent, current location, return, and a working
  skip link on every page (`docs/public-shell-contract.md`). `npm run
  verify:public-navigation` enforces home, parent, and skip target for each FMP
  page and prints the known gaps that are still open.
- **A3 Release integrity.** `npm run verify:fmp` passes. `git log --format='%h %s'
  -- fmp fmpwalk` shows only export commits (no hand edits). The provenance of both
  releases pins the same source commit.
- **A4 Counts and names.** Rig component counts, route names (Catwalk and
  Spotlight area, Walk and Preshow walk), and titles agree across the hub, the
  rig data, `CHANGELOG.md`, and this repository's docs.
- **A5 One entry point.** `/fmp/` is the only FMP directory; `/fmp-index/`
  redirects to it. Check that Learn lists each reference once, that no reference
  repeats a House or Cameras link, and that anything readers need from Notion has
  its own HTML page.
- **A6 Theme architecture.** One theme default and one storage convention across
  the suite, or a documented reason for each exception.
- **A7 Legacy origins.** Every link to the previous private Site or GitHub Pages
  origin has an owner and a retirement condition.
- **A8 Documentation agreement.** `docs/fmp-public-release.md`, `CHANGELOG.md`,
  and the canonical `docs/fmp-suite-architecture.md` and
  `docs/public-camera-release.md` describe the deployed state, not a past or
  planned one.
- **A9 Verifier fragility.** When the rig or routes grow, the allowlist in
  `scripts/verify_fmp_release.js` changes in the same release. So do
  `FMP_SHELL_PAGES` and `FMP_KNOWN_SHELL_GAPS` in
  `scripts/verify_public_navigation.js` when a page is added or a shell gap is
  fixed. A red Pages run from an allowlist mismatch counts as a routine finding,
  not a surprise.

## Area 3: Notion documentation

The Notion half of this routine is the review contract **REV | FMP Suite
Hygiene | Weekly** in REG | Review Contracts. It holds the exact page, data
source, and query targets for the checks below, which stay out of this public
repository. The private canonical `DaveHomeAssist/fmpwalk` `docs/notion-setup.md`
remains the schema source. Use the connector read-only (search, fetch, query)
during the pass.

- **N1 One hub.** A single FMP hub page links to every FMP doc, all five data
  surfaces (Events, Crew Calls, Faults, Walk Reports, and REF · Cameras), and
  the live routes above. Nothing FMP-related is orphaned or duplicated.
- **N2 Current status claims.** Search FMP pages for superseded states: "held",
  "unmerged", "Site v", "owner-only", "github.io", "chatgpt.site". Each hit
  either describes history explicitly or gets corrected.
- **N3 Correct links.** Links use `/fmpwalk/` (not `/fmp-walk`) and the four
  stable camera routes. No links point to retired hosts.
- **N4 Schema agreement.** The camera fields named in `docs/notion-setup.md`
  exist in Crew Calls and Faults with the same names. The position registry
  in REF · Cameras lists exactly `pit-center`, `front-of-house`,
  `pit-stage-left`, and `catwalk`.
- **N5 Record hygiene.** SETUP TEST rows exist only while commissioning is open
  and are clearly labeled. Open faults have an owner or a next step. Walk
  reports link to an event. Count them in Notion. Don't copy data here.
- **N6 Gate status.** The commissioning gates (Google client origin, Notion
  connection sharing, signed-in camera acceptance, walk acceptance) each have a
  recorded state and date in Notion. They match the SETUP TEST language on the
  site.
- **N7 Process gaps.** The operator roster and authorization process, rollback,
  and the season change have a documented owner and procedure.

## Recording a run

1. Save the probe markdown and JSON outside the repository, or attach them in
   Notion.
2. Record the run in DB | Audits as `AUD | FMP | Suite Hygiene | YYYY-MM-DD`,
   with the traffic light, the check results, and the findings register.
3. File each new P0–P2 as a row in **DB | FMP | Tasks**, the FMP backlog, after
   searching for an existing row. Equipment problems stay in DB | FMP | Faults.
   Include the check or finding ID (for example `L1`), the evidence, the owner
   from the ownership map, and the fix approach. Don't start another tracker.
4. Close out with `Status`, `Changed`, `Verified`, `Risks / Notes`, `Next` and
   the run's traffic light.
5. Add a baseline report to `reports/` only when it holds public-safe website
   and architecture evidence and drives a planned change.

The first baseline is
[`reports/fmp-hygiene-baseline-2026-09-17.md`](../reports/fmp-hygiene-baseline-2026-09-17.md).
