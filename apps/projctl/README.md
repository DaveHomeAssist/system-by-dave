# projctl: Frozen at WST projector control

One relay, one web page, four projectors. Spec: Frozen at WST | Projector Control App Spec.

## Run

    npm install
    npm start            # real drivers, reads data/rig.json
    npm run sim          # simulator mode, no projectors needed, reads data/rig.sim.json

Open http://<relay-ip>:8080 on any phone or laptop on the same network.

Ports: 8080 HTTP and WebSocket, 9000 OSC (UDP), 9001 text cues (TCP), 4352 PJLink search (UDP, outbound).
Env overrides: PORT, OSC_PORT, TCP_PORT, POLL_MS, RIG.

## First run on the real rig

1. Setup tab: set each projector's driver (panasonic, pulse, or pjlink), MAC, and current IP. Save.
2. Rig tab: the tile goes live within 10 s once the relay can reach the projector.
3. Set the rig how you want it, Presets tab, name it, Save current rig.

With DHCP the relay re-finds projectors by MAC every 60 s using PJLink class 2 search. The Find projectors button does it on demand.

## Cues from Millumin or QLab

Send OSC to UDP 9000, or a text line to TCP 9001. Same addresses either way:

    /proj/P4/shutter 1          close P4 shutter (0 opens)
    /proj/P1/power 1            power on (0 off)
    /proj/P2/input 31           select input
    /proj/all/shutter 0         every projector
    /proj/preset/preshow        recall a saved preset

## Layout

    server/index.js        relay: HTTP, WS, polling, presets, lock, cue input
    server/store.js        data/rig.json read and write
    server/osc.js          OSC and TCP line parsing
    server/drivers/        base.js (interface), pjlink.js, panasonic.js, pulse.js, simulator.js
    public/                index.html, app.css, app.js

## Status of drivers

- pjlink: complete for power, shutter, input, status, light hours (where the projector answers LAMP).
- simulator: complete.
- pulse (Barco): power and shutter use commands confirmed by other operators. Input property name
  needs confirming in the projector's API console. Status property names are best guesses.
- panasonic: delegates to PJLink for now. Native 1024 protocol and lens commands are phase 3 and 5.
