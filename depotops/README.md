# DepotOps v0.4.1

DepotOps is a local-first home project operations tool. Projects define why
material is needed, Shopping Runs organize what to acquire, and Warehouse
records inventory and tools already owned.

The canonical application is published at:

<https://systembydave.com/depotops/>

## Core workflow

1. Open **Projects** and inspect the project that owns the work.
2. Add or review its modeled requirements. Use **Add Shortages to Run** to add
   quantities not covered by reserved or available Warehouse stock.
3. Open **Shopping Run**, select the run, and filter it by project when useful.
4. Read each row's workflow gate before buying. A project link does not mean an
   item is ready to purchase.
5. Set the requested quantity, update the shopping status while at the store,
   and record the quantity actually purchased.
6. Open **Warehouse** to manage inventory and tools or to export a JSON backup.
7. Use **Complete & Reconcile** only after reviewing every unresolved row and
   deciding which purchased quantities should become general Warehouse stock.

DepotOps links records to their Notion sources, but it does not synchronize
changes to or from Notion automatically.

## Shopping quantities

Each Shopping Run row contains two different quantities:

- **Requested quantity** is the number between the minus and plus buttons. It
  records how many units the run intends to buy.
- **Purchased quantity** is the number field to the right of the shopping
  status. It records how many units were actually acquired.

Choosing `purchased` automatically copies the requested quantity into the
purchased quantity only when the purchased quantity is still zero. Editing the
purchased quantity by itself does not change the shopping status. Review both
fields because the current app permits them to disagree.

## Shopping statuses

Shopping status describes what happened to a row during a specific run. It is
independent of the project's workflow state.

| Status | Meaning |
| --- | --- |
| `needed` | Still intended for this run and not recorded as acquired. |
| `in cart` | Selected during the shopping trip but not yet recorded as purchased. |
| `purchased` | Acquired. Confirm the purchased quantity before closing the run. |
| `not found` | Not available during this attempt. The row remains unresolved. |
| `skipped` | Intentionally excluded from the run's remaining count. |
| `hold` | Preserved on the run but blocked from purchase pending verification or a decision. |

## Project workflow states

Workflow state explains whether the linked project context is ready for
procurement.

| State | Meaning |
| --- | --- |
| **Active** | Current work. These are the primary purchase-ready rows, subject to each row's notes and verification status. |
| **Waiting / gated** | Linked to real work, but blocked by a measurement, design, permit, upstream project, or other decision. |
| **Parked** | Valid previously stopped or later-stage work retained for planning. |
| **Needs review** | The project source and shopping row disagree or require an explicit keep, reopen, spare, or remove decision. |
| **Complete** | Retained project context that is recorded as finished. |
| **Superseded** | An obsolete product or direction preserved for history and excluded from the focused view. |

## Seeded run, filters, and counts

The seeded run is a 2026-08-10 snapshot of the canonical Notion database
`🛒 Home Depot Shopping List`: 48 rows, including 25 outstanding and 23
purchased. Every row links to its Notion source and to the relevant current,
waiting, parked, completed-review, or superseded project context.

The default view shows the 22 outstanding rows tied to active, gated, parked,
or review work:

- **Show All 48** disables both the current-work and needed-only filters. Its
  return action, **Current + Stopped**, restores both default filters.
- **Show Purchased** disables only the needed-only filter. Its return action is
  **Needed Only**.
- The project selector and search field further filter the visible rows.

Summary cards do not all use the same scope:

- **Visible Items** is the number left after the current search and filters.
- **Purchased**, **Actionable**, **Linked Projects**, and **Remaining** describe
  the entire selected run.
- **Actionable** counts rows whose workflow is Active and whose shopping status
  is `needed`.
- **Remaining** excludes only `purchased` and `skipped` rows.

## Project Inspector and shortages

The Projects screen uses a persistent master-detail workspace. On wide screens,
the selected Project Inspector stays beside the board while the board scrolls.
On narrower screens, the inspector moves above the board. The selected project
card remains visibly marked in both layouts.

**Add Shortages to Run** compares a modeled requirement with allocated stock,
available Warehouse stock, and quantities already on an unfinished run. It adds
only the uncovered quantity to the active run. Requirements or catalog items
marked for verification or hold enter the run as `hold` rather than `needed`.

