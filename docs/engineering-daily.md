# Video Engineering Daily

The public calendar archive lives at https://systembydave.com/demos/engineering-daily/ alongside AV by Dave's concept demos. It contains sourced lessons, diagrams, downloadable story cards and an educational Signal lab. It has no device control or equipment inventory integration.

The maintained standalone archive remains the authoring source. Export an updated, fully verified archive with `node scripts/sync_engineering_daily.cjs <archive-path>`. This validates all matching SVG and 1080 by 1920 PNG assets, copies them, adds public metadata and deterministic return links, and records exact content hashes in `release.json`. This is a snapshot, not a live feed. Refresh it through the same reviewed repository release process after authoring changes.

UX fixes from the October 28 audit: a filtered selection notice with explicit reveal; a default Summary combining the fact, context and practical check; model condition and illustrated output beside lab controls. Existing detail URLs, calendar selection and lab scenario links remain supported.

Acceptance: desktop and phone journeys, both themes, complete Summary text through pagination, retained query before reveal, matching lab output, no page overflow, unchanged edition data and card bytes. The full archive/card and Signal lab checks remain required in addition to focused journeys. Chromium emulation is distinct from physical phone and human acceptance.

Public release uses the repository's normal Pages workflow. A local export or a successful push alone does not establish deployment.

`node scripts/probe_engineering_daily.cjs` exercises the served archive at five sizes in both themes, including filter recovery, complete Summary pagination, lab feedback, reload, PNG dimensions and return links. Set `BASE_URL` to the release origin for the same live check. The PR and Pages workflows run this gate. Full authoring verifiers additionally cover every edition diagram and every story card before export.

Compatibility: ECP-1.0 revision 1.0, educational presentation consumer. The models remain generic procedural geometry in arbitrary illustrative units, with no shared catalog schema, physical equipment claim or control interface added. The embedded Three.js version is r184; existing context loss fallback and page lifecycle cleanup are retained.

Persistent controls retain at least 44 by 44 CSS pixels. Narrow or short calendars page dates rather than squeezing a month into undersized targets. Short readers share a compact detail/pagination row; short lab panels page controls and guide text. Category filtering remains reachable through the compact Filter dialog outside the lab. Date, control and guide page state follows existing URL navigation. The browser probe checks target dimensions and complete date/control/guide coverage.
