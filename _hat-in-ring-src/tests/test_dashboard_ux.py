"""Anticipatory-UX layer regression test.

Builds the dashboard and drives its quick-filter / movers / "My adds" logic in a
headless DOM (tests/ux_check.js). Guards against predicate regressions like the
"My adds" rule over-matching real candidate ids (e.g. ``cruz``).

Skipped automatically if Node isn't on PATH (it is on the CI runner).
"""
from __future__ import annotations
import shutil
import subprocess
from datetime import date
from pathlib import Path

import pytest

from hatring.build import render

ROOT = Path(__file__).resolve().parent.parent
UXCHECK = Path(__file__).resolve().parent / "ux_check.js"


@pytest.mark.skipif(shutil.which("node") is None, reason="node not available")
def test_quick_filters_and_anticipatory_ux(tmp_path):
    out = tmp_path / "index.html"
    render(ROOT / "data" / "seed.json", ROOT / "templates", out, built=date(2026, 6, 13))
    res = subprocess.run(
        ["node", str(UXCHECK), str(out)],
        capture_output=True, text=True, timeout=60,
    )
    assert res.returncode == 0, f"UX check failed:\n{res.stdout}\n{res.stderr}"
    assert "PASS" in res.stdout
