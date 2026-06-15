"""Differential Python<->JS scoring parity fuzz.

The dashboard ships two copies of the scoring model: the Python source of truth
in ``hatring/scoring.py`` and a JavaScript copy embedded in
``templates/dashboard.html.j2``. They MUST agree for every input or the static
HTML will show different numbers than the pipeline computed.

This test extracts the REAL JS scoring functions verbatim from the template
(so it tracks weight/threshold edits automatically), then fuzzes a seeded set of
randomized candidates through both engines and asserts identical
``(momentum, tier, statusLabel)`` for every one.

Determinism / offline:
  * Seeded RNG (fixed SEED, fixed N) -> same inputs every run.
  * Pinned TODAY (no dependence on the wall clock).
  * Node is invoked with TZ=UTC, matching the GitHub Actions runner and the
    Python date arithmetic. (The JS engine's millisecond math is timezone
    sensitive at extreme date-line offsets; see
    ``test_recency_band_edge_is_timezone_sensitive`` which documents that as a
    known, separately-tracked issue.)
  * Skipped automatically if Node is not on PATH.
"""
from __future__ import annotations

import json
import os
import random
import shutil
import subprocess
import textwrap
from datetime import date, timedelta
from pathlib import Path

import pytest

from hatring.scoring import WEIGHTS, derive_status, momentum

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / "templates" / "dashboard.html.j2"

TODAY = date(2026, 6, 12)   # pinned build date (matches captured golden values)
SEED = 20260612
N = 4000

ALLKEYS = list(WEIGHTS.keys())
# Adversarial non-signal keys: must be ignored identically by both engines.
JUNK_KEYS = ["bogus", "", "DECLARED", "donors ", "withdrew", "rumored", "vp"]

# JS runner: pulls the WEIGHTS block and the scoring fns straight out of the
# template, sets GENERATED_AT exactly like hatring/build.py
# (``built.isoformat() + "T12:00:00"``), then maps stdin JSONL -> stdout lines
# of ``<momentum> <tier> <json-quoted-label>``.
_JS_RUNNER = textwrap.dedent(r"""
    const fs = require('fs');
    const tplPath = process.argv[2];
    const today = process.argv[3];
    const tpl = fs.readFileSync(tplPath, 'utf8');
    const scripts = [...tpl.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    const main = scripts.find((s) => s.includes('GENERATED_AT'));
    if (!main) { console.error('no dashboard script'); process.exit(65); }
    function slice(src, a, b) {
      const i = src.indexOf(a); if (i < 0) throw new Error('marker ' + a);
      const j = src.indexOf(b, i); if (j < 0) throw new Error('endmarker ' + b);
      return src.slice(i, j);
    }
    const weightsBlock = slice(main, 'const WEIGHTS = {', '\nconst CONF');
    const fnBlock = slice(main, 'function daysSince', '\n/* ===');
    const GENERATED_AT = today + 'T12:00:00';
    const TODAY = new Date(GENERATED_AT);
    const fn = new Function('TODAY', 'Math', 'Date',
      weightsBlock + '\n' + fnBlock + '\nreturn {deriveStatus, score};');
    const { deriveStatus, score } = fn(TODAY, Math, Date);
    const lines = fs.readFileSync(0, 'utf8').split('\n').filter((l) => l.trim());
    const out = [];
    for (const line of lines) {
      const c = JSON.parse(line);
      const st = deriveStatus(c.keys);
      out.push(score(c) + ' ' + st.tier + ' ' + JSON.stringify(st.label));
    }
    process.stdout.write(out.join('\n') + '\n');
""")


def _gen_inputs():
    rng = random.Random(SEED)
    inputs = []
    for _ in range(N):
        pool = ALLKEYS + (JUNK_KEYS if rng.random() < 0.15 else [])
        keys = rng.sample(pool, rng.randint(0, len(pool)))
        off = rng.randint(-200, 10)  # -200..+10 days around TODAY
        inputs.append({"keys": keys, "lastSignal": (TODAY + timedelta(days=off)).isoformat()})
    return inputs


@pytest.mark.skipif(shutil.which("node") is None, reason="node not available")
def test_python_js_scoring_parity_fuzz(tmp_path):
    runner = tmp_path / "runner.js"
    runner.write_text(_JS_RUNNER)

    inputs = _gen_inputs()
    jsonl = "\n".join(json.dumps(c) for c in inputs)

    env = dict(os.environ, TZ="UTC")  # match Python date math + CI runner
    res = subprocess.run(
        ["node", str(runner), str(TEMPLATE), TODAY.isoformat()],
        input=jsonl, capture_output=True, text=True, timeout=120, env=env,
    )
    assert res.returncode == 0, f"node runner failed:\n{res.stderr[-2000:]}"

    js_lines = res.stdout.strip().split("\n")
    assert len(js_lines) == N, f"expected {N} js results, got {len(js_lines)}"

    divergences = []
    for c, jl in zip(inputs, js_lines):
        ptier, plabel = derive_status(c["keys"])
        psc = momentum(c["keys"], c["lastSignal"], TODAY)
        s, t, lab = jl.split(" ", 2)
        got = (int(s), int(t), json.loads(lab))
        if (psc, ptier, plabel) != got:
            divergences.append((c, (psc, ptier, plabel), got))

    assert not divergences, (
        f"{len(divergences)} Python/JS scoring divergences (showing first 10):\n"
        + "\n".join(
            f"  {json.dumps(c)}\n    PY={p} JS={j}" for c, p, j in divergences[:10]
        )
    )


