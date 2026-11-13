#!/usr/bin/env python3
"""Resumable operator acceptance journal. Network access is read-only."""

import argparse
import contextlib
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
import uuid

LANES = ("A", "B", "C", "D")
CHECKS = {
    "backup": ("rig",),
    "mapping": LANES,
    "midi": LANES,
    "pjlink": LANES,
    "preset": LANES,
    "temperature": LANES,
    "shutdown": LANES,
    "reboot": LANES,
    "standby": LANES,
    "usb": LANES,
    "hdmi": LANES,
    "betterdisplay": ("rig",),
    "aten": LANES,
    "shutdown-report": ("rig",),
    "delivery": ("rig",),
    "show-restored": ("rig",),
}
DISRUPTIVE = {"midi", "pjlink", "preset", "shutdown", "reboot", "standby", "usb", "hdmi"}
RECOVERY = {"reboot", "standby", "usb", "hdmi"}
MAX_BYTES = 32 * 1024 * 1024


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def atomic_json(path, data):
    fd, temporary = tempfile.mkstemp(dir=path.parent, prefix=".saving-")
    try:
        with os.fdopen(fd, "w") as stream:
            json.dump(data, stream, indent=2, ensure_ascii=False)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


@contextlib.contextmanager
def transaction(run):
    lock = run / ".lock"
    try:
        lock.mkdir()
    except FileExistsError:
        raise ValueError("Run is locked. Close the other writer before retrying.")
    try:
        data = json.loads((run / "run.json").read_text())
        if data.get("schema") != 1:
            raise ValueError("Unsupported run schema")
        yield data
        atomic_json(run / "run.json", data)
    finally:
        lock.rmdir()


def clean(value):
    if isinstance(value, dict):
        return {key: clean(item) for key, item in value.items()
                if not re.search(r"password|secret|token|cookie|credential|authorization", key, re.I)}
    if isinstance(value, list):
        return [clean(item) for item in value]
    return value


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError("Redirect rejected")


def read_api(base, route):
    headers = {"Accept": "application/json"}
    if os.environ.get("PROJCTL_COOKIE"):
        headers["Cookie"] = os.environ["PROJCTL_COOKIE"]
    request = urllib.request.Request(base + route, headers=headers, method="GET")
    with urllib.request.build_opener(NoRedirect).open(request, timeout=10) as response:
        payload = response.read(MAX_BYTES + 1)
    if len(payload) > MAX_BYTES:
        raise ValueError("Response too large")
    return clean(json.loads(payload))


def initialize(run, base, operator):
    url = urllib.parse.urlsplit(base)
    if url.scheme not in ("http", "https") or not url.hostname or url.username or url.password or url.query or url.fragment or url.path not in ("", "/"):
        raise ValueError("Use a relay origin without credentials, path, query or fragment")
    if not operator.strip():
        raise ValueError("Operator required")
    run.mkdir(parents=True, exist_ok=False, mode=0o700)
    (run / "evidence").mkdir(mode=0o700)
    atomic_json(run / "run.json", {"schema": 1, "id": str(uuid.uuid4()), "created": now(),
                "operator": operator, "relay": base.rstrip("/"), "events": []})


def add_event(run, event):
    event = {**event, "id": uuid.uuid4().hex, "at": now()}
    with transaction(run) as data:
        data["events"].append(event)
    return event["id"]


def attach(run, source):
    source = Path(source).expanduser()
    if not source.is_file() or source.stat().st_size > MAX_BYTES:
        raise ValueError("Evidence must be a regular file no larger than 32 MB")
    payload = source.read_bytes()
    if len(payload) > MAX_BYTES:
        raise ValueError("Evidence grew beyond 32 MB during collection")
    digest = hashlib.sha256(payload).hexdigest()
    destination = run / "evidence" / (uuid.uuid4().hex + source.suffix)
    fd = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "wb") as stream:
        stream.write(payload)
    return add_event(run, {"kind": "attachment", "name": source.name,
                          "file": str(destination.relative_to(run)), "sha256": digest})


