import copy
import json
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from startup import CHECKS, STREAM_SCHEMA, FixtureBridge, run
from test_startup import fixture

HERE = Path(__file__).resolve().parent


class CheckStreamTests(unittest.TestCase):
    def setUp(self):
        self.profile, self.snapshot = fixture()

    def stream(self, snapshot=None, **kwargs):
        events, ticks = [], [0.0]

        def sleep(seconds):
            ticks[0] += seconds
        receipt = run(self.profile, FixtureBridge(snapshot or self.snapshot), timeout=5, interval=1,
                      clock=lambda: ticks[0], sleep=sleep, emit=events.append, **kwargs)
        return receipt, events

    def final(self, events):
        latest = {}
        for event in events:
            if event['type'] == 'check':
                latest[event['id']] = event['status']
        return [latest.get(check_id) for check_id, _ in CHECKS]

    def test_pass_stream_marks_every_check_and_reports_expiry(self):
        receipt, events = self.stream()
        self.assertTrue(receipt['computerReady'])
        self.assertEqual(events[0]['type'], 'run')
        self.assertEqual([c['id'] for c in events[0]['checks']], [c for c, _ in CHECKS])
        self.assertEqual(self.final(events), ['PASS'] * 5)
        result = events[-1]
        self.assertEqual((result['type'], result['passed'], result['failed'], result['notRun']), ('result', 5, 0, 0))
        self.assertIsNotNone(result['readyExpiresAt'])
        self.assertFalse(result['showNightReady'])
        self.assertTrue(all(e['schema'] == STREAM_SCHEMA and e['runID'] == receipt['runID'] for e in events))

    def test_running_precedes_result_for_each_check(self):
        _, events = self.stream()
        for check_id, _ in CHECKS:
            statuses = [e['status'] for e in events if e['type'] == 'check' and e['id'] == check_id]
            self.assertEqual(statuses[-1], 'PASS')
            if check_id != 'routes':
                self.assertEqual(statuses[0], 'RUNNING')

    def test_missing_display_fails_first_check_and_stops_the_rest(self):
        broken = copy.deepcopy(self.snapshot)
        broken['displays'].pop()
        receipt, events = self.stream(broken)
        self.assertFalse(receipt['computerReady'])
        self.assertEqual(self.final(events), ['FAIL'] + ['NOT RUN'] * 4)
        failure = [e for e in events if e.get('status') == 'FAIL'][0]
        self.assertIn('Expected five displays', failure['observed'])
        self.assertEqual(failure['next'], failure['observed'])
        cards = [e for e in events if e['type'] == 'displays'][-1]['displays']
        self.assertEqual([c['detected'] for c in cards], [True, True, True, True, False])
        self.assertEqual((events[-1]['passed'], events[-1]['failed'], events[-1]['notRun']), (0, 1, 4))
        self.assertIsNone(events[-1]['readyExpiresAt'])

    def test_wrong_route_fails_routes_after_show_passes(self):
        broken = copy.deepcopy(self.snapshot)
        broken['millumin']['routes']['CH2'] = broken['displays'][0]['id']
        receipt, events = self.stream(broken, warm=True)
        self.assertEqual(self.final(events), ['PASS', 'PASS', 'PASS', 'FAIL', 'NOT RUN'])
        self.assertIn('canvas destinations', receipt['message'].lower())

    def test_wrong_show_fails_show_check(self):
        broken = copy.deepcopy(self.snapshot)
        broken['millumin']['showSHA256'] = 'b' * 64
        _, events = self.stream(broken, warm=True)
        self.assertEqual(self.final(events), ['PASS', 'PASS', 'FAIL', 'NOT RUN', 'NOT RUN'])

    def test_display_cards_are_not_repeated_when_unchanged(self):
        _, events = self.stream()
        self.assertEqual(len([e for e in events if e['type'] == 'displays']), 1)

    def test_cli_streams_json_lines_to_stdout(self):
        with tempfile.TemporaryDirectory() as folder:
            result = subprocess.run([sys.executable, '-B', str(HERE / 'startup.py'), '--profile', str(HERE / 'example-profile.json'),
                                     '--fixture', str(HERE / 'example-snapshot.json'), '--receipt', str(Path(folder) / 'r.json'),
                                     '--events', '-'], capture_output=True, text=True, timeout=30)
        lines = [json.loads(line) for line in result.stdout.splitlines()]
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(lines[-1]['type'], 'result')
        self.assertIn('Computer checks passed', result.stderr)


