# AV Lighting application

## Brief

Operators need one focused place to prepare a fixture patch, find address conflicts, track focus and hand off the current plan. The smallest useful slice is a local Lighting document with fixture records, status and focus editing, address checks, explicit save, JSON export, and previewed import from the saved Lighting Patch key or its JSON export. It stays independent of the existing `lighting-patch.v1` document, which is read only. No hardware control, fixture library, cue programming, or inferred channel footprint is included.

The new document key is `sbd.avLighting.v1`, schema `system-by-dave.av-lighting.v1`. Legacy imports accept the `lighting-patch.v1` shape and keep every recognized fixture field. Invalid JSON or unsupported shapes leave the document unchanged. Operators can export before replacement. Address checking flags repeated starting addresses within a universe; it does not claim footprint overlap detection.

Acceptance: add and edit a fixture, save and reload, import a legacy fixture only after preview and confirmation, reject an invalid import without mutation, view warning counts, and use the interface by keyboard at phone and desktop sizes. Rail registration, offline caching, sitemap and domain publication are owned by the integration lane.
