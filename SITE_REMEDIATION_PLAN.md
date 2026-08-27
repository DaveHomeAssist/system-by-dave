# System by Dave Site Remediation Plan

**Source audit:** [SITE_INCONSISTENCY_AUDIT.md](SITE_INCONSISTENCY_AUDIT.md)

**Plan date:** August 26, 2026

**Target state:** The public site presents one accurate product story, routes every commercial action to a valid destination, applies a predictable navigation and accessibility contract, and prevents known content drift through automated verification.

## 1. Boundary

### In scope

- Public System by Dave pages and applications listed in the live sitemap.
- Cross-site claims and links that send users to Prompt Lab, Notion Widgets, Digital Footprints, GitHub, or another public destination.
- Product naming, counts, navigation, accessibility, privacy wording, security metadata, resume routing, and release verification.
- Small verification scripts and CI additions that prevent the audited inconsistencies from returning.

### Out of scope

- Rebuilding Prompt Lab functionality.
- Creating a new checkout, payment, account, or analytics platform.
- Broad visual redesigns of AV applications or standalone products.
- Private Notion, house, homelab, or unpublished project data.
- Changing a product’s commercial status without a documented product-owner decision.

### Consumers

- Live-show operators entering through AV Suite.
- Notion users evaluating agents, skills, widgets, and prompts.
- Prompt Lab users comparing free and Pro capabilities.
- AV clients, recruiters, collaborators, and hiring managers.
- Maintainers publishing through GitHub Pages.

## 2. Operating decisions

These decisions must be recorded before the related work package is implemented.

| Decision | Recommended default | Why |
| --- | --- | --- |
| Agent commercial state | Remove purchase-style pricing and use an honest “Details” or “Contact” action until real agent destinations exist. | Prevents a broken paid conversion path without inventing a checkout flow. |
| Digital Footprints destination | Replace unresolved links with Profile or email unless DNS and the live destination are restored first. | Keeps every public call to action functional. |
| Font strategy | Self-host the three remaining Google Font families. | Matches the existing privacy promise and improves offline consistency. |
| Resume architecture | Keep `/resume/` as the systems resume and expose both resume choices from Profile. | Preserves existing canonical URLs and gives each audience an explicit path. |
| Davai naming | Display “Davai — System by Dave Memory Architecture” everywhere it is listed. | Preserves the product name while explaining its relationship to the site. |
| Prompt Lab authority | Treat current `promptlab.tools` product and privacy copy as canonical for pricing, sign-in, proxy, and feature claims. | Prevents System by Dave from becoming a stale second source of truth. |

## 3. System components

| Component | Single responsibility | Inputs | Outputs | Owner |
| --- | --- | --- | --- | --- |
| Public product copy | Describe each product accurately. | Canonical product facts and decisions. | Homepage, product, directory, and policy language. | Product owner |
| Product routes | Send each action to a valid, specific destination. | Route registry and commercial state. | Internal and external links. | Site maintainer |
| Public shell | Preserve location and a reliable return path. | Route family and current page. | Full header, breadcrumb, or AV tool navigation. | Site maintainer |
| Accessibility contract | Provide keyboard and assistive-technology entry points. | Page landmarks and application workspace. | Skip links, focus targets, labels, and status behavior. | Frontend QA |
| Metadata contract | Publish consistent security and social metadata. | Canonical URL and page description. | CSP, canonical, Open Graph, and Twitter tags. | Site maintainer |
| Content registry | Hold canonical counts and public product names. | AV registry and naming decisions. | Generated or verified display values. | Site maintainer |
| Verification suite | Detect drift before deployment. | Source files, sitemap, route registry, and allowlists. | Pass/fail release evidence. | CI |
| Pages workflow | Publish a verified static artifact. | Current `main`. | Live systembydave.com deployment. | GitHub Actions |

## 4. Delivery flow

```text
[Current origin/main]
        ↓
[Isolated clean worktree]
        ↓
[One bounded work package]
        ↓
[Targeted checks + full release suite]
        ↓
[Commit and push]
        ↓
[Merge to main]
        ↓
[GitHub Pages deployment]
        ↓
[Live HTTP + rendered-browser verification]
        ↓
[Audit readback and package closure]
```

Each phase is independently releasable. Do not combine trust-copy, routing, shell, and application changes into one large deployment.

## 5. Work packages

### Phase 0 — Establish the baseline

**Goal:** Begin from current production authority without disturbing the divergent iCloud feature branch or unrelated user work.

#### SBD-R00 — Create an isolated implementation worktree

**Actions**

- Fetch current `origin/main` from the authoritative repository.
- Create a clean temporary worktree from that exact commit.
- Record the starting commit, sitemap route count, AV registry count, current Pages run, and live route checks.
- Preserve the existing iCloud checkout unchanged except for the plan documents already requested.

