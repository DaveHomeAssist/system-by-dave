#!/usr/bin/env python3
"""Read-only mid-show watch for Frozen Startup.

Watch mode only looks. Every cycle asks the bridge for one read-only reading
(`watch`), judges it against the profile and the baseline captured when startup
reached ready, writes the result to the check stream and sends a small status
report to the Projctl relay. It cannot reach the Millumin readback, a display
mode change, OSC, a projector or pixel command, or a relaunch or repair:

* `ReadOnlyBridge` passes the bridge only the actions in `READ_ONLY_ACTIONS`.
* This module imports no `subprocess` or `socket`; its only network use is
  three fixed requests to the relay named in the profile (see `HTTP_REQUESTS`).
* `test_watch.py` checks both facts, and checks the bridge's `watch` path
  separately in `test_mac_bridge.py`.

Python 3.9 compatible, standard library only.
"""
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from startup import StartupError, STREAM_SCHEMA, boot_id, resolve, save

REPORT_SCHEMA = 'frozen-startup.status-report.v1'
BASELINE_SCHEMA = 1
READ_ONLY_ACTIONS = frozenset(('capabilities', 'watch'))
# The only requests watch mode makes to the relay. Anything else is a violation.
HTTP_REQUESTS = frozenset((('GET', '/api/health'), ('GET', '/api/mac-status/projectors'), ('POST', '/api/mac-status')))
ROLES = ('projectors', 'pixel-strips')
PLACEHOLDER = 'REPLACE-'
HOST_RE = re.compile(r'^[a-z0-9][a-z0-9-]{0,31}$')
NAME_RE = re.compile(r'^[A-Za-z0-9._-]{1,64}$')
IFACE_RE = re.compile(r'^[a-z]{2,8}[0-9]{1,3}$')
SLEEP_ASSERTIONS = ('PreventUserIdleSystemSleep', 'PreventSystemSleep')
MODE_KEYS = ('width', 'height', 'pixelWidth', 'pixelHeight', 'refreshRate', 'x', 'y', 'main', 'mirrored', 'rotation')
MODE_REQUIRED = ('width', 'height', 'pixelWidth', 'pixelHeight', 'refreshRate')

# Statuses. Only FAIL is a fault. CHANGED and WARN are notes; NOT CONFIGURED means the profile
# does not switch the check on, and is never shown as a pass.
FAULT = 'FAIL'
NOTES = ('CHANGED', 'WARN')
WATCH_CHECKS = (
    ('displays', 'Displays'),
    ('millumin', 'Millumin process'),
    ('show', 'Show file'),
    ('power', 'Sleep and keep-awake'),
    ('disk', 'Disk space'),
    ('thermal', 'Thermal state'),
    ('memory', 'Memory pressure'),
    ('media', 'Media folder'),
    ('relay', 'Projctl relay'),
    ('projectors', 'Projector power and shutter'),
    ('pixel', 'Pixel output'),
)
LABELS = dict(WATCH_CHECKS)


class WatchViolation(Exception):
    """Raised when something tries to make watch mode do more than read."""


class WatchNotConfigured(StartupError):
    pass


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def clip(text, limit=200):
    text = ' '.join(str(text).split())
    return text if len(text) <= limit else text[:limit - 1] + '…'


# ---- Profile ------------------------------------------------------------------------------------

def placeholders(value, path=''):
    """Paths of every string that still starts with REPLACE-."""
    found = []
    if isinstance(value, dict):
        for key, item in value.items():
            found += placeholders(item, '%s.%s' % (path, key) if path else str(key))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            found += placeholders(item, '%s[%d]' % (path, index))
    elif isinstance(value, str) and value.startswith(PLACEHOLDER):
        found.append(path)
    return found


def _is_abs(value):
    return isinstance(value, str) and value.startswith('/') and '\x00' not in value


def _private_address(value):
    import ipaddress
    try:
        address = ipaddress.ip_address(value)
    except ValueError:
        return False
    return address.is_private or address.is_link_local


def clean_url(value, what):
    if not isinstance(value, str):
        raise StartupError('%s must be an http or https address.' % what)
    parts = urllib.parse.urlsplit(value)
    if parts.scheme not in ('http', 'https') or not parts.hostname or parts.username or parts.password \
            or parts.path not in ('', '/') or parts.query or parts.fragment:
        raise StartupError('%s must be a plain http or https address with no path.' % what)
    return value.rstrip('/')


