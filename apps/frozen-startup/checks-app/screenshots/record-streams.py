#!/usr/bin/env python3
"""Record real check streams from startup.py fixture runs for screenshot review (not shipped)."""
import copy
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
APP = HERE.parent.parent
PROFILE = APP / 'example-profile.json'


def startup(receipt, fixture, *extra):
    return subprocess.run([sys.executable, '-B', str(APP / 'startup.py'), '--profile', str(PROFILE),
                           '--fixture', str(fixture), '--receipt', str(receipt), '--events', '-', *extra],
                          capture_output=True, text=True, timeout=60).stdout


def main(out):
    out.mkdir(parents=True, exist_ok=True)
    snapshot = json.loads((APP / 'example-snapshot.json').read_text())
    missing = copy.deepcopy(snapshot)
    missing['displays'].pop()
    (out / 'snapshot-missing-d.json').write_text(json.dumps(missing))

    passing = out / 'pass.receipt.json'
    (out / 'pass.jsonl').write_text(startup(passing, APP / 'example-snapshot.json'))
    (out / 'fail.jsonl').write_text(startup(out / 'fail.receipt.json', out / 'snapshot-missing-d.json'))

    # Fixture readiness must use a warm run: a startup run changes the in-memory fixture, so a fresh
    # fixture observation would not match. On the Studio the bridge observes the live machine instead.
    warm = out / 'warm.receipt.json'
    (out / 'warm.jsonl').write_text(startup(warm, APP / 'example-snapshot.json', '--warm'))
    evidence = out / 'crew.json'
    evidence.write_text(json.dumps({'runID': json.loads(warm.read_text())['runID'], 'operator': 'Crew operator',
                                    'surfacesAtoD': True, 'approvedShow': True, 'testCardsRemoved': True,
                                    'openingLookRestored': True, 'warningsReviewed': True}))
    (out / 'ready.jsonl').write_text(startup(warm, APP / 'example-snapshot.json', '--warm', '--verify-ready', '--crew-evidence', str(evidence)))
    for name in ('pass', 'fail', 'warm', 'ready'):
        print(name, len((out / (name + '.jsonl')).read_text().splitlines()), 'events')


if __name__ == '__main__':
    main(Path(sys.argv[1]))
