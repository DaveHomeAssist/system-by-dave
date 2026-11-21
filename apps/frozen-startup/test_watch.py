"""Watch mode: what it checks, what it reports, and the proof that it only ever looks."""
import ast
import copy
import json
import os
import subprocess
import sys
import tempfile
import threading
import unittest
import urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import watch
from startup import FixtureBridge, StartupError, profile_digest, run
from test_startup import fixture

HERE = Path(__file__).resolve().parent
EXAMPLE_PROFILE = json.loads((HERE / 'example-profile.json').read_text())
EXAMPLE_SNAPSHOT = json.loads((HERE / 'example-snapshot.json').read_text())
TOKEN = 'status-token-for-tests-0123456789abcdef'


class FakeRelay:
    """A local stand-in for the Projctl relay that records every request it receives."""

    def __init__(self, projectors=None, health=None, accept=True):
        self.requests, self.reports = [], []
        self.projectors = projectors if projectors is not None else [
            {'slot': 'P%d' % i, 'lane': lane, 'online': True, 'current': True, 'power': 'on', 'shutter': 'open'} for i, lane in enumerate('ABCD', 1)]
        self.health = health if health is not None else {'ok': True, 'service': 'projctl'}
        self.accept = accept
        relay = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def reply(self, code, payload):
                data = json.dumps(payload).encode()
                self.send_response(code)
                self.send_header('content-type', 'application/json')
                self.send_header('content-length', str(len(data)))
                self.end_headers()
                self.wfile.write(data)

            def do_GET(self):
                relay.requests.append(('GET', self.path, self.headers.get('authorization')))
                if self.path == '/api/health':
                    self.reply(200, relay.health)
                elif self.path == '/api/mac-status/projectors':
                    if self.headers.get('authorization') != 'Bearer ' + TOKEN:
                        self.reply(401, {'error': 'login required'})
                    else:
                        self.reply(200, {'ok': True, 'projectors': relay.projectors})
                else:
                    self.reply(404, {'error': 'not found'})

            def do_POST(self):
                length = int(self.headers.get('content-length') or 0)
                body = json.loads(self.rfile.read(length) or b'{}')
                relay.requests.append(('POST', self.path, self.headers.get('authorization')))
                if self.path != '/api/mac-status':
                    return self.reply(404, {'error': 'not found'})
                if self.headers.get('authorization') != 'Bearer ' + TOKEN:
                    return self.reply(401, {'error': 'login required'})
                if not relay.accept:
                    return self.reply(400, {'error': 'refused'})
                relay.reports.append(body)
                self.reply(200, {'ok': True})

        self.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        self.url = 'http://127.0.0.1:%d' % self.server.server_address[1]
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def close(self):
        self.server.shutdown()
        self.server.server_close()


class Base(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)
        self.state = Path(self.dir.name)
        self.profile = copy.deepcopy(EXAMPLE_PROFILE)
        self.snapshot = copy.deepcopy(EXAMPLE_SNAPSHOT)
        self.token_file = self.state / 'status-token'
        self.token_file.write_text(TOKEN + '\n')
        os.chmod(self.token_file, 0o600)

    def bridge(self):
        return FixtureBridge(self.snapshot)

    def cfg(self, **extra):
        self.profile['watch'].update(extra)
        return watch.watch_config(self.profile)

    def cycle(self, bridge=None, cfg=None, baseline='startup', **kwargs):
        if baseline == 'startup':
            baseline = self.with_baseline()  # what a startup run leaves behind; the four projector displays share one identity
        bridge = watch.ReadOnlyBridge(bridge or self.bridge())
        cfg = cfg or self.cfg()
        checks, baseline, _ = watch.watch_cycle(self.profile, cfg, bridge, baseline, self.state, boot='boot-1', **kwargs)
        return {c['id']: c for c in checks}, baseline

    def with_baseline(self, bridge=None):
        bridge = bridge or self.bridge()
        return watch.capture_baseline(self.profile, bridge, self.state, run_id='run-1',
                                      lanes={d['lane']: self.snapshot['displays'][i]['id'] for i, d in enumerate(self.profile['displays'])}, boot='boot-1')