def capture(run, label, checker, profile):
    data = json.loads((run / "run.json").read_text())
    snapshot = {"kind": "capture", "label": label, "host": platform.node(),
                "platform": platform.platform(), "started": now(), "api": {}, "errors": {}}
    routes = ["/api/health", "/api/state", "/api/health-reports"]
    for route in routes:
        try:
            snapshot["api"][route] = read_api(data["relay"], route)
        except Exception as error:
            snapshot["errors"][route] = type(error).__name__
    state = snapshot["api"].get("/api/state", {})
    for projector in state.get("projectors", []):
        route = "/api/display-info?slot=" + urllib.parse.quote(str(projector.get("slot", "")))
        try:
            snapshot["api"][route] = read_api(data["relay"], route)
        except Exception as error:
            snapshot["errors"][route] = type(error).__name__
    try:
        completed = subprocess.run([str(checker), "--check-json", "--profile", str(profile)],
                                   capture_output=True, text=True, timeout=20, check=False)
        snapshot["screens"] = {"exit": completed.returncode, "report": json.loads(completed.stdout)}
    except Exception as error:
        snapshot["errors"]["screen-check"] = type(error).__name__
    if sys.platform == "darwin":
        try:
            boot = subprocess.run(["/usr/sbin/sysctl", "-n", "kern.boottime"],
                                  capture_output=True, text=True, timeout=5, check=False)
            snapshot["boot"] = boot.stdout.strip()
        except (OSError, subprocess.SubprocessError) as error:
            snapshot["errors"]["boot-time"] = type(error).__name__
    snapshot["finished"] = now()
    return add_event(run, snapshot)


def release(run, releaser, scope, minutes):
    if not releaser.strip() or not scope or set(scope) - DISRUPTIVE or not 1 <= minutes <= 240:
        raise ValueError("Name, known events and a 1 to 240 minute window required")
    expires = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(minutes=minutes)).isoformat()
    return add_event(run, {"kind": "release", "releaser": releaser, "scope": scope, "expires": expires})


def valid_capture(event):
    screen = event.get("screens", {})
    report = screen.get("report", {})
    return (event.get("kind") == "capture" and not event.get("errors")
            and event.get("api", {}).get("/api/health", {}).get("simulation") is False
            and event.get("api", {}).get("/api/state", {}).get("simulation") is False
            and screen.get("exit") == 0 and report.get("state") == "ready"
            and report.get("expectedCount") == 5 and report.get("readyCount") == 5)


