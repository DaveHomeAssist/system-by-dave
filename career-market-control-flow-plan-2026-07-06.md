# Career Market Control and Screen Flow Plan

Date: 2026-07-06
Owner: Dave Robertson
Related plan: `career-market-site-plan-2026-07-06.md`

## Purpose

Define the navigation, controls, and screen flow for the private career-market command center and its public-facing profile/resume links.

The app should help Dave move from "found a listing" to "sent a targeted application" with minimal friction.

## App Structure

| Area | Screen | Purpose |
|---|---|---|
| Command | Dashboard | Show priority queue, metrics, stale items, and next actions |
| Capture | Add Listing | Enter or paste a job listing quickly |
| Evaluate | Listings | Filter, compare, and rank opportunities |
| Decide | Listing Detail | Inspect one role, choose track, resume, proof links, and action |
| Prepare | Resume Kit | Manage resume variants and export readiness |
| Support | Proof Library | Pick public proof links by role track |
| Send | Application Packet | Generate application-ready checklist and notes |
| Maintain | Canon / Settings | Store verified facts, contact block, role tracks, and backups |

## Primary Navigation

Use a persistent navigation bar or compact left rail.

| Nav Item | Route / View ID | Default Hotkey | Notes |
|---|---|---|---|
| Dashboard | `dashboard` | `1` | First screen on load |
| Listings | `listings` | `2` | Main working table |
| Resume Kit | `resume-kit` | `3` | Variants and exports |
| Proof Library | `proof-library` | `4` | Links grouped by track |
| Packets | `packets` | `5` | Saved application packets |
| Canon | `canon` | `6` | Private verified source data |

Secondary controls should be available globally:

| Control | Behavior |
|---|---|
| Search | Filters visible records across the active view |
| Add Listing | Opens quick-add capture panel |
| Import | Imports JSON backup or listing bundle |
| Export | Exports full local backup |
| Print / PDF | Prints active listing, packet, or resume checklist |
| Theme | Light, medium, dark |
| Help | Shows available shortcuts and data safety notes |

## Screen Flow

```text
Dashboard
  -> Add Listing
  -> Listings
  -> Listing Detail
       -> Resume Kit
       -> Proof Library
       -> Application Packet
       -> Dashboard

Resume Kit
  -> Canon / Settings
  -> Application Packet

Proof Library
  -> Listing Detail
  -> Application Packet

Packets
  -> Listing Detail
  -> Print / PDF

Canon / Settings
  -> Resume Kit
  -> Export Backup
```

## Dashboard Screen

Goal: show what matters today.

| Zone | Content | Primary Controls |
|---|---|---|
| KPI strip | Total listings, apply-now count, follow-ups due, stale listings | Click KPI to filter |
| Priority queue | Top 5 listings by score/action date | Open, mark applied, snooze |
| Follow-up lane | Applications needing action | Mark followed up, schedule next |
| Resume readiness | Variants with missing exports or stale canon | Open Resume Kit |
| Risk flags | Broken public links, contact mismatch, unverified source | Open Canon / Settings |

Dashboard empty state:

| Condition | Message / Action |
|---|---|
| No listings | "Add a listing to start the career queue." |
| No follow-ups | "No follow-ups due." |
| Broken public link | Show warning with affected link |

## Add Listing Flow

Goal: capture fast while browsing job boards or email.

1. User clicks `Add Listing`.
2. Quick-add panel opens.
3. User pastes URL, title, company, or raw listing text.
4. App suggests:
   - role track
   - priority
   - resume variant
   - proof links
   - risk flags
5. User saves as `New`.
6. App returns to Listing Detail for review.

Required fields:

| Field | Required | Notes |
|---|---|---|
| Company | Yes | Manual entry allowed |
| Role title | Yes | Manual entry allowed |
| Source URL | Strongly recommended | Official source preferred |
| Location | Yes | Used for commute/relocation risk |
| Source | Yes | LinkedIn, email, company, recruiter, Upwork, other |
| Role track | Yes | Can be changed later |
| Status | Yes | Defaults to `New` |

## Listings Screen

Goal: scan and compare opportunities.

| Control | Options |
|---|---|
| Search | Company, role, source, notes, skills, tags |
| Track filter | Broadcast, Live Production, Broadcast Systems, Systems/AI, Web/Product |
| Priority filter | Apply now, Screen first, Bridge, Stretch, Backup, Skip |
| Status filter | New, Screened, Tailored, Applied, Follow-up, Interview, Closed |
| Region filter | Philadelphia, PA, NJ, NYC, Remote, Travel, Relocation |
| Source filter | Email, LinkedIn, company page, recruiter, Upwork, other |
| Sort | Score, deadline, follow-up date, newest, company |

Table columns:

| Column | Purpose |
|---|---|
| Rank | Fast priority scan |
| Company / Role | Main identity |
| Track | Resume/proof lane |
| Status | Application state |
| Score | Fit score |
| Region | Location risk |
| Resume | Recommended variant |
| Next Action | What to do next |
| Source | Open listing |

## Listing Detail Screen

Goal: turn one listing into a decision.

| Section | Content |
|---|---|
| Header | Company, role, score, status, source link |
| Decision panel | Apply, screen first, monitor, skip |
| Fit analysis | Strong matches, weak spots, tradeoffs |
| Resume selector | Recommended variant and override control |
| Proof selector | Suggested 1-3 links |
| Tailoring notes | Summary angle, keywords, bullet emphasis |
| Timeline | Date found, checked, tailored, applied, followed up |
| Packet actions | Create packet, print, export notes |

Primary buttons:

