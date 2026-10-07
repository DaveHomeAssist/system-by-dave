# Front Office first application slice

Date: 2026-10-07. Owner: Front Office application.

## Problem and outcome

A TD or owner needs a durable view of clients, venues, and jobs between shows. The existing Front Office concept lists per-show tools but does not retain a client or venue record. This slice makes the handoff from inquiry to advance, change tracking, signoff, and closeout usable without claiming to replace the specialist show tools.

## Flow and smallest useful slice

Create a client and venue, create a job linked to both, set its stage and next action, and record dated updates. Review jobs by stage and open the existing Show Advance, Change Order, Client Sign Off, and Show Handoff tools when detailed documents are needed. Export a JSON backup and preview an import before an explicit replacement. Existing specialist tool storage keys are untouched.

## Data, save, and boundaries

The application owns `sbd.frontOffice.document.v1` only. A versioned document stores clients, venues, jobs, and job updates. Save is explicit; unsaved work is never silently replaced by an import. An invalid or unreadable saved document blocks writes and offers export of its original bytes. Local storage is device-local, with no account, sync, quote math, rates, signatures, or cross-tool document migration. The next version can add lossless imports from specialist tools after their formats are separately mapped and tested.

## Dependencies, risks, and acceptance

The app is a standalone static route so the Rail owner can integrate `front-office/index.html` without shared-file conflicts. Its link targets are canonical registry routes. Acceptance requires durable save/reload, invalid-import recovery without loss of originals, keyboard use and responsive 390px and desktop presentation. Browser, deployment, and human acceptance are separate evidence lanes.
