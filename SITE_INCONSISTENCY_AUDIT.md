# System by Dave Site Inconsistency Audit

**Audit date:** August 26, 2026

**Status:** Yellow

**Scope:** Live public routes under [systembydave.com](https://systembydave.com/), plus the Prompt Lab and Notion Widget destinations reached from the site.

## Executive summary

The core navigation and route availability are healthy, but several trust, conversion, privacy, accessibility, and naming inconsistencies need correction. The most important issues are stale Prompt Lab promises, paid Notion agent cards that do not lead to agent-specific destinations, and broken links from the systems resume to `digitalfootprints.live`.

This was a live route and source audit. Browser-level visual inspection was unavailable, so responsive rendering, visible focus behavior, and screenshot-level spacing remain unverified.

## Route map

```text
Home
├── Tools
│   ├── AV tools and standalone apps
│   ├── Davai Memory Architecture
│   └── Dave profile
├── AV Suite
│   └── 44 operator tools
├── Notion
│   ├── Skills
│   ├── Agents ── currently exits to Prompt Lab
│   ├── Widgets
│   └── Prompt Library
├── Prompt Lab ── external product at promptlab.tools
└── Dave
    ├── Profile
    └── AV Resume

Additional, weakly surfaced route:
└── Systems Resume
```

## Findings

### High priority

#### 1. Prompt Lab promises do not match the current product

- The [System by Dave homepage](https://systembydave.com/) says “no subscriptions” and “no signup gate.”
- The current [Prompt Lab product page](https://promptlab.tools/) offers a $9-per-month Pro subscription and says the hosted app requires sign-in.
- The [System by Dave Prompt Lab page](https://systembydave.com/prompt-lab.html) says that nothing is proxied and keys and data never leave the browser.
- Prompt Lab’s current product copy says hosted requests pass through its domain-allowlisted proxy.
- A/B testing appears as a general feature beneath a “free” product hero, while the current product page places A/B Compare in Pro.

**Impact:** Pricing, account, and privacy expectations change after users leave System by Dave. This creates a direct trust risk.

**Fix direction:** Make claims surface-specific. Distinguish the web app, browser extension, and local build; state current sign-in, proxy, and Pro requirements; remove the blanket no-subscription and no-signup statements.

#### 2. Paid Notion agent cards do not have agent-specific destinations

- The [Notion overview](https://systembydave.com/notion.html) advertises four paid agents priced from $12 to $19.
- Each card on the [Agents page](https://systembydave.com/agents.html) routes to `promptlab.tools/?agent=...`.
- All four parameterized URLs returned the same generic Prompt Lab document as the Prompt Lab homepage.
- The destination contains no matching agent details, purchase path, or query-parameter handling.

**Impact:** The primary discovery and conversion path for paid agents is effectively broken.

**Fix direction:** Create agent-specific detail and purchase destinations. Until they exist, label the products as unavailable or replace “View” with a truthful contact or waitlist action.

#### 3. The systems resume links to an unresolved domain

- The [systems resume](https://systembydave.com/resume/) links to `digitalfootprints.live` from its hero, closing call to action, and footer.
- The domain returned no A, AAAA, or nameserver records during this audit.

**Impact:** A prominent proof and work-history destination fails at the point of contact.

**Fix direction:** Restore the domain, correct the URL, or remove the links until the destination is live.

### Medium priority

#### 4. The privacy policy does not match current implementation

- The [privacy policy](https://systembydave.com/privacy-policy.html) says the site’s fonts are self-hosted.
- [Profile](https://systembydave.com/profile/), [AV Resume](https://systembydave.com/resume/av/), and PixelForge load fonts from Google Fonts.
- The policy says the Widgets page embeds live demos.
- The current [Widgets page](https://systembydave.com/widgets.html) contains cards linking to external demos and no iframes.

**Impact:** The public privacy description is inaccurate, particularly about third-party network requests.

**Fix direction:** Either self-host the remaining fonts or name Google Fonts in the policy. Update the widget wording to describe outbound demo links.

#### 5. The two resume paths lack an audience-selection model

- [Profile](https://systembydave.com/profile/) correctly leads to the [AV Resume](https://systembydave.com/resume/av/).
- The separate [Systems Resume](https://systembydave.com/resume/) is only weakly discoverable through the sitemap and its own footer.
- There is no shared landing page or cross-link explaining which resume serves which audience.

**Impact:** Technical recruiters may not find the systems resume, while AV clients receive no clear path to the broader systems profile.

**Fix direction:** Turn `/resume/` into a two-audience resume landing page or add explicit “AV resume” and “Systems resume” choices to Profile.

#### 6. Navigation uses four different shell models

The sitemap currently contains:

- 14 routes with the full System by Dave header.
- 22 routes with a compact return or breadcrumb header.
- 41 AV routes with dynamic tool navigation.
- Four custom-shell routes: DepotOps, legacy AV Tool Suite v2, Throwline, and Throwline Stage3D.

The [Prompt Library](https://systembydave.com/prompts/) also reduces the Notion navigation to only System by Dave and Notion, even though Overview, Skills, Agents, Widgets, and Prompts are siblings elsewhere.

**Impact:** Users can lose their position in the product hierarchy when moving between standalone applications and catalogs.

**Fix direction:** Define a minimum shell contract: System by Dave, parent product, current route, and one reliable return action. Restore the complete Notion sub-navigation in Prompt Library.

#### 7. Skip-link coverage is inconsistent

Twelve sitemap routes lack a detectable skip link:

- DepotOps
- AV Workbook
- PixelForge
- Throwline
- Throwline Stage3D
- World Cup
- FIFA Pitch Crew
- Scorecard
- NoteForge
- Prompt Library
- Teleprompter
- Show Board

**Impact:** Keyboard and assistive-technology users must traverse repeated controls before reaching the working area.

**Fix direction:** Add a consistent first-focus skip link targeting each route’s main workspace or content landmark.

#### 8. Security and social metadata coverage is incomplete

- Prompt Library, FIFA Pitch Crew, and Scorecard lack a Content Security Policy.
- [Scorecard](https://systembydave.com/scorecard/) also lacks canonical, Open Graph, and Twitter metadata.

**Impact:** These routes do not meet the site’s established security and sharing contract.

**Fix direction:** Apply the shared metadata and CSP checklist to every sitemap route, including bundled standalone applications.

### Low priority

#### 9. The Tools page contains a stale AV count

- The canonical [AV registry](https://systembydave.com/js/sbd-registry.js) contains 44 tools.
- Home and the Tools introduction say 44.
- The AV Suite catalog card inside [Tools](https://systembydave.com/tools.html) still says 43.

**Fix direction:** Render all public tool counts from the canonical registry instead of maintaining duplicate prose values.

#### 10. Product naming and URL taxonomy drift

- “Prompt Lab” and “PromptLab” are both used.
- “Davai Memory Architecture” lives at `/systembydave/`, where users may expect documentation about the System by Dave brand rather than a separately named product.
- Page titles alternate among em dashes, pipes, and ordinary hyphens.

**Fix direction:** Establish canonical product spellings, title patterns, and route labels in one content registry.

## Verified healthy behavior

- All 81 URLs in the live sitemap returned HTTP 200.
- The crawl found 80 unique static internal links and no broken internal destinations.
- The canonical AV registry contained 44 tool entries.
- Prompt Lab, its app and privacy routes, and all four external Notion Widget destinations returned HTTP 200.
- The main top-level routes share a consistent core header.

An HTTP 200 result confirms route availability, not successful rendering or interaction.

## Recommended remediation order

1. Correct Prompt Lab pricing, account, feature, and privacy claims.
2. Replace the paid-agent Prompt Lab redirects with real agent destinations.
3. Repair or remove the `digitalfootprints.live` links.
4. Align the privacy policy with fonts and widget behavior.
5. Add a clear AV-versus-systems resume choice.
6. Standardize the minimum navigation shell and Notion sub-navigation.
7. Add missing skip links, CSP, canonical, and social metadata.
8. Generate public counts and product naming from canonical registries.

## Verification limitations

The interactive browser connection was unavailable during this audit. The findings are based on live HTTP responses, current HTML and JavaScript source, sitemap crawling, DNS resolution, and destination comparison. A separate rendered-browser pass is still required for:

- Desktop and 680-pixel layouts.
- Visual hierarchy and cross-route spacing.
- Keyboard focus order and focus visibility.
- Menu, dialog, filter, storage, and offline interactions.
- Screen-reader announcements and landmark behavior.
