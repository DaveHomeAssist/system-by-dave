import ast
import io
import json
import socket
import subprocess
import unittest
import tempfile
import hashlib
from pathlib import Path
from unittest.mock import patch
import mac_bridge as mac


class MacTests(unittest.TestCase):
    def test_real_identifier_output_shape(self):
        raw = '{"deviceType":"Display","displayID":"5"},{"deviceType":"DisplayGroup","tagID":"-1"}'
        self.assertEqual(mac.identities(raw), [{'deviceType': 'Display', 'displayID': '5'}])

    def test_color_mode(self):
        self.assertEqual(mac.color_mode('184 - 1920x1200 59.95Hz Fixed 8bit SDR YCbCr444 Limited'),
                         'bpc:8+range:limited+encoding:ycbcr+chroma:444+hdrmode:sdr')
        self.assertEqual(mac.color_mode('8bit SDR RGB Full'),
                         'bpc:8+range:full+encoding:rgb+chroma:444+hdrmode:sdr')
        self.assertEqual(mac.color_mode('184 - 3420x2224 60.00Hz Fixed 8bit SDR RGB Full P3'),
                         'bpc:8+range:full+encoding:rgb+chroma:444+hdrmode:sdr')
        with self.assertRaises(ValueError): mac.color_mode('Unknown')

    def test_changed_ids_from_explicit_selection(self):
        rows = [{'canvas': 'CH 2', 'selectedDisplay': 'Projector D'}]
        self.assertEqual(mac.route_values(rows, [{'id': 987, 'name': 'Projector D'}]), {'CH 2': 987})
        with self.assertRaises(ValueError):
            mac.route_values(rows, [{'id': 987, 'name': 'Projector D'}, {'id': 12, 'name': 'Projector D'}])

    def test_document_and_control_window_readback(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'show.millumin'
            path.write_bytes(b'approved fixture')
            tree = {'document': path.as_uri(), 'position': [40, 40], 'fullscreenRequested': True,
                    'routes': [{'canvas': 'CH 2', 'selectedDisplay': 'D'}]}
            displays = [{'id': 1, 'name': 'Control', 'mode': {'x': 0, 'y': 0, 'width': 1920, 'height': 1080}},
                        {'id': 8, 'name': 'D', 'mode': {'x': 1920, 'y': 0, 'width': 1920, 'height': 1200}}]
            windows = [{'kCGWindowOwnerName': 'Millumin5', 'kCGWindowLayer': 1000,
                        'kCGWindowIsOnscreen': True, 'kCGWindowAlpha': 1,
                        'kCGWindowBounds': {'X': 1920, 'Y': 0, 'Width': 1920, 'Height': 1200}}]
            result = mac.millumin_state(tree, displays, windows)
            self.assertEqual(result['routes'], {'CH 2': 8})
            self.assertEqual(result['controlDisplayID'], 1)
            self.assertEqual(result['showSHA256'], hashlib.sha256(b'approved fixture').hexdigest())
            self.assertTrue(result['fullscreen'])
            windows[0]['kCGWindowLayer'] = 0
            self.assertFalse(mac.millumin_state(tree, displays, windows)['fullscreen'])
            windows[0]['kCGWindowLayer'] = 1000
            windows[0]['kCGWindowBounds']['Width'] = 100
            self.assertFalse(mac.millumin_state(tree, displays, windows)['fullscreen'])
            self.assertFalse(mac.millumin_state(tree, displays, [])['fullscreen'])

    def test_unassigned_canvas_and_duplicate_label(self):
        displays = [{'id': 1, 'name': 'One', 'names': ['One', 'Built-in Retina Display']}]
        self.assertEqual(mac.route_values([{'canvas': 'A', 'selectedDisplay': 'Built-in Retina Display (main screen)'}], displays), {'A': 1})
        with self.assertRaises(ValueError):
            mac.route_values([{'canvas': 'A', 'selectedDisplay': 'One'}, {'canvas': 'A', 'selectedDisplay': 'One'}], displays)

    def test_open_show_rejects_different_document_and_hash(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'approved.millumin'
            path.write_bytes(b'approved')
            payload = {'showPath': str(path), 'showSHA256': '0' * 64, 'controlDisplayID': 1}
            with patch.object(mac, 'command') as command:
                with self.assertRaises(ValueError): mac.open_show(payload)
                command.assert_not_called()
            payload['showSHA256'] = hashlib.sha256(b'approved').hexdigest()
            with patch.object(mac, 'millumin_ui', return_value={'document': 'file:///other.millumin'}), patch.object(mac, 'command') as command:
                with self.assertRaises(ValueError): mac.open_show(payload)
                command.assert_not_called()

    def test_identity_change_prevents_any_restore_command(self):
        from test_startup import fixture
        profile, snapshot = fixture()
        rows = [{**d, 'mode': profile['displays'][i]['mode']} for i, d in enumerate(snapshot['displays'])]
        snapshot['displays'][0]['connector'] = 'unexpected'
        with patch.object(mac, 'observe_displays', return_value=snapshot['displays']), patch.object(mac, 'command') as command:
            with self.assertRaises(ValueError): mac.restore(rows)
            command.assert_not_called()

    def test_restore_exact_scoped_commands(self):
        from test_startup import fixture
        profile, snapshot = fixture()
        rows = [{**d, 'mode': profile['displays'][i]['mode']} for i, d in enumerate(snapshot['displays'])]
        with patch.object(mac, 'observe_displays', return_value=snapshot['displays']), patch.object(mac, 'command', return_value='') as command:
            mac.restore(rows)
            calls = command.call_args_list
            self.assertEqual(len(calls), 16)
            self.assertIn('-registryLocation=fixture-port-0', calls[0].args[0])
            self.assertIn('-rotation=0', calls[0].args[0])
            self.assertIn('-hiDPI=off', calls[2].args[0])
            self.assertEqual(calls[-1].args[0], [mac.NATIVE, 'layout'])


ASSERTIONS = '''Assertion status system-wide:
   BackgroundTask                 0
   UserIsActive                   1
   PreventUserIdleDisplaySleep    1
   PreventSystemSleep             0
   PreventUserIdleSystemSleep     1
Listed by owning process:
   pid 364(powerd): [0x00005b0600018701] 03:44:27 PreventUserIdleSystemSleep named: "Powerd - Prevent sleep while display is on"  
   pid 98839(caffeinate): [0x00008af300018726] 00:19:58 PreventUserIdleSystemSleep named: "caffeinate command-line tool"  
\tDetails: caffeinate asserting on behalf of '/opt/homebrew/bin/python3' (pid 98835)
'''
NATIVE_WATCH = json.dumps([{'id': 1, 'name': 'BenQ', 'active': True, 'width': 1920, 'height': 1080, 'pixelWidth': 1920, 'pixelHeight': 1080,
                            'refreshRate': 60.0, 'x': 0, 'y': 0, 'main': True, 'mirrored': False, 'rotation': 0.0, 'vendor': 1, 'model': 2, 'serial': 3}])
IFCONFIG_UP = 'en1: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500\n\tmedia: autoselect\n\tstatus: active\n'


def fake_run(calls):
    """A stand-in for subprocess.run that records the program and returns plausible read-only output."""
    def run(args, **kwargs):
        calls.append(list(args))
        program = args[0]
        if program == '/usr/bin/pmset':
            out = ASSERTIONS if args[2] == 'assertions' else 'CPU_Speed_Limit = 100\n'
        else:
            out = {'/usr/bin/pgrep': '4242\n', '/bin/ps': 'Fri Nov 20 18:02:11 2026\n', '/usr/sbin/sysctl': '1\n',
                   '/sbin/ifconfig': IFCONFIG_UP, '/sbin/ping': '1 packets received\n'}.get(program, NATIVE_WATCH)
        return subprocess.CompletedProcess(args, 0, stdout=out, stderr='')
    return run


class WatchReadingTests(unittest.TestCase):
    PAYLOAD = None

    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)
        show = Path(self.dir.name) / 'show.millumin'
        show.write_bytes(b'approved show')
        self.show = show
        self.payload = {'showPath': str(show), 'knownShow': None, 'diskPath': '/', 'mediaFolder': self.dir.name, 'keepAwakeProcess': 'caffeinate',
                        'pixel': {'enabled': True, 'interface': 'en1', 'controllers': [{'name': 'Strip A', 'address': '192.168.10.21'}]}}
        patcher = patch.object(mac, 'NATIVE', '/fake/mac-displays')
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_reading_shape(self):
        calls = []
        with patch.object(mac.subprocess, 'run', fake_run(calls)):
            reading = mac.watch_observe(self.payload)
        self.assertEqual(reading['errors'], {})
        self.assertEqual(reading['displays'][0]['identity'], {'vendor': 1, 'model': 2, 'serial': 3})
        self.assertNotIn('vendor', reading['displays'][0]['mode'])
        self.assertEqual(reading['millumin']['processes'], [{'pid': 4242, 'startedAt': 'Fri Nov 20 18:02:11 2026'}])
        self.assertEqual(reading['show']['sha256'], hashlib.sha256(b'approved show').hexdigest())
        self.assertEqual([o['process'] for o in reading['power']['owners']], ['powerd', 'caffeinate'])
        self.assertEqual(reading['power']['keepAwakeProcesses'][0]['pid'], 4242)
        self.assertEqual(reading['memory']['pressureLevel'], 1)
        self.assertEqual(reading['thermal']['limits'], {'CPU_Speed_Limit': 100})
        self.assertTrue(reading['media']['readable'])
        self.assertEqual(reading['pixel']['controllers'], [{'name': 'Strip A', 'address': '192.168.10.21', 'reachable': True}])

    def test_every_program_it_runs_is_on_the_read_only_list(self):
        calls = []
        with patch.object(mac.subprocess, 'run', fake_run(calls)):
            mac.watch_observe(self.payload)
        programs = {c[0] for c in calls}
        self.assertEqual(programs, {'/usr/bin/pgrep', '/bin/ps', '/usr/bin/pmset', '/usr/sbin/sysctl', '/sbin/ifconfig', '/sbin/ping', '/fake/mac-displays'})
        text = json.dumps(calls)
        for forbidden in ('BetterDisplay', 'osascript', '/usr/bin/open', 'layout', 'windows', 'openProject', 'enterFullscreen'):
            self.assertNotIn(forbidden, text)
        for call in calls:
            self.assertTrue(mac.WATCH_PROGRAMS['native' if call[0] == mac.NATIVE else call[0]](call), call)

    def test_it_never_reaches_the_readback_osc_or_a_display_change(self):
        def boom(name):
            def fail(*args, **kwargs):
                raise AssertionError('watch mode called %s' % name)
            return fail
        guards = [patch.object(mac, name, boom(name)) for name in
                  ('millumin_ui', 'send_millumin', 'observe_displays', 'observe_millumin', 'restore', 'open_show', 'command', 'millumin_state')]
        guards.append(patch.object(socket, 'socket', boom('socket')))
        calls = []
        for guard in guards:
            guard.start()
            self.addCleanup(guard.stop)
        with patch.object(mac.subprocess, 'run', fake_run(calls)):
            reading = mac.watch_observe(self.payload)
        self.assertEqual(reading['errors'], {})

    def test_the_only_way_to_run_a_program_is_the_allowlist(self):
        for args in (['/usr/bin/open', '-a', 'Millumin5'], ['/usr/bin/osascript', '-l', 'JavaScript', 'x.js'], [mac.NATIVE, 'layout'], [mac.NATIVE, 'windows'],
                     [mac.NATIVE], [mac.BETTERDISPLAY, 'set', '-resolution=1x1'], ['/usr/bin/pmset', 'displaysleepnow'], ['/usr/bin/pmset', '-g', 'assertions', '-x'],
                     ['/usr/bin/pgrep', '-x', 'a b'], ['/usr/bin/pgrep', '-f', 'Millumin5'], ['/sbin/ifconfig', 'en1; reboot'], ['/sbin/ifconfig', 'en1', 'down'],
                     ['/sbin/ping', '-c', '1', '-t', '2', '8.8.8.8'], ['/sbin/ping', '-c', '5', '-t', '2', '192.168.1.2'], ['/sbin/ping', '-f', '192.168.1.2'],
                     ['/bin/ps', '-o', 'lstart=', '-p', '12;ls'], ['/usr/sbin/sysctl', '-w', 'kern.x=1'], ['/bin/kill', '1'], []):
            with self.subTest(args=args):
                with patch.object(mac.subprocess, 'run') as run:
                    with self.assertRaises(ValueError):
                        mac.read_command(args)
                    run.assert_not_called()

    def test_the_watch_path_in_the_source_cannot_reach_anything_else(self):
        tree = ast.parse(Path(mac.__file__).read_text())
        functions = {n.name: n for n in tree.body if isinstance(n, ast.FunctionDef)}
        reachable, todo = set(), ['watch_observe']
        while todo:
            name = todo.pop()
            if name in reachable or name not in functions:
                continue
            reachable.add(name)
            for node in ast.walk(functions[name]):
                if isinstance(node, ast.Name) and node.id in functions:
                    todo.append(node.id)
        self.assertIn('read_command', reachable)
        self.assertTrue(reachable.isdisjoint({'millumin_ui', 'send_millumin', 'observe_displays', 'observe_millumin', 'restore', 'open_show',
                                              'command', 'millumin_state', 'fullscreen_displays', 'main'}), reachable)
        used = set()
        for name in reachable:
            used |= {n.id for n in ast.walk(functions[name]) if isinstance(n, ast.Name)}
            used |= {n.attr for n in ast.walk(functions[name]) if isinstance(n, ast.Attribute)}
        self.assertTrue(used.isdisjoint({'BETTERDISPLAY', 'socket', 'sendto', 'Popen', 'system', 'popen'}), used)
        runs = [name for name in reachable if any(isinstance(n, ast.Attribute) and n.attr == 'run' for n in ast.walk(functions[name]))]
        self.assertEqual(runs, ['read_command'], 'read_command is the only place a program is started')

    def test_main_serves_the_watch_action_and_advertises_it(self):
        for action, expected in (('capabilities', lambda r: r['watch'] is True), ('watch', lambda r: r['schemaVersion'] == 1)):
            with self.subTest(action=action):
                out = io.StringIO()
                with patch.object(mac.sys, 'stdin', io.StringIO(json.dumps({'schemaVersion': 1, 'action': action, 'payload': {}}))), \
                        patch.object(mac.sys, 'stdout', out), patch.object(mac.subprocess, 'run', fake_run([])):
                    mac.main()
                reply = json.loads(out.getvalue())
                self.assertTrue(reply['ok'])
                self.assertTrue(expected(reply['result']))

    def test_a_missing_show_or_failed_section_does_not_stop_the_reading(self):
        self.payload['showPath'] = str(Path(self.dir.name) / 'gone.millumin')
        def run(args, **kwargs):
            if args[0] == '/usr/bin/pmset' and args[2] == 'therm':
                raise subprocess.TimeoutExpired(args, 6)
            return fake_run([])(args, **kwargs)
        with patch.object(mac.subprocess, 'run', run):
            reading = mac.watch_observe(self.payload)
        self.assertEqual(reading['show'], {'exists': False})
        self.assertIn('thermal', reading['errors'])
        self.assertEqual(reading['memory']['pressureLevel'], 1)

    def test_show_hash_is_reused_until_the_file_changes(self):
        first = mac.show_fingerprint(str(self.show), None)
        again = mac.show_fingerprint(str(self.show), {'size': first['size'], 'mtimeNs': first['mtimeNs'], 'sha256': 'f' * 64})
        self.assertEqual(again['sha256'], 'f' * 64, 'unchanged size and time keep the known hash')
        self.show.write_bytes(b'saved again, a different size')
        self.assertNotEqual(mac.show_fingerprint(str(self.show), first)['sha256'], first['sha256'])

    def test_pixel_stub_pings_only_when_the_interface_is_up_and_sends_nothing_else(self):
        down = 'en1: flags=8822<BROADCAST,SMART,SIMPLEX,MULTICAST> mtu 1500\n\tstatus: inactive\n'
        seen = []
        def run(args, **kwargs):
            seen.append(args)
            return subprocess.CompletedProcess(args, 0, stdout=down if args[0] == '/sbin/ifconfig' else '', stderr='')
        with patch.object(mac.subprocess, 'run', run):
            reading = mac.pixel_reading(self.payload['pixel'])
        self.assertFalse(reading['interface']['up'])
        self.assertEqual([c[0] for c in seen], ['/sbin/ifconfig'], 'no ping goes out on a down interface')
        self.assertFalse(reading['controllers'][0]['reachable'])
        with patch.object(mac.subprocess, 'run', fake_run([])):
            with self.assertRaises(ValueError):
                mac.pixel_reading({'interface': 'en1; x', 'controllers': []})


if __name__ == '__main__': unittest.main()
