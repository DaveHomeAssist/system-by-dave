# Portfolio Product Roadmap

**Snapshot:** 2026-08-10

**Products:** Frontier Signals, Frontier Signals data lab, Hat in Ring, CurlPlan, and Phillies Wire

**Target horizon:** 12 months

**Status:** Green in the tested browser scope — the 2026-08-12 Now engineering package is deployed, all six WCAG A/AA release blockers and the remaining CurlPlan 44px hardening issue are closed, and their affected production checks pass.

## Executive direction

The portfolio should not be consolidated into one framework, visual system, or account platform. Each product has a distinct job:

- **Frontier Signals** is an editorial intelligence publication. Grow its content system, provenance, and discovery surface rather than redesigning it.
- **Frontier Signals data lab** is a source and QA workspace. Keep it visibly separate from the publication and intentionally non-indexed.
- **Hat in Ring** is a political intelligence and evidence product. Corrections, traceability, and human review must precede aggressive distribution growth.
- **CurlPlan** is a native operational app. Reconcile its divergent implementation lines before adding production accounts, synchronization, or social features.
- **Phillies Wire** is an automated sports briefing utility. Improve factual reliability, mobile stability, and game flow before adding more dashboards.

Standardize release controls, accessibility gates, structured logs, security automation, and documentation. Preserve each product's brand and appropriate architecture.

## Measured baseline

The following are one-run mobile Lighthouse measurements, not field Core Web Vitals:

| Product | Performance | Accessibility | Best practices | SEO | LCP | CLS | Decisive finding |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Frontier Signals | 99 | 100 | 100 | 100 | 0.9 s | 0 | Excellent technical foundation |
| Frontier data lab | 78 | 100 | 100 | 69 | 4.3 s | 0 | Heavy hero; SEO score reflects intentional `noindex` |
| Hat in Ring | 94 | 100 | 100 | 100 | 2.2 s | 0.005 | Oversized portraits and runtime weight |
| CurlPlan | 87 | 100 | 100 | 100 | 3.1 s | 0.031 | Fonts and a demo-first landing delay product value |
| Phillies Wire | 82 | 100 | 100 | 100 | 2.5 s | 0.271 | Font-driven layout shift is the largest web defect |

Automated accessibility scores are a useful regression signal, not WCAG certification. The 2026-08-12 browser QA matrix now covers full keyboard traversal, representative journeys, 200% reflow, WCAG text spacing, contrast, target size, responsive screenshots, semantics, and reduced motion. Screen-reader testing is excluded from the current portfolio gate.

The 2026-08-13 remediation reruns closed and production-verified CurlPlan #8 and #9, Hat in Ring #4–#7, and Frontier Signals #2. The release gate and broader portfolio target baseline are Green within those re-tested browser-observable checks.

## Portfolio priorities

1. **P0: reconcile CurlPlan's divergent main and account-feature work.** This blocks reliable account, sync, native-release, and social development.
2. **P0: establish evidence contracts for Frontier Signals and Hat in Ring.** Automated scale must not outrun provenance, corrections, or human review.
3. **Ship the measurable web quick wins.** Fix Phillies CLS, Frontier lab LCP, Hat image delivery, and CurlPlan font/landing performance.
4. **Do not add public authentication to editorial products.** CurlPlan is the only product that presently justifies user identity and private data infrastructure.
5. **Adopt one release and observability contract.** Every run must be attributable to a product, commit, workflow, input set, output set, and status.

## Product audits

### Frontier Signals and data lab

#### Feature upgrades

Prioritize stable topic and desk pages, searchable archives, visible source freshness, related coverage, filtered RSS, and locally saved watchlists. The limiting factor is editorial scale and discovery, not missing social features. Do not introduce accounts, comments, or a public feed.

The data lab should add a normalized signal schema, per-source freshness, collection-error visibility, a QA queue, a data dictionary, and a deterministic promotion manifest for material sent to the canonical publication.

#### User interface and experience

Preserve the publication's restrained editorial hierarchy. Expand mobile hit areas to at least 44 by 44 CSS pixels, make source verification easier to locate, add consistent related-content exits, and verify logical keyboard order.

