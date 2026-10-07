# AV Video Stream and Record credential-handling decision

Status: **Decision required**  
Decision ID: **AVV-STREAM-KEY-1**  
Reviewed source: `b0effc822acad9786c528f99c8731c022028093c` on 2026-10-07

## Decision

Choose the credential boundary before Stream Plan and Record Log become AV Video imports and optional modules.

### Option 1 — Block raw stream keys at every AV Video boundary (recommended)

AV Video accepts only a human-readable credential label or reference. If a candidate Stream Plan, AV Video backup, browser import, handoff or edited field looks like a raw key or credential-bearing URL, reject the complete candidate before it changes the current document. Do not persist, preserve as an original import, render, copy, summarize, download, export or recover the rejected value.

**Benefits**

- Keeps raw stream keys out of `sbd.avVideo.v1`, `imports[].raw`, full backups, CSV, summaries, downloads and recovery copies.
- Makes the security promise testable with synthetic fixtures across import, save, reload, export and recovery.
- Keeps operator workflow explicit: the platform or encoder owns the secret; AV Video owns only the label used to find it.

**Costs and trade-offs**

- A legacy Stream Plan that contains a raw-looking key cannot be imported verbatim. The operator must replace the key in a separate safe copy with a label, then import that copy.
- AV Video cannot claim that it preserves an unsafe original payload. It preserves the original only after the complete payload passes credential screening.
- Pattern detection can produce false positives. The failure must identify the row and field without echoing the candidate value, preserve the current document unchanged and explain how to use a label.

**Risk:** Low residual disclosure risk inside AV Video; moderate compatibility risk for legacy plans that used `keyLabel` as a secret field.

### Option 2 — Keep warning-only behavior

Accept, save and export every `keyLabel` unchanged, while warning when it resembles a raw key.

**Benefits**

- Preserves the current Stream Plan behavior and the existing AV Video promise to retain every accepted original payload verbatim.
- Avoids import false positives and operator remediation before import.

**Costs and trade-offs**

- A warning does not prevent disclosure. A raw key can remain in browser storage, `imports[].raw`, JSON, CSV, summaries, full backups, recovery data and shared files.
- Every later export and recovery surface becomes credential-sensitive.
- The application cannot truthfully promise that its documents or backups are safe to share.

**Risk:** High and persistent disclosure risk.

## Recommendation

Choose **Option 1: block raw stream keys at every AV Video boundary**.

Confidence: **High**. The source establishes that the legacy page currently warns without blocking and that AV Video preserves accepted import text verbatim. Warning-only behavior therefore carries a detected value into every downstream copy. Rejecting the candidate before adoption is the only option that both preserves the current document and keeps the value out of AV Video's persistence and export surfaces.

## Required contract if Option 1 is approved

### Data model

- Stream records contain `keyLabel`, renamed in operator copy as **Credential label**, and never contain a secret-value field.
- Record Log adds no credential field; its existing fields and statuses remain unchanged.
- A credential label names a location or platform-owned entry, for example `Primary platform event key`. It must not contain the credential itself or a credential-bearing URL.

### Import and original preservation

- Screen the parsed candidate before preview fingerprinting is adopted, before `applyImport`, and before any write to the AV Video document.
- Scan Stream Plan `items[].keyLabel` and any restored AV Video Stream record credential-label field. Reject on the first unsafe field and report only its row number and field name.
- A rejected candidate never enters `imports[].raw`. The current document, baseline and stored original remain byte-for-byte unchanged.
- Preserve an accepted source verbatim in `imports[].raw` only after the whole candidate passes screening.
- Do not silently redact, hash or partially import an unsafe source. Those outcomes would break source fidelity without giving the operator a reviewable replacement.

### Editing, storage and recovery

- Apply the same validation before adding or editing a Stream credential label and before saving a document.
- If a future or externally produced AV Video document contains an unsafe value, fail closed before restore. Keep the current saved document unchanged and do not display the candidate value.
- If unsafe data is already the current stored baseline, open read-only with Save and share exports blocked. Offer only a local purge workflow that names affected rows without displaying values; approval and implementation of that recovery workflow belong to the dependent implementation brief.
- Never copy a rejected candidate into unreadable-data, draft-recovery or conflict-recovery storage.

### Export and sharing

- Validate the whole document immediately before full JSON, module JSON, CSV, Copy Summary and any handoff or show-package export.
- Block the entire operation on an unsafe value and identify only the affected row and field.
- Export credential labels normally after validation. Do not export secret-shaped values, masked fragments, hashes or partial credentials.

### Detection and test fixtures

- Start from the current legacy detector: a non-space string of at least 20 characters, or text matching `live_`, `sk_`, `key=` or an RTMP/RTMPS URL.
- Treat that detector as a compatibility baseline, not a complete credential classifier. Add provider-specific shapes only with public synthetic fixtures and a documented false-positive review.
- Tests use invented values only. They must never read browser profiles, environment variables, provider dashboards, encoder configuration or real production files.

## Exact consequences of approval

- Stream/Record implementation may proceed with credential-reference-only Stream records and unchanged Record Log fields.
- The import preview, native editor, persistence, full backup, module export, CSV, summary, handoff and recovery paths all receive one shared blocking validator and synthetic tests.
- The legacy `stream-plan.html` page remains warning-only unless a separately scoped compatibility change is approved; AV Video must still reject an unsafe legacy export.
- Existing six-family AV Video imports and their lossless originals remain unchanged.

## Exact consequences of choosing warning-only

- Stream Plan can be added with full legacy fidelity and lower migration friction.
- AV Video documents, stored originals, backups and recovery copies must be classified as potentially credential-bearing.
- Sharing and support guidance must warn operators to inspect every Stream Plan value manually; automated tests can verify warnings but cannot verify disclosure prevention.

## Work independent of the decision

The following design work can proceed without choosing a policy, but no dependent runtime change is authorized by this brief:

- Define typed Stream and Record rows from the field/status matrix.
- Preserve Record Log import, ordering, status, duration text and provenance behavior.
- Define optional-module visibility, empty states and reversible document storage.
- Build synthetic non-secret fixtures and acceptance cases for import preview, cancel, apply, repeat import and restore.

## Acceptance for the later implementation

- Synthetic unsafe candidates are rejected before preview adoption, save and export without their values appearing in UI, logs, snapshots or test output.
- The current document and stored baseline remain unchanged after every rejection.
- Safe labels survive import, original-payload retention, save, reload, JSON/CSV export, recovery and re-import unchanged.
- Record Log preserves every existing field and status and introduces no credential field.
- Existing six-family imports, storage key, schema compatibility and original downloads remain unchanged.

