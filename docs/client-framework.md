# Client platform framework (v1 specification)

System by Dave already publishes several sites from one source with release gates,
source records and data transfer (`docs/domain-sites.md`). This document defines the
layer above that pipeline: how a **client edition** such as FMP Video Operations is
described, what a **product** must declare, where real-world **profiles** live, and how
context moves between services. The goal is that adding a client means adding
configuration, never editing product source.

**Status:** specification only. Nothing in the build reads these files yet.
`scripts/domain-sites.json` remains the build's source of truth until a later change
migrates it with byte-identical output.

## Non-goals for v1

- **No multi-version serving per client.** The pipeline builds one version of each
  product. A client's version range is a CI check against that single build, not an
  instruction to build or serve an older version.
- **No per-user authentication or IAM.** Access is a tier per surface: `public`,
  `public-unlisted` or `private`. `private` is an edge gate (the Cloudflare Worker
  pattern in `DaveHomeAssist/fmp-house-video`), not per-user accounts or per-page roles.
- **No cross-domain transport of sensitive context.** Operator names, personal data and
  large payloads never travel in a URL.
- **No forced shell migration of legacy exports.** `fmp/` and `fmpwalk/` keep their
  exported chrome. Moving them onto the shared shell is `DaveHomeAssist/fmp-suite` work.
- **No build or behaviour change in the specification change.** It adds documents,
  schemas and one descriptive client manifest.

## The four layers

| Layer | Owns | Must not contain | Lives in |
| --- | --- | --- | --- |
| **Platform** | Shell contract, theme tokens, context, envelope, storage rules, access tiers, release gates | Any client or venue detail | `packages/` (planned), `schemas/`, `scripts/` |
| **Products** | A generic, versioned tool and its declared configuration surface | Client names, venue values, client-only code paths | `products/<id>/product.json`, source in place (`apps/<id>/`, root pages) |
| **Profiles** | Descriptions of real equipment, venues, positions and workflows, each value with evidence | Behaviour | `profiles/<kind>/<id>.json` (shared), `clients/<id>/profiles/<kind>/<id>.json` (client-owned) |
| **Client editions** | Brand, surfaces, tiers, enabled products, version ranges, product config, profile selections | Product source | `clients/<id>/client.json` |

Domain, product and client are separate ideas. `housevideo.app` is a surface of the FMP
client; the Camera Simulator is a product; FMP is a client edition that selects it.

### The rule

> **A client edition may configure a product but may not modify the product's source.**

