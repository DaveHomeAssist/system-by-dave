# Domain sites

This repository configures three sets of pages on their own domains as well as on
systembydave.com. The source stays here and passes the same release gates; the
Pages workflow stages each set as its own site and pushes it to that domain's
GitHub Pages repository.

| Site id | Domain | Repository | Pages | Cutover |
| --- | --- | --- | --- | --- |
| `housevideo` | housevideo.app | `DaveHomeAssist/housevideo` | `/fmp/` and its routes, the `/fmp-index/` redirect, `/switcher/` and its routes, `/shader/`, `/backfocus/` | 2026-09-18 |
| `fmpwalk-site` | walk.housevideo.app | `DaveHomeAssist/housevideo-walk` | `/fmpwalk/` and the `/fmp-walk/` redirect | Pending infrastructure, auth and live acceptance |
| `avbydave` | avbydave.com | `DaveHomeAssist/avbydave` | `av-suite.html`, every registry tool and offline page (including `plotforge.html`), `av-workbook.html`, `av-tool-suite/` | 2026-09-18 |

`scripts/domain-sites.json` owns this list, each site's home route, robots rules
and the browser storage its tools own. AV by Dave pages come from
`js/sbd-registry.js`, so a tool added to the registry is published on
avbydave.com without editing the config. Paths are unchanged on the new domains:
`systembydave.com/fmp/house/` is `housevideo.app/fmp/house/`. The bare domain
redirects to the site's home (`/fmp/`, `/fmpwalk/` or `/av-suite.html`).

The proposed cutover gives the preshow walk its own origin. Existing hub links
still open the walk explicitly. `housevideo.app/fmpwalk/`
and `/fmp-walk/` stay reachable as redirects to the new address: a site's
`movedTo` entry names each route it used to serve and the site that serves it now,
and the stager writes a noindex migration page at each one. It offers saved-data
transfer before redirecting, preserving query and hash. A fresh browser redirects
immediately; a no-JavaScript visitor gets a fallback link and meta redirect.

Links that now cross between the two origins are absolute, in both directions. The
walk's camera launch and its legacy `?camera=N` and `?position=` redirect name
`https://housevideo.app/fmp/camera/`; the hub, camera reference list, house board
and bowl camera guide name `https://walk.housevideo.app/fmpwalk/`. Those live in
the managed export, so `DaveHomeAssist/fmp-suite` owns them: `PUBLIC_CAMERA_ROOT` and
`PUBLIC_WALK_ROOT` in its exporter, which fails the export if a same-origin walk
link survives.

The walk's saved data moves with it. `fmpPhotosV1` holds walk photos and camera
fault photos in one store keyed by random UUID, with no field distinguishing them,
so the whole database is offered to the new origin rather than split (Dave,
2026-09-20). The walk's own `transfer.html` performs the move.

## Pipeline

1. `npm run verify:domain-sites` runs with the other release gates. It stages
   all sites into a temporary directory and fails when:
   - a staged page loads or links a local file that the site does not carry
     (a systembydave.com-only page must be linked absolutely);
   - a registry offline asset is missing, which would make the service worker
     install fail on the new domain;
   - after cutover, a page still names its old systembydave.com address;
   - the Pages workflow does not publish a configured site with its own key.
2. The workflow stages systembydave.com as before, then runs
   `node scripts/stage_domain_sites.mjs --out _sites --site-root _site`.
3. Before any deployment, require `HOUSEVIDEO_WALK_DEPLOY_KEY` and the repository
   variable `HOUSEVIDEO_WALK_AUTH_VERIFIED=true`. Record that variable only after
   verifying the new origin in the existing Google client and backend
   `FMP_ALLOWED_ORIGINS`. It records external configuration evidence; it does not
   prove Gmail delivery or a Notion save.
4. Publish the walk first with `scripts/publish_domain_site.sh`. Wait up to ten
   minutes for HTTPS to serve the exact staged `source.json`, walk, alias and
   transfer page. Missing DNS, TLS, target repository, deploy key, or stale output
   stops the release before systembydave.com or housevideo.app redirects change.
