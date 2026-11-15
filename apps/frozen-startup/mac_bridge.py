#!/usr/bin/env python3
"""Mac application adapter. Direct invocation is inert until a request arrives."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import socket
import time
from urllib.parse import unquote, urlparse

BETTERDISPLAY = '/Applications/BetterDisplay.app/Contents/MacOS/BetterDisplay'
NATIVE = os.environ.get('FROZEN_NATIVE_DISPLAY_TOOL', str(Path(__file__).with_name('mac-displays')))


def command(args, payload=None):
    result = subprocess.run(args, input=payload, text=True, capture_output=True, timeout=40, check=True)
    return result.stdout.strip()


def identities(raw):
    # BetterDisplay emits comma-separated objects rather than a JSON array.
    items = json.loads('[' + raw.strip().strip(',') + ']')
    return [i for i in items if i.get('deviceType') == 'Display' and i.get('displayID')]


def color_mode(text):
    bits = re.search(r'(8|10|12|16)bit', text)
    encoding = 'ycbcr' if re.search(r'ycbcr|yuv', text, re.I) else 'rgb' if re.search(r'\bRGB\b', text) else None
    chroma = re.search(r'(?i)(?:ycbcr|yuv)\s*(4:4:4|444|4:2:2|422|4:2:0|420)', text)
    limited = re.search(r'\b(limited|full)\b', text, re.I)
    if not bits or not encoding or not limited:
        raise ValueError('Source color mode is unavailable')
    return 'bpc:%s+range:%s+encoding:%s+chroma:%s+hdrmode:%s' % (
        bits[1], limited[1].lower(), encoding, chroma[1].replace(':', '') if chroma else '444',
        'hdr10' if re.search(r'\bHDR10\b', text, re.I) else 'sdr')


def route_values(rows, display_names):
    """Accept only explicit AX rows with a canvas label and one selected display."""
    routes = {}
    for row in rows:
        canvas = row.get('canvas')
        selected = row.get('selectedDisplay')
        if not isinstance(canvas, str) or not canvas or canvas in routes:
            raise ValueError('Ambiguous canvas row')
        label = re.sub(r' \(main screen\)$', '', selected)
        matches = [d['id'] for d in display_names if label in d.get('names', [d['name']])]
        if len(matches) != 1:
            raise ValueError('Ambiguous selected display')
        routes[canvas] = matches[0]
    return routes


def millumin_ui(action='observe', payload=None):
    return json.loads(command(['/usr/bin/osascript', '-l', 'JavaScript',
                              str(Path(__file__).with_name('millumin-readback.js')), action, json.dumps(payload or {})]))


def fullscreen_displays(windows, displays):
    result = set()
    for window in windows:
        if window.get('kCGWindowOwnerName') != 'Millumin5' or window.get('kCGWindowLayer') != 1000:
            continue
        if window.get('kCGWindowIsOnscreen') is not True or window.get('kCGWindowAlpha', 0) <= 0:
            continue
        bounds = window.get('kCGWindowBounds', {})
        for display in displays:
            mode = display['mode']
            if all(abs(bounds.get(k, -999999) - mode[v]) <= 1 for k, v in
                   [('X', 'x'), ('Y', 'y'), ('Width', 'width'), ('Height', 'height')]):
                result.add(display['id'])
    return result


def millumin_state(tree, displays, windows):
    url = urlparse(tree['document'])
    if url.scheme != 'file' or url.netloc not in ('', 'localhost'):
        raise ValueError('Millumin document path is unavailable')
    path = Path(unquote(url.path))
    show_hash = hashlib.sha256(path.read_bytes()).hexdigest()
    x, y = tree['position']
    owners = [d['id'] for d in displays if d['mode']['x'] <= x < d['mode']['x'] + d['mode']['width']
              and d['mode']['y'] <= y < d['mode']['y'] + d['mode']['height']]
    if len(owners) != 1:
        raise ValueError('Millumin control window display is ambiguous')
    assigned = [r for r in tree['routes'] if r['selectedDisplay'] != '(no display)']
    routes = route_values(assigned, displays)
    actual = fullscreen_displays(windows, displays)
    expected = set(routes.values())
    return {'showSHA256': show_hash, 'showPath': str(path.resolve()), 'routes': routes,
            'controlDisplayID': owners[0], 'fullscreen': bool(expected) and actual == expected and tree['fullscreenRequested'],
            'outputDisplayIDs': sorted(actual), 'unassignedCanvases': [r['canvas'] for r in tree['routes'] if r['selectedDisplay'] == '(no display)']}


def observe_millumin(displays):
    try:
        tree = millumin_ui()
        windows = json.loads(command([NATIVE, 'windows']))
        return millumin_state(tree, displays, windows)
    except (ValueError, KeyError, TypeError, subprocess.SubprocessError, OSError) as error:
        return {'verificationError': str(error)}


def send_millumin(action, argument=None):
    allowed = {'openProject', 'enterFullscreen', 'exitFullscreen'}
    if action not in allowed:
        raise ValueError('Unsupported Millumin action')
    message = '/millumin/action/' + action
    if argument is not None:
        message += ' ' + json.dumps(argument)
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        sock.sendto(message.encode(), ('127.0.0.1', 5000))


def open_show(payload):
    path = Path(payload['showPath']).resolve(strict=True)
    if hashlib.sha256(path.read_bytes()).hexdigest() != payload['showSHA256']:
        raise ValueError('Approved show file hash changed')
    # A different active document must be closed by the operator first.
    try:
        current = millumin_ui('document')
    except subprocess.SubprocessError as error:
        running = subprocess.run(['/usr/bin/pgrep', '-x', 'Millumin5'], capture_output=True).returncode == 0
        if running:
            raise ValueError('Cannot inspect the existing Millumin document') from error
        current = None
    if current and current.get('document') and Path(unquote(urlparse(current['document']).path)).resolve() != path:
        raise ValueError('Another Millumin document is open')
    if current is None or not current.get('document'):
        command(['/usr/bin/open', '-a', 'Millumin5', str(path)])
    for _ in range(10):
        try:
            current = millumin_ui('document')
            if current.get('document') and Path(unquote(urlparse(current['document']).path)).resolve() == path:
                break
        except subprocess.SubprocessError:
            pass
        time.sleep(.2)
    else:
        raise ValueError('Millumin did not open the approved project')
    displays = observe_displays()
    targets = [d for d in displays if d['id'] == payload['controlDisplayID']]
    if len(targets) != 1:
        raise ValueError('Control display changed')
    mode = targets[0]['mode']
    millumin_ui('position', {'position': [mode['x'] + 40, mode['y'] + 40]})
    return {}


def observe_displays():
    native = json.loads(command([NATIVE]))
    bd = identities(command([BETTERDISPLAY, 'get', '-identifiers']))
    result = []
    for display in native:
        matches = [i for i in bd if int(i['displayID']) == display['id']]
        if len(matches) != 1:
            raise ValueError('Native and BetterDisplay identities disagree')
        info = matches[0]
        mode = {k: v for k, v in display.items() if k not in ('id', 'active', 'name')}
        mode['colorMode'] = color_mode(command([BETTERDISPLAY, 'get', '-displayID='+str(display['id']), '-connectionMode']))
        result.append({'id': display['id'], 'active': display['active'], 'connector': info['registryLocation'],
                       'identity': {k: int(info[k]) for k in ('vendor', 'model', 'serial')},
                       'name': info['name'], 'names': [info['name'], info.get('productName', ''), display.get('name', '')], 'mode': mode})
    return result


def restore(rows):
    current = observe_displays()
    if not isinstance(rows, list) or len(rows) != 5 or len(rows) != len(current):
        raise ValueError('Display set changed')
    for row in rows:
        matches = [d for d in current if d['id'] == row['id'] and d['connector'] == row['connector'] and d['identity'] == row['identity']]
        if len(matches) != 1:
            raise ValueError('Display identity changed before restoration')
    for row in rows:
        mode = row['mode']
        selector = '-registryLocation='+row['connector']
        command([BETTERDISPLAY, 'set', selector, '-connectionMode='+mode['colorMode']])
        command([BETTERDISPLAY, 'set', selector, '-resolution=%dx%d' % (mode['width'], mode['height']),
                 '-refreshRate=%sHz' % mode['refreshRate'], '-hiDPI=off'])
    after = observe_displays()
    for row in rows:
        matches = [d for d in after if d['id'] == row['id'] and d['connector'] == row['connector'] and d['identity'] == row['identity']]
        if len(matches) != 1:
            raise ValueError('Display identity changed during mode restoration')
    command([NATIVE, 'layout'], json.dumps([{'id': d['id'], 'x': d['mode']['x'], 'y': d['mode']['y']} for d in rows]))
    return {}


def main():
    request = json.load(sys.stdin)
    if request.get('schemaVersion') != 1:
        raise ValueError('Unsupported request')
    action, payload = request.get('action'), request.get('payload', {})
    if action == 'capabilities':
        result = {'startup': True, 'routingReadback': True}
    elif action == 'observe':
        displays = observe_displays()
        result = {'schemaVersion': 1, 'displays': displays, 'millumin': observe_millumin(displays)}
    elif action == 'restore':
        result = restore(payload['displays'])
    elif action == 'openShow':
        result = open_show(payload)
    elif action == 'fullscreen':
        send_millumin('enterFullscreen')
        result = {}
    else:
        raise ValueError('Unsupported Mac adapter operation')
    print(json.dumps({'ok': True, 'result': result}))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(json.dumps({'ok': False, 'error': str(error)}))
        sys.exit(1)