Make the lab operate like a QA surface: source status, retrieval time, confidence, normalization state, errors, and promotion status should be more prominent than magazine-style presentation.

#### Aesthetics

No canonical redesign is warranted. Typography, dark palette, spacing, and editorial restraint are coherent. Differentiate the lab with operational status tokens, restrained monospace accents, denser provenance blocks, and less hero emphasis.

#### Screen flow

Canonical flow:

`Home → desk or topic → signal → evidence and verification → related signal or briefing → RSS or follow topic`

Lab flow:

`Lab status → source or desk → collected item → normalized record → QA decision → canonical publication handoff`

The lab must not become a competing editorial archive.

#### Security and compliance

No public authentication is needed. Continue sanitizing Markdown and remote content. Add source-origin allowlists, timeouts, response-size limits, schema validation, secret scanning, dependency auditing, CodeQL, and release SBOM generation. Public output must exclude credentials, private reviewer notes, unpublished content, and unnecessary personal data.

GDPR controls are needed only where newsletter or analytics systems process personal data: document processors, consent, lawful basis, retention, export, and deletion. SOC 2 certification is not proportionate without an institutional requirement.

#### SEO

Add `Article` or `NewsArticle` structured data, breadcrumbs, stable topic hubs, stronger internal links, review/update signals, and Search Console monitoring. Content cadence is the primary growth lever.

The data lab must remain `noindex`, outside the canonical sitemap, and visibly subordinate to the publication. Its lower Lighthouse SEO score is therefore expected.

#### Performance and scalability

The canonical site has ample static-hosting headroom. For the lab, convert the oversized hero to responsive AVIF/WebP, add `srcset`, and remove or defer nonessential CDN animation. Target LCP at or below 2.5 seconds.

No database optimization is currently required. Reassess build and sitemap strategy only after archive size becomes material.

#### Developer experience and technical debt

Version the shared signal schema and add collector-to-publication contract tests. Pin the Python runtime, provide one bootstrap/test command, add fixture-driven parser tests, verify deploy allowlists, and generate a collection/publication manifest for every run.

### Hat in Ring

#### Feature upgrades

Sequence the next capabilities as corrections workflow, dated change archive, per-component provenance, multi-source corroboration, high-impact human review, and a versioned open dataset. A remote review console is optional and should follow a proven editorial workflow. General-public accounts are not justified.

#### User interface and experience

Desktop presentation is strong but dense. On mobile, default to top-mover and candidate-summary cards. Keep the full comparison table as an expert view. Make “why this score changed,” freshness, methodology, and correction routes available in one tap.

#### Aesthetics

Retain the cream, navy, and red editorial system. Reduce competing emphasis, standardize party/status/confidence/movement colors, pair icons with labels, and keep data-table density distinct from long-form editorial spacing.

#### Screen flow

Public flow:

`Field overview → top mover or candidate → candidate dossier → score components → evidence → methodology or correction`

Internal flow:

`New evidence → automated classification → review queue → reviewer decision → publish → audit record`

Keep internal review state out of the public interface and artifacts.

#### Security and compliance

The public site needs no authentication. A future remote review console requires managed identity, MFA, role-based authorization, CSRF protection, rate limiting, revocable sessions, least-privilege source access, and immutable decision logs.

Reduce inline runtime JavaScript so a stricter Content Security Policy becomes practical. Treat source integrity, neutral classification, corrections, evidence retention, and human approval for high-impact changes as security controls.

#### SEO

Add dated change archives, deeper methodology pages, dataset documentation, breadcrumbs, and semantically valid `Dataset`, `Article`, and `Person` data. Connect candidates, daily changes, evidence, methodology, and corrections with durable internal links.

#### Performance and scalability

Generate thumbnail variants instead of serving full portraits in small placements. Use AVIF/WebP, `srcset`, and intrinsic dimensions. Reduce blocking font and React work. Candidate count is not an infrastructure challenge; source reliability and deterministic builds are the scaling concerns.

#### Developer experience and technical debt

Add Python dependency auditing, classification/source fixtures, versioned scoring schemas, reproducible review-decision import, and release manifests containing source revisions and scoring inputs. Keep corrections, scoring changes, and editorial changes separate in changelogs.