class CheckTests(Base):
    def test_example_fixture_passes_and_is_honest_about_what_is_off(self):
        checks, _ = self.cycle()
        self.assertEqual(watch.overall(list(checks.values())), 'ok')
        self.assertEqual({k: v['status'] for k, v in checks.items()},
                         {'displays': 'PASS', 'millumin': 'PASS', 'show': 'PASS', 'power': 'PASS', 'disk': 'PASS', 'thermal': 'PASS',
                          'memory': 'PASS', 'media': 'PASS', 'relay': 'NOT CONFIGURED'})
        self.assertNotIn('projectors', checks)  # not this Mac's check
        self.assertNotIn('pixel', checks)

    def test_each_display_fault_turns_displays_red(self):
        baseline = self.with_baseline()
        cases = {
            'missing': lambda s: s['displays'].pop(2),
            'inactive': lambda s: s['displays'][1].__setitem__('active', False),
            'refresh': lambda s: s['displays'][1]['mode'].__setitem__('refreshRate', 50.0),
            'resolution': lambda s: s['displays'][3]['mode'].__setitem__('width', 1280),
            'identity': lambda s: s['displays'][2]['identity'].__setitem__('serial', 999),
            'extra': lambda s: s['displays'].append(copy.deepcopy(s['displays'][0])),
        }
        for name, change in cases.items():
            with self.subTest(name):
                self.snapshot = copy.deepcopy(EXAMPLE_SNAPSHOT)
                change(self.snapshot)
                checks, _ = self.cycle(baseline=copy.deepcopy(baseline))
                self.assertEqual(checks['displays']['status'], 'FAIL', checks['displays'])
                self.assertEqual(watch.overall(list(checks.values())), 'fault')

    def test_displays_without_baseline_need_a_unique_identity(self):
        checks, _ = self.cycle(baseline=None)  # A, B, C and D share one identity in the fixture
        self.assertEqual(checks['displays']['status'], 'FAIL')
        self.assertIn('startup check first', checks['displays']['observed'])

    def test_millumin_must_be_the_same_process_as_at_startup(self):
        baseline = self.with_baseline()
        self.assertEqual(baseline['source'], 'startup')
        checks, _ = self.cycle(baseline=copy.deepcopy(baseline))
        self.assertIn('same process as at startup', checks['millumin']['observed'])
        self.snapshot['watch']['millumin']['processes'][0]['pid'] = 9999
        checks, _ = self.cycle(baseline=copy.deepcopy(baseline))
        self.assertEqual(checks['millumin']['status'], 'FAIL')
        self.assertIn('restarted', checks['millumin']['observed'])
        self.snapshot['watch']['millumin']['processes'][0].update(pid=4242, startedAt='Sat Nov 21 01:00:00 2026')
        self.assertEqual(self.cycle(baseline=copy.deepcopy(baseline))[0]['millumin']['status'], 'FAIL')
        self.snapshot['watch']['millumin']['processes'] = []
        self.assertIn('not running', self.cycle(baseline=copy.deepcopy(baseline))[0]['millumin']['observed'])
        self.snapshot['watch']['millumin']['processes'] = [{'pid': 1, 'startedAt': 'a'}, {'pid': 2, 'startedAt': 'b'}]
        self.assertEqual(self.cycle(baseline=copy.deepcopy(baseline))[0]['millumin']['status'], 'FAIL')

    def test_a_saved_show_is_changed_not_a_fault(self):
        baseline = self.with_baseline()
        self.snapshot['watch']['show'].update(sha256='b' * 64, mtimeNs=1763683200000000000)
        checks, _ = self.cycle(baseline=copy.deepcopy(baseline))
        self.assertEqual(checks['show']['status'], 'CHANGED')
        self.assertIn('Changed since startup', checks['show']['observed'])
        self.assertEqual(watch.overall(list(checks.values())), 'ok', 'a planned save must not turn the Mac red')
        self.snapshot['watch']['show'] = {'exists': False}
        checks, _ = self.cycle(baseline=copy.deepcopy(baseline))
        self.assertEqual(checks['show']['status'], 'FAIL')
        self.assertEqual(watch.overall(list(checks.values())), 'fault')

    def test_sleep_must_be_held_by_the_named_keep_awake_process(self):
        self.snapshot['watch']['power']['owners'] = [{'pid': 364, 'process': 'powerd', 'type': 'PreventUserIdleSystemSleep'}]
        self.assertEqual(self.cycle()[0]['power']['status'], 'FAIL')
        self.profile['watch'].pop('keepAwake')
        self.assertEqual(self.cycle()[0]['power']['status'], 'PASS', 'without a named process the system-wide assertion counts')
        self.snapshot['watch']['power']['systemWide'] = {}
        self.assertEqual(self.cycle()[0]['power']['status'], 'FAIL')

    def test_resources(self):
        self.snapshot['watch']['disk']['freeBytes'] = 5 * 10 ** 9
        self.assertEqual(self.cycle()[0]['disk']['status'], 'FAIL')
        self.snapshot['watch']['disk']['freeBytes'] = 600 * 10 ** 9
        self.snapshot['watch']['thermal']['limits'] = {'CPU_Speed_Limit': 80}
        self.assertEqual(self.cycle()[0]['thermal']['status'], 'FAIL')
        self.snapshot['watch']['thermal']['limits'] = {}
        self.snapshot['watch']['memory']['pressureLevel'] = 2
        checks, _ = self.cycle()
        self.assertEqual(checks['memory']['status'], 'WARN')
        self.assertEqual(watch.overall(list(checks.values())), 'ok', 'elevated memory is a note, not a fault')
        self.snapshot['watch']['memory']['pressureLevel'] = 4
        self.assertEqual(self.cycle()[0]['memory']['status'], 'FAIL')

    def test_media_folder_and_unconfigured_checks(self):
        self.snapshot['watch']['media']['exists'] = False
        self.assertEqual(self.cycle()[0]['media']['status'], 'FAIL')
        self.profile['watch'].pop('mediaFolder')
        self.assertEqual(self.cycle()[0]['media']['status'], 'NOT CONFIGURED')

    def test_an_unreadable_section_is_a_failure_not_a_pass(self):
        self.snapshot['watch']['errors'] = {'thermal': 'pmset failed'}
        checks, _ = self.cycle()
        self.assertEqual(checks['thermal']['status'], 'FAIL')
        self.assertIn('Could not read', checks['thermal']['observed'])
        self.assertEqual(checks['disk']['status'], 'PASS', 'one failed reading must not hide the others')

    def test_bridge_failure_and_malformed_reading_are_faults(self):
        class Broken(FixtureBridge):
            def watch_reading(self):
                raise StartupError('The local application bridge failed.')
        checks, _ = self.cycle(bridge=Broken(self.snapshot))
        self.assertEqual(checks['bridge']['status'], 'FAIL')
        self.assertNotIn('displays', checks)
        baseline = self.with_baseline()
        self.snapshot['watch']['millumin'] = 'garbage'
        checks, _ = self.cycle(baseline=baseline)
        self.assertEqual(checks['bridge']['status'], 'FAIL')

    def test_first_reading_baseline_is_used_and_saved_when_startup_gave_none(self):
        checks, baseline = self.cycle(baseline=None)
        self.assertEqual(baseline['source'], 'first-reading')
        self.assertIn('first watch reading', checks['millumin']['observed'])
        self.assertTrue((self.state / 'watch-baseline.json').exists())
        again = watch.load_baseline(self.state, 'boot-1')
        self.assertEqual(again['millumin']['pid'], 4242)
        self.assertIsNone(watch.load_baseline(self.state, 'another-boot'), 'a restart ends the baseline')