**Acceptance criteria**

- The worktree has no pre-existing modifications.
- `origin/main`, the planned base commit, and live Pages provenance are recorded separately.
- The baseline confirms 81 sitemap routes and 44 AV registry entries or records the new current values.

**Dependency:** None.

---

### Phase 1 — Repair trust and conversion paths

**Goal:** Remove claims and actions that are currently misleading or nonfunctional.

#### SBD-R01 — Align Prompt Lab claims

**Surfaces**

- Homepage.
- Tools directory.
- Prompt Lab product page.
- Any footer or card repeating subscription, sign-in, proxy, privacy, or A/B Compare claims.

**Actions**

- Replace blanket “no subscriptions” language with product-specific language.
- State that the hosted Prompt Lab app currently requires sign-in.
- Separate browser-local storage claims from hosted proxy behavior.
- Label A/B Compare as Pro wherever feature access is described.
- Keep extension, hosted web, and source-build claims distinct.

**Acceptance criteria**

- System by Dave and `promptlab.tools` agree on pricing, sign-in, proxy behavior, storage, and A/B Compare access.
- No System by Dave page contains an unqualified “nothing is proxied,” “no signup gate,” or “no subscriptions” claim.
- Every Prompt Lab call to action accurately names its destination: product page, app, setup guide, or privacy policy.

**Dependency:** Prompt Lab authority decision.

#### SBD-R02 — Replace generic paid-agent redirects

**Surfaces**

- Notion overview.
- Agents catalog.

**Actions**

- Apply the recorded agent commercial-state decision.
- Give each agent a distinct internal detail target or truthful contact action.
- Remove `promptlab.tools/?agent=...` links unless Prompt Lab implements and verifies those destinations.
- Preserve the working `agents.html#agent-id` deep links.

**Acceptance criteria**

- Every agent card has a distinct, relevant destination.
- No paid-looking action lands on a generic unrelated product page.
- Prices appear only when a real fulfillment path exists.
- All four destinations return HTTP 200 and visibly identify the selected agent.

**Dependency:** Agent commercial-state decision.

#### SBD-R03 — Repair the Production Work destination

**Surfaces**

- Systems resume hero.
- Systems resume closing call to action.
- Systems resume footer and structured data.

**Actions**

- Restore and verify `digitalfootprints.live`, or replace it with the selected working destination.
- Remove the unresolved domain from structured data if it remains unavailable.

**Acceptance criteria**

- Every Production Work link resolves and renders the intended content.
- The live destination has valid DNS, HTTPS, and a page title matching the action.
- No structured-data `sameAs` value points to an unavailable domain.

**Dependency:** Digital Footprints destination decision.

**Phase 1 release gate:** R01, R02, and R03 may ship as separate commits, but each must pass the full deployment workflow and live readback before Phase 2 begins.

---

### Phase 2 — Align privacy and personal routing

**Goal:** Make policy statements and audience paths match actual implementation.

#### SBD-R04 — Remove font-policy drift

**Surfaces**

- Profile.
- AV Resume.
- PixelForge.
- Privacy policy.

**Actions**

- Self-host the remaining fonts using the site’s existing font patterns.
- Remove Google Fonts stylesheets, preconnects, and CSP allowances after local fonts are verified.
- If self-hosting is rejected, update the privacy policy with the exact third-party request behavior instead.

**Acceptance criteria**

- The selected font policy and network behavior match.
- No Google Fonts request occurs when the self-hosting default is selected.
- Pages preserve readable fallbacks if a font asset fails.
- CSP font and style directives match the final implementation.

**Dependency:** Font-strategy decision.

#### SBD-R05 — Correct widget privacy wording

**Actions**

- Replace the statement that the Widgets page embeds live demos.
- Describe the current outbound links and the external Notion Widget host.
- Confirm every external widget link uses `target="_blank"` and `rel="noopener noreferrer"`.

**Acceptance criteria**

- Policy copy matches the actual lack or presence of iframes.
- The Widgets page and policy name the same external host behavior.

**Dependency:** None.

#### SBD-R06 — Expose both resume audiences

**Surfaces**

- Profile.
- Systems Resume.
- AV Resume.

**Actions**

- Add explicit “AV Resume” and “Systems Resume” choices to Profile.
- Cross-link the two resumes with audience-specific language.
- Preserve `/resume/` and `/resume/av/` canonical URLs.
- Keep the AV resume as the primary production-contact action.

**Acceptance criteria**

- A user can reach either resume from Profile in one action.
- Each resume identifies its intended audience before the first major scroll.
- Canonical tags, titles, PDFs, and contact actions remain correct.

**Dependency:** Resume-architecture decision.

