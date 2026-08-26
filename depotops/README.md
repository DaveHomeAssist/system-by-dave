# DepotOps v0.5.0

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
7. Use **Review & Close Run** to classify every unresolved remainder, accept
   any quantity overage, and decide which acquired quantities should become
   general Warehouse stock.

DepotOps links records to their Notion sources, but it does not synchronize
changes to or from Notion automatically.

## Shopping quantities

Each Shopping Run row contains two different quantities:

- **Requested quantity** is the number between the minus and plus buttons. It
  records how many units the run intends to buy.
- **Purchased quantity** is the number field to the right of the shopping
  status. It records how many units were actually acquired.

The controls now enforce one run-state model:

- Choosing `purchased` sets the purchased quantity to the requested quantity.
  If both quantities were zero, both become one.
- Entering a positive purchased quantity derives `partially purchased` when it
  is below the request and `purchased` when it meets or exceeds the request.
- A partial row shows the quantity left. A row above the request shows the
  overage.
- Setting purchased quantity back to zero returns a derived purchase state to
  `needed`.
- A row with acquired quantity cannot be changed to a nonpurchase status until
  the purchased quantity is cleared. This prevents status changes from hiding
  recorded purchase evidence.

## Shopping statuses

Shopping status describes what happened to a row during a specific run. It is
independent of the project's workflow state.

| Status | Meaning |
| --- | --- |
| `needed` | Still intended for this run and not recorded as acquired. |
| `in cart` | Selected during the shopping trip but not yet recorded as purchased. |
| `partially purchased` | Some units were acquired, but fewer than requested. This state is derived from the two quantities and cannot be selected directly. |
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

The summary cards state their scope directly:

- **Shown** is the number left after the current search and filters.
- **Run Purchased**, **Ready to Buy**, **Run Projects**, and **Run Unresolved**
  describe the entire selected run.
- **Ready to Buy** counts Active workflow rows that are `needed`, `in cart`, or
  `partially purchased`.
- **Run Unresolved** counts every row that still needs a closeout decision. A
  newly closed run treats its recorded carry, skip, and fulfillment
  dispositions as resolved history.

## Project Inspector and shortages

The Projects screen uses a persistent master-detail workspace. On wide screens,
the selected Project Inspector stays beside the board while the board scrolls.
On narrower screens, the inspector moves above the board. The selected project
card remains visibly marked in both layouts.

**Add Shortages to Run** compares a modeled requirement with allocated stock,
available Warehouse stock, and quantities already on an unfinished run. It adds
only the uncovered quantity to the active run. Requirements or catalog items
marked for verification or hold enter the run as `hold` rather than `needed`.

## Reviewing and closing a run

**Review & Close Run** performs a preflight across the entire selected run.
The Close Run button remains disabled until all required decisions are present:

- Every unresolved row must be set to **Carry forward** or **Skip remainder**.
- Every purchased quantity above its request must be explicitly accepted.
- If any row is carried, the prefilled follow-up run name must remain nonempty.
- Each Warehouse allocation must be a whole number from zero through the
  acquired quantity. Project-only material can remain at zero.

DepotOps validates the full closeout before mutating state. A failed validation
does not complete the run, create a follow-up, or change Warehouse quantities.
On a successful closeout it:

- adds the approved Warehouse quantities to inventory;
- records fulfilled, accepted-overage, carried-forward, skipped, or
  skipped-remainder disposition on every original row;
- creates one active follow-up run when needed, containing only each carried
  row's unpurchased remainder with purchased quantity reset to zero;
- preserves gated, parked, review, or held work as `hold` in that follow-up and
  returns active purchase-ready work to `needed`; and
- completes and locks the original run, records its completion time, and makes
  the follow-up the selected run.

Closeout does not allocate purchases automatically to project requirements or
resolve Notion project-source conflicts. Those remain explicit project actions.

## Local data and recovery

Application state is stored in browser `localStorage` under:

`depotops-v0.2-state`

The `v0.2` text is a stable legacy storage name retained for compatibility; the
current data schema is v5. Export filenames also retain the legacy
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

Existing schema v1 through v4 browser data migrates to schema v5. Earlier
migrations still replace the old generic shopping-list project association with
evidence-backed project links. The v5 migration normalizes contradictory saved
shopping states from the quantities while preserving older runs and custom
data.

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
browser state when the test completes. The current expected result is 43 passes
and zero failures on desktop, and 44 passes and zero failures at the 680px
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