def validate_watch_profile(profile):
    """Validate a profile for a Mac whose startup checks are not commissioned (the m1, until it is inspected)."""
    if not isinstance(profile, dict) or profile.get('schemaVersion') != 1:
        raise StartupError('Unsupported profile version.')
    if profile.get('role', 'projectors') not in ROLES:
        raise StartupError('Unknown profile role.')
    found = placeholders(profile)
    if found:
        raise StartupError('This profile still has placeholders (%s). Fill them in from a read-only inspection of the Mac.'
                           % ', '.join(found[:6]))
    displays = profile.get('displays')
    if not isinstance(displays, list) or not 1 <= len(displays) <= 16 or any(not isinstance(d, dict) for d in displays):
        raise StartupError('Profile needs between one and sixteen displays.')
    lanes = [d.get('lane') for d in displays]
    if any(not isinstance(lane, str) or not lane for lane in lanes) or len(set(lanes)) != len(lanes):
        raise StartupError('Each display needs its own lane name.')
    for d in displays:
        identity, mode = d.get('identity'), d.get('mode')
        if not isinstance(identity, dict) or not identity or any(not isinstance(k, str) or type(v) not in (str, int) for k, v in identity.items()):
            raise StartupError('%s needs identity evidence.' % d['lane'])
        if not isinstance(mode, dict) or any(k not in mode for k in MODE_REQUIRED) or any(k not in MODE_KEYS + ('colorMode',) for k in mode):
            raise StartupError('%s needs width, height, pixel size and refresh rate.' % d['lane'])
        for key in ('width', 'height', 'pixelWidth', 'pixelHeight'):
            if type(mode[key]) is not int or not 1 <= mode[key] <= 32768:
                raise StartupError('Invalid display dimensions.')
        if type(mode['refreshRate']) not in (int, float) or not 1 <= mode['refreshRate'] <= 240:
            raise StartupError('Invalid display refresh rate.')
    if not _is_abs(profile.get('showPath')):
        raise StartupError('Profile needs an absolute show path.')
    sha = profile.get('showSHA256')
    if sha is not None and (not isinstance(sha, str) or len(sha) != 64 or any(c not in '0123456789abcdef' for c in sha)):
        raise StartupError('Invalid approved show SHA-256.')
    return profile


def watch_config(profile):
    """Normalized watch settings from profile['watch']. Every check is switched on by the profile."""
    raw = profile.get('watch') if isinstance(profile, dict) else None
    if not isinstance(raw, dict):
        raise WatchNotConfigured('Watch mode is not configured in this profile.')
    found = placeholders(profile)
    if found:
        raise StartupError('This profile still has placeholders (%s).' % ', '.join(found[:6]))
    host = raw.get('host')
    if not isinstance(host, str) or not HOST_RE.match(host):
        raise StartupError('watch.host must be a short lowercase label such as m5.')
    name = raw.get('hostName')
    if name is not None and (not isinstance(name, str) or not 1 <= len(name) <= 80):
        raise StartupError('watch.hostName must be up to 80 characters.')
    interval = raw.get('intervalSeconds', 60)
    if type(interval) not in (int, float) or not 10 <= interval <= 600:
        raise StartupError('watch.intervalSeconds must be between 10 and 600.')
    disk = raw.get('diskPath', '/')
    free = raw.get('minFreeDiskGB', 20)
    if not _is_abs(disk) or type(free) not in (int, float) or not free > 0:
        raise StartupError('watch.diskPath must be absolute and minFreeDiskGB above zero.')
    media = raw.get('mediaFolder')
    if media is not None and not _is_abs(media):
        raise StartupError('watch.mediaFolder must be an absolute path.')
    keep = raw.get('keepAwake')
    if keep is not None and (not isinstance(keep, dict) or not isinstance(keep.get('process'), str) or not NAME_RE.match(keep['process'])):
        raise StartupError('watch.keepAwake.process must be a process name.')
    relay = raw.get('relay')
    relay_url = clean_url(relay.get('url'), 'watch.relay.url') if isinstance(relay, dict) else None
    if relay is not None and relay_url is None:
        raise StartupError('watch.relay needs a url.')
    report = raw.get('report')
    report_cfg = None
    if report is not None:
        if not isinstance(report, dict) or not _is_abs(report.get('tokenFile')):
            raise StartupError('watch.report needs an absolute tokenFile.')
        url = clean_url(report['url'], 'watch.report.url') if report.get('url') else relay_url
        if url is None:
            raise StartupError('watch.report needs a relay address (watch.relay.url or watch.report.url).')
        report_cfg = {'url': url, 'tokenFile': report['tokenFile']}
    projectors = raw.get('projectors')
    projector_cfg = None
    if projectors is not None:
        known = {d.get('lane') for d in profile.get('displays', []) if isinstance(d, dict)} - {'control'}
        lanes = projectors.get('lanes') if isinstance(projectors, dict) else None
        expect = projectors.get('expectPower') if isinstance(projectors, dict) else None
        if not isinstance(lanes, list) or not lanes or any(lane not in known for lane in lanes):
            raise StartupError('watch.projectors.lanes must name lanes from the profile displays.')
        if expect is not None and (not isinstance(expect, list) or not expect or any(p not in ('on', 'warming', 'cooling', 'off') for p in expect)):
            raise StartupError('watch.projectors.expectPower must list power states or be null.')
        if relay_url is None or report_cfg is None:
            raise StartupError('Projector checks need watch.relay.url and watch.report.tokenFile.')
        projector_cfg = {'lanes': list(lanes), 'expectPower': list(expect) if expect else None}
    pixel = raw.get('pixelOutput')
    pixel_cfg = None
    if pixel is not None:
        if not isinstance(pixel, dict) or type(pixel.get('enabled')) is not bool:
            raise StartupError('watch.pixelOutput needs enabled true or false.')
        if pixel['enabled']:
            controllers = pixel.get('controllers')
            if not isinstance(pixel.get('interface'), str) or not IFACE_RE.match(pixel['interface']):
                raise StartupError('watch.pixelOutput.interface must be a network interface name such as en1.')
            if not isinstance(controllers, list) or not controllers or len(controllers) > 32 or any(
                    not isinstance(c, dict) or not isinstance(c.get('name'), str) or not 1 <= len(c['name']) <= 40
                    or not _private_address(c.get('address')) for c in controllers):
                raise StartupError('watch.pixelOutput.controllers need a name and a private network address each.')
            pixel_cfg = {'enabled': True, 'interface': pixel['interface'],
                         'controllers': [{'name': c['name'], 'address': c['address']} for c in controllers]}
        else:
            pixel_cfg = {'enabled': False}
    return {'host': host, 'hostName': name, 'role': profile.get('role', 'projectors'), 'intervalSeconds': interval,
            'diskPath': disk, 'minFreeDiskGB': free, 'mediaFolder': media, 'keepAwake': keep, 'relayUrl': relay_url,
            'report': report_cfg, 'projectors': projector_cfg, 'pixelOutput': pixel_cfg}