---

### Phase 3 — Standardize navigation and accessibility

**Goal:** Give every route a predictable orientation and keyboard-entry contract without flattening intentional product designs.

#### SBD-R07 — Define the minimum shell contract

Every public route must expose:

1. System by Dave home.
2. The parent product or directory.
3. The current page name.
4. One reliable return action.
5. A visible keyboard focus state.

**Actions**

- Restore the complete Notion sub-navigation in Prompt Library.
- Add the minimum return shell to DepotOps, AV Tool Suite v2, Throwline, and Throwline Stage3D.
- Keep the full header, breadcrumb, and dynamic AV tool navigation as intentional variants.
- Extend `verify:public-navigation` to validate the minimum shell rather than identical markup.

**Acceptance criteria**

- Every sitemap route satisfies the five shell requirements.
- Notion Overview, Skills, Agents, Widgets, and Prompts remain mutually reachable.
- Application workspaces do not lose vertical space or cover controls at 680 pixels.

**Dependency:** Phase 2 personal-routing changes.

#### SBD-R08 — Add skip links to the twelve uncovered routes

**Targets**

- DepotOps.
- AV Workbook.
- PixelForge.
- Throwline.
- Throwline Stage3D.
- World Cup.
- FIFA Pitch Crew.
- Scorecard.
- NoteForge.
- Prompt Library.
- Teleprompter.
- Show Board.

**Actions**

- Make the skip link the first focusable element.
- Target the actual content or application workspace landmark.
- Use the shared visible-on-focus treatment where compatible.

**Acceptance criteria**

- Tab from the address bar reaches the skip link first.
- Activating it moves focus to meaningful content.
- The link is visible on focus and does not obscure controls.
- Reduced-motion settings are respected.

**Dependency:** Minimum shell contract.

---

### Phase 4 — Close metadata, naming, and count drift

**Goal:** Make public metadata and repeated content deterministic.

#### SBD-R09 — Complete CSP and social metadata

**Actions**

- Add CSP to Prompt Library, FIFA Pitch Crew, and Scorecard.
- Add canonical, Open Graph, and Twitter metadata to Scorecard.
- Validate external resources before tightening each CSP.
- Preserve application behavior with JavaScript disabled where progressive enhancement applies.

**Acceptance criteria**

- Every sitemap HTML route has description, canonical, Open Graph, Twitter, theme color, viewport, and CSP metadata unless an explicit documented exemption exists.
- No production console reports a CSP-blocked required resource.
- Shared images and canonical URLs return HTTP 200.

**Dependency:** Font remediation, because font origins affect CSP.

#### SBD-R10 — Eliminate duplicated tool counts

**Actions**

- Correct the stale 43-tool card copy.
- Add a verifier that compares public AV counts with `js/sbd-registry.js`.
- Prefer generated documentation values or a checked static fallback over runtime-only text.

**Acceptance criteria**

- Homepage, Tools, AV Suite, and documentation all report the canonical registry count.
- A deliberate registry change fails CI until every required public count is updated.

**Dependency:** None.

#### SBD-R11 — Normalize product names and titles

**Actions**

- Standardize “Prompt Lab” in prose and navigation; reserve `PromptLab` only where the external product intentionally uses it.
- Apply the recorded Davai display name.
- Define one title pattern for marketing pages and one for AV tools.
- Document intentional exceptions.

**Acceptance criteria**

- Navigation, cards, page titles, Open Graph, and Twitter titles use canonical product names.
- Davai’s route and description explain its relationship to System by Dave.
- Title punctuation differences are intentional and covered by verification.

**Dependency:** Davai naming decision.

---

### Phase 5 — Automate and verify the complete contract

**Goal:** Turn the remediation into a durable release gate.

#### SBD-R12 — Add a public consistency verifier

**Proposed command:** `npm run verify:public-consistency`

The verifier should fail on:

- Prohibited stale Prompt Lab claims.
- Generic or duplicate agent destinations.
- Unresolved required external links.
- Public AV counts that differ from the registry.
- Missing minimum-shell elements.
- Missing skip links on required routes.
- Missing canonical, Open Graph, Twitter, viewport, description, theme color, or CSP tags.
- Noncanonical Prompt Lab or Davai labels.
- Privacy statements that contradict known external font or iframe usage.

Add the command to the existing “Verify AV Suite contracts” workflow block or rename that block to “Verify public site contracts.”

**Acceptance criteria**

- Each audited defect has at least one automated regression check where source inspection is sufficient.
- The verifier prints the failing route and contract.
- Legitimate exceptions are explicit, named, and narrowly scoped.
- The existing Pages workflow remains green.

**Dependency:** Phases 1–4, so the verifier codifies the accepted final behavior.