class RelayChecks(Base):
    def setUp(self):
        super().setUp()
        self.relay = FakeRelay()
        self.addCleanup(self.relay.close)

    def m5_cfg(self, **projectors):
        return self.cfg(relay={'url': self.relay.url}, report={'tokenFile': str(self.token_file)},
                        projectors=dict({'lanes': ['A', 'B', 'C', 'D'], 'expectPower': None}, **projectors))

    def test_relay_and_projector_checks_read_only_from_the_relay(self):
        checks, _ = self.cycle(cfg=self.m5_cfg())
        self.assertEqual(checks['relay']['status'], 'PASS')
        self.assertEqual(checks['projectors']['status'], 'PASS')
        self.assertIn('A on · shutter open', checks['projectors']['observed'])
        self.assertEqual({(m, p) for m, p, _ in self.relay.requests}, {('GET', '/api/health'), ('GET', '/api/mac-status/projectors')})
        self.assertTrue(all(auth in (None, 'Bearer ' + TOKEN) for _, _, auth in self.relay.requests))

    def test_projector_faults(self):
        cfg = self.m5_cfg()
        self.relay.projectors[1]['current'] = False
        self.assertIn('B not replying', self.cycle(cfg=cfg)[0]['projectors']['observed'])
        self.relay.projectors[1]['current'] = True
        self.relay.projectors.pop(2)
        self.assertIn('C has no projector assigned', self.cycle(cfg=cfg)[0]['projectors']['observed'])

    def test_shutter_state_is_reported_but_never_a_fault(self):
        self.relay.projectors[0]['shutter'] = 'closed'
        checks, _ = self.cycle(cfg=self.m5_cfg())
        self.assertEqual(checks['projectors']['status'], 'PASS')
        self.assertIn('A on · shutter closed', checks['projectors']['observed'])

    def test_expected_power_is_opt_in(self):
        self.relay.projectors[3]['power'] = 'off'
        self.assertEqual(self.cycle(cfg=self.m5_cfg())[0]['projectors']['status'], 'PASS')
        checks, _ = self.cycle(cfg=self.m5_cfg(expectPower=['on', 'warming']))
        self.assertEqual(checks['projectors']['status'], 'FAIL')
        self.assertIn('D is off', checks['projectors']['observed'])

    def test_relay_down_or_wrong_service_is_a_fault(self):
        cfg = self.m5_cfg()
        self.relay.health = {'ok': True, 'service': 'something-else'}
        self.assertIn('not the Projctl relay', self.cycle(cfg=cfg)[0]['relay']['observed'])
        self.relay.close()
        checks, _ = self.cycle(cfg=cfg)
        self.assertEqual(checks['relay']['status'], 'FAIL')
        self.assertEqual(checks['projectors']['status'], 'FAIL')

    def test_token_file_must_be_private(self):
        os.chmod(self.token_file, 0o644)
        checks, _ = self.cycle(cfg=self.m5_cfg())
        self.assertEqual(checks['projectors']['status'], 'FAIL')
        self.assertIn('chmod 600', checks['projectors']['observed'])
        self.assertEqual([r for r in self.relay.requests if r[1] != '/api/health'], [], 'no request is made with a token that is exposed')

    def test_reports_carry_the_token_and_the_checks(self):
        cfg = self.m5_cfg()
        events = []
        self.with_baseline()
        event = watch.run_watch(self.profile, self.bridge(), cfg, self.state, emit=events.append,
                                reporter=watch.Reporter(cfg, 'mac'), max_cycles=1, boot='boot-1')
        self.assertEqual(event['state'], 'ok')
        self.assertEqual(len(self.relay.reports), 1)
        report = self.relay.reports[0]
        self.assertEqual((report['schema'], report['host'], report['phase'], report['state'], report['execution'], report['cycle']),
                         (watch.REPORT_SCHEMA, 'm5', 'watch', 'ok', 'mac', 1))
        self.assertEqual({c['id'] for c in report['checks']}, {c['id'] for c in event['checks']})
        self.assertEqual([e['type'] for e in events], ['watch', 'report'])
        self.assertTrue(events[1]['ok'])
        self.assertNotIn(TOKEN, json.dumps(events))
        self.assertNotIn(TOKEN, json.dumps(report))

    def test_reporter_never_raises(self):
        cfg = self.m5_cfg()
        reporter = watch.Reporter(cfg, 'mac')
        checks = [{'id': 'disk', 'label': 'Disk space', 'status': 'PASS', 'observed': 'ok'}]
        self.relay.accept = False
        out = reporter.send('watch', 'ok', checks, cycle=1)
        self.assertEqual((out['ok'], out['message']), (False, 'The relay refused the report (400)'))
        os.chmod(self.token_file, 0o644)
        self.assertIn('chmod 600', reporter.send('watch', 'ok', checks, cycle=1)['message'])
        os.chmod(self.token_file, 0o600)
        self.token_file.write_text('wrong-token\n')
        self.assertIn('(401)', reporter.send('watch', 'ok', checks, cycle=1)['message'])
        self.relay.close()
        out = reporter.send('watch', 'ok', checks, cycle=1)
        self.assertFalse(out['ok'])
        self.assertNotIn('wrong-token', json.dumps(out))
        self.token_file.unlink()
        self.assertIn('could not be read', reporter.send('watch', 'ok', checks, cycle=1)['message'])

    def test_startup_phase_is_reported_from_the_check_stream(self):
        cfg = self.m5_cfg()
        profile, snapshot = fixture()
        profile['watch'] = copy.deepcopy(self.profile['watch'])
        sent = []
        reporter = watch.StartupReporter(watch.Reporter(cfg, 'mac'), sent.append)
        ticks = [0.0]
        run(profile, FixtureBridge(snapshot), timeout=5, interval=1, clock=lambda: ticks[0], sleep=lambda s: ticks.__setitem__(0, ticks[0] + s),
            emit=reporter)
        states = [(r['phase'], r['state']) for r in self.relay.reports]
        self.assertEqual(states, [('startup', 'running'), ('startup', 'ok')])
        self.assertEqual({c['status'] for c in self.relay.reports[-1]['checks']}, {'PASS'})
        self.assertEqual([e['ok'] for e in sent], [True, True])

    def test_startup_failure_is_reported_as_a_fault_naming_the_check(self):
        cfg = self.m5_cfg()
        profile, snapshot = fixture()
        snapshot['displays'].pop()
        reporter = watch.StartupReporter(watch.Reporter(cfg, 'mac'))
        ticks = [0.0]
        run(profile, FixtureBridge(snapshot), timeout=5, interval=1, clock=lambda: ticks[0], sleep=lambda s: ticks.__setitem__(0, ticks[0] + s),
            emit=reporter)
        last = self.relay.reports[-1]
        self.assertEqual((last['phase'], last['state']), ('startup', 'fault'))
        self.assertEqual([c['id'] for c in last['checks'] if c['status'] == 'FAIL'], ['displays'])