class ShippedWindowTests(unittest.TestCase):
    WEB = HERE / 'checks-app' / 'web'

    def test_shipped_ui_contains_no_simulated_results(self):
        for name in ('index.html', 'app.js'):
            source = (self.WEB / name).read_text().lower()
            for marker in ('scenario', 'simulat', 'preview only', 'sample result'):
                self.assertNotIn(marker, source, '%s contains %r' % (name, marker))

    def test_shipped_ui_is_offline(self):
        page = (self.WEB / 'index.html').read_text()
        self.assertIn("connect-src 'none'", page)
        self.assertNotIn('http://', page.replace('http://www.w3.org', ''))
        self.assertNotIn('https://', page)
        script = (self.WEB / 'app.js').read_text()
        for marker in ('fetch(', 'XMLHttpRequest', 'WebSocket', 'innerHTML'):
            self.assertNotIn(marker, script)

    def test_ui_uses_the_stream_check_ids(self):
        script = (self.WEB / 'app.js').read_text()
        for status in ('PASS', 'FAIL', 'NOT RUN', 'RUNNING'):
            self.assertIn(status, script)


class WatchWindowTests(unittest.TestCase):
    """The window only shows the watch; it never asks for a check, a repair or a command."""
    WEB = HERE / 'checks-app' / 'web'
    SWIFT = (HERE / 'checks-app' / 'FrozenStartupChecks.swift').read_text()

    def test_the_stream_carries_what_the_window_draws(self):
        with tempfile.TemporaryDirectory() as folder:
            args = [sys.executable, '-B', str(HERE / 'startup.py'), '--profile', str(HERE / 'example-profile.json'),
                    '--fixture', str(HERE / 'example-snapshot.json'), '--events', '-']
            subprocess.run(args + ['--receipt', str(Path(folder) / 'r.json')], capture_output=True, text=True, timeout=30)
            done = subprocess.run(args + ['--receipt', str(Path(folder) / 'watch.json'), '--watch', '--max-cycles', '1'],
                                  capture_output=True, text=True, timeout=30)
        event = json.loads(done.stdout.splitlines()[-1])
        self.assertEqual((event['schema'], event['type'], event['state']), (STREAM_SCHEMA, 'watch', 'ok'))
        script = (self.WEB / 'app.js').read_text()
        for check in event['checks']:
            self.assertEqual(set(check) - {'expected'}, {'id', 'label', 'status', 'observed'})
            self.assertIn("'%s'" % check['status'], script, 'the window has a symbol for %s' % check['status'])
        for kind in ('watch', 'report', 'watch-state'):
            self.assertIn("event.type === '%s'" % kind, script)

    def test_the_window_has_no_way_to_send_anything(self):
        script = (self.WEB / 'app.js').read_text()
        posted = set(re.findall(r"post\(\{ action: '([a-z]+)'", script))
        self.assertEqual(posted, {'ready', 'retry', 'crew', 'collapse', 'expand'}, 'watch adds no message to the app')
        for marker in ('fetch(', 'XMLHttpRequest', 'WebSocket', 'innerHTML', 'eval(', 'sendBeacon'):
            self.assertNotIn(marker, script)

    def test_the_app_starts_only_the_read_only_watch_and_has_no_network_or_automation_code(self):
        self.assertIn('"--watch"', self.SWIFT)
        for imported in re.findall(r'^import (\w+)', self.SWIFT, re.M):
            self.assertIn(imported, ('AppKit', 'WebKit'))
        start = self.SWIFT.index('func startWatch()')
        body = self.SWIFT[start:self.SWIFT.index('func stopWatch()')]
        for forbidden in ('--warm', '--verify-ready', '--crew-evidence', 'osascript', 'BetterDisplay', '/usr/bin/open', 'restore', 'URLSession', 'NWConnection', 'socket'):
            self.assertNotIn(forbidden, body)
        for forbidden in ('URLSession', 'NWConnection', 'CFSocket', 'osascript', 'BetterDisplay', 'NSAppleScript'):
            self.assertNotIn(forbidden, self.SWIFT)

    def test_watch_stops_before_a_new_startup_check_and_starts_only_after_the_computer_checks_pass(self):
        start_check = self.SWIFT[self.SWIFT.index('func startCheck()'):self.SWIFT.index('func recordCrew')]
        self.assertIn('stopWatch()', start_check)
        self.assertIn('startWatchAfterFinish = true', self.SWIFT)
        self.assertIn('(object["computerReady"] as? Bool) == true', self.SWIFT)
        self.assertIn('func applicationWillTerminate', self.SWIFT)
        self.assertIn('stopWatch()', self.SWIFT[self.SWIFT.index('func applicationWillTerminate'):][:120])


if __name__ == '__main__':
    unittest.main()
