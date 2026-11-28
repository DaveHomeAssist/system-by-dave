#!/usr/bin/env python3
"""Mac application adapter. Direct invocation is inert until a request arrives."""
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import re
import shutil
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
        command([BETTERDISPLAY, 'set', selector, '-rotation='+str(mode['rotation'])])
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


# ---- Read-only watch reading ---------------------------------------------------------------------
# Everything below is what mid-show watch mode may do on the Mac, and nothing else. It never calls the
# Millumin readback (millumin_ui), BetterDisplay, OSC (send_millumin), restore, openShow or the
# native tool's layout and windows commands. Every program it runs goes through read_command(), which
# refuses anything outside WATCH_PROGRAMS or with arguments outside the shapes listed there.
# test_mac_bridge.py checks this at runtime and in the source.

NAME_RE = re.compile(r'^[A-Za-z0-9._-]{1,64}$')
IFACE_RE = re.compile(r'^[a-z]{2,8}[0-9]{1,3}$')


def _pgrep_ok(args):
    return len(args) == 3 and args[1] == '-x' and bool(NAME_RE.match(args[2]))


def _ps_ok(args):
    return len(args) == 5 and args[1:4] == ['-o', 'lstart=', '-p'] and args[4].isdigit()


def _pmset_ok(args):
    return args[1:] in (['-g', 'assertions'], ['-g', 'therm'])


def _sysctl_ok(args):
    return args[1:] == ['-n', 'kern.memorystatus_vm_pressure_level']


def _ifconfig_ok(args):
    return len(args) == 2 and bool(IFACE_RE.match(args[1]))


def _private(value):
    try:
        address = ipaddress.ip_address(value)
    except ValueError:
        return False
    return address.is_private or address.is_link_local


def _ping_ok(args):
    return len(args) == 6 and args[1:5] == ['-c', '1', '-t', '2'] and _private(args[5])


def _native_ok(args):
    return len(args) == 2 and args[1] == 'watch'


WATCH_PROGRAMS = {
    '/usr/bin/pgrep': _pgrep_ok,
    '/bin/ps': _ps_ok,
    '/usr/bin/pmset': _pmset_ok,
    '/usr/sbin/sysctl': _sysctl_ok,
    '/sbin/ifconfig': _ifconfig_ok,
    '/sbin/ping': _ping_ok,
    'native': _native_ok,
}


def read_command(args, timeout=6):
    """Run one allowed read-only program. Returns (exit status, stdout). Raises ValueError for anything else."""
    key = 'native' if args and args[0] == NATIVE else (args[0] if args else '')
    allowed = WATCH_PROGRAMS.get(key)
    if allowed is None or not allowed(list(args)):
        raise ValueError('Watch mode may not run that command.')
    done = subprocess.run(list(args), capture_output=True, text=True, timeout=timeout, check=False)
    return done.returncode, done.stdout


def parse_assertions(text):
    """pmset -g assertions: system-wide counts and the processes that hold them."""
    counts, owners, section = {}, [], None
    for line in text.splitlines():
        if line.startswith('Assertion status system-wide'):
            section = 'counts'
        elif line.startswith('Listed by owning process'):
            section = 'owners'
        elif section == 'counts':
            found = re.match(r'^\s+([A-Za-z]+)\s+(\d+)\s*$', line)
            if found:
                counts[found.group(1)] = int(found.group(2))
        elif section == 'owners':
            found = re.match(r'^\s+pid (\d+)\(([^)]+)\): \[[^\]]+\] \S+ ([A-Za-z]+) named:', line)
            if found:
                owners.append({'pid': int(found.group(1)), 'process': found.group(2), 'type': found.group(3)})
    return {'systemWide': counts, 'owners': owners}


def parse_thermal(text):
    limits = {m.group(1): int(m.group(2)) for m in re.finditer(r'^\s*([A-Za-z_]*Limit)\s*=\s*(\d+)', text, re.M)}
    return {'limits': limits}


def processes_named(name):
    status, out = read_command(['/usr/bin/pgrep', '-x', name])
    if status not in (0, 1):
        raise ValueError('pgrep failed')
    found = []
    for pid in [line.strip() for line in out.splitlines() if line.strip().isdigit()]:
        code, started = read_command(['/bin/ps', '-o', 'lstart=', '-p', pid])
        if code == 0 and started.strip():
            found.append({'pid': int(pid), 'startedAt': ' '.join(started.split())})
    return found