def load_profile(profile, watch=False):
    """Validate a profile for startup (the M5 shape) or for watch (any role)."""
    from startup import validate_profile
    role = profile.get('role', 'projectors') if isinstance(profile, dict) else None
    if role in (None, 'projectors'):
        return validate_profile(profile)
    if not watch:
        raise StartupError('Startup checks for the %s profile are commissioned after the Mac is inspected. Only watch mode is available.' % role)
    return validate_watch_profile(profile)


# ---- Bridge guard -------------------------------------------------------------------------------

class ReadOnlyBridge:
    """The only bridge the watch loop ever sees. Any action beyond a read raises before it leaves this class."""

    def __init__(self, bridge):
        self._bridge = bridge

    def call(self, action, payload):
        if action not in READ_ONLY_ACTIONS:
            raise WatchViolation('Watch mode may not call %r.' % action)
        return self._bridge.call(action, payload)


# ---- Baseline -----------------------------------------------------------------------------------

def baseline_path(state_dir):
    return Path(state_dir) / 'watch-baseline.json'


def load_baseline(state_dir, boot=None):
    try:
        data = json.loads(baseline_path(state_dir).read_text())
        if not isinstance(data, dict) or data.get('schemaVersion') != BASELINE_SCHEMA:
            return None
        if data.get('bootID') != (boot if boot is not None else boot_id()):
            return None  # a restart ends the baseline: the processes it described are gone
        return data
    except (OSError, ValueError, StartupError):
        return None


def watch_request(cfg, profile, known_show=None):
    """The payload for the bridge's read-only watch action. It names what to read and nothing else."""
    pixel = cfg['pixelOutput'] if cfg['pixelOutput'] and cfg['pixelOutput'].get('enabled') else None
    return {'showPath': profile['showPath'], 'knownShow': known_show, 'diskPath': cfg['diskPath'],
            'mediaFolder': cfg['mediaFolder'], 'keepAwakeProcess': (cfg['keepAwake'] or {}).get('process'), 'pixel': pixel}


def _identity_map(profile, displays):
    """lane -> display id, matched by identity evidence. Raises when two displays cannot be told apart."""
    mapping = {}
    for expected in profile['displays']:
        matches = [d for d in displays if isinstance(d.get('identity'), dict)
                   and all(d['identity'].get(k) == v for k, v in expected['identity'].items())]
        if len(matches) != 1:
            raise StartupError('Cannot tell which display is %s from its identity alone.' % expected['lane'])
        mapping[expected['lane']] = matches[0]['id']
    return mapping


