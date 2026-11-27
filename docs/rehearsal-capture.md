# Rehearsal Capture on avbydave.com

Rehearsal Capture is the Rehearsal Review viewer from
[`DaveHomeAssist/frozen-rehearsal-capture`](https://github.com/DaveHomeAssist/frozen-rehearsal-capture)
(`viewer/src/`, built to `viewer/dist/rehearsal-review.html`). That repository stays
the only place its behavior changes. This repository publishes it at
`https://avbydave.com/rehearsal-capture/` as a managed release, the same way it treats NoteForge.

## Files

| Path | What it is |
| --- | --- |
| `apps/rehearsal-capture/upstream/rehearsal-review.html` | The viewer build, byte for byte as committed upstream. Not published. |
| `apps/rehearsal-capture/release.json` | Source repository, commit, path, sha256 and build time of that copy. |
| `apps/rehearsal-capture/avbydave.css` | AV by Dave skin: maps the viewer's `--frozen-*` palette to `css/avd/tokens.css`. |
| `scripts/build_rehearsal_capture.mjs` | Writes `rehearsal-capture/index.html`. `--check` fails on drift; `--sync <checkout>` repins. |
| `rehearsal-capture/index.html` | Generated page. Never hand-edit it. |
| `run-review/index.html` | Generated forward from the page's first address. Keeps the query and hash. Never hand-edit it. |

The build swaps only the shell: title, description, canonical and social metadata,
favicon, token stylesheet, skip link, the AV by Dave / Console / Rehearsal Capture breadcrumb,
the theme key and the saved-copy home link, then recomputes the CSP hashes with
`wst/hosting/scripts/review-csp.mjs`. Every swap names the exact upstream text it
replaces, so an upstream change to any of them fails the build instead of shipping a
half-branded page.

Upstream hard-codes its hosted asset path as `/run-review/`, the Frozen route. The build
swaps that one string for `/rehearsal-capture/` so hosted mode, once wired, looks beside
this page. Making the path configurable upstream would let this swap go.

The page first shipped as Run Review at `/run-review/` on November 26 and was renamed the
same day. `/run-review/` stays as a noindex forward so saved links keep working.

## Updating the viewer

```
node scripts/build_rehearsal_capture.mjs --sync ../frozen-rehearsal-capture
npm run verify:rehearsal-capture
```

`--sync` refuses a checkout whose committed `viewer/dist/rehearsal-review.html` has local
changes. Commit the refreshed `apps/rehearsal-capture/` and `rehearsal-capture/index.html` together.

## What works and what is not wired

- **Local mode works.** With no `catalog.json` beside the page, the viewer opens a capture
  `.zip` and an optional Notion cue snapshot `.json` from the operator's computer. Nothing
  is uploaded.
- **Review marks and notes are per browser.** They live in this browser's storage and
  leave as CSV, Markdown or JSON exports. There is no shared sync and no save API.
- **Hosted mode is a seam, not wired.** The viewer turns on hosted mode when
  `/rehearsal-capture/catalog.json` and its manifests and photos exist on the same origin
  (`hosted.js`). Nothing publishes a production's capture to avbydave.com. The Frozen
  evidence stays in the WST Worker's R2 bucket behind `wst.housevideo.app/run-review/`.
- **Per-production names come from the files.** Show, session and cue names are read from
  the archive and snapshot. No Frozen wording shows on the page; only CSS comments and internal names keep it.
- **Theme.** The page shares `av-theme-mode.v1` with the console. White and Black read
  as light and dark. The viewer's light, dark and system control writes the same key.

## Boundaries

- `wst.housevideo.app/run-review/` is built by `wst/hosting/scripts/integrate-review.mjs`
  and is untouched by this release.
- The route is noindex,follow with its canonical on avbydave.com, so it is outside the
  sitemap and the public tool count. Listing it publicly is a separate decision.
- The console lists it as the `rehearsal-capture` own-app handoff in `js/sbd-registry.js`
  (`EXTERNALS`, `MENU.showTools`), not as a registry tool, so tool counts and the offline
  suite are unchanged.