class RelayContract(Base):
    """What the Mac sends must be exactly what the Projctl relay accepts. Skipped only when this app is packaged alone."""
    RELAY = HERE.parent / 'projctl'

    def setUp(self):
        super().setUp()
        if not (self.RELAY / 'server' / 'mac-status.js').exists():
            self.skipTest('the Projctl relay source is not beside this app')

    def js_list(self, name):
        import re
        source = (self.RELAY / 'server' / 'mac-status.js').read_text()
        found = re.search(r'const %s = \[([^\]]*)\]' % name, source)
        return set(re.findall(r"'([^']*)'", found.group(1)))

    def test_report_keys_and_statuses_match_the_relay_schema(self):
        cfg = self.cfg()
        checks, _ = self.cycle()
        report = watch.report_body(cfg, 'watch', 'ok', list(checks.values()), 'mac', run_id='run-1', cycle=1, interval=60, message='m')
        self.assertEqual(set(report), self.js_list('KEYS') - set(), 'every field the Mac can send is a field the relay knows')
        self.assertEqual(set(report['checks'][0]), self.js_list('CHECK_KEYS'))
        self.assertEqual(report['schema'], watch.REPORT_SCHEMA)
        every_status = {'PASS', 'FAIL', 'CHANGED', 'WARN', 'NOT CONFIGURED', 'NOT RUN', 'RUNNING'}
        self.assertEqual(every_status, self.js_list('STATUSES'))
        self.assertTrue({c['status'] for c in checks.values()} <= every_status)
        self.assertEqual({'startup', 'watch'}, self.js_list('PHASES'))
        self.assertEqual({'running', 'ok', 'fault'}, self.js_list('STATES'))
        self.assertEqual({'mac', 'offline fixture'}, self.js_list('EXECUTIONS'))

    def test_the_relays_documented_example_has_the_shape_the_mac_builds(self):
        example = json.loads((self.RELAY / 'test' / 'fixtures' / 'status-report.example.json').read_text())
        built = watch.report_body(self.cfg(), 'watch', 'ok', [{'id': 'disk', 'label': 'Disk space', 'status': 'PASS', 'observed': 'x'}], 'mac',
                                  run_id='r', cycle=1, interval=60)
        self.assertEqual(set(built), set(example))
        self.assertEqual({k: type(v) for k, v in built.items()}, {k: type(v) for k, v in example.items()})
        self.assertEqual(set(built['checks'][0]), set(example['checks'][0]))

    def test_every_check_id_and_label_fits_the_relay_limits(self):
        import re
        for check_id, label in watch.WATCH_CHECKS:
            self.assertTrue(re.match(r'^[a-z][a-z0-9-]*$', check_id) and len(check_id) <= 32)
            self.assertTrue(1 <= len(label) <= 60)
        report = watch.report_body(self.cfg(hostName='x' * 80), 'watch', 'ok', [{'id': 'a', 'label': 'A', 'status': 'PASS', 'observed': 'o' * 500}], 'mac')
        self.assertEqual(len(report['hostName']), 80)