### CurlPlan

#### Feature upgrades

The current main and account-feature work have substantial independent and overlapping changes. Reconcile them on an integration branch before further development.

After reconciliation, sequence the product as:

1. Stable local season and scoring experience.
2. Managed identity and account recovery.
3. Multi-device synchronization and conflict handling.
4. Public identity controls.
5. Shared teams, events, and seasons.
6. Relationship graph.
7. Limited social interactions.
8. Moderation and trust-and-safety expansion.

Do not productionize a bespoke password authority. Preserve useful service contracts but use a managed standards-based identity provider or platform identity.

#### User interface and experience

Separate the public web surface into a marketing route and an explicitly labeled sample-data demo. Make the native app the authoritative operational surface. Account creation must never block local scoring.

Expose offline/sync state in plain language, retain reachable recovery/export/deletion paths, and never claim cloud truth unless verified against the backend. Fix the web H1, font delivery, and undersized controls.

#### Aesthetics

Retain the ice, stone, sky, granite, gold, and leaf language. Create one versioned source for semantic colors, type roles, spacing, radii, shadows, motion, and icon rules across marketing, demo, and native surfaces.

#### Screen flow

Public flow:

`Landing → product proof → demo or App Store → privacy or help`

Native flow:

`Onboarding → local season → spiel → game → end-by-end score → confirmed result → standings`

Optional account flow:

`Settings → create or sign in → verify device → initial sync → sync status → export or delete`

Shared-object flow:

`Owner creates object → invites member → member accepts → explicit role → offline-safe updates → conflict resolution`

#### Security and compliance

Use managed authentication, authorization checks on every private object, TLS, Keychain storage, managed encryption at rest, revocable sessions, rate limits, export/deletion, and audited account/sharing/recovery events. Never trust client-provided owner identifiers.

Index account, season, version, membership, and change-feed keys. Enforce unique membership edges, paginate change feeds, use optimistic concurrency, test backups, and define deletion propagation.

Complete GDPR data inventory, minimization, retention, export, deletion, processor, privacy, and breach controls before public accounts. Keep SOC 2 evidence-ready but delay certification until a commercial requirement exists. Trust and safety blocks public comments, messaging, or discovery.

#### SEO

SEO applies to marketing and help content, not the native application. Add `SoftwareApplication` or `MobileApplication` structured data, authoritative App Store links, indexable help pages, meaningful screenshot text, and canonical separation between marketing and demo routes.

#### Performance and scalability

Self-host or subset fonts, reduce render blocking, and prioritize the product message to bring web LCP to 2.5 seconds or less.

Build synchronization around delta changes, idempotency, explicit versions, rate limits, retry jitter, backpressure, conflict metrics, and feature flags rather than full-season replacement.

#### Developer experience and technical debt

Create an integration branch from current main and reapply feature work in semantic slices. Run web verification, backend verification, Swift tests, simulator builds, migration tests, and recovery-flow tests after each slice. Do not wholesale-merge the divergent branch.

Standardize Swift scratch/build paths to avoid stale absolute module caches. Consolidate roadmap claims and feature-review matrices into enforceable release gates.

### Phillies Wire

#### Feature upgrades

Prioritize bullpen availability, a stable alternate injury source, complete play-by-play/innings data, explicit game freshness, better mobile summaries, effective preferences, delivery trends, and then optional alerts. Do not add another dashboard until the latest briefing, Game Center, innings, schedule, archive, and accuracy surfaces form one coherent product.

#### User interface and experience

Replace mobile dependence on a horizontally scrolling primary navigation with a priority row plus a clear overflow destination. Increase RSS, theme, and status hit areas; default to a concise game synopsis; keep live state next to the score; retain a visible but noninterruptive subscription path; and respect reduced motion.

#### Aesthetics

Retain the Liberty Bell and broadsheet identity. Reduce competing pills, stabilize font metrics, standardize game-state and editorial labels, add breathing room between major blocks, and allow schedules/statistics to use wider responsive containers than long-form editorial copy.

#### Screen flow

Primary flow:

`Latest briefing → game synopsis → innings or play-by-play → schedule or archive → subscribe`

Accountability flow:

`Latest briefing → source or accuracy note → accuracy dashboard → methodology`

Treat the dashboard as a Game Center, not a parallel home page.

#### Security and compliance

No application authentication is needed. Keep subscriber identity with the email provider. Use minimal-scope credentials, environment-only secrets, upstream-content escaping, response validation, locked dependencies, dependency/secret scanning, and preview-only email generation before delivery. Never place subscriber addresses in logs or artifacts.

GDPR obligations cover consent, unsubscribe, processor disclosure, retention, and deletion. SOC 2 is not currently proportionate.

#### SEO

Add `NewsArticle`, `SportsEvent`, and breadcrumb data where valid. Build archive and series links around meaningful original content, monitor Search Console, paginate archives cleanly, and prevent thin generated pages from being indexed.

#### Performance and scalability

Font-driven CLS is the first frontend defect to fix. Self-host or preload fonts carefully, use metric overrides such as `size-adjust`, reserve dimensions, inline only critical CSS, and defer the remainder. Cache upstream responses within each run and make scheduled execution state-aware.

Static hosting has adequate headroom. Split sitemaps only when archive size warrants it.

#### Developer experience and technical debt

Make standalone verification hermetic with committed fixtures or a fixture mode. Document generated-artifact preconditions, add Playwright smoke coverage for live/final/postponed/off-day states, store upstream schema fixtures, add delivery dry runs, and measure run duration, API errors, publication changes, and delivery state.

## Phased roadmap

Owner types: **PO** product owner, **FE** frontend/design systems, **iOS**, **BE/Sec** backend/security, **Data**, **Editorial**, **QA/A11y**, and **DevOps**. One person may hold several roles, but each initiative requires one accountable owner.

### Now: 0–4 weeks

| Initiative | Priority | Owner | Success metric | Dependencies |
| --- | --- | --- | --- | --- |
| Reconcile CurlPlan main and account-feature work through an integration branch | **P0 blocker**, high impact/high effort | Tech lead, iOS, BE | One reviewed integration head; all web, Swift, backend, simulator, migration, and recovery checks pass | None |
| Fix Phillies font CLS and critical CSS | **Quick win**, high/medium | FE | Mobile CLS at or below 0.10 and performance at or above 90 | None |
| Optimize Frontier lab hero and blocking animation | **Quick win**, high/low | FE | Mobile LCP at or below 2.5 seconds and performance at or above 90 | None |
| Generate Hat candidate thumbnails and responsive images | **Quick win**, high/low | FE, Data | At least 80% less candidate-image transfer on mobile | Image build pipeline |
| Improve CurlPlan web H1, fonts, product CTA, and hit areas | **Quick win**, medium/low | FE | LCP at or below 2.5 seconds; core targets at least 44 px | None |
| Run a WCAG 2.2 AA browser QA matrix | High/medium | QA/A11y | Keyboard, semantics, 200% reflow, text spacing, contrast, targets, responsive visuals, and motion pass or have owned defects | Stable test URLs |
| Add shared dependency, secret, and source-integrity scanning | High/medium | DevOps, Sec | Zero unresolved critical/high findings; scheduled scans in every repo | None |
| Define signal, evidence, and release schemas | **Automation blocker**, high/medium | Data, Editorial | Versioned schemas with contract tests | Editorial decisions |
| Initialize missing changelogs and release templates | **Quick win**, medium/low | PO, DevOps | Every repo produces tag-linked changelogs and proof-based releases | None |

#### Now execution record — 2026-08-12

