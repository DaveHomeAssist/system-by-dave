# AV by Dave: uptime monitoring, post-publish smoke check, live-behind-main

Status: plan plus local tooling (AUD-005). Nothing here creates an account, a signup or a
hosted CI job. Every option below is free. Dave chooses the hosted monitor, if any, and
whoever sets it up owns that account.

## What is watched

| URL | Expect | Published by |
| --- | --- | --- |
| `https://avbydave.com/` | 200, `<title>AV by Dave</title>` | live today |
| `https://avbydave.com/demos/frame-sync.html` | 200, demo title, `demo-shell.js` | #361 (demos staged for avbydave.com) |
| `https://avbydave.com/field-kit/` | 200, `Field Kit`, `sbd-launch-config.js` | #352 (the Field Kit page) |
| `https://avbydave.com/source.json` | `sourceCommit` = main HEAD | every deploy (`scripts/stage_domain_sites.mjs`) |

The targets live in `scripts/launch/smoke-live.json`. Until #361 and #352 publish, the last
two pages return GitHub Pages' 404 and the check reports which change ships each one.

On 2026-10-21 at about 3:30 AM ET the check found `/` up and both other pages returning 404.
`source.json` was a740564e, 5 commits behind main, because the #360 deploy stopped at the
`npm audit --audit-level=high` gate (AUD-001).

## 1. Uptime: free options (pick one, no change to this repo needed)

| Option | Free tier (per vendor pages, 2026-10-21; recheck before relying on it) | Fits | Notes |
| --- | --- | --- | --- |
| **UptimeRobot** | 50 monitors, 5-minute checks, keyword monitors, email alerts, basic status page | Recommended: keyword monitors catch "200 but wrong page" | Needs an account (Dave). Use keyword monitors for the three URLs with the keywords from the table. Its help centre (checked 2026-10-21) says the free plan allows commercial use, so selling the Field Kit is fine. |
| **Better Stack (Uptime)** | 10 monitors and 10 heartbeats, 3-minute checks, email/Slack, 1 status page ("free for personal projects") | Good alternative | Needs an account (Dave). Keyword checks. A heartbeat can also receive a ping from the cron below on success, which makes it the alert channel for the self-hosted check. |
| **Self-hosted cron** (`smoke_live_domain.mjs`) | Free. Runs on any always-on machine (the box, a Pi, the self-hosted runner) | No third party, also checks source.json | Alerting is whatever the host has (cron mail, a desktop notification, a log someone reads). See section 3. |
| GitHub Actions `schedule:` | Uses Actions minutes | Not recommended | Dave keeps Actions minutes for deploys. |

Recommendation: start with the self-hosted cron (zero accounts, covers the source.json
lag that a ping monitor can't see). Add UptimeRobot keyword monitors when Dave wants alerts
on his phone. Both can run together.

## 2. Post-publish smoke check

`scripts/launch/smoke_live_domain.mjs` runs on Node 22 with no dependencies and makes only
read-only GETs. Exit codes: 0 = all good, 1 = a check failed, 2 = bad usage.

```sh
# Once, against the live site
node scripts/launch/smoke_live_domain.mjs

# Right after a deploy: wait up to 15 min for source.json to report the commit, then check pages
node scripts/launch/smoke_live_domain.mjs --expect-commit "$(git rev-parse origin/main)" --wait 900 --delay 20

# The same checks against a staged folder before publishing (after stage_domain_sites.mjs)
node scripts/launch/smoke_live_domain.mjs --dir _sites/avbydave

# Live-behind-main (section 4); --json for machines
node scripts/launch/smoke_live_domain.mjs --behind-main --max-behind-minutes 60 --json
```

Each page is fetched with a cache-busting query and retried (`--retries 3 --delay 10` by
default). It fails on a non-200, on a 200 that is really the site's not-found page, or on a
missing marker. `npm run test:smoke-live-local` is the local self-test (fixtures and a fake
GitHub API, no network).

### Running it on a self-hosted runner

`docs/launch/examples/smoke-live-self-hosted.yml.example` is a workflow for a
**self-hosted** runner. It sits under `docs/`, so nothing runs until someone copies it into
`.github/workflows/`, and that is Dave's call. It triggers after "Deploy site to Pages"
completes and on a 15-minute schedule. A self-hosted job does not use GitHub-hosted Actions
minutes. GitHub still queues it, so it needs a registered runner, which this plan does not
create.

### Cron on any machine (no GitHub at all)

```cron
*/15 * * * * cd /path/to/system-by-dave && git fetch -q origin main && node scripts/launch/smoke_live_domain.mjs --behind-main --main-sha "$(git rev-parse origin/main)" >> ~/avbydave-smoke.log 2>&1 || echo "avbydave smoke FAILED $(date)" >> ~/avbydave-smoke-alerts.log
```

`--main-sha` from a local fetch skips the GitHub API entirely.

## 3. Alerting without accounts

- The cron line above appends to an alerts log. Any notifier the host already has (mail,
  `notify-send`, a Home Assistant webhook Dave already runs) can watch that file.
- The self-hosted workflow example fails the job. GitHub's own failure email goes to
  whoever watches the repo, so no new account is needed.

## 4. Live-behind-main check (design)

**Signal.** Every deploy writes `source.json` with `sourceCommit`: the system-by-dave commit
the site was staged from. Every push to main triggers "Deploy site to Pages" (`on: push:
branches: [main]`), so after a healthy deploy `sourceCommit` equals main HEAD.

**Comparison.** `GET https://api.github.com/repos/DaveHomeAssist/system-by-dave/compare/<sourceCommit>...main`
uses the public API with no token (60 requests/hour per IP, enough for one check every 5-15
min). Alternatively pass `--main-sha` from a local `git fetch`.

| compare status | Meaning | Result |
| --- | --- | --- |
| `identical` | live = main | ok |
| `ahead` (main ahead), oldest unpublished commit younger than the limit | deploy in progress | ok (reports N pending) |
| `ahead`, older than the limit (default 60 min) | **live is behind main** (a deploy failed or is stuck: AUD-001 is an example) | FAIL |
| `behind` / `diverged` | the site was published from a non-main commit | FAIL |
| API error / rate limit | unknown | FAIL (`state: unknown`), retry next run |

**Why the age of the oldest unpublished commit.** A healthy deploy runs about 35 gates and
then the avbydave Pages build, roughly 10 to 20 minutes. Measuring from the first commit
main has that the site lacks means a steady stream of merges can't keep resetting the clock.
Lower the limit to 30 if deploys stay fast.

**Covers both hops.** system-by-dave deploy → push to DaveHomeAssist/avbydave → avbydave
Pages build. `source.json` is read from the live domain, so a failure at either hop shows up
as "behind".

**Not covered.** CDN staleness of individual files (the page checks' cache-busting query
covers HTML) and correctness of interactive behaviour (the local probes cover that before
merge).

## 5. Analytics: waiting on the Umami ID

The demos already call `window.sbdTrack(...)`. That is a no-op until `demos/config.js` has
`umamiWebsiteId`. **Placeholder:** `scripts/launch/smoke-live.json` → `analytics.umamiWebsiteId:
null`. When Dave sends the ID, set it in both places. The smoke check then also confirms the
live `demos/config.js` carries it. Nothing else is wired and no Umami account is created
here.

## Out of scope here

Dave-only values (subscribe URL, Payment Links, prices), privacy policy text, GitHub email
privacy and phone settings, and #362.