#### SBD-R13 — Run rendered user-journey QA

**Required journeys**

1. Home → Prompt Lab → product → app or pricing.
2. Home → Notion → each agent destination.
3. Home → Dave → AV Resume and Systems Resume.
4. Home → AV Suite → representative planning, show, and closeout tools.
5. Notion → Skills → Agents → Widgets → Prompt Library.

**Viewports**

- Desktop.
- Tablet.
- 680-pixel breakpoint.
- Narrow phone.

**Interaction checks**

- Keyboard-only traversal.
- Visible focus.
- Skip links.
- Dialog and menu focus return.
- Reduced motion.
- External-link expectations.
- Offline behavior for AV routes where advertised.

**Acceptance criteria**

- No horizontal overflow at required viewports.
- No sub-44-pixel primary touch target unless documented as noninteractive.
- All five journeys finish at the promised destination.
- The user-facing rendered surface confirms the release; HTTP 200 alone is insufficient.

**Dependency:** All implementation work packages.

## 6. Verification matrix

| Gate | Command or evidence | Required result |
| --- | --- | --- |
| Install | `npm ci` | Completes without lockfile drift. |
| AV contracts | `npm run verify:av` | Pass. |
| Gear reference | `npm run verify:gear-reference` | Pass. |
| Indexing | `npm run verify:indexing` | Pass. |
| Portfolio schemas | `npm run verify:portfolio-schemas` | Pass. |
| Public navigation | `npm run verify:public-navigation` | Pass. |
| Throwline | `npm run verify:throwline` | Pass. |
| NoteForge | `npm run verify:noteforge` | Pass. |
| AV Workbook | `npm run typecheck:av-workbook && npm run test:av-workbook && npm run build:av-workbook` | Pass with no generated drift. |
| Dependencies | `npm audit --audit-level=high` | No high or critical findings. |
| Generated sitemap | `python3 scripts/gen_sitemap.py` followed by an exact diff check | No unexplained changes. |
| Public consistency | Proposed `npm run verify:public-consistency` | Pass. |
| Internal links | Live sitemap crawl | No broken internal destinations. |
| External actions | Targeted live checks | Correct final URL, HTTP success, and matching rendered page. |
| Pages | GitHub Pages workflow | Successful run for the exact main commit. |
| Live artifact | Hash or exact content comparison where practical | Production matches the committed artifact. |
| Rendered QA | Browser evidence at required viewports | All required journeys and interaction checks pass. |

## 7. Failure handling

| Failure | Response | Fallback |
| --- | --- | --- |
| Canonical product facts are unclear | Stop the affected copy package and record the unresolved decision. | Keep the existing product action but remove unsupported claims. |
| Agent fulfillment does not exist | Do not invent checkout or delivery behavior. | Use internal details, contact, or “not currently available.” |
| Digital Footprints DNS remains unavailable | Do not keep retrying during unrelated work. | Route to Profile or email and record restoration as separate infrastructure work. |
| Self-hosted font changes alter layout | Compare metrics and adjust the local font stack. | Keep the existing font temporarily and update the privacy policy accurately. |
| Shared navigation breaks an application | Revert that route to its prior shell. | Add only a compact return breadcrumb and skip link. |
| CSP blocks required behavior | Identify the exact required origin or directive. | Revert the route’s CSP commit; never use an unrestricted wildcard as the fix. |
| CI fails outside the package scope | Determine whether the failure is pre-existing from current main. | Do not hide it; isolate evidence and stop the merge if production confidence is reduced. |
| Live rendering differs from committed source | Treat the release as Yellow or Red. | Verify Pages provenance, cache-bust, and redeploy or revert. |

## 8. Release and closeout rules

- One work package per focused commit whenever practical.
- Every package updates relevant documentation and `CHANGELOG.md` when behavior or public content changes.
- Update `sitemap.xml` only when route content or route inventory requires it, using the repository generator.
- Push, merge, deploy, and verify each completed phase before beginning the next phase.
- Record the exact main commit, Pages run, live URLs, and remaining Unknowns.
- Do not mark the overall remediation Green until rendered-browser QA closes the audit limitation.

## 9. Completion definition

The remediation is complete when:

- Every high- and medium-priority audit finding is closed or explicitly accepted with an owner and rationale.
- Prompt Lab claims match the current product.
- Every agent and resume action reaches a relevant, working destination.
- Privacy wording matches actual network behavior.
- Every sitemap route satisfies the minimum navigation, skip-link, metadata, and CSP contracts or has a documented exception.
- All public AV counts and canonical product names are consistent.
- The full CI and Pages workflow passes for the final main commit.
- Live rendered journeys pass at desktop, tablet, 680 pixels, and narrow phone widths.
- The source audit is updated with closure evidence and remaining risks.
