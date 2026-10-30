# Public project registry

## Approved scope

PLT-04 decision, October 30, 2026: keep and refresh the directory, preserve
`project-registry.html`, and add a repeatable public-data refresh.

Visitors need current repository descriptions, language summaries and activity
without publishing the private local audit. The existing 52 repository names
and curated categories are the initial explicit allowlist in
`scripts/public-registry-repositories.json`. Adding a repository is a reviewed
source change; the refresh never discovers or publishes the whole account.

## Behavior and acceptance

Refresh names, descriptions, languages, default branches, archive flags, push
dates, sizes and default-branch commit counts from GitHub. Only PUBLIC results
under the configured owner are eligible. Refuse missing, private, transferred,
incomplete or invalid results and leave the old snapshot intact. Resolve public
renames through GitHub and reject duplicate canonical identities. Keep curated
categories separate from measured metadata. Do not invent a maintained/active
status from a private audit; use GitHub's archived or unarchived state.

Keep search, category/status filters and activity/name/date sorts. Static
repository links and snapshot date must work without JavaScript. Use accessible
light/dark, viewport-contained navigation with a bounded long directory, a
separate filter panel and meaningful ultrawide summary. Preserve the route,
canonical URL and indexing. No browser network API or credentials are needed.

Activity means commits reachable from the captured default-branch head in the
90 days ending at snapshot time, as reported by GitHub history totalCount.
Push dates are repository-wide GitHub pushedAt, not deployment or acceptance.
Languages are GitHub language classifications, not inferred frameworks. Empty
repositories have zero commits and no branch. Missing metadata is displayed
explicitly rather than converted into a fabricated result.

## Refresh and verification

`npm run sync:public-registry` uses the existing authenticated `gh` CLI for
read-only GraphQL requests. It writes only after every allowlisted repository
has passed validation. Raw API responses, commit messages, local paths and
credentials are never published. The generated JavaScript and static HTML rows
are deterministic for the captured snapshot. Regenerate both together.

`npm run verify:public-registry` validates schema, allowlist parity, counts,
static-row parity and a maximum snapshot age of 30 days without network access.
A stale snapshot needs another explicit refresh; no scheduled workflow is added.
`npm run test:public-registry` exercises refusal, preservation and generation.
`npm run test:public-registry-browser` exercises visible filtering, saved theme,
keyboard, no-script content and responsive containment using disposable state.

Refresh does not merge or deploy. Git integration checks still precede pushes.
Physical device and human acceptance remain separate from browser emulation.
GitHub visibility can change after observation; a static snapshot is not a
continuous privacy monitor. Source metadata may itself contain public personal
content; this workflow is not a semantic privacy audit of every description.

API contracts: [Repository](https://docs.github.com/en/graphql/reference/repos#repository)
and [Commit history](https://docs.github.com/en/graphql/reference/commits#commit).
