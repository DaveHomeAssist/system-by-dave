import copy
import fcntl
import subprocess
import sys
import zipfile
import json
from pathlib import Path
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from startup import FixtureBridge, StartupError, display_problems, readiness, resolve, run, save, validate_profile


def fixture():
    lanes = ['control', 'A', 'B', 'C', 'D']
    profile = {'schemaVersion': 1, 'showPath': '/fixture/approved.millumin', 'showSHA256': 'a' * 64,
               'routes': {'CH1': 'C', 'CH2': 'D', 'CH3': 'A', 'CH4': 'B', 'boost': 'B'}, 'displays': []}
    snapshot = {'schemaVersion': 1, 'displays': [], 'millumin': {'showSHA256': 'a' * 64, 'controlDisplayID': 10, 'fullscreen': True}}
    for i, lane in enumerate(lanes):
        mode = {'width': 1920, 'height': 1080 if i == 0 else 1200, 'pixelWidth': 1920,
                'pixelHeight': 1080 if i == 0 else 1200, 'refreshRate': 60 if i == 0 else 59.95,
                'x': i * 1920, 'y': 0, 'main': i == 0, 'mirrored': False, 'rotation': 0,
                'colorMode': 'fixture-rgb8'}
        identity = {'vendor': 100, 'product': 200, 'serial': 300 if i == 0 else 0}
        profile['displays'].append({'lane': lane, 'connector': 'fixture-port-%s' % i, 'identity': identity, 'mode': mode})
        snapshot['displays'].append({'id': 10 + i, 'connector': 'fixture-port-%s' % i, 'identity': identity,
                                     'active': True, 'mode': copy.deepcopy(mode)})
    snapshot['millumin']['routes'] = {c: 10 + lanes.index(l) for c, l in profile['routes'].items()}
    return profile, snapshot