| Initiative | Result | Production evidence |
| --- | --- | --- |
| CurlPlan branch reconciliation | **Complete** | PR [DaveHomeAssist/curl-plan#4](https://github.com/DaveHomeAssist/curl-plan/pull/4) merged as `a3b97f8`; web, iOS simulator, security, and Pages checks passed. Development credential auth remains explicitly non-production. |
| Phillies Wire critical rendering | **Complete** | `d7f6c419` shipped through Publish run `31578708448`; the subsequent generated snapshot is `71e7666f`. Live delivery uses one `site.css`. Lighthouse: performance 96, accessibility 100, best practices 100, SEO 100, CLS 0.02. |
| Frontier data-lab hero and blocking dependencies | **Complete** | `dc3ed09` passed security and Pages deployment. Lighthouse: performance 98, accessibility 100, best practices 100, LCP 2.3 seconds, CLS 0. The SEO score remains 69 because the lab is intentionally `noindex`. |
| Hat in Ring responsive portraits | **Complete** | `d6a0061` passed 207 tests, security, and Pages deployment. The 40-file 96px set is 97.0% smaller than the original portrait set; the 192px set is 92.3% smaller. |
| CurlPlan web quick win | **Complete** | Live preview self-hosts fonts, has one H1, no unbacked social action hooks, explicit sample-location language, 44px targets, and reduced-motion handling. Lighthouse: performance 99 and all other category scores 100; LCP 1.8 seconds, CLS 0. |
| Shared security baseline | **Complete** | All five repositories have pinned Trivy dependency/secret/misconfiguration scans, weekly Dependabot configuration, vulnerability alerts, and automated security fixes. All initial repository scans passed after the CurlPlan container was moved to a non-root user. |
| Evidence and logging contracts | **Complete** | Versioned signal, evidence, release-manifest, and run-event schemas plus executable examples are in `schemas/`. `docs/portfolio-observability-standard.md` selects JSON Lines, GitHub Actions logs/artifacts, a shared correlation ID, and a vendor-neutral OpenTelemetry export path. |
| Changelogs and release templates | **Complete** | Every repository now has a changelog and proof-based release checklist; CurlPlan and the three public performance changes also have dated press-release drafts. |
| WCAG 2.2 AA baseline | **Complete; Green in tested scope** | `reports/portfolio-accessibility-remediation-2026-08-13.md` records deployed commits, CI/security/Pages provenance, issue closures, and production reruns for all six release blockers plus CurlPlan #9. |

The original Now engineering package remains deployed. The accessibility release gate and broader portfolio target baseline are Green in the re-tested browser scope. Managed production identity and public social authority remain separate future gates.

### Near term: 1–3 months

| Initiative | Owner | Success metric | Dependencies |
| --- | --- | --- | --- |
| CurlPlan managed identity foundation | BE/Sec, iOS | Sign in/out, revoke, restore, export, and delete pass end-to-end tests | Curl integration resolved |
| CurlPlan synchronization and conflict model | BE, iOS | 99.9% successful test sync; zero silent data loss; conflicts observable | Managed identity and versioned storage |
| Frontier topic archive, search, related content, and cadence | Editorial, FE | At least two quality signals per week; growing indexed topic coverage | Taxonomy and schema |
| Frontier lab QA queue and canonical promotion manifest | Data, Editorial | Every published signal carries source, time, hash, freshness, and review state | Shared schema |
| Hat corrections workflow and dated archive | Editorial, Data | Corrections acknowledged within 24 hours; material changes traceable | Evidence schema |
| Phillies Game Center and bullpen/injury reliability | PO, Data, FE | Alternate-source coverage; zero critical factual regressions | Stable feed contracts |
| Central run ledger and structured logs | DevOps | Every scheduled/build/deploy run searchable by product, commit, run ID, status, and error code | Logging schema |

### Mid term: 3–6 months

| Initiative | Owner | Success metric | Dependencies |
| --- | --- | --- | --- |
| CurlPlan multi-device beta and App Store gate | iOS, BE/Sec, QA | Cross-device recovery passes; crash-free sessions at or above 99.5%; privacy metadata complete | Identity and sync |
| Phillies innings/play-by-play and meaningful preferences | Data, FE | Live/final/off-day E2E states pass; preferences change output predictably | Feed fixtures and Game Center |
| Hat component provenance and versioned open dataset | Data, Editorial | Every score component is explainable; dataset compatibility checks pass | Corrections/evidence workflow |
| Frontier local watchlists and filtered RSS | FE, Editorial | Repeat readership increases without collecting account data | Stable taxonomy |
| Reduce runtime JavaScript across static products | FE, Sec | Stricter CSP, less blocking script, no progressive-enhancement regression | Updated UI flows |
| Portfolio release verification suite | QA, DevOps | Core journeys smoke-tested before deploy; rollback artifact attached | Standard manifests |

### Long term: 6–12 months

| Initiative | Owner | Success metric | Dependencies |
| --- | --- | --- | --- |
| CurlPlan shared seasons, teams, and events | PO, BE, iOS | Authorization matrix passes; invitations and conflicts remain within targets | Stable sync and roles |
| CurlPlan limited public identity and relationships | PO, Trust/Safety, Sec | Reporting, blocking, moderation, privacy, and deletion operational before launch | Trust-and-safety capacity |
| Hat remote review console, only if local review stops scaling | BE/Sec, Editorial | MFA, RBAC, and immutable audit records; no public/admin boundary failures | Proven review workflow |
| Hosting migration only where stronger headers/services justify it | DevOps | A measurable security or operating benefit | Documented current-host limitation |
| SOC 2 readiness or certification | Sec, Operations | Pursue only with a buyer, partner, or contractual requirement | Stable production controls |

## Central logs and standard format

Use a two-stage model rather than introducing a high-volume platform prematurely:

1. Keep GitHub Actions as the authoritative raw execution log.
2. Emit a compact NDJSON manifest from every build, collection, publication, delivery, verification, and deployment.
3. Upload manifests as workflow artifacts and index their summaries in a private portfolio operations repository.
4. When CurlPlan operates a continuous backend, forward structured application events through an OpenTelemetry-compatible collector to one central log backend.
5. Keep client crashes and browser exceptions separate from pipeline and audit logs.

Canonical event shape:

```json
{
  "ts": "2026-08-10T15:04:05Z",
  "level": "info",
  "service": "phillies-wire",
  "env": "production",
  "event": "publish.complete",
  "run_id": "31453696696",
  "commit_sha": "285b615",
  "duration_ms": 18420,
  "records_in": 42,
  "records_out": 40,
  "status": "ok",
  "error_code": null,
  "pii_class": "none",
  "schema_version": "1.0"
}
```

Never log secrets, subscriber addresses, session tokens, raw account data, or unpublished political review notes.

## Portfolio release gates

- Mobile LCP at or below 2.5 seconds, CLS at or below 0.10, and INP at or below 200 ms at p75 once real-user monitoring exists.
- Automated accessibility remains green and the core journey passes a manual WCAG 2.2 AA checklist.
- No unresolved critical or high dependency/security findings.
- No accidental `noindex`, canonical conflict, sitemap omission, or indexed lab/internal page.
- Every release manifest links commit, tests, build, deployment, and live smoke evidence.
- Changelog and press claims match deployed functionality.
- Editorial/data products retain source, retrieval time, freshness, review, and correction provenance.
- CurlPlan account claims are proven against the real backend and never inferred from local UI state.

## High-complexity risks

| Risk | Mitigation |
| --- | --- |
| CurlPlan semantic conflicts or data loss during integration | Slice-by-slice integration, migration fixtures, dual-read where necessary, feature flags, and rollback tags |
| CurlPlan identity scope expanding into an unfinished social platform | Managed identity first, explicit phase gates, and no public social launch before moderation/deletion are operational |
| Hat political classification error or reputational harm | Human approval for high-impact changes, evidence hashes, neutrality tests, visible corrections, and retained sources |
| Phillies upstream API drift or contradictory game states | Fixture corpus, alternate source, schema alarms, circuit breakers, and explicit stale/unverified states |
| Frontier lab becoming accidentally indexable or authoritative | Deploy allowlist, `noindex` verifier, sitemap exclusion, lab branding, and canonical promotion manifests |
| Solo-maintainer operational overload | Shared release commands, deterministic fixtures, structured run summaries, and automated audits |
| Overengineering static products | Retain static/no-auth architecture until a measurable requirement proves otherwise |

## Completion sequence

1. Resolve the CurlPlan integration blocker.
2. Ship the four measurable web-performance quick wins.
3. Establish manual accessibility and security baselines.
4. Land evidence and release schemas.
5. Build identity/sync, editorial discovery, corrections, and Game Center work only on those foundations.
