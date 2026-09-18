# Domain sites

This repository publishes two sets of pages on their own domains as well as on
systembydave.com. The source stays here and passes the same release gates; the
Pages workflow stages each set as its own site and pushes it to that domain's
GitHub Pages repository.

| Site id | Domain | Repository | Pages | Cutover |
| --- | --- | --- | --- | --- |
| `housevideo` | housevideo.app | `DaveHomeAssist/housevideo` | `/fmp/` and its routes, `/fmpwalk/`, `/fmp-index/`, `/fmp-walk/`, `/switcher/`, `/shader/`, `/backfocus/` | 2026-09-18 |
| `avbydave` | avbydave.com | `DaveHomeAssist/avbydave` | `av-suite.html`, every registry tool and offline page (including `plotforge.html`), `av-workbook.html`, `av-tool-suite/` | 2026-09-18 |

`scripts/domain-sites.json` owns this list, each site's home route, robots rules
and the browser storage its tools own. AV by Dave pages come from
`js/sbd-registry.js`, so a tool added to the registry is published on
avbydave.com without editing the config. Paths are unchanged on the new domains:
`systembydave.com/fmp/house/` is `housevideo.app/fmp/house/`. The bare domain
redirects to the site's home (`/fmp/` or `/av-suite.html`).

## Pipeline

1. `npm run verify:domain-sites` runs with the other release gates. It stages
   both sites into a temporary directory and fails when:
   - a staged page loads or links a local file that the site does not carry
     (a systembydave.com-only page must be linked absolutely);
   - a registry offline asset is missing, which would make the service worker
     install fail on the new domain;
   - after cutover, a page still names its old systembydave.com address;
   - the Pages workflow does not publish a configured site with its own key.
2. The workflow stages systembydave.com as before, then runs
   `node scripts/stage_domain_sites.mjs --out _sites --site-root _site`.
3. After systembydave.com deploys, `scripts/publish_domain_site.sh` pushes each
   staged site to its repository with that repository's write deploy key
   (`HOUSEVIDEO_DEPLOY_KEY`, `AVBYDAVE_DEPLOY_KEY` in this repository's
   Actions secrets). The target repository's own Pages workflow deploys it.
   Unchanged content produces no commit. Unlike NoteForge, which is synced
   in by hand, these two sites use cross-repository keys by Dave's decision
   (2026-09-17); each key can write only its own repository.

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

Browsers keep saved data per domain, so tool data saved on systembydave.com is
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
Nothing is deleted on systembydave.com, and the choice is remembered in
`sbd.domainMove.<site>.v1`. `js/domain-storage.js`, `js/domain-move.js` and
`js/domain-transfer.js` implement this; `css/domain-move.css` styles both pages.

### Cutover checklist

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

## Local simulation

```sh
node scripts/stage_domain_sites.mjs --out /tmp/sites --site-root /tmp/sbd-site --simulate \
  --source-origin http://localhost:8801 \
  --site-origin housevideo=http://localhost:8802 --site-origin avbydave=http://localhost:8803
```

`/tmp/sbd-site` must first hold a copy of the repository webroot (the same
rsync the workflow runs). Serve it on 8801 and each staged site on its port.
`--simulate` refuses to run without local origins, and it reports stale
canonical URLs as warnings rather than failures.