def make_baseline(profile, reading, source, run_id=None, lanes=None, boot=None):
    """Capture what 'the same as at startup' means, from one read-only reading."""
    displays = reading.get('displays') or []
    mapping = lanes
    if mapping is None:
        try:
            mapping = _identity_map(profile, displays)
        except StartupError:
            mapping = {}
    by_id = {d.get('id'): d for d in displays if isinstance(d, dict)}
    processes = (reading.get('millumin') or {}).get('processes') or []
    show = reading.get('show') or {}
    return {'schemaVersion': BASELINE_SCHEMA, 'source': source, 'bootID': boot if boot is not None else boot_id(), 'runID': run_id,
            'capturedAt': now_iso(), 'lanes': dict(mapping),
            'identities': {lane: by_id[i].get('identity') for lane, i in mapping.items() if i in by_id},
            'millumin': {'pid': processes[0]['pid'], 'startedAt': processes[0]['startedAt']} if len(processes) == 1 else None,
            'show': {'size': show['size'], 'mtimeNs': show['mtimeNs'], 'sha256': show.get('sha256')} if show.get('exists') and show.get('sha256') else None}


def capture_baseline(profile, bridge, state_dir, run_id=None, lanes=None, source='startup', boot=None):
    """Called once when startup reaches ready. One read-only reading; never blocks or fails startup."""
    cfg = watch_config(profile)
    reading = ReadOnlyBridge(bridge).call('watch', watch_request(cfg, profile))
    baseline = make_baseline(profile, reading, source, run_id=run_id, lanes=lanes, boot=boot)
    save(baseline_path(state_dir), baseline)
    return baseline


def fill_baseline(profile, reading, baseline, state_dir, boot=None):
    """Add whatever the baseline lacks from this reading (first-reading baseline). Returns the baseline."""
    fresh = make_baseline(profile, reading, 'first-reading', boot=boot)
    if baseline is None:
        baseline = fresh
        changed = True
    else:
        changed = False
        for key in ('lanes', 'identities', 'millumin', 'show'):
            if not baseline.get(key) and fresh.get(key):
                baseline[key] = fresh[key]
                changed = True
    if changed:
        try:
            save(baseline_path(state_dir), baseline)
        except OSError:
            pass
    return baseline


# ---- Checks -------------------------------------------------------------------------------------

def result(check_id, status, observed, expected=None):
    item = {'id': check_id, 'label': LABELS[check_id], 'status': status, 'observed': clip(observed)}
    if expected:
        item['expected'] = clip(expected)
    return item


def _failed_read(check_id, reading, expected=None):
    error = (reading.get('errors') or {}).get(check_id)
    return result(check_id, 'FAIL', 'Could not read: %s' % error, expected) if error else None


def mode_mismatches(expected, actual):
    problems = []
    for key in MODE_KEYS:
        if key not in expected:
            continue
        value, wanted = actual.get(key), expected[key]
        if key == 'refreshRate':
            ok = type(value) in (int, float) and abs(value - wanted) <= 0.02
        else:
            ok = type(value) == type(wanted) and value == wanted
        if not ok:
            problems.append(key)
    return problems


def check_displays(profile, reading, baseline):
    expected = '%d displays: %s' % (len(profile['displays']), ', '.join(d['lane'] for d in profile['displays']))
    failed = _failed_read('displays', reading, expected)
    if failed:
        return failed
    displays = [d for d in reading.get('displays', []) if isinstance(d, dict)]
    mapping = (baseline or {}).get('lanes') or None
    if not mapping:
        try:
            mapping = _identity_map(profile, displays)
        except StartupError as error:
            return result('displays', 'FAIL', '%s Run the startup check first.' % error, expected)
    problems = []
    if len(displays) != len(profile['displays']):
        problems.append('%d displays present, expected %d' % (len(displays), len(profile['displays'])))
    by_id = {d.get('id'): d for d in displays}
    identities = (baseline or {}).get('identities') or {}
    for want in profile['displays']:
        lane = want['lane']
        actual = by_id.get(mapping.get(lane))
        if actual is None:
            problems.append('%s display is missing' % lane)
            continue
        if actual.get('active') is not True:
            problems.append('%s display is inactive' % lane)
            continue
        seen = identities.get(lane)
        if seen is not None and actual.get('identity') != seen:
            problems.append('%s display identity changed' % lane)
        wrong = mode_mismatches(want['mode'], actual.get('mode') or {})
        if wrong:
            problems.append('%s %s differs from the approved mode' % (lane, '/'.join(wrong)))
    if problems:
        return result('displays', 'FAIL', '; '.join(problems[:3]) + ('; and %d more' % (len(problems) - 3) if len(problems) > 3 else ''), expected)
    return result('displays', 'PASS', '%d displays present · identities, resolution and refresh match' % len(displays), expected)


