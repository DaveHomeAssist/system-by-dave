#!/usr/bin/env python3
"""Mac application adapter. Direct invocation is inert until a request arrives."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import unquote, urlparse

BETTERDISPLAY = '/Applications/BetterDisplay.app/Contents/MacOS/BetterDisplay'
NATIVE = os.environ.get('FROZEN_NATIVE_DISPLAY_TOOL', str(Path(__file__).with_name('mac-displays')))


def command(args, payload=None):
    result = subprocess.run(args, input=payload, text=True, capture_output=True, timeout=12, check=True)
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
        matches = [d['id'] for d in display_names if d['name'] == selected]
        if len(matches) != 1:
            raise ValueError('Ambiguous selected display')
        routes[canvas] = matches[0]
    return routes


def parse_output_panel(tree, displays):
    """Read explicit AX rows; fail closed if the app exposes a different layout."""
    rows = []
    def visit(node):
        if not isinstance(node, dict):
            raise ValueError('Invalid accessibility tree')
        children = node.get('children', [])
        if node.get('role') == 'AXRow':
            labels = [c.get('value') or c.get('name') for c in children if c.get('role') == 'AXStaticText']
            popups = [c.get('value') for c in children if c.get('role') == 'AXPopUpButton']
            if len(labels) == 1 and len(popups) == 1 and isinstance(labels[0], str):
                rows.append({'canvas': labels[0], 'selectedDisplay': popups[0]})
        for child in children:
            visit(child)
    visit(tree)
    if not rows:
        raise ValueError('Millumin does not expose unambiguous canvas rows')
    return route_values(rows, displays)


def read_millumin_tree():
    return json.loads(command(['/usr/bin/osascript', '-l', 'JavaScript', str(Path(__file__).with_name('millumin-readback.js'))]))


def millumin_state(tree, displays):
    documents = [w for w in tree['windows'] if w.get('document')]
    if len(documents) != 1:
        raise ValueError('Millumin active document is unavailable or ambiguous')
    window = documents[0]
    url = urlparse(window['document'])
    if url.scheme != 'file' or url.netloc not in ('', 'localhost'):
        raise ValueError('Millumin document path is unavailable')
    path = Path(unquote(url.path))
    show_hash = hashlib.sha256(path.read_bytes()).hexdigest()
    x, y = window['position']
    owners = [d['id'] for d in displays if d['mode']['x'] <= x < d['mode']['x'] + d['mode']['width']
              and d['mode']['y'] <= y < d['mode']['y'] + d['mode']['height']]
    if len(owners) != 1:
        raise ValueError('Millumin control window display is ambiguous')
    routes = parse_output_panel(tree.get('outputPanel', {}), displays)
    return {'showSHA256': show_hash, 'routes': routes, 'controlDisplayID': owners[0],
            'fullscreen': False, 'verificationError': 'Fullscreen window evidence is not yet qualified'}


def observe_millumin(displays):
    try:
        return millumin_state(read_millumin_tree(), displays)
    except (ValueError, KeyError, TypeError, subprocess.SubprocessError, OSError) as error:
        return {'verificationError': str(error)}


def open_show(payload):
    path = Path(payload['showPath'])
    if hashlib.sha256(path.read_bytes()).hexdigest() != payload['showSHA256']:
        raise ValueError('Approved show file hash changed')
    # Never replace another open document or discard unsaved work.
    tree = read_millumin_tree()
    docs = [w for w in tree.get('windows', []) if w.get('document')]
    expected = path.resolve().as_uri()
    if len(docs) != 1 or docs[0]['document'] != expected:
        raise ValueError('Open the approved show before running this development adapter')
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
        mode = {k: v for k, v in display.items() if k not in ('id', 'active')}
        mode['colorMode'] = color_mode(command([BETTERDISPLAY, 'get', '-displayID='+str(display['id']), '-connectionMode']))
        result.append({'id': display['id'], 'active': display['active'], 'connector': info['registryLocation'],
                       'identity': {k: int(info[k]) for k in ('vendor', 'model', 'serial')},
                       'name': info['name'], 'mode': mode})
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
        result = {'startup': False, 'routingReadback': False, 'reason': 'Live Millumin output ownership is unqualified'}
    elif action == 'observe':
        displays = observe_displays()
        result = {'schemaVersion': 1, 'displays': displays, 'millumin': observe_millumin(displays)}
    elif action == 'restore':
        result = restore(payload['displays'])
    elif action == 'openShow':
        result = open_show(payload)
    else:
        raise ValueError('Millumin live integration is not yet qualified; output remains unavailable')
    print(json.dumps({'ok': True, 'result': result}))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(json.dumps({'ok': False, 'error': str(error)}))
        sys.exit(1)
