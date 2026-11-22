#!/usr/bin/env python3
"""Offline-testable startup coordinator. All machine I/O uses an explicit bridge."""
import argparse
import fcntl
import copy
import hashlib
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import uuid
from datetime import datetime, timedelta, timezone


class StartupError(Exception):
    pass


def boot_id():
    if sys.platform == 'darwin':
        try:
            return subprocess.check_output(['/usr/sbin/sysctl', '-n', 'kern.boottime'], text=True, timeout=3).strip()
        except (OSError, subprocess.SubprocessError) as error:
            raise StartupError('Boot identity is unavailable.') from error
    path = Path('/proc/sys/kernel/random/boot_id')
    if path.exists():
        return path.read_text().strip()
    raise StartupError('Boot identity is unavailable.')


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()


def validate_profile(profile):
    if not isinstance(profile, dict) or profile.get('schemaVersion') != 1:
        raise StartupError('Unsupported profile version.')
    displays = profile.get('displays', [])
    if not isinstance(displays, list) or any(not isinstance(d, dict) for d in displays) or len(displays) != 5 or {d.get('lane') for d in displays} != {'control', 'A', 'B', 'C', 'D'}:
        raise StartupError('Profile must describe BenQ/control and A, B, C, D.')
    connectors = [d.get('connector') for d in displays]
    if any(not isinstance(c, str) or not c for c in connectors) or len(set(connectors)) != 5:
        raise StartupError('Each display needs a unique physical connector.')
    for d in displays:
        if not d.get('identity') or not isinstance(d['identity'], dict) or any(not isinstance(k, str) or type(v) not in (str, int) for k, v in d['identity'].items()):
            raise StartupError('Each connector needs identity evidence.')
        mode = d.get('mode', {})
        required = {'width', 'height', 'pixelWidth', 'pixelHeight', 'refreshRate', 'x', 'y', 'main', 'mirrored', 'rotation', 'colorMode'}
        if not isinstance(mode, dict) or set(mode) != required:
            raise StartupError('Incomplete or unsupported display mode.')
        for key in ('width', 'height', 'pixelWidth', 'pixelHeight'):
            if type(mode[key]) is not int or not 1 <= mode[key] <= 32768:
                raise StartupError('Invalid display dimensions.')
        for key in ('refreshRate', 'x', 'y', 'rotation'):
            if type(mode[key]) not in (int, float) or not math.isfinite(mode[key]):
                raise StartupError('Invalid display timing or position.')
        if not 1 <= mode['refreshRate'] <= 240 or type(mode['main']) is not bool or type(mode['mirrored']) is not bool:
            raise StartupError('Invalid display mode.')
        if mode['main'] != (d['lane'] == 'control') or mode['mirrored']:
            raise StartupError('The control display must be main and all displays extended.')
    routes = profile.get('routes')
    if not isinstance(routes, dict) or set(routes.values()) != {'A', 'B', 'C', 'D'}:
        raise StartupError('Profile must map the four projector lanes.')
    if any(not isinstance(c, str) or not c or lane == 'control' for c, lane in routes.items()):
        raise StartupError('Invalid canvas route.')
    if not isinstance(profile.get('showPath'), str) or not profile['showPath'].startswith('/'):
        raise StartupError('Profile needs an absolute approved show path.')
    if not isinstance(profile.get('showSHA256'), str) or len(profile['showSHA256']) != 64 or any(c not in '0123456789abcdef' for c in profile['showSHA256']):
        raise StartupError('Profile needs the approved show SHA-256.')
    return profile


def resolve(profile, snapshot):
    if not isinstance(snapshot, dict) or snapshot.get('schemaVersion') != 1 or not isinstance(snapshot.get('displays'), list):
        raise StartupError('Display observation is unavailable.')
    observed = snapshot['displays']
    if any(not isinstance(d, dict) for d in observed):
        raise StartupError('Invalid display observation.')
    if len(observed) != 5:
        raise StartupError('Expected five displays. Found %d.' % len(observed))
    ids = [d.get('id') for d in observed]
    if any(type(i) is not int or i <= 0 for i in ids) or len(set(ids)) != 5:
        raise StartupError('Display IDs are missing or duplicated.')
    mapped = {}
    for expected in profile['displays']:
        matches = [d for d in observed if d.get('connector') == expected['connector']]
        if len(matches) != 1:
            raise StartupError('Check the physical connection for %s.' % expected['lane'])
        actual = matches[0]
        if actual.get('active') is not True:
            raise StartupError('%s is inactive.' % expected['lane'])
        identity = actual.get('identity')
        if not isinstance(identity, dict):
            raise StartupError('%s identity is unavailable.' % expected['lane'])
        if any(identity.get(k) != v for k, v in expected['identity'].items()):
            raise StartupError('%s identity changed. Review its connection.' % expected['lane'])
        mapped[expected['lane']] = actual
    return mapped