class PixelStub(Base):
    PIXEL = {'enabled': True, 'interface': 'en1', 'controllers': [{'name': 'Strip A', 'address': '192.168.10.21'}, {'name': 'Strip B', 'address': '192.168.10.22'}]}

    def test_inactive_stub_says_so_and_asks_nothing(self):
        checks, _ = self.cycle(cfg=self.cfg(pixelOutput={'enabled': False}))
        self.assertEqual(checks['pixel']['status'], 'NOT CONFIGURED')
        request = watch.watch_request(self.cfg(pixelOutput={'enabled': False}), self.profile)
        self.assertIsNone(request['pixel'])

    def test_active_stub_checks_interface_and_pings(self):
        cfg = self.cfg(pixelOutput=self.PIXEL)
        self.snapshot['watch']['pixel'] = {'interface': {'name': 'en1', 'exists': True, 'up': True},
                                           'controllers': [{'name': 'Strip A', 'reachable': True}, {'name': 'Strip B', 'reachable': True}]}
        self.assertEqual(self.cycle(cfg=cfg)[0]['pixel']['status'], 'PASS')
        self.snapshot['watch']['pixel']['controllers'][1]['reachable'] = False
        checks, _ = self.cycle(cfg=cfg)
        self.assertEqual(checks['pixel']['status'], 'FAIL')
        self.assertIn('Strip B', checks['pixel']['observed'])
        self.snapshot['watch']['pixel']['interface']['up'] = False
        self.assertIn('en1 is down', self.cycle(cfg=cfg)[0]['pixel']['observed'])

    def test_pixel_config_validation_refuses_public_and_malformed_targets(self):
        for bad in ({'enabled': True, 'interface': 'en1', 'controllers': [{'name': 'x', 'address': '8.8.8.8'}]},
                    {'enabled': True, 'interface': 'en1; reboot', 'controllers': [{'name': 'x', 'address': '192.168.1.5'}]},
                    {'enabled': True, 'interface': 'en1', 'controllers': []},
                    {'enabled': 'yes'}):
            with self.subTest(bad=bad):
                with self.assertRaises(StartupError):
                    self.cfg(pixelOutput=bad)


