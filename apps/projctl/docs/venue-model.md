# Private building model

The Stage tab can inspect a local building GLB alongside the existing drawing
views and live lane cards. Acceptance: preserve metric coordinates, keep model
inspection inert, load large scan layers only on demand, retain controls when
WebGL fails, and preserve all saved rig assignments and commands. Actual venue
geometry and source evidence stay outside the public repository.

Place `manifest.json` and its assets in `data/venue/` beside the active rig, or
set `VENUE_MODEL` to that directory. The authenticated relay exposes a sanitized
descriptor at `/api/venue-model` and verified assets at `/api/venue-model/<role>`.
No browser file paths or user-supplied command mappings are accepted.

Manifest version 1 requires `title`, `modelVersion`, `notes`, `units: "metres"`,
`up: "Y"`, `upstage: "-Z"`, and an `assets` object. Roles use fixed filenames:
`room: room.glb` (required), `plot: plot.glb`, `scan: scan.glb`, and
`preview: preview.png`. Each entry has `bytes` and lowercase `sha256`. The
manifest is limited to 32 KiB; each asset to 32 MiB. GLBs must embed their
buffers and images. Hash, size, format and path containment are checked before
serving; private responses use `Cache-Control: no-store`.

Optional `cutaway` lists up to 64 room-node names to hide initially (for example,
roof and near walls). The Cutaway button restores them without changing any
geometry, coordinate, dimension or source file.

Assets share one origin and scale. The viewer does not independently center,
resize, or register layers. Building, drawing reference and original scan are
separate visibility controls. Drawing overlays are provisional references,
never collision surfaces or measured projector locations. Unknown mounting
heights remain unknown. Existing diagram views retain their own diagram scale.
Only existing lane cards can open the relay's guarded adjustment controls.

Without a venue manifest the existing Stage experience is unchanged. Without a
stage plot, a valid building bundle still opens. A failed renderer offers the
included preview and the Rig tab; hidden viewers pause and pagehide disposes
their resources. Nothing here rewrites `rig.json` or `stage-plot.json`.

Validation: `npm test`, `npm run test:browser`, and `npm run test:venue-browser`
from `apps/projctl`. Browser fixtures are synthetic, not private venue data.