class Tests(unittest.TestCase):
    def setUp(self):
        self.profile, self.snapshot = fixture()

    def execute(self, bridge=None, **kwargs):
        return run(self.profile, bridge or FixtureBridge(self.snapshot), timeout=.015, interval=.001, **kwargs)

    def test_complete_startup(self):
        b = FixtureBridge(self.snapshot)
        r = self.execute(b)
        self.assertTrue(r['computerReady'])
        self.assertFalse(r['showNightReady'])
        self.assertEqual([c for c in b.calls if c != 'observe'], ['capabilities', 'restore', 'openShow', 'fullscreen'])

    def test_changed_ids_use_current_handles(self):
        for d in self.snapshot['displays']:
            d['id'] += 400
        self.snapshot['millumin']['controlDisplayID'] += 400
        self.snapshot['millumin']['routes'] = {c: i + 400 for c, i in self.snapshot['millumin']['routes'].items()}
        self.snapshot['displays'].reverse()
        b = FixtureBridge(self.snapshot)
        self.assertTrue(self.execute(b)['computerReady'])
        self.assertEqual(resolve(self.profile, b.snapshot)['control']['id'], 410)

    def test_each_missing_display_blocks_writes(self):
        for i in range(5):
            with self.subTest(i=i):
                s = copy.deepcopy(self.snapshot)
                s['displays'].pop(i)
                b = FixtureBridge(s)
                self.assertFalse(self.execute(b)['computerReady'])
                self.assertEqual(set(b.calls), {'capabilities', 'observe'})

    def test_duplicate_connector_and_extra_display(self):
        for change in ('duplicate', 'extra', 'inactive', 'wrongIdentity', 'duplicateID'):
            with self.subTest(change=change):
                s = copy.deepcopy(self.snapshot)
                if change == 'duplicate': s['displays'][1]['connector'] = s['displays'][0]['connector']
                if change == 'extra': s['displays'].append(copy.deepcopy(s['displays'][0]))
                if change == 'inactive': s['displays'][2]['active'] = False
                if change == 'wrongIdentity': s['displays'][2]['identity'] = {'vendor': 999}
                if change == 'duplicateID': s['displays'][2]['id'] = 10
                b = FixtureBridge(s)
                self.assertFalse(self.execute(b)['computerReady'])
                self.assertNotIn('restore', b.calls)

    def test_warm_never_mutates(self):
        b = FixtureBridge(self.snapshot)
        self.assertTrue(self.execute(b, warm=True)['computerReady'])
        self.assertEqual(set(b.calls), {'capabilities', 'observe'})
        b.snapshot['displays'][1]['mode']['height'] = 1080
        self.assertFalse(self.execute(b, warm=True)['computerReady'])
        self.assertEqual(set(b.calls), {'capabilities', 'observe'})

    def test_mode_acknowledgement_is_not_readback(self):
        class FailedRestore(FixtureBridge):
            def call(self, action, payload):
                if action == 'restore':
                    self.calls.append(action)
                    return {}
                return super().call(action, payload)
        self.snapshot['displays'][1]['mode']['pixelHeight'] = 1080
        b = FailedRestore(self.snapshot)
        self.assertFalse(self.execute(b)['computerReady'])
        self.assertNotIn('openShow', b.calls)

    def test_wrong_or_unavailable_routing_blocks_fullscreen(self):
        for routes in ({}, {'CH1': 10}, None):
            s = copy.deepcopy(self.snapshot)
            s['millumin']['routes'] = routes
            b = FixtureBridge(s)
            self.assertFalse(self.execute(b)['computerReady'])
            self.assertNotIn('fullscreen', b.calls)

    def test_bridge_failure_is_recorded(self):
        class Broken(FixtureBridge):
            def call(self, action, payload): raise StartupError('Bridge unavailable.')
        self.assertEqual(self.execute(Broken(self.snapshot))['message'], 'Bridge unavailable.')

    def test_unstable_ids_timeout(self):
        class Unstable(FixtureBridge):
            def call(self, action, payload):
                s = super().call(action, payload)
                if action == 'observe': self.snapshot['displays'][0]['id'] += 1
                return s
        self.assertFalse(self.execute(Unstable(self.snapshot))['computerReady'])

    def test_partial_restore_does_not_launch(self):
        class Partial(FixtureBridge):
            def call(self, action, payload):
                if action == 'restore':
                    super().call(action, payload)
                    self.snapshot['displays'].pop()
                    return {}
                return super().call(action, payload)
        b = Partial(self.snapshot)
        self.assertFalse(self.execute(b)['computerReady'])
        self.assertNotIn('openShow', b.calls)

    def test_ready_requires_current_run_and_every_crew_check(self):
        r = self.execute(warm=True)
        e = {'runID': r['runID'], 'operator': 'Fixture operator', 'surfacesAtoD': True, 'approvedShow': True,
             'testCardsRemoved': True, 'openingLookRestored': True, 'warningsReviewed': True}
        self.assertTrue(readiness(r, e, self.snapshot, self.profile)['showNightReady'])
        for key in e:
            bad = dict(e)
            bad[key] = False if key not in ('runID', 'operator') else ''
            self.assertFalse(readiness(r, bad, self.snapshot, self.profile)['showNightReady'])
        later = datetime.fromisoformat(r['createdAt']) + timedelta(minutes=16)
        self.assertFalse(readiness(r, e, self.snapshot, self.profile, later)['showNightReady'])
        self.snapshot['displays'][1]['id'] += 100
        self.assertFalse(readiness(r, e, self.snapshot, self.profile)['showNightReady'])

    def test_delayed_display_recovers(self):
        class Delayed(FixtureBridge):
            def call(self, action, payload):
                result = super().call(action, payload)
                if action == 'observe' and len(self.calls) < 3:
                    result['displays'].pop()
                return result
        self.assertTrue(self.execute(Delayed(self.snapshot))['computerReady'])

    def test_cli_readiness_and_concurrency(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            for name, value in [('profile', self.profile), ('snapshot', self.snapshot)]:
                (root / (name + '.json')).write_text(json.dumps(value))
            cmd = [sys.executable, str(Path(__file__).with_name('startup.py')), '--profile', str(root / 'profile.json'),
                   '--fixture', str(root / 'snapshot.json'), '--receipt', str(root / 'receipt.json'), '--warm']
            result = subprocess.run(cmd, capture_output=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            receipt = json.loads((root / 'receipt.json').read_text())
            e = dict(runID=receipt['runID'], operator='Crew', surfacesAtoD=True, approvedShow=True,
                     testCardsRemoved=True, openingLookRestored=True, warningsReviewed=True)
            (root / 'crew.json').write_text(json.dumps(e))
            result = subprocess.run(cmd + ['--verify-ready', '--crew-evidence', str(root / 'crew.json')], capture_output=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(json.loads((root / 'receipt.json').read_text())['showNightReady'])
            with open(root / '.frozen-startup.lock', 'a') as lock:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                result = subprocess.run(cmd, capture_output=True)
                self.assertEqual(result.returncode, 3)

    def test_deterministic_package_and_extracted_suite(self):
        import package
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            package.build(root)
            data = (root / 'Frozen-Startup-0.2.0.zip').read_bytes()
            package.build(root)
            self.assertEqual(data, (root / 'Frozen-Startup-0.2.0.zip').read_bytes())
            with zipfile.ZipFile(root / 'Frozen-Startup-0.2.0.zip') as archive:
                self.assertEqual(set(archive.namelist()), {'Frozen Startup/' + n for n in package.FILES})

    def test_malformed_observations_fail_cleanly(self):
        for value in (None, [], {}, {'schemaVersion': 1, 'displays': [None] * 5}):
            class Malformed(FixtureBridge):
                def call(self, action, payload): return value
            self.assertFalse(self.execute(Malformed(self.snapshot))['computerReady'])

    def test_changed_id_before_fullscreen_stops(self):
        class Race(FixtureBridge):
            def call(self, action, payload):
                result = super().call(action, payload)
                # After the third stable routing observation, change the next read.
                if action == 'openShow': self.routing_reads = 0
                if action == 'observe' and hasattr(self, 'routing_reads'):
                    self.routing_reads += 1
                    if self.routing_reads == 4: result['displays'][1]['id'] += 100
                return result
        b = Race(self.snapshot)
        self.assertFalse(self.execute(b)['computerReady'])
        self.assertNotIn('fullscreen', b.calls)

    def test_incomplete_native_adapter_cannot_restore(self):
        class Incomplete(FixtureBridge):
            def call(self, action, payload):
                if action == 'capabilities': return {'startup': False}
                return super().call(action, payload)
        b = Incomplete(self.snapshot)
        result = self.execute(b)
        self.assertFalse(result['computerReady'])
        self.assertNotIn('restore', b.calls)

    def test_bad_profile_and_private_atomic_receipt(self):
        self.profile['displays'][1]['connector'] = self.profile['displays'][0]['connector']
        with self.assertRaises(StartupError): validate_profile(self.profile)
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'receipt.json'
            save(path, {'ok': True})
            self.assertEqual(json.loads(path.read_text()), {'ok': True})
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)


if __name__ == '__main__': unittest.main()