def check_millumin(reading, baseline):
    expected = 'Running, same process as at startup'
    failed = _failed_read('millumin', reading, expected)
    if failed:
        return failed
    processes = (reading.get('millumin') or {}).get('processes') or []
    if not processes:
        return result('millumin', 'FAIL', 'Millumin is not running', expected)
    if len(processes) > 1:
        return result('millumin', 'FAIL', 'More than one Millumin process: %s' % ', '.join(str(p['pid']) for p in processes), expected)
    process, then = processes[0], (baseline or {}).get('millumin')
    if then and (process['pid'], process['startedAt']) != (then['pid'], then['startedAt']):
        return result('millumin', 'FAIL', 'Millumin restarted since startup (pid %s, started %s; now pid %s, started %s)'
                      % (then['pid'], then['startedAt'], process['pid'], process['startedAt']), expected)
    since = 'startup' if (baseline or {}).get('source') == 'startup' else 'the first watch reading'
    return result('millumin', 'PASS', 'Running · pid %s · same process as at %s' % (process['pid'], since), expected)


def check_show(profile, reading, baseline):
    expected = 'Saved file unchanged since startup'
    failed = _failed_read('show', reading, expected)
    if failed:
        return failed
    show = reading.get('show') or {}
    name = Path(profile['showPath']).name
    if not show.get('exists'):
        return result('show', 'FAIL', 'Show file %s is missing' % name, expected)
    then = (baseline or {}).get('show')
    sha = show.get('sha256') or ''
    if then and sha and sha != then.get('sha256'):
        saved = datetime.fromtimestamp(show['mtimeNs'] / 1e9).strftime('%H:%M')
        return result('show', 'CHANGED', 'Changed since startup (saved about %s) · SHA-256 %s… · a save is reported, not treated as a fault'
                      % (saved, sha[:8]), expected)
    return result('show', 'PASS', 'Unchanged since %s · SHA-256 %s…' % ('startup' if (baseline or {}).get('source') == 'startup' else 'the first watch reading', sha[:8]), expected)


def check_power(cfg, reading):
    expected = 'Sleep held off%s' % (' by %s' % cfg['keepAwake']['process'] if cfg['keepAwake'] else '')
    failed = _failed_read('power', reading, expected)
    if failed:
        return failed
    power = reading.get('power') or {}
    owners = [o for o in power.get('owners', []) if o.get('type') in SLEEP_ASSERTIONS]
    if cfg['keepAwake']:
        mine = [o for o in owners if o.get('process') == cfg['keepAwake']['process']]
        if not mine:
            return result('power', 'FAIL', 'Keep-awake process %s is not holding sleep off' % cfg['keepAwake']['process'], expected)
        return result('power', 'PASS', 'Sleep held off by %s (pid %s)' % (mine[0]['process'], mine[0]['pid']), expected)
    held = power.get('systemWide') or {}
    if not any(held.get(name, 0) > 0 for name in SLEEP_ASSERTIONS):
        return result('power', 'FAIL', 'Nothing is holding the Mac awake', expected)
    return result('power', 'PASS', 'Sleep is held off (no keep-awake process is named in the profile)', expected)


def check_disk(cfg, reading):
    expected = 'At least %g GB free' % cfg['minFreeDiskGB']
    failed = _failed_read('disk', reading, expected)
    if failed:
        return failed
    disk = reading.get('disk') or {}
    free, total = disk.get('freeBytes'), disk.get('totalBytes')
    if type(free) is not int or type(total) is not int:
        return result('disk', 'FAIL', 'Could not read free space', expected)
    text = '%.1f GB free of %.1f GB' % (free / 1e9, total / 1e9)
    return result('disk', 'PASS' if free >= cfg['minFreeDiskGB'] * 1e9 else 'FAIL', text, expected)


def check_thermal(reading):
    expected = 'No thermal throttling'
    failed = _failed_read('thermal', reading, expected)
    if failed:
        return failed
    limits = (reading.get('thermal') or {}).get('limits') or {}
    low = {k: v for k, v in limits.items() if type(v) is int and v < 100}
    if low:
        return result('thermal', 'FAIL', 'Throttled: %s' % ', '.join('%s %d%%' % (k.replace('_', ' '), v) for k, v in sorted(low.items())), expected)
    return result('thermal', 'PASS', 'No thermal throttling recorded', expected)


def check_memory(reading):
    expected = 'Memory pressure normal'
    failed = _failed_read('memory', reading, expected)
    if failed:
        return failed
    level = (reading.get('memory') or {}).get('pressureLevel')
    if level == 1:
        return result('memory', 'PASS', 'Normal', expected)
    if level == 2:
        return result('memory', 'WARN', 'Elevated (warning level)', expected)
    if level == 4:
        return result('memory', 'FAIL', 'Critical', expected)
    return result('memory', 'FAIL', 'Could not read memory pressure', expected)


