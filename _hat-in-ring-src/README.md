<div align="center">

# 🧭 Hat-in-Ring Radar — auto-ingest pipeline

![Python](https://img.shields.io/badge/python-3.11-3776AB?logo=python&logoColor=white)
![Data](https://img.shields.io/badge/data-FEC%20%2B%20Google%20News-1f9d55)
![Deploy](https://img.shields.io/badge/deploy-GitHub%20Actions%20%E2%86%92%20Pages-181717?logo=githubactions&logoColor=white)
![No API key](https://img.shields.io/badge/classifier-no%20API%20key-7d8794)

</div>

Turns the manually-seeded 2028 tracker into a self-updating one. It pulls
formal filings from the **FEC** and chatter from **Google News**, classifies
each item into the same signal model the dashboard uses, merges it into the
dataset, and rebuilds the self-contained `dashboard.html`.

```
FEC API ─┐
         ├─▶ classify (rules) ─▶ merge (dedup + status history) ─▶ candidates.json ─▶ build ─▶ dashboard.html
News RSS ┘                                                              │
                                                                  signals.jsonl (audit)
                                                                  review_queue.json (unmatched names)
```

---

## 🔌 What's actually wired (production-ready)

- ✅ **FEC ingest** (`hatring/fec.py`) — live OpenFEC API; presidential candidates
  for the cycle become `declared`/`exploratory` signals. Paginated, rate-limit
  back-off, name+FEC-id matching. **Validated against the live API.**
- ✅ **News ingest** (`hatring/news.py`) — Google News RSS, no key required;
  per-person + broad discovery queries; source-reliability → confidence ceiling.
  **Validated against the live feed.**
- **Classifier** (`hatring/classify.py`) — deterministic regex rules mapping
  headlines to signal keys, person-matching, confidence gating. No API key.
- **Scoring** (`hatring/scoring.py`) — Python port kept in exact parity with the
  dashboard's JS engine (enforced by `tests/test_scoring.py`).
- **Merge** (`hatring/merge.py`) — idempotent (audit log), status-history,
  delta from momentum snapshots, FEC auto-create, discovery review queue,
  never overwrites human-curated fields.
- **Build** (`hatring/build.py`) — re-renders the dashboard with fresh data
  inlined and the build date stamped (drives recency maths).
- **CI** (`.github/workflows/ingest.yml`) — daily schedule, runs tests, commits
  data, deploys to GitHub Pages.

---

## ⚙️ Setup

```bash
pip install -r requirements.txt
cp .env.example .env          # then paste your free FEC key
```

> [!TIP]
> Get a free FEC key (~30 seconds): https://api.data.gov/signup/
> `DEMO_KEY` works for light testing but is rate-limited.

---

## ▶️ Run

```bash
./run.sh                              # full pipeline: FEC + news + rebuild
python -m hatring.pipeline --news --build      # news only
python -m hatring.pipeline --build             # just rebuild the HTML
python -m hatring.pipeline --offline --build   # no network, uses fixtures
python -m hatring.pipeline --build --out public/index.html   # Pages-style entrypoint
python -m hatring.pipeline --all --today 2026-06-12   # pin "today" for recency
pytest -q                             # 21 unit tests
```

Outputs land in `data/`:

| Output | What it is |
|---|---|
| `candidates.json` | dataset |
| `dashboard.html` | hostable |
| `signals.jsonl` | audit trail |
| `review_queue.json` | unmatched names a human should triage |

---

## 🚀 Deploy (GitHub Pages)

The dashboard ships as a **live, auto-updating GitHub Pages URL**. The daily
Action (`.github/workflows/ingest.yml`) runs **ingest → tests → build → publish**:
it pulls fresh FEC + news, gates the build on the test suite, rebuilds
`public/index.html`, commits the refreshed dataset, and deploys the HTML to Pages
as a build artifact.

> [!NOTE]
> **Why the Actions-artifact source (not `/docs` or a `gh-pages` branch):** the
> published file is generated, not source. Committing it to `/docs` or `gh-pages`
> would pollute history with a 48 KB blob every day and risk merge conflicts with
> the data commit. The artifact path keeps the repo clean — `public/` stays
> git-ignored, the dataset (`data/*.json`) is the only thing committed back, and
> the live HTML is republished fresh each run.

### One-time setup (manual, in the GitHub UI)

1. Push this repo to GitHub.
2. **Settings → Pages → Build and deployment → Source: `GitHub Actions`.**
3. *(Optional)* **Settings → Secrets and variables → Actions → New repository
   secret**: `FEC_API_KEY` = your free key from https://api.data.gov/signup/.
   Without it the Action falls back to the rate-limited `DEMO_KEY`.
4. Run it once: **Actions → ingest → Run workflow** (or wait for 11:00 UTC).

> [!IMPORTANT]
> Your URL: **`https://<user>.github.io/<repo>/`** (project Pages), or
> `https://<user>.github.io/` for a `<user>.github.io` repo. The exact URL is
> printed in the workflow's **deploy** job summary.

> [!TIP]
> The header carries a visible **`As of <date> · ⟳ auto-built <timestamp>`** stamp
> so the data freshness of any published build is obvious at a glance.

### Local scheduling instead

To run on your own machine rather than Pages, add a cron line:
`0 6 * * * cd /path/to/hat-in-ring && ./run.sh` (writes `data/dashboard.html`).

---

## 🛡️ Human-in-the-loop

Automation only **adds** positive/behavioural signal keys and refreshes the
latest headline. It never edits your curated `why`, `role`, `bucket`, or quotes.

> [!IMPORTANT]
> Three guardrails keep the board trustworthy:
>
> - **Unknown names → review queue,** never the live board (parody/perennial FEC
>   filers and unmatched chatter don't auto-promote).
> - **Unknown FEC filers** are only surfaced if they have a registered principal
>   committee; the rest of the 367-name registry is dropped as noise.
> - **Denials/downgrades are never auto-applied.** An ambiguous headline like
>   "Slotkin won't rule out a bid but…" won't flip her to "Ruled out" — the
>   `ruledOut`/`barred` signal goes to review for human confirmation (validated
>   against live headlines). Triage it in the dashboard's **Review** screen.

Manual additions and edits survive future rebuilds (matched by id).

### 🔁 Review screen + decisions loop

The dashboard's **Review (N)** tab lists everything the pipeline routed to a
human — discoveries, ambiguous denials, and unmatched FEC filers — instead of
auto-applying. Each item has **Confirm** (apply the signal to the board) or
**Dismiss** (drop it). Decisions save in your browser; click **Export decisions**
to download `review_decisions.json`, commit it to `data/`, and the next rebuild
applies them:

| File | Purpose |
|---|---|
| `data/review_queue.json` | queued items (persisted across runs, deduped by rid) |
| `data/review_decisions.json` | human inbox: `[{rid, action}]` — consumed + emptied each run |
| `data/review_resolved.json` | resolved rids, so a confirmed/dismissed item never resurfaces |

`reconcile_review` (in `pipeline.py`) persists the queue across daily runs — a
flagged item no longer vanishes before a human acts — applies committed decisions
idempotently, and fails safe (a corrupt `review_decisions.json` is ignored, not a
crashed cron run). A `confirm` adds the item's keys to the named person (creating
a minimal record if new); curated fields are still never overwritten by automation.

---

## 🚧 Gaps / explicit non-goals

> [!WARNING]
> These are deliberate boundaries, not hidden breakage.

1. **Headline-only classification.** Rules read the RSS title + snippet, not full
   article bodies (Google News RSS doesn't supply them, and fetching each outlet
   raises paywall/ToS issues). Accuracy is good for explicit statements
   ("files statement of candidacy", "not ruling out") and weaker on hedged
   paraphrase. The `review_queue.json` + curated-field protection contain this.
2. **LLM adjudication is an opt-in stub.** `classify.classify_llm()` is a
   documented `NotImplementedError`. The deterministic engine is the supported
   default; wiring the Anthropic call is a one-function upgrade if you want it.
3. **FEC "exploratory" is inferred,** not a distinct filing — FEC has no
   exploratory form; testing-the-waters orgs surface via news, not the API.
4. **No early-state travel feed.** Travel signals come from news headlines only;
   a dedicated events/C-SPAN source would improve `earlyState` coverage.
5. **The Cowork sidebar artifact stays manual.** That view is sandboxed with no
   network, so it can't self-update. This pipeline regenerates a *hostable*
   dashboard (Pages/local) — point your bookmark there for the live one, or
   periodically paste the regenerated file back into Cowork.

---

## 🗂️ Layout

| Path | What |
|---|---|
| `config.yaml` | watchlist, aliases, FEC ids, discovery queries |
| `hatring/` | fec · news · classify · scoring · merge · build · pipeline |
| `templates/dashboard.html.j2` | the dashboard (data injected at build) |
| `data/seed.json` | canonical 40-record starting dataset |
| `tests/` | scoring parity · classifier · merge (pytest) |
| `.github/workflows/` | daily ingest + Pages deploy |
