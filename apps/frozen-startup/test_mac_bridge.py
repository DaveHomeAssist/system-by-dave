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
            self.assertEqual(len(calls), 11)
            self.assertIn('-registryLocation=fixture-port-0', calls[0].args[0])
            self.assertIn('-hiDPI=off', calls[1].args[0])
            self.assertEqual(calls[-1].args[0], [mac.NATIVE, 'layout'])


if __name__ == '__main__': unittest.main()
