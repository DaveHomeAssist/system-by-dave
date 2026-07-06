# Career Market Site Plan

Date: 2026-07-06
Owner: Dave Robertson
Project home: `system-by-dave`

## Purpose

Create a cohesive career-market resource that lets Dave browse listings, evaluate fit, choose the right resume variant, and keep proof links ready without hunting across separate websites, Drive docs, and one-off HTML files.

This is not a public marketing splash page first. The primary value is an operator-grade application command center with a clean public profile layer behind it.

## Current Asset Map

| Asset | Location | Role in the system | Exposure |
|---|---|---|---|
| System by Dave profile | `profile/index.html` | Public landing page for "who Dave is" | Public |
| System by Dave resume | `resume/index.html` | Systems, AI, automation, and infrastructure resume lane | Public |
| AV Resume | `../av-resume/index.html` | AV, broadcast, and live production resume base | Public |
| Job dashboard | `C:\Users\digit\Desktop\job-search.html` | Private active-listing dashboard and application tracker | Private |
| Freelance landing | `../freelance-landing/index.html` | Systems architecture and AI consulting proof | Public |
| Project registry | `project-registry.html` | Public software/project proof index | Public |
| Rapid Sites | `../freelance/index.html` | Web/lead-gen case study | Public |
| Contractor demo | `../contractor/index.html` | Static business-site proof and lead-capture example | Public |
| Google Drive `Resume 2024` | Drive document | Editable AV/live resume source | Private source |
| Google Drive `DOC-Resume-2023` | Drive document | Older resume archive | Private archive |

## Recommended Information Architecture

| Surface | Path | Purpose |
|---|---|---|
| Public profile | `/profile/` | Send to recruiters, hiring managers, and networking contacts |
| Public resume | `/resume/` | Systems/AI/software-facing resume |
| AV resume | `https://davehomeassist.github.io/av-resume/` | Broadcast, AV, live event, and production-facing resume |
| Career command center | local/private `career-market.html` or upgraded `job-search.html` | Track listings, fit, resume variant, proof links, and next actions |
| Career source data | private JSON file | Own canonical facts, resume bullets, role tracks, and listing records |
| Application packets | private folder | Per-application exports: resume PDF, notes, cover note, proof links |

Do not publish the application command center unless private notes, compensation notes, emails, and internal screening logic are removed.

## Role Tracks

| Track | Use for | Primary resume | Proof links |
|---|---|---|---|
| Broadcast Engineer | CBS, Spectacor, studio, control-room, live-streaming roles | AV/broadcast variant | `/profile/`, AV resume, AV tools, selected show credits |
| Live Event Production Ops | Precon, production manager, show advance, technical director-adjacent roles | Live production ops variant | AV resume, show-advance tools, signal-flow/video-patch examples |
| Broadcast Systems / IP / Streaming | Broadcast systems, cloud playout, hybrid systems, AV engineer roles | Broadcast systems variant | `/resume/`, AV resume, stream-plan/network-plan examples |
| Systems / AI / Automation | AI tooling, Notion systems, internal tools, operations automation | Systems/AI variant | `/resume/`, project registry, freelance landing |
| Web / Product / Freelance | Web build, small-business tooling, consulting, landing-page roles | Web/product variant | Rapid Sites, contractor demo, project registry |

## Resume Variant Strategy

Create one master source of truth and generate variants from it. Avoid hand-maintaining several resumes that drift.

### Canonical Source

Store verified career facts in one private structured file, for example:

`career-market/source/dave-career-canon.json`

Suggested fields:

| Field | Purpose |
|---|---|
| `contact` | Verified name, location, email, phone, public links |
| `summary_blocks` | Reusable summaries by track |
| `experience` | Canonical roles, dates, employers, and verified bullets |
| `skills` | Skill tags grouped by AV, broadcast, systems, AI, web, leadership |
| `credits` | Verified event/client/venue credits safe to mention |
| `projects` | Proof links, descriptions, and track relevance |
| `certifications` | Safety and technical certs |
| `resume_variants` | Variant definitions, ordering rules, and preferred summaries |

### Variant Outputs

| Variant | File name pattern | Notes |
|---|---|---|
| Broadcast Engineer | `dave-robertson-broadcast-engineer-YYYY-MM.pdf` | Prioritize video engineering, signal flow, broadcast systems, studio reliability |
| Live Event Production Ops | `dave-robertson-live-production-ops-YYYY-MM.pdf` | Prioritize crew leadership, estimates, vendors, show advance, execution |
| Broadcast Systems / IP | `dave-robertson-broadcast-systems-ip-YYYY-MM.pdf` | Prioritize IP video, streaming, routing, troubleshooting, infrastructure |
| Systems / AI | `dave-robertson-systems-ai-YYYY-MM.pdf` | Prioritize System by Dave, automation, dashboards, local-first tools |
| Web / Product | `dave-robertson-web-product-YYYY-MM.pdf` | Prioritize public demos, product thinking, client-ready output |

## Application Workflow

1. Capture listing.
   - Source: LinkedIn, email alert, company career page, referral, Upwork, recruiter.
   - Save: company, role, URL, location, pay/range if known, application deadline, source, and raw posting excerpt.

2. Score fit.
   - Track fit: which role track it belongs to.
   - Strength: direct, bridge, stretch, backup.
   - Friction: commute, travel, relocation, schedule, pay uncertainty, credential gaps.
   - Action: apply, screen first, monitor, or skip.