class NeverTests(Base):
    """Watch mode never reaches the readback, a display change, OSC, a projector or pixel command, or a repair."""

    def test_the_bridge_guard_refuses_every_action_that_does_more_than_read(self):
        guarded = watch.ReadOnlyBridge(self.bridge())
        for action in ('observe', 'restore', 'openShow', 'fullscreen', 'anything'):
            with self.subTest(action=action):
                with self.assertRaises(watch.WatchViolation):
                    guarded.call(action, {})
        self.assertEqual(self.bridge().call('watch', {})['schemaVersion'], 1)

    def test_a_full_watch_loop_only_ever_calls_capabilities_and_watch(self):
        bridge = self.bridge()
        cfg = self.cfg()
        watch.run_watch(self.profile, bridge, cfg, self.state, max_cycles=4, sleep=lambda s: None, boot='boot-1')
        self.assertEqual(bridge.calls, ['capabilities'] + ['watch'] * 4)
        for forbidden in ('observe', 'restore', 'openShow', 'fullscreen'):
            self.assertNotIn(forbidden, bridge.calls)
        self.assertEqual(bridge.snapshot['displays'], self.snapshot['displays'], 'the fixture machine was not touched')

    def test_a_bridge_without_the_read_only_reading_is_refused(self):
        self.snapshot.pop('watch')
        with self.assertRaises(StartupError):
            watch.run_watch(self.profile, self.bridge(), self.cfg(), self.state, max_cycles=1)

    def test_watch_module_has_no_way_to_run_a_program_or_open_a_socket(self):
        tree = ast.parse((HERE / 'watch.py').read_text())
        imported = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                imported |= {a.name.split('.')[0] for a in node.names}
            elif isinstance(node, ast.ImportFrom):
                imported.add((node.module or '').split('.')[0])
        self.assertTrue(imported.isdisjoint({'subprocess', 'socket', 'shutil', 'ctypes', 'multiprocessing', 'pty'}), imported)
        names = {n.id for n in ast.walk(tree) if isinstance(n, ast.Name)}
        for forbidden in ('millumin_ui', 'send_millumin', 'observe_displays', 'observe_millumin', 'open_show', 'restore', 'BETTERDISPLAY',
                          'Popen', 'system', 'popen', 'rmtree', 'unlink'):
            self.assertNotIn(forbidden, names)
        os_calls = {n.attr for n in ast.walk(tree) if isinstance(n, ast.Attribute) and isinstance(n.value, ast.Name) and n.value.id == 'os'}
        self.assertTrue(os_calls.isdisjoint({'system', 'popen', 'fork', 'kill', 'remove', 'unlink', 'rename', 'replace', 'execv', 'execvp', 'spawnl'}), os_calls)
        strings = {n.value for n in ast.walk(tree) if isinstance(n, ast.Constant) and isinstance(n.value, str) and len(n.value) < 80}
        for forbidden in ('/usr/bin/osascript', '/usr/bin/open', 'BetterDisplay', '/millumin/action/enterFullscreen', 'openShow', 'restore', 'fullscreen'):
            self.assertNotIn(forbidden, strings)

    def test_only_three_requests_are_ever_made_to_the_relay(self):
        relay = FakeRelay()
        self.addCleanup(relay.close)
        cfg = self.cfg(relay={'url': relay.url}, report={'tokenFile': str(self.token_file)}, projectors={'lanes': ['A', 'B', 'C', 'D'], 'expectPower': None})
        watch.run_watch(self.profile, self.bridge(), cfg, self.state, reporter=watch.Reporter(cfg, 'mac'), max_cycles=3, sleep=lambda s: None, boot='boot-1')
        self.assertEqual({(m, p) for m, p, _ in relay.requests}, set(watch.HTTP_REQUESTS))
        self.assertEqual(len(relay.reports), 3)
        for method, path in (('POST', '/api/command'), ('POST', '/api/lock'), ('GET', '/api/state'), ('POST', '/api/preset/recall'), ('GET', '/api/health?x=1')):
            with self.assertRaises(watch.WatchViolation):
                watch._request(relay.url, path, method)
        self.assertEqual([r for r in relay.requests if r[1] in ('/api/command', '/api/lock', '/api/state')], [])

    def test_the_cli_never_reports_from_an_offline_fixture(self):
        relay = FakeRelay()
        self.addCleanup(relay.close)
        profile = copy.deepcopy(self.profile)
        profile['watch'].update(relay={'url': relay.url}, report={'tokenFile': str(self.token_file)})
        path = self.state / 'profile.json'
        path.write_text(json.dumps(profile))
        done = subprocess.run([sys.executable, '-B', str(HERE / 'startup.py'), '--profile', str(path), '--fixture', str(HERE / 'example-snapshot.json'),
                               '--receipt', str(self.state / 'r' / 'watch.json'), '--watch', '--max-cycles', '1', '--events', '-'],
                              capture_output=True, text=True, timeout=30)
        self.assertEqual(done.returncode, 0, done.stderr)
        events = [json.loads(line) for line in done.stdout.splitlines()]
        self.assertEqual([e['type'] for e in events], ['watch'])
        self.assertEqual([r for r in relay.requests if r[0] == 'POST'], [], 'a fixture must never appear on the Rig page as a Mac')