| Button | Result |
|---|---|
| Mark Screened | Moves status from `New` to `Screened` |
| Prepare Resume | Opens Resume Kit with this listing context |
| Create Packet | Opens Application Packet view |
| Mark Applied | Requires resume variant and source URL |
| Schedule Follow-up | Adds follow-up date |
| Skip | Requires reason |

## Resume Kit Screen

Goal: keep variants ready without losing the source of truth.

| Section | Content |
|---|---|
| Variant cards | Broadcast, Live Production, Broadcast Systems/IP, Systems/AI, Web/Product |
| Canon health | Contact consistency, stale facts, missing dates, broken links |
| Export status | Last PDF date, file name, target use |
| Tailoring workspace | Listing-specific summary and bullet selection |

Controls:

| Control | Behavior |
|---|---|
| Preview Variant | Shows resume view for selected track |
| Print / Save PDF | Opens print dialog for selected variant |
| Copy Summary | Copies role-specific profile summary |
| Copy Bullet Set | Copies selected bullets for ATS/application forms |
| Mark Exported | Records export date and file name |

## Proof Library Screen

Goal: choose the best public proof links quickly.

| Proof Type | Examples |
|---|---|
| Profile | `https://systembydave.com/profile/` |
| Systems resume | `https://systembydave.com/resume/` |
| AV resume | `https://davehomeassist.github.io/av-resume/` |
| Project registry | `https://systembydave.com/project-registry.html` |
| AV tools | show advance, signal flow, video patch, stream plan, network plan |
| Consulting proof | freelance landing |
| Web/product demos | Rapid Sites, contractor demo |

Controls:

| Control | Behavior |
|---|---|
| Track filter | Shows links relevant to selected track |
| Copy link set | Copies 1-3 recommended links |
| Validate links | Marks link as checked with date |
| Hide from packets | Keeps a link available but excluded by default |

## Application Packet Screen

Goal: package one application cleanly.

Packet contents:

| Item | Included |
|---|---|
| Company / role | Yes |
| Source URL | Yes |
| Resume variant | Yes |
| Proof links | Yes, 1-3 max |
| Fit summary | Yes |
| Tailoring notes | Yes |
| Follow-up date | Optional |
| Private notes | Clearly marked, excluded from public copy |

Packet controls:

| Control | Behavior |
|---|---|
| Copy public packet | Copies safe recruiter-facing summary |
| Copy private notes | Copies full internal notes |
| Print packet | Opens print/PDF view |
| Mark applied | Updates listing status |
| Save packet snapshot | Stores packet metadata locally |

## Canon / Settings Screen

Goal: prevent resume drift.

| Section | Content |
|---|---|
| Contact block | Name, email, phone, region, public links |
| Career facts | Roles, dates, clients/credits, certifications |
| Skill bank | Skills grouped by track |
| Resume rules | Variant definitions and sorting logic |
| Public links | URL, purpose, track relevance, last checked |
| Backup | JSON import/export |

Safety rules:

- Never expose private company identifiers in public packets.
- Flag broken public links before packet export.
- Flag contact mismatch across variants.
- Require confirmation before overwriting canon data from imported JSON.

## Listing Status Model

```text
New
  -> Screened
  -> Tailored
  -> Applied
  -> Follow-up
  -> Interview
  -> Closed

Any status
  -> Skipped
  -> Stale
```

| Status | Meaning |
|---|---|
| New | Captured but not evaluated |
| Screened | Reviewed and scored |
| Tailored | Resume/proof angle chosen |
| Applied | Application submitted |
| Follow-up | Waiting for next action |
| Interview | Active conversation |
| Closed | Finished, rejected, filled, or not pursuing |
| Skipped | Intentionally not pursuing |
| Stale | Needs recheck |

## Keyboard and Control Rules

| Key | Action |
|---|---|
| `/` | Focus search |
| `n` | Add listing |
| `1`-`6` | Switch main screens |
| `e` | Edit current listing |
| `p` | Print current packet or view |
| `s` | Save current edit |
| `Esc` | Close modal or side panel |

Keyboard shortcuts should be progressive enhancement only. All actions must remain clickable.

## Mobile Flow

Mobile should favor cards over dense tables.

| Screen | Mobile behavior |
|---|---|
| Dashboard | KPI cards, priority queue, follow-up cards |
| Listings | Card list with sticky filters |
| Listing Detail | Stacked sections with sticky action bar |
| Resume Kit | Variant cards and print/export buttons |
| Proof Library | Track tabs and copy buttons |
| Packet | Single-column preview with copy/print actions |

## Screen Build Order

| Phase | Build |
|---|---|
| 1 | Dashboard shell, Listings view, Listing Detail view |
| 2 | Add Listing quick panel and local save/edit |
| 3 | Resume selector and proof-link selector |
| 4 | Application Packet print/copy view |
| 5 | Canon / Settings and JSON backup |
| 6 | Link validation and resume export tracking |
| 7 | Self-hosted interaction layer for screen, drawer, filter, and packet feedback |

## Acceptance Checklist

- [ ] User can add a listing in under one minute.
- [ ] User can filter to apply-now roles in one click.
- [ ] Every listing shows recommended resume variant.
- [ ] Every listing can create a safe application packet.
- [ ] Private notes are visually separated from public copy.
- [ ] Public links can be validated and timestamped.
- [ ] Dashboard shows stale listings and follow-ups due.
- [ ] JSON export/import preserves listings, packets, variants, and settings.
- [ ] Mobile view works without horizontal scrolling.
- [ ] Public `system-by-dave` page self-hosts approved dependencies and keeps third-party runtime code out of the live CSP surface.
- [ ] Private app can use dependencies or a local backend when they materially improve the application workflow.