3. Select resume variant.
   - Use the closest track variant.
   - Tailor only the summary, top skill order, and 4-8 bullets.
   - Do not invent facts or unsupported titles.

4. Attach proof links.
   - Send 1-3 links max.
   - Default: profile + resume + one proof link.
   - Avoid overwhelming a hiring manager with every site.

5. Save application packet.
   - Folder: `career-market/applications/YYYY-MM-DD-company-role/`
   - Include: listing snapshot, tailored resume, cover note, proof links, follow-up date, status notes.

## Command Center Requirements

The private dashboard should support:

| Feature | Requirement |
|---|---|
| Listing table | Sort/filter by priority, track, source, region, status |
| Role detail cards | Fit, tradeoff, next action, proof links, selected resume variant |
| Resume selector | Shows recommended variant per listing |
| Proof-link picker | Suggests the best 1-3 public links for the role |
| Application status | New, screening, tailored, applied, follow-up, interview, stale, rejected |
| Packet export | Copy application notes and save a per-role packet |
| Risk flags | Relocation, low pay, generic support role, unclear scope, private notes present |
| Verification fields | Listing checked date, official source checked, posting still live |

## Public Site Requirements

The public layer should stay simple and client-safe:

| Requirement | Notes |
|---|---|
| Clear profile route | Keep `/profile/` as the primary public career landing page |
| Resume route clarity | Keep `/resume/` focused on systems/AI; link AV resume where appropriate |
| Proof links by lane | Add restrained links to AV tools, project registry, freelance landing, and demos |
| No private notes | Do not expose application decisions, pay notes, email listings, or phone/email variants until verified |
| Dependency policy | Dependencies are allowed when they improve the workflow. Public pages should self-host approved assets, keep CSP tight, and avoid loading third-party runtime code from CDNs. |
| Mobile-first scanning | Recruiters should be able to scan profile, proof, and resume links quickly |

## Content Cleanup Before Launch

| Item | Why it matters | Action |
|---|---|---|
| Contact block mismatch | Older docs and newer pages may disagree | Verify final email, phone, city/region, and public links |
| Experience-years mismatch | `Resume 2024` and current AV resume differ | Pick one current phrasing and update variants |
| `DigitalFootprints.Live` DNS failure | Broken resume link hurts credibility | Fix DNS or remove from application materials |
| Private company-info doc | Contains internal identifiers/admin data | Keep excluded from all public and resume output |
| Drive resume wording | Some older bullets are weaker/generic | Promote current HTML resume wording as the baseline |

## Implementation Phases

### Phase 1: Planning and Canon

- Create this planning document.
- Create private canon JSON with verified facts.
- Normalize contact block and public link list.
- Decide final public link set for each role track.

### Phase 2: Private Dashboard

- Extend `job-search.html` or create a local `career-market.html`.
- Add role tracks, resume variant recommendation, proof-link picker, and application status.
- Store listings in a structured JS/JSON block so records can be copied or generated.
- Use GSAP or another justified UI dependency for meaningful interaction polish: screen transitions, drawer motion, filter refresh cues, and packet creation feedback. Keep reduced-motion support.

### Phase 3: Resume Variants

- Build static HTML resume templates or structured markdown templates.
- Generate PDF exports manually through print first.
- Later, add a repeatable script only if manual export becomes slow or inconsistent.

### Phase 4: Public Site Stitching

- Add a restrained "Career" or "Work With Dave" pathway on System by Dave.
- Link `/profile/`, `/resume/`, AV resume, and selected proof pages.
- Keep application dashboard private unless a sanitized public version is deliberately created.

### Phase 5: Application Packet Workflow

- For each high-fit listing, create an application folder.
- Save listing snapshot, selected resume, tailored summary, proof links, and follow-up note.
- Keep a status trail so follow-ups are easy under deadline pressure.

## Verification Checklist

Before using the kit for applications:

- [ ] Public profile loads.
- [ ] Public resume loads.
- [ ] AV resume loads.
- [ ] Selected proof links load.
- [ ] Contact details are consistent everywhere.
- [ ] Resume PDF exports cleanly at one or two pages, depending on target role.
- [ ] No private notes or internal business identifiers appear in public pages.
- [ ] Listing source has been checked from the official company page when possible.
- [ ] Application packet has the exact resume variant used.

## Immediate Next Actions

| Priority | Action |
|---|---|
| High | Verify final contact block and remove/fix `DigitalFootprints.Live` anywhere it is broken |
| High | Create `career-market/source/dave-career-canon.json` from current AV resume, System by Dave resume, and Drive `Resume 2024` |
| High | Add resume variant and proof-link fields to the private job dashboard |
| Medium | Create first two resume variants: Broadcast Engineer and Live Event Production Ops |
| Medium | Add a simple public profile link section pointing to the strongest proof pages |
| Low | Build a generator for custom per-application resumes after the manual workflow proves useful |

## Decision Log

| Decision | Rationale |
|---|---|
| Use System by Dave as the public umbrella | It already has the custom domain, profile, resume, project registry, and public proof pages |
| Keep the job dashboard private | It contains tactical application notes and screening logic that are not recruiter-facing |
| Use one canon source for resumes | Prevents drift between Drive docs, HTML resumes, and generated PDFs |
| Start with manual PDF export | Faster and lower risk than building automation before the content model is settled |