def display_problems(profile, snapshot):
    mapped = resolve(profile, snapshot)
    problems = []
    for expected in profile['displays']:
        actual = mapped[expected['lane']].get('mode', {})
        if not isinstance(actual, dict):
            actual = {}
        for key, wanted in expected['mode'].items():
            value = actual.get(key)
            if key == 'refreshRate':
                matches = type(value) in (int, float) and math.isfinite(value) and abs(value - wanted) <= 0.02
            else:
                matches = type(value) == type(wanted) and value == wanted
            if not matches:
                problems.append('%s needs its approved %s.' % (expected['lane'], key))
    return problems


def show_problems(profile, snapshot):
    mapped = resolve(profile, snapshot)
    millumin = snapshot.get('millumin', {})
    if not isinstance(millumin, dict) or millumin.get('showSHA256') != profile['showSHA256']:
        return ['Open the approved show version.']
    if millumin.get('controlDisplayID') != mapped['control']['id']:
        return ['Move the Millumin control window to BenQ.']
    return []


def routing_problems(profile, snapshot):
    mapped = resolve(profile, snapshot)
    millumin = snapshot.get('millumin', {})
    wanted = {canvas: mapped[lane]['id'] for canvas, lane in profile['routes'].items()}
    if not isinstance(millumin, dict) or millumin.get('routes') != wanted:
        return ['Check Millumin canvas destinations.']
    return []


CHECKS = (
    ('displays', 'Display detection'),
    ('desktop', 'Desktop settings'),
    ('show', 'Show file'),
    ('routes', 'Canvas destinations'),
    ('fullscreen', 'Fullscreen output'),
)
STREAM_SCHEMA = 'frozen-startup.check-stream.v1'


def mode_text(mode):
    if not isinstance(mode, dict):
        return 'Mode unavailable'
    try:
        return '%d × %d · %s Hz' % (mode['width'], mode['height'], ('%.2f' % mode['refreshRate']).rstrip('0').rstrip('.'))
    except (KeyError, TypeError, ValueError):
        return 'Mode unavailable'


def display_summary(profile, snapshot):
    """Per-lane observation for the window's display cards. Never raises."""
    observed = snapshot.get('displays', []) if isinstance(snapshot, dict) and isinstance(snapshot.get('displays'), list) else []
    cards = []
    for expected in profile['displays']:
        matches = [d for d in observed if isinstance(d, dict) and d.get('connector') == expected['connector']]
        actual = matches[0] if len(matches) == 1 else None
        detected = bool(actual) and actual.get('active') is True
        cards.append({'lane': expected['lane'], 'detected': detected,
                      'expected': mode_text(expected['mode']),
                      'observed': mode_text(actual.get('mode')) if detected else 'Not detected'})
    return cards


def route_text(profile):
    order = sorted(profile['routes'].items(), key=lambda item: (item[0].lower().startswith('boost'), item[0]))
    return ' · '.join('%s → %s' % (canvas, lane) for canvas, lane in order)


class Bridge:
    def __init__(self, executable):
        self.executable = str(Path(executable).resolve(strict=True))

    def call(self, action, payload):
        try:
            result = subprocess.run([self.executable], input=json.dumps({'schemaVersion': 1, 'action': action, 'payload': payload}),
                                    capture_output=True, text=True, timeout=45, check=True)
            reply = json.loads(result.stdout)
        except (OSError, subprocess.SubprocessError, ValueError) as error:
            raise StartupError('The local application bridge failed.') from error
        if not isinstance(reply, dict) or reply.get('ok') is not True:
            raise StartupError('The local application bridge could not complete %s.' % action)
        result = reply.get('result', {})
        if not isinstance(result, dict):
            raise StartupError('The bridge returned an invalid observation.')
        return result


class FixtureBridge:
    """In-memory bridge used by offline demonstrations and regression tests."""
    def __init__(self, snapshot):
        self.snapshot = copy.deepcopy(snapshot)
        self.calls = []

    def call(self, action, payload):
        self.calls.append(action)
        if action == 'capabilities':
            return {'startup': True, 'routingReadback': True}
        if action == 'observe':
            return copy.deepcopy(self.snapshot)
        if action == 'restore':
            for change in payload['displays']:
                target = next(d for d in self.snapshot['displays'] if d['id'] == change['id'])
                target['mode'] = change['mode']
        elif action == 'openShow':
            self.snapshot['millumin'] = {**self.snapshot.get('millumin', {}), **payload, 'fullscreen': False}
        elif action == 'fullscreen':
            self.snapshot['millumin']['fullscreen'] = True
        else:
            raise StartupError('Unsupported fixture operation.')
        return {}