## Completing and reconciling a run

**Complete & Reconcile** lists rows currently marked `purchased`. For each row,
enter the portion of the purchased quantity that should become general
Warehouse inventory or unused leftover stock. Project-only material can remain
at zero.

Completing the dialog:

- fills a zero purchased quantity from the requested quantity for rows already
  marked `purchased`;
- adds the entered Warehouse quantities to inventory;
- marks the run completed and records its completion time; and
- locks that run's row controls as completed history.

The current implementation does not block closure when rows remain unresolved,
create a follow-up run, allocate purchases automatically to project
requirements, or resolve project-source conflicts. Review and classify those
items before completing the run.

## Local data and recovery

Application state is stored in browser `localStorage` under:

`depotops-v0.2-state`

The `v0.2` text is a stable legacy storage name retained for compatibility; the
current data schema is v4. Export filenames also retain the legacy
`depotops-v0.2-YYYY-MM-DD.json` prefix, but the JSON records its actual schema
version.

Data does not automatically sync between browsers, devices, domains, or HTTP
and HTTPS origins. Keep the same production origin after beginning real work.

### Safe import or reset sequence

1. Use **Warehouse → Export JSON** before importing or resetting.
2. Confirm the backup file exists and keep it until verification is complete.
3. Import the replacement JSON or confirm **Reset App Data**.
4. Recheck the active run, project count, shopping totals, and Warehouse stock.

Import validates and migrates the selected JSON, then replaces the entire
current browser state. It does not merge records and does not create an
automatic pre-import backup. Reset replaces the current state with the seeded
canonical state after a confirmation prompt.

Existing schema v1 through v3 browser data migrates to schema v4. The migration
replaces the old generic shopping-list project association with evidence-backed
project links while preserving saved shopping statuses, quantities, older runs,
and custom data.

## Files and architecture

- `index.html` contains the complete application, styles, seed data, migration,
  persistence, and built-in self-tests.
- `icon.svg` is the browser and installable-app icon.
- `manifest.webmanifest` contains installable-web-app metadata.
- `vercel.json` and `netlify.toml` are optional alternative-host templates.

DepotOps has no build step, backend, database, or environment variables. GSAP
is loaded from cdnjs with `defer` for progressive motion; the application shell
and core behavior have non-GSAP fallbacks when the CDN is unavailable.

## Local development

From the repository root:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Open:

- <http://127.0.0.1:4173/depotops/>
- <http://127.0.0.1:4173/depotops/?selftest=1>

The self-test route temporarily exercises seeded state and restores the saved
browser state when the test completes. The current expected result is 31 passes
and zero failures on desktop, and 32 passes and zero failures at the 680px
mobile breakpoint or below.

## Verification

Repository tooling uses npm with the committed `package-lock.json`. Run the
same checks required by the GitHub Pages workflow:

```bash
npm ci
npm run verify:av
npm run verify:public-navigation
npm run typecheck:av-workbook
npm run test:av-workbook
npm run build:av-workbook
npm audit --audit-level=high
python3 scripts/gen_sitemap.py
git diff --exit-code -- av-workbook sitemap.xml
git diff --check
```

Also verify DepotOps in a browser at desktop and phone widths, confirm the
self-test has no failures, and check for console errors or warnings. Automated
checks do not constitute a human VoiceOver or WCAG certification.

Do not hand-edit `sitemap.xml`; it is generated by `scripts/gen_sitemap.py`.
Do not hand-edit the generated `av-workbook/` output; its source lives under
`apps/av-workbook/`.

## Deployment

### Canonical production

The checked-in source is `depotops/` in `DaveHomeAssist/system-by-dave`.
Fast-forward pushes to `main` trigger the repository's **Deploy site to Pages**
workflow and publish the site at <https://systembydave.com/depotops/>.

### Optional Vercel deployment

Create a project from this folder with framework preset **Other**, no build
command, and output directory `.`.

### Optional Netlify deployment

Deploy this folder directly with no build command.

### Any static web server

Serve this directory as the site root.

## Release history

The repository root [CHANGELOG.md](../CHANGELOG.md) is the single canonical
release ledger. Do not create a second DepotOps changelog.