def check_media(cfg, reading):
    if not cfg['mediaFolder']:
        return result('media', 'NOT CONFIGURED', 'The profile names no media folder')
    expected = 'Media folder present'
    failed = _failed_read('media', reading, expected)
    if failed:
        return failed
    media = reading.get('media') or {}
    name = Path(cfg['mediaFolder']).name or cfg['mediaFolder']
    if not (media.get('exists') and media.get('isDir') and media.get('readable')):
        return result('media', 'FAIL', 'Media folder %s is missing or not readable' % name, expected)
    return result('media', 'PASS', 'Media folder %s is present and readable' % name, expected)


def check_pixel(cfg, reading):
    pixel = cfg['pixelOutput']
    if pixel is None:
        return None  # not part of this Mac's checks at all
    if not pixel.get('enabled'):
        return result('pixel', 'NOT CONFIGURED', 'Starts when the pixel controllers are listed in the profile (MF-3)')
    expected = 'Interface %s up and every controller answers a ping' % pixel['interface']
    failed = _failed_read('pixel', reading, expected)
    if failed:
        return failed
    data = reading.get('pixel') or {}
    iface = data.get('interface') or {}
    if not (iface.get('exists') and iface.get('up')):
        return result('pixel', 'FAIL', 'Interface %s is down or missing' % pixel['interface'], expected)
    silent = [c['name'] for c in data.get('controllers', []) if c.get('reachable') is not True]
    answered = {c.get('name') for c in data.get('controllers', [])}
    silent += [c['name'] for c in pixel['controllers'] if c['name'] not in answered]
    if silent:
        return result('pixel', 'FAIL', 'No ping reply from %s' % ', '.join(sorted(set(silent))), expected)
    return result('pixel', 'PASS', 'Interface %s up · %d controllers answer a ping' % (pixel['interface'], len(pixel['controllers'])), expected)


# ---- Relay reads and reports ---------------------------------------------------------------------

def _request(url, path, method, token=None, body=None, timeout=3, opener=None):
    if (method, path) not in HTTP_REQUESTS:
        raise WatchViolation('Watch mode may not call %s %s.' % (method, path))
    headers = {'accept': 'application/json'}
    data = None
    if body is not None:
        data = json.dumps(body, allow_nan=False).encode()
        headers['content-type'] = 'application/json'
    if token:
        headers['authorization'] = 'Bearer ' + token
    request = urllib.request.Request(url + path, data=data, headers=headers, method=method)
    with (opener or urllib.request.urlopen)(request, timeout=timeout) as response:
        payload = json.loads(response.read(1 << 20).decode('utf-8'))
        return response.status, payload


def read_token(token_file):
    """The status token, or a short reason. The file must be readable by its owner only."""
    try:
        mode = os.stat(token_file).st_mode
        if mode & 0o077:
            return None, 'The status token file must be readable only by its owner (chmod 600).'
        token = Path(token_file).read_text().strip()
    except OSError:
        return None, 'The status token file could not be read.'
    return (token, None) if token else (None, 'The status token file is empty.')


def _failure_text(error):
    if isinstance(error, urllib.error.HTTPError):
        return 'the relay answered %d' % error.code
    if isinstance(error, urllib.error.URLError):
        return 'the relay did not answer'
    if isinstance(error, (TimeoutError, OSError)):
        return 'the relay did not answer in time'
    return 'the relay sent an unreadable answer'


def check_relay(cfg, opener=None):
    if not cfg['relayUrl']:
        return result('relay', 'NOT CONFIGURED', 'The profile names no Projctl relay')
    expected = 'Projctl relay answering'
    started = time.monotonic()
    try:
        status, payload = _request(cfg['relayUrl'], '/api/health', 'GET', opener=opener)
    except (urllib.error.URLError, OSError, ValueError, TimeoutError) as error:
        return result('relay', 'FAIL', 'Projctl relay: %s' % _failure_text(error), expected)
    if status != 200 or not isinstance(payload, dict) or payload.get('ok') is not True or payload.get('service') != 'projctl':
        return result('relay', 'FAIL', 'Something answered, but it is not the Projctl relay', expected)
    return result('relay', 'PASS', 'Answering (%d ms)' % round((time.monotonic() - started) * 1000), expected)