def run(profile, bridge, warm=False, timeout=60, interval=1, stable_samples=3, clock=time.monotonic, sleep=time.sleep, emit=None):
    validate_profile(profile)
    if timeout <= 0 or interval <= 0 or stable_samples < 2:
        raise StartupError('Invalid wait settings.')
    receipt = {'schemaVersion': 1, 'runID': str(uuid.uuid4()), 'createdAt': datetime.now(timezone.utc).isoformat(),
               'bootID': boot_id(), 'profileSHA256': digest(profile), 'mode': 'warm' if warm else 'startup', 'events': [], 'computerReady': False,
               'showNightReady': False}

    def record(action):
        receipt['events'].append(action)

    expected = {
        'displays': '5 displays: BenQ control, A, B, C, D',
        'desktop': 'Approved modes and layout',
        'show': 'Approved saved project, SHA-256 %s…' % profile['showSHA256'][:8],
        'routes': route_text(profile),
        'fullscreen': 'Output windows on A, B, C and D' if not warm else 'Output windows already on A, B, C and D',
    }
    state = {'current': None, 'done': [], 'snapshot': None}

    def send(event):
        if emit is not None:
            emit(dict(event, schema=STREAM_SCHEMA, runID=receipt['runID'], at=datetime.now(timezone.utc).isoformat()))

    def begin(check_id):
        state['current'] = check_id
        send({'type': 'check', 'id': check_id, 'label': dict(CHECKS)[check_id], 'status': 'RUNNING',
              'expected': expected[check_id], 'observed': 'Checking…'})

    def passed(check_id, observed):
        state['done'].append(check_id)
        send({'type': 'check', 'id': check_id, 'label': dict(CHECKS)[check_id], 'status': 'PASS',
              'expected': expected[check_id], 'observed': observed})

    def show_displays(snapshot):
        cards = display_summary(profile, snapshot)
        if cards != state['snapshot']:
            state['snapshot'] = cards
            send({'type': 'displays', 'displays': cards})

    def observing(snapshot):
        show_displays(snapshot)
        return snapshot

    def wait_for(check):
        deadline = clock() + timeout
        previous, count, issue = None, 0, 'Waiting for displays.'
        while clock() < deadline:
            snapshot = observing(bridge.call('observe', {}))
            try:
                resolve(profile, snapshot)
                errors = check(snapshot)
                if errors:
                    raise StartupError(' '.join(errors))
                fingerprint = digest(snapshot)
                count = count + 1 if fingerprint == previous else 1
                previous = fingerprint
                if count >= stable_samples:
                    return snapshot
            except StartupError as error:
                issue, previous, count = str(error), None, 0
            sleep(interval)
        raise StartupError(issue)

    send({'type': 'run', 'status': 'RUNNING', 'mode': receipt['mode'],
          'checks': [{'id': i, 'label': l, 'expected': expected[i]} for i, l in CHECKS]})
    try:
        capabilities = bridge.call('capabilities', {})
        if not isinstance(capabilities, dict) or (not warm and capabilities.get('startup') is not True):
            raise StartupError('Mac startup integration is incomplete. No display changes were made.')
        record('Waiting for five stable display identities')
        begin('displays')
        snapshot = wait_for(lambda s: [])
        passed('displays', '5 displays detected; identities match the profile')
        begin('desktop')
        def restore_desktop(observation):
            mapped = resolve(profile, observation)
            bridge.call('restore', {'displays': [
                {'id': mapped[d['lane']]['id'], 'connector': d['connector'],
                 'identity': d['identity'], 'mode': d['mode']} for d in profile['displays']
            ]})

        needs_restore = not warm and bool(display_problems(profile, snapshot))
        if needs_restore:
            receipt['beforeRestore'] = snapshot
            record('Restoring approved display modes and arrangement')
            restore_desktop(snapshot)
        record('Verifying display modes and arrangement')
        try:
            snapshot = wait_for(lambda s: display_problems(profile, s))
        except StartupError:
            if not needs_restore:
                raise
            snapshot = wait_for(lambda s: [])
            if display_problems(profile, snapshot):
                record('Retrying approved display restoration once using current display identities')
                restore_desktop(snapshot)
            snapshot = wait_for(lambda s: display_problems(profile, s))
        passed('desktop', '5 displays match approved modes and layout')
        begin('show')
        if not warm:
            mapped = resolve(profile, snapshot)
            receipt['afterRestore'] = snapshot
            record('Opening approved show')
            bridge.call('openShow', {'showSHA256': profile['showSHA256'], 'showPath': profile['showPath'],
                                    'controlDisplayID': mapped['control']['id']})
        snapshot = wait_for(lambda s: display_problems(profile, s) + show_problems(profile, s))
        passed('show', 'Saved file hash matches; control window on BenQ')
        begin('routes')
        record('Verifying Millumin routing')
        snapshot = wait_for(lambda s: display_problems(profile, s) + show_problems(profile, s)
                            + routing_problems(profile, s))
        passed('routes', 'All %d assigned canvases match' % len(profile['routes']))
        begin('fullscreen')
        if not warm:
            # Re-read immediately before enabling output; never reuse stale display handles.
            current = bridge.call('observe', {})
            if digest(current) != digest(snapshot):
                raise StartupError('Displays changed before fullscreen. Retry the startup check.')
            bridge.call('fullscreen', {})
            snapshot = wait_for(lambda s: display_problems(profile, s) + routing_problems(profile, s)
                                + show_problems(profile, s)
                                + ([] if s.get('millumin', {}).get('fullscreen') is True else ['Check fullscreen output.']))
        elif snapshot.get('millumin', {}).get('fullscreen') is not True:
            raise StartupError('Check fullscreen output.')
        receipt.update(computerReady=True, snapshotSHA256=digest(snapshot), message='Computer checks passed. Complete the crew visual check.')
        passed('fullscreen', '4 output windows confirmed')
    except StartupError as error:
        receipt['message'] = str(error)
        failed = state['current']
        if failed is None:
            failed = 'displays'
        send({'type': 'check', 'id': failed, 'label': dict(CHECKS)[failed], 'status': 'FAIL',
              'expected': expected[failed], 'observed': str(error), 'next': str(error)})
        stop = dict(CHECKS)[failed].lower()
        for check_id, label in CHECKS:
            if check_id != failed and check_id not in state['done']:
                send({'type': 'check', 'id': check_id, 'label': label, 'status': 'NOT RUN',
                      'expected': expected[check_id], 'observed': 'Stopped after %s' % stop})
    receipt['completedAt'] = datetime.now(timezone.utc).isoformat()
    send({'type': 'result', 'computerReady': receipt['computerReady'], 'showNightReady': False,
          'message': receipt['message'], 'completedAt': receipt['completedAt'],
          'passed': len(state['done']), 'failed': 0 if receipt['computerReady'] else 1,
          'notRun': len(CHECKS) - len(state['done']) - (0 if receipt['computerReady'] else 1),
          'readyExpiresAt': (datetime.fromisoformat(receipt['completedAt']) + timedelta(seconds=READY_SECONDS)).isoformat()
          if receipt['computerReady'] else None})
    return receipt


