# Box lens model standalone route

## Scope

Dave directly requested `https://avbydave.com/boxlens` on October 23, 2026.
This is the workspace project-intake exception for directly instructed work.
Give a camera operator one shareable link to the existing Ion Workbench camera
rig without opening an AV workspace or choosing an equipment panel.

The smallest slice is a viewport-filling host at `/boxlens/` with deterministic
home and console links, a keyboard skip target and an always-available direct
viewer link. The source remains the existing public Ion Workbench `/camera/`
route. Do not copy or modify its geometry, control IDs, practice state or renderer.
Do not add a camera panel to the AV chooser or change Site access.

## Source and compatibility

Ion Workbench source inspected at `9a7620ac8f6da3a67a318025f5343164746ae9b0`;
camera catalog `equipment.inspection.v1`, revision `1.1.0`, equipment ID
`fujinon66-cartoni30-rig`; ECP-1.0 revision 1.0 applies. The public viewer models
Fujinon XA66-family controls and a Cartoni Maxima 30 reference, with a generic
Panasonic body. Geometry and balance behavior remain illustrative. This does
not identify Mike's actual equipment or certify physical payload/capacity.

The host is an online-only, cross-origin display adapter. It sends no commands,
credentials or show data. Existing viewer theme controls and instance state stay
within the viewer. The live viewer can evolve independently; the source revision
above records the snapshot reviewed for this release.

## Acceptance

- `/boxlens` resolves to the standalone `/boxlens/` page on avbydave.com.
- The actual public camera viewer loads, renders and exposes all 23 controls.
- Explore selection, lens/head views, balance and back-focus walkthrough remain
  usable. Light and dark remain selectable inside the viewer.
- Root dimensions remain bounded at desktop, phone, landscape and ultrawide
  sizes. A very short phone viewport presents a direct-viewer recovery panel
  so the model can use the full browser height. Home, console, skip and direct-viewer links remain accessible.
- A direct viewer link remains available if a browser blocks third-party framing.
- Domain staging includes the route, source checks pass, CI/merge/deploy and live
  behavior are checked separately. Physical-device/operator proof stays open.

## Verification

Local source checks passed for public navigation, public copy, indexing policy,
all three domain-site staging outputs, deterministic sitemap and whitespace.

Dominic Chromium checks passed at 1440x900, 680x900, 375x812, 844x390 and
3840x1080: rendered WebGL model, 23 selectable controls, component selection,
F.f lock and back-focus steps, balance reset, head presets, light/dark and bounded
host/viewer roots. At 320x256 the host presents bounded direct-viewer recovery;
the direct public viewer renders with all 23 controls. Page errors were absent.
Physical-device, operator and real equipment acceptance remain separate.

PR [#363](https://github.com/DaveHomeAssist/system-by-dave/pull/363) passed both
checks and merged at `105620f655876a099d95e1990301b254c91c770d`. Its release
receipt maintains the current deployment and exact live acceptance evidence.
The browser observations above are the pre-publication host checks; consult
the receipt for production results. Physical/operator acceptance stays open.