def check_projectors(cfg, opener=None):
    wanted = cfg['projectors']
    if wanted is None:
        return None
    expected = 'Lanes %s replying%s' % (', '.join(wanted['lanes']), ' and %s' % '/'.join(wanted['expectPower']) if wanted['expectPower'] else '')
    token, why = read_token(cfg['report']['tokenFile'])
    if token is None:
        return result('projectors', 'FAIL', why, expected)
    try:
        status, payload = _request(cfg['relayUrl'], '/api/mac-status/projectors', 'GET', token=token, opener=opener)
    except (urllib.error.URLError, OSError, ValueError, TimeoutError) as error:
        return result('projectors', 'FAIL', 'Projector summary unavailable: %s' % _failure_text(error), expected)
    rows = payload.get('projectors') if isinstance(payload, dict) else None
    if status != 200 or not isinstance(rows, list):
        return result('projectors', 'FAIL', 'The relay sent no projector summary', expected)
    by_lane = {r.get('lane'): r for r in rows if isinstance(r, dict)}
    problems, parts = [], []
    for lane in wanted['lanes']:
        row = by_lane.get(lane)
        if row is None:
            problems.append('%s has no projector assigned' % lane)
            continue
        power, shutter = row.get('power') or 'unknown', row.get('shutter') or 'unknown'
        parts.append('%s %s · shutter %s' % (lane, power, shutter))
        if row.get('current') is not True:
            problems.append('%s not replying' % lane)
        elif wanted['expectPower'] and power not in wanted['expectPower']:
            problems.append('%s is %s' % (lane, power))
    if problems:
        return result('projectors', 'FAIL', '; '.join(problems), expected)
    return result('projectors', 'PASS', '; '.join(parts), expected)


def report_body(cfg, phase, state, checks, execution, run_id=None, cycle=None, interval=None, message=None, at=None):
    body = {'schema': REPORT_SCHEMA, 'host': cfg['host'], 'role': cfg['role'], 'phase': phase, 'state': state,
            'reportedAt': at or now_iso(), 'execution': execution,
            'checks': [{'id': c['id'], 'label': c['label'], 'status': c['status'], 'observed': c['observed']} for c in checks]}
    if cfg.get('hostName'):
        body['hostName'] = cfg['hostName']
    if run_id:
        body['runID'] = run_id
    if cycle is not None:
        body['cycle'] = cycle
    if interval is not None:
        body['intervalSeconds'] = interval
    if message:
        body['message'] = clip(message, 240)
    return body


class Reporter:
    """Sends status reports to the relay. It never raises and never waits long."""

    def __init__(self, cfg, execution, opener=None, timeout=3):
        self.cfg, self.execution, self.opener, self.timeout = cfg, execution, opener, timeout

    def send(self, phase, state, checks, run_id=None, cycle=None, message=None):
        report = report_body(self.cfg, phase, state, checks, self.execution, run_id=run_id, cycle=cycle,
                             interval=self.cfg['intervalSeconds'] if phase == 'watch' else None, message=message)
        token, why = read_token(self.cfg['report']['tokenFile'])
        if token is None:
            return {'type': 'report', 'ok': False, 'at': now_iso(), 'host': self.cfg['host'], 'message': why}
        try:
            status, payload = _request(self.cfg['report']['url'], '/api/mac-status', 'POST', token=token, body=report,
                                       timeout=self.timeout, opener=self.opener)
            ok = status == 200 and isinstance(payload, dict) and payload.get('ok') is True
            message = 'Report sent' if ok else 'The relay did not accept the report'
        except urllib.error.HTTPError as error:
            ok, message = False, 'The relay refused the report (%d)' % error.code
        except (urllib.error.URLError, OSError, ValueError, TimeoutError) as error:
            ok, message = False, 'Report not sent: %s' % _failure_text(error)
        return {'type': 'report', 'ok': ok, 'at': now_iso(), 'host': self.cfg['host'], 'message': message}


class StartupReporter:
    """Reports the startup phase from the check stream: running at the start, ok or fault at the end."""

    def __init__(self, reporter, emit=None):
        self.reporter, self.emit = reporter, emit
        self.checks, self.run_id = {}, None

    def __call__(self, event):
        kind = event.get('type')
        if kind == 'run':
            self.run_id = event.get('runID')
            self.checks = {c['id']: {'id': c['id'], 'label': c['label'], 'status': 'RUNNING', 'observed': 'Waiting'} for c in event.get('checks', [])}
            self._send('running', None)
        elif kind == 'check' and event.get('id') in self.checks:
            self.checks[event['id']] = {'id': event['id'], 'label': event.get('label', event['id']), 'status': event.get('status', 'RUNNING'),
                                        'observed': event.get('observed', '')}
        elif kind == 'result':
            self._send('ok' if event.get('computerReady') else 'fault', event.get('message'))
        elif kind == 'unavailable':
            self._send('fault', event.get('message'))

    def _send(self, state, message):
        checks = list(self.checks.values()) or [{'id': 'startup', 'label': 'Startup', 'status': 'FAIL', 'observed': message or 'Startup check unavailable'}]
        outcome = self.reporter.send('startup', state, checks, run_id=self.run_id, message=message)
        if self.emit:
            self.emit(dict(outcome, schema=STREAM_SCHEMA))