READY_SECONDS = 900
CREW_CHECKS = ('surfacesAtoD', 'approvedShow', 'testCardsRemoved', 'openingLookRestored', 'warningsReviewed')


def readiness(receipt, evidence, snapshot, profile, now=None):
    now = now or datetime.now(timezone.utc)
    try:
        age = (now - datetime.fromisoformat(receipt['completedAt'])).total_seconds()
        valid = (receipt.get('computerReady') is True and receipt.get('bootID') == boot_id() and 0 <= age <= READY_SECONDS
                 and receipt['profileSHA256'] == digest(profile)
                 and receipt.get('snapshotSHA256') == digest(snapshot)
                 and evidence.get('runID') == receipt['runID']
                 and bool(evidence.get('operator', '').strip())
                 and all(evidence.get(k) is True for k in CREW_CHECKS)
                 and not display_problems(profile, snapshot) and not show_problems(profile, snapshot)
                 and not routing_problems(profile, snapshot)
                 and snapshot.get('millumin', {}).get('fullscreen') is True)
    except (KeyError, ValueError, TypeError, AttributeError, StartupError):
        valid = False
    return {'showNightReady': valid, 'message': 'Ready for the agreed opening look.' if valid else 'Complete a current computer and crew check.'}


def readiness_event(result):
    expires = None
    if result.get('showNightReady') is True and result.get('completedAt'):
        expires = (datetime.fromisoformat(result['completedAt']) + timedelta(seconds=READY_SECONDS)).isoformat()
    evidence = result.get('crewEvidence') if isinstance(result.get('crewEvidence'), dict) else {}
    return {'schema': STREAM_SCHEMA, 'type': 'readiness', 'runID': result.get('runID'), 'at': datetime.now(timezone.utc).isoformat(),
            'showNightReady': result.get('showNightReady') is True, 'message': result.get('message'),
            'operator': evidence.get('operator'), 'expiresAt': expires}


