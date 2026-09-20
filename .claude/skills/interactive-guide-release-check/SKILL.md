---
name: interactive-guide-release-check
description: Verify an interactive equipment guide across its supported desktop, tablet, and phone environments, accessible alternatives, offline delivery, and authorized deployed version. Use for guide release checks, fullscreen/responsive defects, portable exports, or publication verification; distinguish emulation from physical-device results.
---

# Verify a guide release

Verify the actual operator tasks on the promised delivery surfaces. Preserve the requested platform and existing release process. A successful build, catalog check, or deployment job proves only that layer.

## Define the release contract

Identify source revision, guide/catalog revision, local artifact, promised offline mode, deployment target if any, supported devices/browsers, and the tasks that must work. Derive reasonable test coverage from the request and existing app; do not interpret 'every device' as universal certification. Use [the release matrix](references/release-matrix.md) and start [a release record](assets/release-record.json) when multiple surfaces are involved.

Record each check as `passed`, `failed`, `blocked`, `not_run`, or `not_applicable` with environment, revision, timestamp when observed, and evidence. Require a reason for `not_applicable`. Keep blocked rendering and unavailable hardware visible; an emulated viewport is not a physical iPad test.

## Exercise the guide

- Desktop: test maximized and short-height windows, zoom, fullscreen entry/exit if implemented, and resize. Verify the viewer height does not grow solely from window width or push essential controls out of reach.
- Tablet/phone: test portrait/landscape, narrow content width, page scrolling around and through the model, accessible alternate controls, and dynamic browser chrome where available. Do not trap the entire page with canvas touch handling.
- Interaction: select a large part, a small/overlapping control, and an articulated part. Move it and reselect it; check highlight, caption, framing, and reset. Verify hidden contextual controls stay hidden until applicable.
- Accessibility: complete essential tasks by keyboard and semantic component list. Check visible/unobscured focus, label/name agreement, touch targets, zoom/reflow, contrast, reduced motion, and screen-reader output when available. Use the sourced criteria in the reference; report a scoped assessment rather than unsupported WCAG certification.
- Rendering failure: simulate or observe unavailable/lost WebGL. Confirm searchable component descriptions, photo alternatives, and necessary instructions still work. This proves fallback, not the 3D renderer.

If a test tool cannot launch, diagnose the immediate environment issue with a bounded retry or supported alternative. Do not repeat unlimited launches or relabel a source-only test as visual verification. Complete other useful checks and state the exact untested scope.

## Verify portable delivery

For a promised standalone HTML file, disconnect network in a fresh session and open the downloaded copy using its actual supported launch mode. Check scripts, fonts, images, models, workers, dynamic imports, and fetched data. Distinguish truly self-contained files from a bundled folder or a previously cached PWA. A warm service-worker cache is not cold offline proof. Phone file-opening restrictions may require a different delivery mode; report them instead of claiming desktop double-click behavior applies everywhere.

Use `python3 scripts/artifact_manifest.py create DIST_DIR --guide-id ID --revision REV --out MANIFEST.json` for a portable bundle, placing the manifest outside `DIST_DIR`. Use `verify DIST_DIR --manifest MANIFEST.json` after copying it. The script verifies file parity only; it performs no network requests, browser tests, or deployment.

## Publish and verify when authorized

Complete the reviewable artifact and applicable checks first. Use authorization already present in the session; do not add a new approval loop. Preserve the platform's release process and rollback target. Publish only the requested scope.

Read the actual deployed URL, revision marker, and changed behavior after publication. Compare payload hashes when the delivered files should be byte-identical. If the host transforms output, compare the shared catalog revision/content plus observable behavior; explain why whole-file hashes differ. Check stale cache/service-worker behavior when relevant. Do not infer release parity from a source commit or successful job alone.

Deliver the labeled download and live link as applicable, with a compact evidence matrix and material gaps. Keep source checks, rendered-browser checks, real-device checks, offline checks, and deployed checks separate. Do not claim physical equipment readiness from software verification.