If a client needs a new capability, the product gains it as a supported option in its
`configSchema`, and the client enables it. The rule is enforced by two checks (see
[Enforcement](#enforcement)): client identifiers may not appear in product source beyond a
shrinking baseline, and every client's `config` must validate against the product's schema.

## Client edition — `schemas/sbd.client.v1.json`

`clients/<id>/client.json` declares:

- **id and storagePrefix** — the client namespace. Every key a product writes for this
  client starts with `<storagePrefix>.` (FMP already uses `fmp`).
- **brand** — title, separator, colours, logo and `publisherCredit`. `none` is a
  white-label edition; FMP uses it because its publisher branding was struck deliberately
  (`docs/public-shell-contract.md`).
- **surfaces** — each domain with its tier and home, and while the migration is pending,
  the matching `domainSiteId` in `scripts/domain-sites.json`.
- **products** — enabled products keyed by id, each with `expectedVersionRange`, the
  surface and route it is served on, its `config` and its profile selections.
- **external** — managed exports owned by another repository (FMP's `fmp/` and
  `fmpwalk/` from `DaveHomeAssist/fmp-suite`). This repository never hand-edits them.

### Version ranges are gates, not builds

`expectedVersionRange` (for example `~1.7`) is **a CI validation gate against the single
built version**. The product's version comes from its release log (the camera-sim model:
`apps/fmp-camera-sim/CHANGELOG.md`, top entry). The release fails when the built version
falls outside a client's range. The client then either accepts the new version by
widening its range, or the product change waits. Clients never receive different builds
of the same product in v1.

`clients/fmp/client.json` is the first manifest. It lists only `camera-sim` as a product
because it is the only FMP product with a version source today.

## Product — `schemas/sbd.product.v1.json`

`products/<id>/product.json` is **the canonical declaration of a product**: id, name,
version source (its changelog), source kind (`native`, `app` or `external`), registry
fields (department, phases, tag), `configSchema`, accepted profile roles, owned storage
keys and supported continuity capabilities.

**`js/sbd-registry.js` becomes generated, non-authoritative output** of the product
manifests. Until the generator exists, the registry stays hand-maintained, and the first
product manifests must match their registry entries exactly (a check enforces this when
manifests land). After the generator lands, a hand edit to `js/sbd-registry.js` fails CI.

Every product will carry `product.json`, a release log, its config schema, and tests. The
Camera Simulator is the reference: release log, embedded version stamp, validated saved
data and a rebuild-and-compare gate.

## Profiles — `schemas/sbd.profile.v1.json`

Profiles quarantine real-world specifics so products stay generic.

```text
Camera Simulator (product)
  └─ position profile   fmp:position/cam4-catwalk@1   clients/fmp/profiles/position/cam4-catwalk.json
       ├─ camera        camera/birddog-p240@1         profiles/camera/birddog-p240.json
       └─ venue         fmp:venue/pavilion@1          clients/fmp/profiles/venue/pavilion.json
```

**Precedence and ownership are fixed, not resolved at run time:**

- **Shared equipment profiles** (camera, lens, controller, switcher, display) live in
  top-level `profiles/<kind>/<id>.json` with `owner: "shared"`.
- **Client profiles** (venue, position, workflow) live in
  `clients/<id>/profiles/<kind>/<id>.json` with `owner: "<client>"`.
- A client profile **references** shared profiles by ID through `extends`. It never copies
  their values. A shared profile may not reference a client profile.
- References pin a major version: `camera/birddog-p240@1` (shared) or
  `fmp:position/cam4-catwalk@1` (client-owned). A major bump means a value changed meaning
  or unit; correcting a value or its evidence is not a bump.

**Every value carries evidence.** Each leaf is `{ value, unit, evidence }`, and
`evidence.status` and `evidence.method` are required. The vocabulary is exactly the Camera
Simulator's (`apps/fmp-camera-sim/src/domain/evidence.ts`): statuses `measured`,
`confirmed`, `published`, `estimated`, `inferred`, `demo`, `uncalibrated`; methods
`unknown`, `assumption`, `photo`, `scaled-plan`, `staff-report`, `field-measurement`,
`manufacturer`, `operator`. Its venue records therefore migrate into profiles without
translation. Sources flagged `private` (for example venue photographs) publish only their
identifier.

## Context, envelope and storage — `schemas/sbd.context.v1.json`

Three separate contracts, so a product can adopt one without the others:

| Contract | Question | Definition |
| --- | --- | --- |
| **Context** (`$defs/context`) | What does the shared state mean? | `SBDContext`: client, session (show, venue, date, operator, phase, department), navigation (returnTo, previousProduct) |
| **Envelope** (`$defs/envelope`) | How does it move? | `sbd.envelope.v1`: transport, from/to product, session subset, target-shaped payload |
| **Storage** (`$defs/storageRecord`) | Where does it rest? | Namespaced keys, expiry for staged handoffs, non-destructive migration |

**Client identity is never taken from a URL.** `context.client` is injected from the build
of the serving surface. A product ignores any client value arriving in a URL, envelope or
storage record.

**Transport priority:**

1. **Same origin** — storage record (`<client>.handoff.<product>.v1`), consumed on read and
   expired after `expiresAt`. This is today's `js/sbd-handoff.js` behaviour with namespaced
   keys.
2. **Cross origin** — URL fragment `#sbd=<base64url(JSON)>`. The fragment never reaches a
   server, but it does stay in browser history, so it is **bounded**: encoded length at most
   **2048 bytes**, no `operator` field (the schema rejects it), and no payload containing
   personal data.
3. **Larger or sensitive** — the existing `transfer.html` flow or a file handoff.

`session` mirrors the existing `sbd*` URL parameters (`sbdShow`, `sbdVenue`, `sbdDate`,
`sbdOperator`, `sbdPhase`) so current links keep working. `navigation.returnTo` must be on
a surface listed in the active client manifest; anything else is dropped. Receivers decode
envelopes with the same validation as a file import and discard them on any failure.

## Shell — contract first, package second

The shell is **a contract before it is a UI**. It extends the five cues every public route
already owes (`docs/public-shell-contract.md`) with client identity. Products must not
re-implement these regions:

| Region | Source |
| --- | --- |
| Client identity and page title (`<product><separator><brand.title>`) | Client manifest |
| Product identity and version | Product manifest and release log |
| Breadcrumb and deterministic return path | Client surfaces and `context.navigation` |
| Show context display | `SBDContext.session` |
| Build and evidence stamp | `source.json`, product version stamp |
| Theme tokens (light and dark) | Brand plus platform CSS custom properties |
| Skip link, focus order, phone layout | `docs/public-shell-contract.md` |

**Delivery model: `sbd-shell` is a versioned package integrated into each product's own
build.** It is not a runtime host that loads products. Reasons from the current repos:

- The Camera Simulator ships a standalone offline HTML file and a strict CSP
  (`script-src 'self'`, `connect-src 'none'`, `worker-src 'none'`); a runtime loader would
  break the first and weaken the second.
- `fmp/` and `fmpwalk/` are exact-file managed exports from `DaveHomeAssist/fmp-suite`.
  Only a package that fmp-suite's exporter bundles can reach them. **Shell adoption for
  `fmp/` and `fmpwalk/` is `fmp-suite` scope**, not this repository's.
- Build-time staging to each domain already works; a package changes no deployment step.

Each product records the shell version it integrates (`shellVersion`), and the continuity
gate reports products that lag. A runtime host is reconsidered only if a client needs
products this pipeline does not build, or per-user sign-in arrives.

## Continuity gate

Continuity is measured per product, not reviewed by eye. Fourteen checks:

| # | Check | Passes when |
| --- | --- | --- |
| 1 | Identity | The product knows the active client from the build |
| 2 | Shell | It renders the shell regions from the package |
| 3 | Theme | It uses shared theme tokens only |
| 4 | Context | It reads and writes `SBDContext` |
| 5 | Handoff receive | It accepts the envelopes it declares in `supports.handoffReceive` |
| 6 | Cross-domain decode | Sample fragment envelopes decode, validate and apply in CI |
| 7 | Storage | Every key it writes is namespaced or listed as legacy |
| 8 | Version | It exposes its product version |
| 9 | Build stamp | It exposes the build and source stamp |
| 10 | Return path exists | A real-URL parent link is present |
| 11 | Return path keeps context | Following it preserves `SBDContext.session` |
| 12 | Access | Its visibility is inherited from the client surface |
| 13 | Deep links | Legitimate deep links and reloads restore the view |
| 14 | Phone | The shell remains usable at 390 × 613 |

The gate **ratchets rather than blocks**: each product's first score becomes its baseline,
a release fails only when a score drops, and a new product needs at least 12 of 14.

## Enforcement

Planned checks, each landing with the change that makes it meaningful:

1. **`verify:client-boundary`** — client identifiers and names (from every
   `clients/*/client.json`: id, name, brand title, surface domains) may not appear in
   product source. Existing hits, such as FMP venue defaults inside the Camera Simulator,
   form a baseline that may only shrink.
2. **Client config validation** — every client's `products.<id>.config` validates against
   that product's `configSchema`; profile references resolve and match the product's
   `profileRoles`.
3. **Version gate** — every product's built version satisfies every client's
   `expectedVersionRange`.
4. **Manifest parity** — while `scripts/domain-sites.json` drives the build, each client
   manifest's surfaces must describe exactly what that file publishes.
5. **Registry parity, then generation** — product manifests match `js/sbd-registry.js`, and
   later the registry is generated from them.

## Sequence

| Phase | Deliver | Do not do yet |
| --- | --- | --- |
| 1. Contract | This document, the four schemas, `clients/fmp/client.json` (descriptive) | Wire anything into the build |
| 2. Reference product | `products/camera-sim/product.json`, `profiles/camera/birddog-p240.json`, FMP position and venue profiles from current defaults, checks 1–2 | Change camera-sim behaviour |
| 3. Manifest parity | Check 4; `clients/sbd/client.json` for systembydave.com and avbydave.com | Switch the build input |
| 4. Build switch | Stage domain sites from client manifests with byte-identical output | Restyle anything |
| 5. Context | Namespaced storage, envelope encode/decode, cross-domain decode gate | Accounts or backend |
| 6. Shell | `packages/sbd-shell` v0 on camera-sim and one AV tool; fmp-suite adopts it separately | Big-bang migration |
| 7. Access | Generic private-surface edge gate; FMP House Video as a private surface | Per-user IAM |
| 8. Client B | A test client built from existing products and profiles with no product source change | Production use |

**Framework v1 is done when** a new `clients/<id>/` folder, its DNS and a deploy key are
enough to publish an edition, with no change to any product's source, and every page it
serves shows that client's shell.
