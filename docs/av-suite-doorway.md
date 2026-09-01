# AV Suite Doorway Contract

`av-suite.html` is the stable AV by Dave route. It exposes two distinct,
addressable workspaces without duplicating the route or the canonical tool
registry.

## Entries

- `av-suite.html?entry=show` opens **Show Console** for show-attached work.
- `av-suite.html?entry=toolbox` opens **AV Toolbox** for show-independent tool
  discovery and launch.
- A URL containing any supported `sbd*` show parameter always opens Show
  Console, even when `entry=toolbox` is also present.
- A neutral URL uses the saved entry preference when one exists. A true first
  visit presents two native-button choices and stores the selected preference.
- Doorway navigation uses `history.pushState`; Back and Forward restore the
  entry represented by the URL.

The canonical URL remains `https://systembydave.com/av-suite.html`; query
parameters select application state and do not create separate indexable pages.

## Show Console

Show Console retains the existing show profile, phase flow, readiness, Guided
Setup, queue, and context-aware tool links. Its persistent show state remains in
`av-suite-dashboard.v1`. Links launched from this workspace carry the current
supported show parameters.

## AV Toolbox

AV Toolbox is derived entirely from `window.SBD_REGISTRY.tools`. It renders the
complete current inventory, groups tools by workbook and console families, and
uses registry `toolboxFeatured` flags for the featured set. Toolbox links are
plain destinations: they do not include `sbdShow`, `sbdVenue`, `sbdDate`,
`sbdOperator`, or `sbdPhase`.

Toolbox exposes search plus All, Use anytime, Pinned, Recent, and family views.
It clearly reports that no show is attached and keeps Show Console controls out
of the Toolbox workspace. Front Office remains a labeled roadmap concept and
does not imply persistent workflow functionality.

## Persistence boundary

`av-suite-ui.v1` owns doorway and Toolbox preferences:

- `preferredEntry`
- `toolboxPinned`
- `toolboxRecent`
- `toolboxSearch`
- `toolboxFilter`
- `toolboxFamily`
- `toolboxCommandRecent`

Toolbox interactions must not read from or write to
`av-suite-dashboard.v1`. This boundary is release-gated with a byte-for-byte
dashboard sentinel in `scripts/probe_av_suite_responsive.js`.

## Motion and accessibility

Workspace changes use the vendored local GSAP build for short opacity and
transform transitions. Repeated transitions kill in-flight tweens before
starting a new sequence. `prefers-reduced-motion: reduce` bypasses animation and
renders the final state immediately.

The first-visit chooser uses native buttons, moves focus into the dialog, traps
Tab while open, restores the background inert state, and supports native Enter
activation. The doorway and Toolbox are release-probed at 390, 680, and 1280
pixels for page overflow and unreachable clipped controls.