@pytest.mark.skipif(shutil.which("node") is None, reason="node not available")
def test_known_golden_values_match_both_engines(tmp_path):
    """The four captured golden candidates render identically in PY and JS."""
    runner = tmp_path / "runner.js"
    runner.write_text(_JS_RUNNER)
    cases = [
        (["consideringQuote", "earlyState", "donors", "staffing", "mediaBlitz"], "2026-05-28", 60, 3),
        (["donors", "staffing", "mediaBlitz"], "2026-06-03", 30, 2),
        (["barred"], "2026-05-01", 0, 0),
        (["declared"], "2026-02-15", 30, 5),
    ]
    jsonl = "\n".join(json.dumps({"keys": k, "lastSignal": d}) for k, d, _, _ in cases)
    env = dict(os.environ, TZ="UTC")
    res = subprocess.run(
        ["node", str(runner), str(TEMPLATE), TODAY.isoformat()],
        input=jsonl, capture_output=True, text=True, timeout=60, env=env,
    )
    assert res.returncode == 0, res.stderr
    for (keys, d, exp_sc, exp_t), jl in zip(cases, res.stdout.strip().split("\n")):
        s, t, _ = jl.split(" ", 2)
        assert (int(s), int(t)) == (exp_sc, exp_t), f"JS {keys}->{jl} != {exp_sc}/{exp_t}"
        assert momentum(keys, d, TODAY) == exp_sc
        assert derive_status(keys)[0] == exp_t


@pytest.mark.skipif(shutil.which("node") is None, reason="node not available")
def test_recency_band_edge_is_timezone_sensitive(tmp_path):
    """KNOWN ISSUE (documented, not a flake): the JS momentum is timezone
    sensitive at the recency band edges (days_since == 30 and == 90).

    ``build.py`` renders ``GENERATED_AT`` as ``"<date>T12:00:00"`` with no
    timezone, so JS parses TODAY in *local* time while date-only signal strings
    parse as UTC midnight. At extreme date-line offsets (UTC-12 / UTC+13+) the
    local-noon anchor shifts day counts by +-1, flipping the +5 boost / -10
    stale band and producing a momentum that differs from Python by 5-10 points.
    Tier/label never diverge (the status axis is date-independent).

    This test asserts the divergence is *exactly* this shape so a future change
    that either fixes it (use a UTC/no-time anchor) or widens it gets flagged.
    """
    runner = tmp_path / "runner.js"
    runner.write_text(_JS_RUNNER)
    # In Etc/GMT+12 the local-noon TODAY pushes JS day-counts +1 vs Python:
    #   2026-05-13: py days_since 30 (boost) -> js 31 (no boost): JS loses +5
    #   2026-03-14: py days_since 90 (ok)    -> js 91 (stale):    JS adds -10
    cases = [
        (["earlyState"], "2026-05-13"),   # py days_since 30 (recency boost)
        (["donors"], "2026-03-14"),       # py days_since 90 (just inside fresh)
    ]
    jsonl = "\n".join(json.dumps({"keys": k, "lastSignal": d}) for k, d in cases)

    # UTC: must agree.
    env_utc = dict(os.environ, TZ="UTC")
    r_utc = subprocess.run(
        ["node", str(runner), str(TEMPLATE), TODAY.isoformat()],
        input=jsonl, capture_output=True, text=True, timeout=60, env=env_utc,
    )
    assert r_utc.returncode == 0, r_utc.stderr
    for (keys, d), jl in zip(cases, r_utc.stdout.strip().split("\n")):
        s, _, _ = jl.split(" ", 2)
        assert int(s) == momentum(keys, d, TODAY), "UTC parity must hold"

    # UTC-12: JS diverges by the recency band amount, tier still matches.
    env_far = dict(os.environ, TZ="Etc/GMT+12")
    r_far = subprocess.run(
        ["node", str(runner), str(TEMPLATE), TODAY.isoformat()],
        input=jsonl, capture_output=True, text=True, timeout=60, env=env_far,
    )
    assert r_far.returncode == 0, r_far.stderr
    deltas = []
    for (keys, d), jl in zip(cases, r_far.stdout.strip().split("\n")):
        s, t, _ = jl.split(" ", 2)
        py_sc = momentum(keys, d, TODAY)
        py_t = derive_status(keys)[0]
        deltas.append(int(s) - py_sc)
        assert int(t) == py_t, "tier must stay in parity even across timezones"
    # earlyState@30d loses +5 boost; donors@90d gains -10 stale, in JS only.
    assert deltas == [-5, -10], f"unexpected band-edge deltas: {deltas}"