def tee(*sinks):
    sinks = [s for s in sinks if s is not None]
    if not sinks:
        return None

    def write(event):
        for sink in sinks:
            sink(event)
    return write


# ---- One cycle and the loop ---------------------------------------------------------------------

def watch_cycle(profile, cfg, bridge, baseline, state_dir, known_show=None, opener=None, boot=None):
    """One read-only cycle. Returns (checks, baseline, show_fingerprint). Never changes anything on the Mac."""
    checks = []
    reading = None
    try:
        reading = bridge.call('watch', watch_request(cfg, profile, known_show))
    except StartupError as error:
        checks.append({'id': 'bridge', 'label': 'Mac readings', 'status': 'FAIL', 'observed': clip('The read-only bridge did not answer: %s' % error)})
    if reading is not None:
        try:
            baseline = fill_baseline(profile, reading, baseline, state_dir, boot)
            from_reading = [check_displays(profile, reading, baseline), check_millumin(reading, baseline), check_show(profile, reading, baseline),
                            check_power(cfg, reading), check_disk(cfg, reading), check_thermal(reading), check_memory(reading), check_media(cfg, reading)]
            show = reading.get('show') or {}
            if show.get('exists') and show.get('sha256'):
                known_show = {'size': show['size'], 'mtimeNs': show['mtimeNs'], 'sha256': show['sha256']}
            checks += from_reading
        except (KeyError, TypeError, ValueError, AttributeError, IndexError):
            reading = None
            checks.append({'id': 'bridge', 'label': 'Mac readings', 'status': 'FAIL', 'observed': 'The read-only reading was not in the expected shape.'})
    checks.append(check_relay(cfg, opener))
    for extra in (check_projectors(cfg, opener), check_pixel(cfg, reading) if reading is not None else None):
        if extra is not None:
            checks.append(extra)
    return checks, baseline, known_show


def overall(checks):
    return 'fault' if any(c['status'] == FAULT for c in checks) else 'ok'


def cycle_event(cfg, cycle, checks, baseline):
    failed = [c for c in checks if c['status'] == FAULT]
    return {'schema': STREAM_SCHEMA, 'type': 'watch', 'host': cfg['host'], 'cycle': cycle, 'at': now_iso(), 'state': overall(checks),
            'intervalSeconds': cfg['intervalSeconds'], 'checks': checks, 'failed': [c['id'] for c in failed],
            'baseline': {'source': (baseline or {}).get('source'), 'capturedAt': (baseline or {}).get('capturedAt')}}


def run_watch(profile, bridge, cfg, state_dir, emit=None, reporter=None, clock=time.monotonic, sleep=time.sleep,
              max_cycles=None, stop=None, opener=None, boot=None):
    """Watch until stopped. Reads only. The bridge is wrapped so nothing but the read-only actions can pass."""
    guarded = ReadOnlyBridge(bridge)
    capabilities = guarded.call('capabilities', {})
    if not isinstance(capabilities, dict) or capabilities.get('watch') is not True:
        raise StartupError('This bridge has no read-only watch reading. Update the Mac adapter.')
    baseline = load_baseline(state_dir, boot)
    known_show, cycle = None, 0
    next_at = clock()
    while True:
        cycle += 1
        checks, baseline, known_show = watch_cycle(profile, cfg, guarded, baseline, state_dir, known_show, opener, boot)
        event = cycle_event(cfg, cycle, checks, baseline)
        outcome = None
        if reporter is not None:
            outcome = reporter.send('watch', event['state'], checks, cycle=cycle)
        if emit:
            emit(event)
            if outcome:
                emit(dict(outcome, schema=STREAM_SCHEMA))
        try:
            save(Path(state_dir) / 'watch-latest.json', {'schemaVersion': 1, 'event': event, 'report': outcome})
        except OSError:
            pass
        if max_cycles is not None and cycle >= max_cycles:
            return event
        if stop is not None and stop():
            return event
        next_at += cfg['intervalSeconds']
        delay = next_at - clock()
        if delay < 0:
            next_at, delay = clock(), 0  # a slow cycle skips the beat instead of bunching up
        while delay > 0 and not (stop is not None and stop()):
            step = min(1.0, delay)
            sleep(step)
            delay -= step
        if stop is not None and stop():
            return event