def watch_displays():
    rows = json.loads(read_command([NATIVE, 'watch'])[1])
    result = []
    for row in rows:
        mode = {k: v for k, v in row.items() if k not in ('id', 'active', 'name', 'vendor', 'model', 'serial')}
        result.append({'id': row['id'], 'name': row.get('name', ''), 'active': row.get('active') is True,
                       'identity': {k: row.get(k) for k in ('vendor', 'model', 'serial')}, 'mode': mode})
    return result


def show_fingerprint(path, known):
    """Size and modified time every time; the SHA-256 only when either changed since the last reading."""
    stat = os.stat(path)
    if not os.path.isfile(path):
        raise ValueError('The show path is not a file')
    if isinstance(known, dict) and known.get('size') == stat.st_size and known.get('mtimeNs') == stat.st_mtime_ns and known.get('sha256'):
        sha = known['sha256']
    else:
        digest = hashlib.sha256()
        with open(path, 'rb') as handle:
            for chunk in iter(lambda: handle.read(1 << 20), b''):
                digest.update(chunk)
        sha = digest.hexdigest()
    return {'exists': True, 'size': stat.st_size, 'mtimeNs': stat.st_mtime_ns, 'sha256': sha}


def pixel_reading(config):
    """Interface state and a ping to each listed controller. Never sends pixel data (MF-3, option A)."""
    iface = config['interface']
    if not IFACE_RE.match(iface):
        raise ValueError('Invalid interface')
    status, out = read_command(['/sbin/ifconfig', iface])
    exists = status == 0
    up = exists and bool(re.search(r'flags=[0-9a-f]+<[^>]*\bUP\b[^>]*\bRUNNING\b', out)) and not re.search(r'status:\s*inactive', out)
    controllers = []
    for item in config.get('controllers', []):
        reachable = False
        if up and _private(item.get('address')):
            reachable = read_command(['/sbin/ping', '-c', '1', '-t', '2', item['address']], timeout=6)[0] == 0
        controllers.append({'name': item.get('name'), 'address': item.get('address'), 'reachable': reachable})
    return {'interface': {'name': iface, 'exists': exists, 'up': up}, 'controllers': controllers}


def watch_observe(payload):
    """One read-only reading. A section that cannot be read reports its error instead of stopping the others."""
    payload = payload if isinstance(payload, dict) else {}
    errors, reading = {}, {'schemaVersion': 1}

    def section(name, read):
        try:
            reading[name] = read()
        except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
            errors[name] = str(error)[:160] or type(error).__name__
    section('displays', watch_displays)
    section('millumin', lambda: {'processes': processes_named('Millumin5')})

    def show():
        try:
            return show_fingerprint(payload['showPath'], payload.get('knownShow'))
        except FileNotFoundError:
            return {'exists': False}
    section('show', show)

    def power():
        found = parse_assertions(read_command(['/usr/bin/pmset', '-g', 'assertions'])[1])
        name = payload.get('keepAwakeProcess')
        if name:
            if not NAME_RE.match(str(name)):
                raise ValueError('Invalid keep-awake process name')
            found['keepAwakeProcesses'] = processes_named(name)
        return found
    section('power', power)

    def disk():
        usage = shutil.disk_usage(payload.get('diskPath') or '/')
        return {'path': payload.get('diskPath') or '/', 'totalBytes': usage.total, 'freeBytes': usage.free}
    section('disk', disk)
    section('thermal', lambda: parse_thermal(read_command(['/usr/bin/pmset', '-g', 'therm'])[1]))
    section('memory', lambda: {'pressureLevel': int(read_command(['/usr/sbin/sysctl', '-n', 'kern.memorystatus_vm_pressure_level'])[1].strip())})
    folder = payload.get('mediaFolder')
    if folder:
        section('media', lambda: {'path': folder, 'exists': os.path.exists(folder), 'isDir': os.path.isdir(folder),
                                  'readable': os.access(folder, os.R_OK | os.X_OK)})
    if isinstance(payload.get('pixel'), dict):
        section('pixel', lambda: pixel_reading(payload['pixel']))
    reading['errors'] = errors
    return reading


def main():
    request = json.load(sys.stdin)
    if request.get('schemaVersion') != 1:
        raise ValueError('Unsupported request')
    action, payload = request.get('action'), request.get('payload', {})
    if action == 'capabilities':
        result = {'startup': True, 'routingReadback': True, 'watch': True}
    elif action == 'watch':
        result = watch_observe(payload)
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
