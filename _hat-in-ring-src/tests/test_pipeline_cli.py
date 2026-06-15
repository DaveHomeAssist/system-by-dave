"""CLI matrix, argument validation, and failure-resilience tests for the
hat-in-ring ingest pipeline.

These tests are OFFLINE and DETERMINISTIC:
  * no network is touched (sources are monkeypatched / --offline is used);
  * the build date is pinned via --today so output never depends on the wall clock;
  * pipeline.DATA is redirected to a tmp dir so the repo's real data/ is never mutated.

The behaviour under test is the pipeline's by-design resilience: each ingest
source (FEC, news) is wrapped in try/except so that one dead source logs an
error but still lets the dashboard build. See hatring/pipeline.py:run().
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

import pytest

from hatring import pipeline as P
from hatring import fec as fecmod
from hatring import news as newsmod

PINNED_TODAY = "2099-01-01"  # far-future, fixed -> no dependence on date.today()


@pytest.fixture
def data_sandbox(tmp_path, monkeypatch):
    """Redirect pipeline.DATA at a throwaway dir seeded with the real seed.json,
    so a build has records to render but the repo's data/ is never written."""
    data = tmp_path / "data"
    data.mkdir()
    # The real seed lives next to the package; copy it in as the dataset source.
    real_seed = P.DATA / "seed.json"
    shutil.copy(real_seed, data / "seed.json")
    monkeypatch.setattr(P, "DATA", data)
    return data


# --------------------------------------------------------------------------- #
# Argument validation                                                         #
# --------------------------------------------------------------------------- #

def test_no_args_errors_nonzero():
    """No action flags -> argparse p.error -> SystemExit(2), helpful message."""
    with pytest.raises(SystemExit) as ei:
        P.main([])
    assert ei.value.code == 2  # argparse error exit code


def test_unknown_flag_errors_nonzero():
    with pytest.raises(SystemExit) as ei:
        P.main(["--bogus"])
    assert ei.value.code == 2


def test_help_exits_zero():
    with pytest.raises(SystemExit) as ei:
        P.main(["--help"])
    assert ei.value.code == 0


@pytest.mark.parametrize("argv", [
    ["--build"],
    ["--all"],
    ["--fec"],
    ["--news"],
    ["--fec", "--build"],
])
def test_action_flags_pass_validation(argv, data_sandbox, monkeypatch):
    """Any single action flag must satisfy the 'nothing to do' guard.

    We neutralise the network sources so --fec/--news/--all don't reach out;
    --offline isn't passed here precisely to exercise the live-path try/except.
    """
    monkeypatch.setattr(fecmod, "FecClient", _BoomFecClient)
    monkeypatch.setattr(newsmod, "fetch_all", _boom_fetch_all)
    out = data_sandbox / "dash.html"
    rc = P.main(argv + ["--out", str(out), "--today", PINNED_TODAY])
    assert rc == 0


# --------------------------------------------------------------------------- #
# Failure resilience: a dead source must not kill the run                      #
# --------------------------------------------------------------------------- #

class _BoomFecClient:
    def __init__(self, *a, **k):
        pass

    def signals(self, *a, **k):
        raise RuntimeError("SIMULATED FEC OUTAGE")


def _boom_fetch_all(*a, **k):
    raise RuntimeError("SIMULATED NEWS OUTAGE")


def test_both_sources_dead_still_builds(data_sandbox, monkeypatch, caplog):
    """BOTH ingest sources raise on fetch. The pipeline must:
       * NOT propagate the exception,
       * LOG each failure,
       * STILL render the dashboard,
       * exit 0.
    """
    monkeypatch.setattr(fecmod, "FecClient", _BoomFecClient)
    monkeypatch.setattr(newsmod, "fetch_all", _boom_fetch_all)
    out = data_sandbox / "out" / "deep" / "dash.html"  # also exercises mkdir

    with caplog.at_level("ERROR", logger="hatring"):
        rc = P.main(["--all", "--out", str(out), "--today", PINNED_TODAY])

    assert rc == 0
    assert out.exists() and out.stat().st_size > 0
    msgs = "\n".join(r.getMessage() for r in caplog.records)
    assert "FEC fetch failed" in msgs
    assert "news fetch failed" in msgs


def test_one_dead_source_other_survives(data_sandbox, monkeypatch, caplog):
    """FEC raises but news returns real fixture items: the surviving source's
    data must still flow through classify+merge and the build still happens."""
    monkeypatch.setattr(fecmod, "FecClient", _BoomFecClient)

    fx = P.ROOT / "tests" / "fixtures" / "news_items.json"
    raw = json.loads(fx.read_text())
    monkeypatch.setattr(newsmod, "fetch_all",
                        lambda *a, **k: [newsmod.NewsItem(**r) for r in raw])

    out = data_sandbox / "dash.html"
    with caplog.at_level("ERROR", logger="hatring"):
        rc = P.main(["--all", "--out", str(out), "--today", PINNED_TODAY])

    assert rc == 0
    assert out.exists() and out.stat().st_size > 0
    msgs = "\n".join(r.getMessage() for r in caplog.records)
    assert "FEC fetch failed" in msgs          # dead source logged
    assert "news fetch failed" not in msgs     # live source did NOT error


# --------------------------------------------------------------------------- #
# --out parent-directory creation for deep paths                              #
# --------------------------------------------------------------------------- #

def test_out_creates_deep_parent_dirs(data_sandbox):
    """--out with a multi-level nonexistent parent path must create the dirs."""
    out = data_sandbox / "a" / "b" / "c" / "index.html"
    assert not out.parent.exists()
    rc = P.main(["--build", "--out", str(out), "--today", PINNED_TODAY])
    assert rc == 0
    assert out.exists() and out.stat().st_size > 0


def test_offline_build_is_deterministic_recency(data_sandbox):
    """Pinned --today must produce a build whose recency stamp is independent
    of the wall clock (two pinned builds agree on the as-of / generated_at)."""
    out1 = data_sandbox / "d1.html"
    out2 = data_sandbox / "d2.html"
    P.main(["--offline", "--build", "--out", str(out1), "--today", PINNED_TODAY])
    P.main(["--offline", "--build", "--out", str(out2), "--today", PINNED_TODAY])
    h1, h2 = out1.read_text(), out2.read_text()
    # The pinned recency anchor must appear identically in both renders.
    assert "2099-01-01T12:00:00" in h1
    assert "2099-01-01T12:00:00" in h2