class LoopTests(Base):
    def test_cycles_keep_a_steady_beat_and_skip_when_slow(self):
        ticks, sleeps = [0.0], []

        def sleep(seconds):
            sleeps.append(seconds)
            ticks[0] += seconds
        watch.run_watch(self.profile, self.bridge(), self.cfg(), self.state, max_cycles=3, clock=lambda: ticks[0], sleep=sleep, boot='boot-1')
        self.assertEqual(round(sum(sleeps)), 120)
        self.assertTrue(all(0 < s <= 1.0 for s in sleeps))
        ticks[0], sleeps[:] = 0.0, []
        slow = {'n': 0}

        def clock():
            slow['n'] += 1
            return ticks[0] + (500 if slow['n'] == 4 else 0)
        watch.run_watch(self.profile, self.bridge(), self.cfg(), self.state, max_cycles=2, clock=clock, sleep=sleep, boot='boot-1')
        self.assertLessEqual(round(sum(sleeps)), 60, 'a late cycle must not queue up a burst of catch-up cycles')

    def test_stop_ends_the_loop_between_cycles(self):
        stops = {'n': 0}

        def stop():
            stops['n'] += 1
            return stops['n'] > 3
        watch.run_watch(self.profile, self.bridge(), self.cfg(), self.state, stop=stop, sleep=lambda s: None, boot='boot-1')
        self.assertTrue((self.state / 'watch-latest.json').exists())

    def test_latest_result_is_written_for_evidence(self):
        self.with_baseline()
        watch.run_watch(self.profile, self.bridge(), self.cfg(), self.state, max_cycles=1, boot='boot-1')
        latest = json.loads((self.state / 'watch-latest.json').read_text())
        self.assertEqual(latest['event']['type'], 'watch')
        self.assertEqual(latest['event']['state'], 'ok')


class ProfileTests(Base):
    def test_watch_settings_do_not_change_the_profile_digest(self):
        before = profile_digest(self.profile)
        self.profile['watch']['intervalSeconds'] = 30
        self.profile['watch']['relay'] = {'url': 'http://127.0.0.1:8080'}
        self.assertEqual(profile_digest(self.profile), before)
        self.profile['showPath'] = '/fixture/other.millumin'
        self.assertNotEqual(profile_digest(self.profile), before)

    def test_watch_config_defaults_and_limits(self):
        cfg = self.cfg()
        self.assertEqual((cfg['host'], cfg['intervalSeconds'], cfg['diskPath'], cfg['minFreeDiskGB']), ('m5', 60, '/', 20))
        for bad in ({'intervalSeconds': 5}, {'intervalSeconds': 601}, {'host': 'M5!'}, {'mediaFolder': 'relative'},
                    {'relay': {'url': 'ftp://x'}}, {'relay': {'url': 'http://user:pw@127.0.0.1:8080'}}, {'relay': {'url': 'http://127.0.0.1:8080/api'}},
                    {'report': {'tokenFile': '/x'}}, {'minFreeDiskGB': 0}, {'keepAwake': {'process': 'a b'}},
                    {'projectors': {'lanes': ['A'], 'expectPower': None}}):
            with self.subTest(bad=bad):
                self.profile = copy.deepcopy(EXAMPLE_PROFILE)
                with self.assertRaises(StartupError):
                    self.cfg(**bad)

    def test_a_profile_without_watch_settings_is_not_configured(self):
        self.profile.pop('watch')
        with self.assertRaises(watch.WatchNotConfigured):
            watch.watch_config(self.profile)

    def test_m1_example_is_placeholders_only_and_refuses_to_run(self):
        m1 = json.loads((HERE / 'example-m1-profile.json').read_text())
        found = watch.placeholders(m1)
        self.assertGreaterEqual(len(found), 10)
        self.assertEqual(m1['watch']['pixelOutput']['enabled'], False, 'the pixel stub ships switched off')
        for call in (lambda: watch.load_profile(m1, watch=True), lambda: watch.watch_config(m1)):
            with self.assertRaises(StartupError) as caught:
                call()
            self.assertIn('placeholders', str(caught.exception))

    def test_m1_example_works_once_every_placeholder_is_filled_in(self):
        m1 = json.loads((HERE / 'example-m1-profile.json').read_text())
        m1.pop('_placeholders')
        m1['showPath'] = '/fixture/m1.millumin'
        m1.pop('showSHA256')
        m1['displays'][0].update(identity={'vendor': 1, 'model': 2, 'serial': 3},
                                 mode={'width': 1920, 'height': 1080, 'pixelWidth': 1920, 'pixelHeight': 1080, 'refreshRate': 60})
        w = m1['watch']
        w.update(mediaFolder='/fixture/media', keepAwake={'process': 'caffeinate'}, relay={'url': 'http://100.64.0.2:8080'},
                 report={'tokenFile': '/fixture/token'}, pixelOutput={'enabled': True, 'interface': 'en1', 'controllers': [{'name': 'Strip A', 'address': '192.168.10.21'}]})
        self.assertEqual(watch.placeholders(m1), [])
        watch.load_profile(m1, watch=True)
        cfg = watch.watch_config(m1)
        self.assertEqual((cfg['host'], cfg['role'], cfg['pixelOutput']['enabled']), ('m1', 'pixel-strips', True))
        self.assertIsNone(cfg['projectors'], 'the m1 has no projector checks')

    def test_startup_checks_are_refused_for_a_profile_that_is_not_commissioned(self):
        m1 = {'schemaVersion': 1, 'role': 'pixel-strips'}
        with self.assertRaises(StartupError) as caught:
            watch.load_profile(m1)
        self.assertIn('Only watch mode is available', str(caught.exception))