5. Deploy systembydave.com, then publish housevideo.app and avbydave.com with
   their respective `HOUSEVIDEO_DEPLOY_KEY` and `AVBYDAVE_DEPLOY_KEY`. Each target
   repository's own Pages workflow deploys its push; each key can write only its
   own repository. Unchanged content produces no commit.

Each staged site gets its own `index.html` (home redirect), `404.html`,
`robots.txt`, `CNAME`, `source.json` (source commit and artifact digest) and
`transfer.html`.

## Before and after cutover

Until a site's `cutover` is `true`, its new domain is a mirror: the pages keep
their systembydave.com canonical URLs, its `robots.txt` disallows crawling, and
systembydave.com is unchanged. Links labelled System by Dave already name
`https://systembydave.com/` absolutely, so they work from either domain.

When `cutover` is `true`:

- every moved HTML page on systembydave.com is replaced at deploy time by a
  redirect stub to the same path, query and hash on the new domain, and the
  moved non-HTML files are dropped (anything still loading one fails the gate);
- systembydave.com's `av-suite-worker.js` becomes a retiring worker that deletes
  the old `sbd-av-suite-*` caches, unregisters itself and reloads open pages;
- the moved pages leave systembydave.com's sitemap, the new domain gets its own
  (`python3 scripts/gen_sitemap.py --site <id> --out <path>`), and its
  `robots.txt` allows crawling with the configured disallow rules.

### Saved browser data

Browsers keep saved data per origin, so tool data saved on a previous origin is
not visible on the new domain. A stub checks for the site's keys and IndexedDB
databases (`storage` in the config; AV by Dave also includes every registry
storage key). With none, it redirects immediately. Otherwise it offers:

- **Move my data and continue**: opens `transfer.html` on the new domain as a
  popup, which announces itself to its opener; the stub sends the data by
  `postMessage` (origin-checked both ways) and redirects once it is imported.
- **Download a backup**: a JSON file that `transfer.html` imports later.
- **Continue without moving**.

Portfolio pages keep their relative links to moved pages, so a returning
visitor passes through a stub and gets the move offer once; after they move or
skip, later stubs redirect immediately. Revisit direct links once most saved
data has moved.

Imports never overwrite: keys and records that already exist on the new domain
are kept and listed, with an explicit, confirmed option to replace them.
Nothing is deleted on the source origin, and the choice is remembered there in
`sbd.domainMove.<site>.v1`. `js/domain-storage.js`, `js/domain-move.js` and
`js/domain-transfer.js` implement this; `css/domain-move.css` styles both pages.

The source records a completed move only after the destination acknowledges all
attempted writes. A full storage quota or incompatible database layout leaves
the move incomplete and offers retry or backup recovery. Already copied items
are kept when retrying. A source read failure also stays on the source page with
a retry button; it cannot silently skip unreadable saved data.

The walk accepts transfers from both systembydave.com and housevideo.app. The
allowlist is generated from `movedTo`; the receiver checks the opener, message
origin and payload source. The destination-specific completion flag keeps a
previous portfolio-to-hub move from skipping the later hub-to-walk move.

### Cutover checklist

For the walk split, provision the `DaveHomeAssist/housevideo-walk` Pages repository,
its deploy key, and DNS/HTTPS for `walk.housevideo.app` first. Verify the exact new
origin in Google OAuth and backend `FMP_ALLOWED_ORIGINS`, then record the auth
variable described above. Keep both PRs draft until those prerequisites are met;
merge fmpwalk #7 before system-by-dave #72. The workflow publishes the destination
before redirects; authenticated walk acceptance remains a separate final gate.

Do these per site, in order, and verify each before the next:

1. At Namecheap, replace the parking records with GitHub Pages records: `A`
   `@` 185.199.108.153, 185.199.109.153, 185.199.110.153 and 185.199.111.153;
   optionally `AAAA` `@` 2606:50c0:8000::153, 2606:50c0:8001::153,
   2606:50c0:8002::153 and 2606:50c0:8003::153; and `CNAME` `www`
   davehomeassist.github.io.
