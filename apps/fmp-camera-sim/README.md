# FMP Camera Simulator (source)

A virtual BirdDog P240 at the FMP catwalk position, published at
https://housevideo.app/camera-sim/. This folder is the React, TypeScript and Three.js source;
`camera-sim/` at the repository root is its committed build and must match it.

- Product, architecture, evidence, gates and operations: `docs/fmp-camera-simulator.md`
- Release log (its top entry is the running version): `CHANGELOG.md`
- Hosting header plan: `EDGE-HEADERS.md`

```bash
npm run dev:camera-sim
npm run typecheck:camera-sim && npm run test:camera-sim
npm run build:camera-sim            # then commit camera-sim/ with the source
npm run test:camera-sim-browser     # Playwright acceptance probe
npm run verify:camera-sim-release -- --base origin/main
```

Every change to `camera-sim/` needs a new entry at the top of `CHANGELOG.md`.
