# DepotOps v0.2.3 — Static Deploy Package

This folder is ready for a static deployment. No build step, backend, database, or environment variables are required.

## Files

- `index.html` — the complete DepotOps application.
- `icon.svg` — the browser and installable-app icon.
- `manifest.webmanifest` — basic installable-web-app metadata.
- `vercel.json` — optional Vercel static-host configuration.
- `netlify.toml` — optional Netlify static-host configuration.

## Deploy

### System by Dave

The canonical checked-in copy lives at `depotops/` in the System by Dave repository and is published by GitHub Pages at:

`https://systembydave.com/depotops/`

### Vercel
Create a new project from this folder/repository. Framework preset: **Other**. Build command: **none**. Output directory: **`.`**.

### Netlify
Deploy this folder directly. No build command is required.

### Any static web server
Serve this directory as the site root.

## Data behavior

DepotOps is local-first. Application state is stored in the browser under the `localStorage` key:

`depotops-v0.2-state`

Data does **not** automatically sync between browsers or devices. Use the application's JSON Export/Import controls when moving data between devices.

## GSAP

GSAP is loaded from cdnjs with `defer`, so the app shell and core functionality do not wait on the CDN before first paint. DepotOps already includes non-GSAP functional fallbacks if the library is unavailable.

## Important deployment note

Because data lives in browser `localStorage`, keep the same production origin/domain once you begin using the deployed copy. Changing domains or moving between `http` and `https` creates a different browser storage origin.