2. Confirm the repository's Pages custom domain, wait for the certificate,
   then enforce HTTPS. housevideo.app is on the HSTS preload list, so it loads
   only over HTTPS.
3. For housevideo.app only: add `https://housevideo.app` to the FMP Google
   OAuth client's authorized JavaScript origins, redeploy the `fmp-walk-notion`
   backend (its default allowed origins include housevideo.app since fmpwalk
   `c816ea8`), and repeat the SETUP TEST and walk acceptance on the new domain.
4. Set `"cutover": true`, then move canonical, Open Graph and structured-data
   URLs to the new domain: `node scripts/domain_cutover_rewrite.mjs --site <id>`
   lists every absolute systembydave.com URL naming a moved page, and `--write`
   rewrites the hand-maintained ones. Change generated files at their source
   (`apps/av-workbook/` then `npm run build:av-workbook`; the fmpwalk exporter
   for `fmp/` and `fmpwalk/`). Release gates read expected canonical origins and
   sitemap membership from `scripts/domain_sites_lib.js`, so they follow the
   flag; `npm run verify:domain-sites` fails until no stale URL remains. For
   housevideo.app, also point `scripts/fmp_hygiene_probe.js` at the new domain.
5. Regenerate `sitemap.xml` and release.
6. Read back: a stub redirects with path and query intact, a browser with saved
   data sees the move offer, both sitemaps and robots files are correct, and
   `npm run hygiene:fmp` passes against housevideo.app.

Rollback: set `"cutover": false` and release. systembydave.com serves the real
pages again; data already moved stays on the new domain as a copy.
For the later housevideo-to-walk split, that flag alone is insufficient: restore
the prior route ownership, remove the `movedTo` entries, and re-export the prior
canonical walk origin through coordinated normal revert commits. Retain all
browser data and the destination copy.

## Local simulation

```sh
node scripts/stage_domain_sites.mjs --out /tmp/sites --site-root /tmp/sbd-site --simulate \
  --source-origin http://localhost:8801 \
  --site-origin housevideo=http://localhost:8802 --site-origin avbydave=http://localhost:8803 \
  --site-origin fmpwalk-site=http://localhost:8804
```

`/tmp/sbd-site` must first hold a copy of the repository webroot (the same
rsync the workflow runs). Serve it on 8801 and each staged site on its port.
`--simulate` refuses to run without local origins, and it reports stale
canonical URLs as warnings rather than failures.

For repeatable browser acceptance, run `npm run test:domain-cutover` after
`npm ci` and `npx playwright install chromium`. The harness stages the current
source on four disposable local origins and uses new browser contexts for
each scenario. `CHROME_CHANNEL=chrome` uses an installed Chrome instead.
`CUTOVER_CAPTURE_DIR=/absolute/path` saves JSON results and recovery screenshots.
The Pages release workflow runs this acceptance before deployment. Every
`movedTo` route also runs the eight migration scenarios from its previous site,
including both housevideo.app walk aliases. Rejected opener/source messages and
deployment readiness failures have regression coverage.

`node scripts/test_domain_cutover.mjs --live` repeats the same tests on the
published domains using disposable synthetic browser state. It does not sign in,
submit operational records, or use an operator's browser profile. Coverage
includes clean and upgrade visits, binary IndexedDB records, retained source
copies, duplicate backup imports, interrupted transfers, storage read/write
failures, incompatible databases, invalid backups, history, all published pages,
absolute home links, and every registry-declared offline AV asset and HTML page.

Offline acceptance applies to the AV registry's declared offline pages. The FMP
suite remains online-only under `docs/fmp-public-release.md`; no protected API
response or authentication state is cached. Its strict `connect-src 'none'`
reference pages are tested by navigation; a deliberately blocked test fetch is
recorded as expected CSP enforcement.