def event_writer(target):
    """Return a callable that appends one flushed JSON line per event, or None."""
    if not target:
        return None
    stream = sys.stdout if target == '-' else open(target, 'a', buffering=1)

    def write(event):
        stream.write(json.dumps(event, allow_nan=False, sort_keys=True) + '\n')
        stream.flush()
    return write


def save(path, value):
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(dir=destination.parent, prefix='.startup-')
    try:
        with os.fdopen(fd, 'w') as out:
            json.dump(value, out, indent=2, allow_nan=False)
            out.write('\n')
            out.flush()
            os.fsync(out.fileno())
        os.replace(temporary, destination)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def main():
    parser = argparse.ArgumentParser(description='Frozen Startup offline coordinator')
    parser.add_argument('--profile', required=True)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument('--fixture', help='Offline display snapshot, no machine operations')
    source.add_argument('--bridge', help='Explicit commissioned local bridge executable')
    parser.add_argument('--receipt', required=True)
    parser.add_argument('--warm', action='store_true')
    parser.add_argument('--crew-evidence')
    parser.add_argument('--verify-ready', action='store_true', help='Verify crew evidence against an existing receipt and current snapshot')
    parser.add_argument('--events', help='Write the live check stream as JSON lines to this path; use - for stdout')
    args = parser.parse_args()
    emit = event_writer(args.events)
    result = None
    lock_owned = False
    try:
        receipt_path = Path(args.receipt)
        receipt_path.parent.mkdir(parents=True, exist_ok=True)
        lock = open(receipt_path.parent / '.frozen-startup.lock', 'a')
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            lock_owned = True
        except BlockingIOError as error:
            raise StartupError('Another startup check is running in this receipt directory.') from error
        if args.verify_ready:
            result = json.loads(Path(args.receipt).read_text())
        profile = validate_profile(json.loads(Path(args.profile).read_text()))
        bridge = FixtureBridge(json.loads(Path(args.fixture).read_text())) if args.fixture else Bridge(args.bridge)
        if args.crew_evidence and not args.verify_ready:
            raise StartupError('Use --verify-ready to attach crew evidence to a completed run.')
        if args.verify_ready:
            if not args.crew_evidence:
                raise StartupError('Crew evidence is required.')
            result = json.loads(Path(args.receipt).read_text())
        else:
            result = run(profile, bridge, warm=args.warm, timeout=0.1 if args.fixture else 60, interval=0.001 if args.fixture else 1, emit=emit)
        execution = 'offline fixture' if args.fixture else 'local bridge'
        if args.verify_ready and result.get('execution') != execution:
            raise StartupError('Receipt and current observation use different execution modes.')
        result['execution'] = execution
        if args.crew_evidence:
            evidence = json.loads(Path(args.crew_evidence).read_text())
            result.update(readiness(result, evidence, bridge.call('observe', {}), profile))
            result['crewEvidence'] = evidence
            result['readinessCheckedAt'] = datetime.now(timezone.utc).isoformat()
            if emit:
                emit(readiness_event(result))
        save(args.receipt, result)
        print(result['message'], file=sys.stderr if args.events == '-' else sys.stdout)
        return 0 if result.get('showNightReady' if args.verify_ready else 'computerReady') else 2
    except (StartupError, OSError, ValueError) as error:
        if args.verify_ready and lock_owned and isinstance(result, dict):
            result.update(showNightReady=False, message='Readiness verification unavailable.', readinessCheckedAt=datetime.now(timezone.utc).isoformat())
            try:
                save(args.receipt, result)
            except OSError:
                pass
        if emit:
            emit({'schema': STREAM_SCHEMA, 'type': 'unavailable', 'message': 'Startup check unavailable: %s' % error,
                  'runID': result.get('runID') if isinstance(result, dict) else None, 'at': datetime.now(timezone.utc).isoformat()})
            if args.verify_ready and isinstance(result, dict):
                emit(readiness_event(result))
        print('Startup check unavailable: %s' % error, file=sys.stderr)
        return 3


if __name__ == '__main__':
    sys.exit(main())
