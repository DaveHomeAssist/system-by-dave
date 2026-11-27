# Envision cross device workspace

## Product brief

Dave needs to move between computers without wondering which machine owns a project or whether image generation is available. The private browser Studio remains the shared source of truth on Dominic. Walter remains the GPU runner. A connected browser or desktop client shows that authority chain directly.

The first slice adds a compact Computers panel to the private Studio and a native status strip to Envision for Mac. Both surfaces distinguish the current computer, Dominic and Walter. The Mac client can explicitly keep a project offline. That copy contains the project identity, image direction, artwork records and the selected artwork bytes. It is read-only recovery material while disconnected. Saving, generation, revision history, imports and layout changes still require Dominic.

## Flow

1. Open Envision from any authorized computer.
2. Read the Computers panel to confirm the current device, Dominic and Walter.
3. On the Mac Generate screen, select a project and choose **Keep offline**.
4. The client writes an atomic private cache under Application Support and reports the stored artwork.
5. If Dominic is unavailable, cached projects remain selectable and their stored artwork remains visible.
6. After reconnection, the live project replaces the cached view and refreshes an enabled offline copy.

## Boundaries

- Dominic owns projects, revisions, jobs and editable exports.
- Walter owns rendering only and never becomes a project database.
- Offline copies are per computer, read-only and opt-in.
- The first slice stores the selected artwork for each opted-in project. It does not mirror every project asset, mask, logo or layout export.
- Deleting or replacing server data is outside this feature.
- Windows desktop packaging and multi-user sharing are outside this feature.

## Data and safety

The coordinator state response names roles and availability without returning private addresses, credentials or machine inventory. The native cache validates project identifiers and image hashes, limits stored artwork to 40 MiB, writes atomically and stays inside the application support directory. Removing an offline copy affects only that local cache.

## Acceptance

- Browser and Mac surfaces identify this computer, Dominic and Walter with understandable connected, unavailable, paused and rendering states.
- The browser panel works at 375 by 812 and 1440 by 900 without page overflow and remains keyboard accessible.
- A Mac user can keep the selected project offline, relaunch disconnected and see its stored project and artwork.
- A cached project refreshes after Dominic reconnects.
- Invalid identifiers, oversized media and interrupted writes do not replace a valid cache.
- Existing generation, comparison, native download and project APIs continue to work.