def record(run, check, lane, result, witness, notes, evidence):
    if result not in ("pass", "fail", "not_tested") or lane not in CHECKS[check] or not witness.strip() or not notes.strip():
        raise ValueError("Correct lane, witness and detailed observation required")
    with transaction(run) as data:
        events = data["events"]
        indexed = {event["id"]: event for event in events}
        if any(ref not in indexed or indexed[ref]["kind"] not in ("attachment", "capture") for ref in evidence):
            raise ValueError("Evidence IDs must reference this run's attachments or captures")
        if result == "pass" and not evidence:
            raise ValueError("Pass requires saved evidence")
        if result == "pass" and check in ("temperature", "shutdown-report", "delivery"):
            reports = []
            for ref in evidence:
                capture = indexed[ref]
                if capture["kind"] == "capture" and capture.get("api", {}).get("/api/state", {}).get("simulation") is False:
                    reports.extend(capture.get("api", {}).get("/api/health-reports", {}).get("reports", []))
            current = [item for item in reports if item.get("startedAt")
                       and dt.datetime.fromisoformat(item["startedAt"].replace("Z", "+00:00"))
                       >= dt.datetime.fromisoformat(data["created"])]
            if check == "temperature":
                current = [item for item in current if item.get("counts", {}).get("units") == 4
                           and item["counts"].get("reached") == 4 and item["counts"].get("flagged") == 0]
            elif check == "shutdown-report":
                current = [item for item in current if item.get("kind") in ("power-off", "relay-stop")]
            else:
                current = [item for item in current if item.get("kind") in ("power-off", "relay-stop")
                           and item.get("notion", {}).get("state") == "published" and item["notion"].get("url")]
            if not current:
                raise ValueError("Pass requires a current real-rig report in the captured relay summaries")
        if result != "not_tested" and check in DISRUPTIVE:
            active = [event for event in events if event["kind"] == "release" and check in event["scope"]
                      and dt.datetime.fromisoformat(event["expires"]) > dt.datetime.now(dt.timezone.utc)]
            if not active:
                raise ValueError("A current released window is required for this event")
        if result == "pass" and check in RECOVERY:
            captures = [indexed[ref] for ref in evidence if indexed[ref]["kind"] == "capture"]
            if len({item["id"] for item in captures}) < 2 or not all(valid_capture(item) for item in captures):
                raise ValueError("Recovery pass requires successful before and after capture IDs")
            captures.sort(key=lambda item: item["at"])
            if captures[0].get("label") != check + " before" or captures[-1].get("label") != check + " after":
                raise ValueError("Use captures labelled '<event> before' and '<event> after'")
            if dt.datetime.fromisoformat(captures[0]["at"]) < dt.datetime.fromisoformat(active[-1]["at"]):
                raise ValueError("Recovery captures must be taken within the current released window")
            if len({item["host"] for item in captures}) != 1:
                raise ValueError("Recovery captures must come from the same production host")
            if check == "reboot" and (not captures[0].get("boot") or not captures[-1].get("boot")
                                      or captures[0]["boot"] == captures[-1]["boot"]):
                raise ValueError("Reboot pass requires changed macOS boot time")
        events.append({"kind": "result", "id": uuid.uuid4().hex, "at": now(), "check": check,
                       "lane": lane, "result": result, "witness": witness, "notes": notes,
                       "evidence": evidence})
    return report(run)


def report(run):
    with transaction(run) as data:
        return write_report(run, data)


def write_report(run, data):
    latest = {(event["check"], event["lane"]): event for event in data["events"] if event["kind"] == "result"}
    integrity_errors = []
    for event in data["events"]:
        if event["kind"] == "attachment":
            path = run / event["file"]
            if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != event["sha256"]:
                integrity_errors.append(event["id"])
    passed = not integrity_errors and all(latest.get((check, lane), {}).get("result") == "pass"
                 for check, lanes in CHECKS.items() for lane in lanes)
    lines = ["# Frozen acceptance report", "", "Overall " + ("PASS" if passed else "INCOMPLETE OR FAILED"),
             "", "Run " + data["id"], "", "Generated " + now(), "",
             "Operator " + data["operator"], "", "Results are operator attestations linked to saved evidence.", "",
             "Attachment integrity errors: " + (", ".join(integrity_errors) or "None"), "",
             "| Check | Lane | Result | Witness | Evidence IDs |", "| --- | --- | --- | --- | --- |"]
    for check, lanes in CHECKS.items():
        for lane in lanes:
            item = latest.get((check, lane), {})
            row = [check, lane, item.get("result", "not_tested"), item.get("witness", ""), ", ".join(item.get("evidence", []))]
            lines.append("| " + " | ".join(str(cell).replace("|", "\\|").replace("\n", " ") for cell in row) + " |")
    lines += ["", "## History", ""]
    for event in data["events"]:
        lines += ["```json", json.dumps(event, ensure_ascii=False, indent=2), "```", ""]
    target = run / "report.md"
    fd, temporary = tempfile.mkstemp(dir=run, prefix=".report-")
    with os.fdopen(fd, "w") as stream:
        stream.write("\n".join(lines))
    os.replace(temporary, target)
    return 0 if passed else 2


