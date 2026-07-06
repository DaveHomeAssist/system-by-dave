# Private Resource Backend Plan

Date: 2026-07-06
Owner: Dave Robertson
Related app: `career-market.html`

## Purpose

Design a private backend for Dave's personal operating files: career packets, resumes, planning docs, profile assets, job listings, client-safe proof links, exports, and other small working artifacts.

The backend does not need to force everything into one app. It should provide one reliable storage layer that multiple focused tools can use.

## Design Principle

Keep public presentation and private storage separate.

| Layer | Role |
|---|---|
| Public pages | Profile, resume, portfolio, project registry, sanitized app shells |
| Private backend | Files, records, notes, packets, private listings, source documents |
| Local tools | Career market app, future proposal tools, invoice tools, AV planning tools |
| Export layer | JSON, PDF, markdown, CSV, and application packets |

## Recommended Architecture

Start boring and local-first:

| Component | Recommendation | Why |
|---|---|---|
| App server | Local Node or Python service bound to `127.0.0.1` | Private by default, easy to run on workstation |
| Metadata store | SQLite | Simple, durable, searchable, easy to back up |
| File store | Plain folders on disk | Keeps files portable and inspectable |
| Search index | SQLite FTS or generated JSON index | Enough for docs, packets, listings, and notes |
| Auth | Local-only first; add login only if exposed remotely | Avoid premature security surface |
| Backup | Timestamped ZIP + JSON manifest | Easy restore under deadline pressure |

Do not expose this over the public internet until authentication, encryption, logging, and backups are designed and tested.

## Storage Shape

Use one root folder outside the public repo:

`C:\Users\digit\Documents\DaveVault`

Suggested layout:

```text
DaveVault/
  db/
    dave-vault.sqlite
  files/
    career/
    resumes/
    profile-assets/
    proposals/
    invoices/
    av-projects/
    exports/
  backups/
    dave-vault-YYYY-MM-DD-HHMM.zip
  inbox/
    drop-zone/
```

## Core Data Types

| Type | Examples | Notes |
|---|---|---|
| File asset | PDF, DOCX, HTML, markdown, image, JSON export | Stored as files with metadata row |
| Career listing | Company, role, source URL, status, resume variant | Feeds career-market app |
| Resume variant | Track, summary, exported PDF, source links | Can reference canon facts |
| Application packet | Listing, resume file, proof links, notes, follow-up | Generated from career-market app |
| Public proof link | URL, track relevance, last checked, notes | Shared across apps |
| Canon fact | Contact block, verified dates, credits, skills | Prevents resume drift |
| Project note | Planning docs, audits, UX issues, open action items | Searchable and linkable |

## Minimal SQLite Tables

| Table | Purpose |
|---|---|
| `assets` | Every stored file or external URL |
| `tags` | Reusable tags |
| `asset_tags` | Many-to-many tags |
| `career_listings` | Job/application records |
| `resume_variants` | Resume tracks and export records |
| `application_packets` | Per-application bundles |
| `proof_links` | Public links and validation dates |
| `canon_facts` | Verified private source facts |
| `audit_items` | Open tasks, UX issues, navigation notes, follow-ups |
| `activity_log` | Important changes and exports |

## API Surface

Keep endpoints small and boring.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Confirm service is running |
| `/api/assets` | GET/POST | Search/add file metadata |
| `/api/assets/:id/file` | GET | Download/open file |
| `/api/career/listings` | GET/POST | Read/write career listings |
| `/api/career/packets` | GET/POST | Read/write application packets |
| `/api/proofs` | GET/POST | Manage proof links |
| `/api/canon` | GET/POST | Manage verified facts |
| `/api/export` | POST | Create backup/export |
| `/api/import` | POST | Import JSON/app data |

## Integration Model

The current `career-market.html` can stay single-file and localStorage-first.

Next upgrade path:

1. Keep localStorage as fallback.
2. Add optional backend URL setting, default blank.
3. If backend is available, sync listings, packets, proofs, variants, and canon.
4. If backend is unavailable, continue local-only.
5. Export JSON stays available either way.

## Security Boundary

| Risk | Requirement |
|---|---|
| Public repo leaks private records | Never commit real listings, packets, private notes, phone/email variants, or exported resumes |
| Backend exposed accidentally | Bind to `127.0.0.1` by default |
| File loss | Backup ZIP plus database dump |
| Bad import overwrites canon | Require preview and confirmation |
| Secrets in files | Do not scan/upload secrets into public proof pages |
| Remote access later | Require HTTPS, authentication, and audit logging before opening beyond local machine |

## Build Phases

### Phase 1: Local Vault

- Create `DaveVault` folder structure.
- Create SQLite schema.
- Add import/export CLI.
- Store career-market JSON exports as first-class records.

### Phase 2: Local API

- Build local service on `127.0.0.1`.
- Add CRUD for listings, packets, proofs, canon, and assets.
- Add backup endpoint.

### Phase 3: Career App Sync

- Add optional backend sync to `career-market.html`.
- Keep localStorage fallback.
- Add conflict rules: newest edit wins only after preview.

### Phase 4: Broader Tools

- Connect proposal docs, invoice templates, AV project files, and profile/resume assets.
- Add search across files and metadata.
- Add action-item/audit issue capture from project docs.

### Phase 5: Remote Option

- Only after local workflow is stable.
- Add authentication, HTTPS, backups, and access logs.
- Consider Tailscale-only access before public hosting.

## Immediate Next Task

Build a local `DaveVault` proof of concept with:

| Deliverable | Scope |
|---|---|
| SQLite schema | Assets, career listings, packets, proofs, canon, audit items |
| Import command | Reads a career-market JSON backup |
| Export command | Writes a timestamped backup |
| Local API health check | Confirms future app sync target |

This keeps the private backend separate from the public System by Dave site while letting individual apps share the same storage layer later.
