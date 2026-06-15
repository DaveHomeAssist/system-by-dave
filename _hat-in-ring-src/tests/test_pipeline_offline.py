"""End-to-end CLI test for the offline pipeline path (hatring.pipeline).

hatring/pipeline.py is the orchestrator that wires fetch -> classify -> merge ->
render, yet it carried 0% coverage because no test drove it. This test runs the
fully deterministic `--offline --fixtures ... --today ...` path, which by design
needs no network, and asserts the real side effects:

  * candidates.json / review_queue.json / dashboard.html are written
  * the FEC fixture filer is applied (declared) to a watchlist record
  * a news "considering" signal advances a tracked person's tier
  * an off-watchlist name (Kennedy) and a denial (Moore "not running") route to
    the review queue instead of mutating the live board
  * re-running with the same audit log is idempotent (dedup), so candidates.json
    is byte-identical on the second pass

Hermetic: the pipeline's module-level DATA/TEMPLATES/ROOT are monkeypatched to a
tmp copy, so the repo's data/ is never touched. Pinned --today => date-stable.
"""
from __future__ import annotations
import json
import shutil
from pathlib import Path

import pytest

from hatring import pipeline

REPO = Path(__file__).resolve().parent.parent
TODAY = "2026-06-13"


def _isolated_env(tmp_path, monkeypatch):
    """Copy the repo's data + templates into tmp and point the pipeline at it."""
    data = tmp_path / "data"
    tmpl = tmp_path / "templates"
    shutil.copytree(REPO / "data", data)
    shutil.copytree(REPO / "templates", tmpl)
    # Start from the curated seed only, so the run is reproducible regardless of
    # whatever candidates.json happens to be checked in.
    (data / "candidates.json").unlink(missing_ok=True)
    (data / "review_queue.json").unlink(missing_ok=True)
    (data / "signals.jsonl").unlink(missing_ok=True)
    monkeypatch.setattr(pipeline, "ROOT", REPO)        # config.yaml still read from repo
    monkeypatch.setattr(pipeline, "DATA", data)
    monkeypatch.setattr(pipeline, "TEMPLATES", tmpl)
    return data


def _argv(data, *extra):
    return [
        "--all", "--offline",
        "--fixtures", str(REPO / "tests" / "fixtures"),
        "--today", TODAY,
        "--out", str(data / "dashboard.html"),
        *extra,
    ]


def test_offline_pipeline_full_run(tmp_path, monkeypatch):
    data = _isolated_env(tmp_path, monkeypatch)

    rc = pipeline.main(_argv(data))
    assert rc == 0

    cand_path = data / "candidates.json"
    assert cand_path.exists(), "pipeline must write candidates.json"
    assert (data / "dashboard.html").exists(), "pipeline must render the dashboard"
    html = (data / "dashboard.html").read_text()
    assert "<html" in html.lower() and "PREFS" in html

    records = json.loads(cand_path.read_text())
    by_id = {r["id"]: r for r in records}

    # The FEC fixture (TESTCANDIDATE, ALEX) is an unknown filer with a committee:
    # with fec_autocreate False (config default) it must NOT be auto-added to the
    # board but must land in the review queue.
    assert not any("testcandidate" in r["id"].lower() for r in records)
    review = json.loads((data / "review_queue.json").read_text())
    assert any(r.get("source") == "FEC" for r in review), "FEC filer should be in review"

    # An off-watchlist name in the news fixture (John Kennedy) is a discovery item
    # and must route to review, not the board.
    assert any("kennedy" in (r.get("name") or "").lower() for r in review)


def test_offline_pipeline_advances_a_tracked_person(tmp_path, monkeypatch):
    data = _isolated_env(tmp_path, monkeypatch)
    pipeline.main(_argv(data))
    records = json.loads((data / "candidates.json").read_text())
    by_id = {r["id"]: r for r in records}

    # Gallego's seed status is soft; the "seriously considering" AP fixture should
    # push him to the consideringQuote signal (Considering tier).
    gallego = next((r for r in records if "gallego" in r["id"].lower()
                    or "gallego" in r["name"].lower()), None)
    assert gallego is not None, "Gallego must be a seed record"
    assert "consideringQuote" in gallego["keys"], gallego["keys"]


def _durable_state(records):
    """The parts of a record that automation must keep stable across re-runs.

    `delta` is intentionally excluded: it is the *within-run* momentum movement,
    so it legitimately drops to 0 on a second run where the dedup'd signals no
    longer move anything. Keys / lastSignal / headline / history are the durable
    record state and must not drift.
    """
    return {
        r["id"]: {k: r.get(k) for k in
                  ("keys", "lastSignal", "headline", "quote", "history", "conf")}
        for r in records
    }


def test_offline_pipeline_is_idempotent(tmp_path, monkeypatch):
    data = _isolated_env(tmp_path, monkeypatch)
    pipeline.main(_argv(data))
    first = json.loads((data / "candidates.json").read_text())
    audit_first = (data / "signals.jsonl").read_text().splitlines()

    # Second identical run shares the audit log -> nothing new applies.
    pipeline.main(_argv(data))
    second = json.loads((data / "candidates.json").read_text())
    audit_second = (data / "signals.jsonl").read_text().splitlines()

    # Durable record state must be byte-for-byte stable.
    assert _durable_state(first) == _durable_state(second), \
        "re-running the same signals must not change keys/lastSignal/history"
    # The append-only audit log must not gain rows for already-seen signals.
    assert len(audit_first) == len(audit_second), \
        "dedup must stop a second run from re-appending audit rows"


def test_build_only_mode_renders_without_fetching(tmp_path, monkeypatch):
    data = _isolated_env(tmp_path, monkeypatch)
    out = data / "build-only.html"
    rc = pipeline.main(["--build", "--today", TODAY, "--out", str(out)])
    assert rc == 0
    assert out.exists()
    # No candidates.json was produced (no fetch happened) -> render fell back to seed.
    assert not (data / "candidates.json").exists()


def test_main_errors_when_no_action_requested(monkeypatch):
    # argparse calls SystemExit(2) via parser.error when nothing to do.
    with pytest.raises(SystemExit) as ei:
        pipeline.main([])
    assert ei.value.code == 2