def default_checker():
    for root in (Path.home() / "Applications", Path("/Applications")):
        candidate = root / "Frozen Screen Check.app/Contents/MacOS/FrozenScreenCheck"
        if candidate.is_file():
            return candidate
    return Path("/Applications/Frozen Screen Check.app/Contents/MacOS/FrozenScreenCheck")


def menu():
    default = Path.home() / "Documents/Frozen Acceptance"
    run = Path(input(f"Run folder [{default}]: ").strip() or str(default)).expanduser()
    if not (run / "run.json").exists():
        initialize(run, input("Relay origin [http://127.0.0.1:8080]: ").strip() or "http://127.0.0.1:8080",
                   input("Operator name: "))
    while True:
        print("\n1 Capture  2 Attach file  3 Record release  4 Record result  5 Report  0 Exit")
        choice = input("> ").strip()
        try:
            if choice == "0":
                return 0
            if choice == "1":
                print(capture(run, input("Label (event, lane, before/after): "), default_checker(),
                              Path.home() / "Library/Application Support/Frozen Screen Check/show-profile.json"))
            elif choice == "2":
                print(attach(run, input("Evidence file path: ")))
            elif choice == "3":
                print("Allowed events: " + ", ".join(sorted(DISRUPTIVE)))
                print(release(run, input("Person releasing the screens: "), [value.strip() for value in input("Events (comma separated): ").split(",")],
                              int(input("Window minutes: "))))
            elif choice == "4":
                print("Checks: " + ", ".join(CHECKS))
                check = input("Check: ")
                print("Lanes: " + ", ".join(CHECKS[check]))
                result = input("Result (pass/fail/not_tested): ")
                if result not in ("pass", "fail", "not_tested"):
                    raise ValueError("Unknown result")
                record(run, check, input("Lane: "), result, input("Witness: "),
                       input("Observed result, timing, mapping and restoration details: "),
                       list(filter(None, input("Evidence IDs (comma separated, optional for failures): ").replace(" ", "").split(","))))
            elif choice == "5":
                report(run)
                print(run / "report.md")
        except (ValueError, OSError, KeyError) as error:
            print("Operation error: " + str(error))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("menu")
    for name in ("init", "capture", "attach", "release", "record", "report"):
        sub = commands.add_parser(name)
        sub.add_argument("--run", type=Path, required=True)
        if name == "init":
            sub.add_argument("--relay", required=True)
            sub.add_argument("--operator", required=True)
        elif name == "capture":
            sub.add_argument("--label", required=True)
            sub.add_argument("--checker", type=Path, default=default_checker())
            sub.add_argument("--profile", type=Path, default=Path.home() / "Library/Application Support/Frozen Screen Check/show-profile.json")
        elif name == "attach":
            sub.add_argument("file", type=Path)
        elif name == "release":
            sub.add_argument("--releaser", required=True)
            sub.add_argument("--scope", nargs="+", choices=sorted(DISRUPTIVE), required=True)
            sub.add_argument("--minutes", type=int, required=True)
        elif name == "record":
            sub.add_argument("--check", choices=CHECKS, required=True)
            sub.add_argument("--lane", required=True)
            sub.add_argument("--result", choices=("pass", "fail", "not_tested"), required=True)
            sub.add_argument("--witness", required=True)
            sub.add_argument("--notes", required=True)
            sub.add_argument("--evidence", nargs="*", default=[])
    args = parser.parse_args()
    if args.command == "menu":
        return menu()
    run = args.run.expanduser().resolve()
    if args.command == "init":
        initialize(run, args.relay, args.operator)
    elif args.command == "capture":
        print(capture(run, args.label, args.checker, args.profile))
    elif args.command == "attach":
        print(attach(run, args.file))
    elif args.command == "release":
        print(release(run, args.releaser, args.scope, args.minutes))
    elif args.command == "record":
        return record(run, args.check, args.lane, args.result, args.witness, args.notes, args.evidence)
    elif args.command == "report":
        return report(run)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(130)
    except (ValueError, OSError, KeyError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
