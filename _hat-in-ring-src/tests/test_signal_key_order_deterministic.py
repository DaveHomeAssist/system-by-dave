"""Regression test: signal-key ordering must be deterministic across processes.

The merge dedup id (sid) for a news signal is built as
    person | ','.join(classified.keys) | url   (see hatring/merge.py)
so if classify produces the same keys in a different ORDER on a second run
(e.g. a fresh CI process with a different PYTHONHASHSEED), the sid changes and
the append-only audit log (data/signals.jsonl) dedup is defeated -> duplicate
audit rows accumulate on every other daily run.

Root cause: hatring/classify.py uses sorted(set(keys), key=lambda k:
-STRENGTH.get(k,0)); behaviour-only keys all have STRENGTH 0, so the sort ties
and the order falls back to set() iteration, which is hash-seed dependent.

This test is offline and date-independent. It (1) asserts classify is
order-stable for a behaviour-only headline, and (2) asserts the keys list is in
a total order so the derived sid is reproducible.
"""
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

_SNIPPET = (
    "from hatring.classify import classify_item\n"
    "class I:\n"
    "    title='Newsom to headline New Hampshire Democratic fundraiser'\n"
    "    summary='Early-state travel and donor outreach.'\n"
    "    url='u'; source='AP'; published='2026-06-11'\n"
    "    confidence_ceiling='High'\n"
    "c=classify_item(I(), [{'id':'newsom','name':'Gavin Newsom','aliases':['Newsom']}])\n"
    "print(','.join(c.keys))\n"
)


def _keys_for_seed(seed: str) -> str:
    env = dict(os.environ)
    env['PYTHONHASHSEED'] = seed
    env['PYTHONPATH'] = str(ROOT)
    out = subprocess.check_output(
        [sys.executable, '-c', _SNIPPET], env=env, cwd=str(ROOT), text=True)
    return out.strip()


def test_classify_key_order_is_hashseed_independent():
    """Same headline -> same key order regardless of PYTHONHASHSEED.

    Fails on the current code (sorted(set(...)) with all-tied sort keys),
    passes once classify uses a total order, e.g.
        sorted(set(keys), key=lambda k: (-STRENGTH.get(k, 0), k)).
    """
    results = {_keys_for_seed(s) for s in ('0', '1', '2', '3', '4')}
    assert len(results) == 1, (
        'classify produced different key orderings across hash seeds: '
        f'{results}. The merge sid (person|keys|url) is therefore unstable and '
        'signals.jsonl dedup will accumulate duplicate rows.'
    )


def test_classify_keys_have_total_order_locally():
    """In-process sanity: behaviour-only keys come back in a stable, sorted form."""
    from hatring.classify import classify_item

    class I:
        title = 'Newsom to headline New Hampshire Democratic fundraiser'
        summary = 'Early-state travel and donor outreach.'
        url = 'u'
        source = 'AP'
        published = '2026-06-11'
        confidence_ceiling = 'High'

    c = classify_item(I(), [{'id': 'newsom', 'name': 'Gavin Newsom',
                             'aliases': ['Newsom']}])
    assert set(c.keys) == {'earlyState', 'donors'}
    # A total order means the list equals its own sorted form when strengths tie.
    tied = [k for k in c.keys if k in ('earlyState', 'donors')]
    assert tied == sorted(tied), (
        f'tied behaviour keys not in a deterministic order: {tied}')