class CliTests(Base):
    def run_cli(self, *args, profile=None):
        path = self.state / 'profile.json'
        path.write_text(json.dumps(profile or self.profile))
        return subprocess.run([sys.executable, '-B', str(HERE / 'startup.py'), '--profile', str(path), '--fixture', str(HERE / 'example-snapshot.json'),
                               '--receipt', str(self.state / 'receipts' / 'watch.json'), '--events', '-', *args],
                              capture_output=True, text=True, timeout=30)

    def test_startup_captures_the_baseline_and_watch_uses_it(self):
        done = self.run_cli()
        self.assertEqual(done.returncode, 0, done.stderr)
        baseline = json.loads((self.state / 'receipts' / 'watch-baseline.json').read_text())
        self.assertEqual(baseline['source'], 'startup')
        self.assertEqual(sorted(baseline['lanes']), ['A', 'B', 'C', 'D', 'control'])
        self.assertEqual(baseline['millumin']['pid'], 4242)
        done = self.run_cli('--watch', '--max-cycles', '1')
        self.assertEqual(done.returncode, 0, done.stderr)
        event = json.loads(done.stdout.splitlines()[-1])
        self.assertEqual((event['type'], event['state']), ('watch', 'ok'))
        self.assertEqual(event['baseline']['source'], 'startup')

    def test_exit_codes_for_missing_and_placeholder_profiles(self):
        bare = copy.deepcopy(self.profile)
        bare.pop('watch')
        done = self.run_cli('--watch', '--max-cycles', '1', profile=bare)
        self.assertEqual(done.returncode, 4)
        self.assertEqual(json.loads(done.stdout.splitlines()[-1])['state'], 'not-configured')
        m1 = json.loads((HERE / 'example-m1-profile.json').read_text())
        done = self.run_cli('--watch', '--max-cycles', '1', profile=m1)
        self.assertEqual(done.returncode, 3)
        self.assertIn('placeholders', done.stdout)
        done = self.run_cli(profile=m1)
        self.assertEqual(done.returncode, 3, 'startup checks are not available for an uninspected pixel-strip Mac')

    def test_flags_that_do_not_mix_with_watch(self):
        done = self.run_cli('--watch', '--warm')
        self.assertEqual(done.returncode, 2)

    def test_two_watchers_cannot_share_a_receipt_directory(self):
        import fcntl
        (self.state / 'receipts').mkdir()
        with open(self.state / 'receipts' / '.frozen-startup-watch.lock', 'a') as held:
            fcntl.flock(held, fcntl.LOCK_EX | fcntl.LOCK_NB)
            done = self.run_cli('--watch', '--max-cycles', '1')
        self.assertEqual(done.returncode, 3)
        self.assertIn('Another watch is running', done.stdout)


if __name__ == '__main__':
    unittest.main()
