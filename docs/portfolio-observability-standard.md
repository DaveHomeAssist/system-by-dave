# Portfolio observability and logging standard

**Version:** 1.0.0

**Owner type:** Platform / release engineering

**Applies to:** Frontier Signals, Frontier data lab, Hat in Ring, CurlPlan, and Phillies Wire

## Decision

Centralize operational logs at the workflow boundary, not inside a shared application runtime. Every product keeps its architecture, but collectors, tests, builders, deployers, and smoke checks emit the same one-object-per-line JSON format defined by schemas/run-event.schema.json.

The initial source of truth is GitHub Actions:

1. Emit JSON Lines to standard output for immediate browsing beside the failed step.
2. Upload the complete run-events.jsonl and release-manifest.json as named workflow artifacts with at least 30 days retention.
3. Put the GitHub run URL in every terminal event and manifest.
4. Use one correlation_id from source collection through deployment so a product release can be followed across workflows.

The central search destination should accept OTLP or JSON without changing the event contract. Grafana Cloud Loki plus Tempo is the recommended first destination because it supports log search, dashboards, alerts, and traces without binding application code to a vendor SDK. An OpenTelemetry Collector should perform the export. GitHub artifacts remain the immutable release evidence even after a drain is configured.

## Required fields

Every event includes:

- schema_version
- UTC timestamp
- severity
- product and environment
- event_type and status
- run_id and correlation_id
- commit_sha
- short human-readable message

Terminal events also include duration, counts, evidence URLs, and a sanitized error object when failed.

## Browsing and tracking

Use these default indexed labels only: product, environment, event_type, status, workflow, and severity. Keep run_id, correlation_id, and commit_sha as searchable fields. Do not turn URLs, error messages, source titles, or user-provided values into labels; that creates unbounded cardinality.

Recommended saved views:

- Failed or blocked production runs by product
- Latest deployment for each commit
- Collection freshness and rejected-record count
- Security-gate failures
- Release duration and retry rate
- Runs missing a terminal event

## Data handling

Never log secrets, bearer tokens, passwords, cookies, private user content, raw email addresses, or full request bodies. Log credential names and redacted suffixes only when diagnosis requires it. Source excerpts belong in evidence records, not operational logs. Production log retention defaults to 30 days; signed release manifests and security evidence follow the repository retention policy.

## Rollout

### Now

- Adopt the four versioned schemas.
- Add run IDs, correlation IDs, commit SHAs, and terminal statuses to each workflow.
- Upload structured run and release artifacts.

### Near term

- Deploy one OpenTelemetry Collector with authenticated ingestion.
- Drain GitHub Actions and production runtime events to the central store.
- Build the six saved views above and alerts for failed production runs and missing terminal events.

### Gate

A run is not green unless it has a terminal event, an attributable commit, verification evidence, a deployment result when applicable, and no secret-bearing fields.
