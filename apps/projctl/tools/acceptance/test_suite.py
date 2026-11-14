import json
from pathlib import Path
import tempfile
import threading
import unittest
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from unittest.mock import patch

import suite


class AcceptanceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.run = self.root / "run"
        suite.initialize(self.run, "http://127.0.0.1:8080", "Fixture Operator")

    def data(self):
        return json.loads((self.run / "run.json").read_text())

    def attachment(self):
        file = self.root / "observation.txt"
        file.write_text("Fixture observation")
        return suite.attach(self.run, file)

    def good_capture(self, boot="first", label="reboot before"):
        return suite.add_event(self.run, {"kind": "capture", "host": "fixture-studio", "boot": boot, "label": label,
            "api": {"/api/health": {"simulation": False}, "/api/state": {"simulation": False}},
            "errors": {}, "screens": {"exit": 0, "report": {"state": "ready", "expectedCount": 5, "readyCount": 5}}})

    def test_init_preserves_existing_and_rejects_credentials(self):
        with self.assertRaises(FileExistsError):
            suite.initialize(self.run, "http://localhost", "Other")
        for url in ("http://user:secret@host", "http://host?token=secret", "file:///tmp", "http://host/api"):
            with self.assertRaises(ValueError):
                suite.initialize(self.root / "bad", url, "Other")
        self.assertEqual(self.data()["operator"], "Fixture Operator")

    def test_pass_requires_evidence_and_witness(self):
        for witness, evidence in (("", []), ("Person", []), ("Person", ["missing"])):
            with self.assertRaises(ValueError):
                suite.record(self.run, "backup", "rig", "pass", witness, "Observed", evidence)
        self.assertEqual(suite.record(self.run, "backup", "rig", "pass", "Person", "Observed", [self.attachment()]), 2)

    def test_window_expiry_and_scope(self):
        evidence = [self.attachment()]
        with self.assertRaises(ValueError):
            suite.record(self.run, "midi", "A", "pass", "Person", "Observed", evidence)
        suite.release(self.run, "Operator", ["preset"], 1)
        with self.assertRaises(ValueError):
            suite.record(self.run, "midi", "A", "fail", "Person", "Observed", evidence)
        suite.release(self.run, "Operator", ["midi"], 1)
        suite.record(self.run, "midi", "A", "fail", "Person", "Observed", evidence)
        with suite.transaction(self.run) as data:
            data["events"][-2]["expires"] = "2000-01-01T00:00:00+00:00"
        with self.assertRaises(ValueError):
            suite.record(self.run, "midi", "A", "pass", "Person", "Observed", evidence)

    def test_recovery_requires_distinct_successful_snapshots_and_reboot(self):
        suite.release(self.run, "Operator", ["reboot", "usb"], 30)
        before = self.good_capture()
        with self.assertRaises(ValueError):
            suite.record(self.run, "usb", "A", "pass", "Person", "Observed", [before, before])
        after = self.good_capture()
        with self.assertRaises(ValueError):
            suite.record(self.run, "reboot", "A", "pass", "Person", "Observed", [before, after])
        after = self.good_capture("second", "reboot after")
        suite.record(self.run, "reboot", "A", "pass", "Person", "Observed", [before, after])

    def test_simulation_and_incomplete_capture_cannot_pass(self):
        event = {"kind": "capture", "errors": {}, "api": {"/api/health": {"simulation": True}},
                 "screens": {"exit": 0, "report": {"state": "ready", "expectedCount": 5, "readyCount": 5}}}
        self.assertFalse(suite.valid_capture(event))
        self.assertFalse(suite.valid_capture({}))

    def test_report_checks_require_current_trigger_health_and_delivery(self):
        evidence = self.attachment()
        for check, lane in (("temperature", "A"), ("shutdown-report", "rig"), ("delivery", "rig")):
            with self.assertRaises(ValueError):
                suite.record(self.run, check, lane, "pass", "Witness", "Observed", [evidence])
        report = {"startedAt": suite.now(), "kind": "manual", "counts": {"units": 4, "reached": 4, "flagged": 0, "incomplete": 0}}
        def save_report(value):
            return suite.add_event(self.run, {"kind": "capture", "api": {"/api/state": {"simulation": False},
                     "/api/health-reports": {"reports": [value]}}})
        capture = save_report(report)
        suite.record(self.run, "temperature", "A", "pass", "Witness", "Observed", [capture])
        with self.assertRaises(ValueError):
            suite.record(self.run, "shutdown-report", "rig", "pass", "Witness", "Observed", [capture])
        report["kind"] = "power-off"
        capture = save_report(report)
        suite.release(self.run, "Stage manager", ["shutdown"], 30)
        for lane in suite.LANES:
            suite.record(self.run, "shutdown", lane, "pass", "Witness", "Observed standby", [capture])
        suite.record(self.run, "shutdown-report", "rig", "pass", "Witness", "Observed", [capture])
        with self.assertRaises(ValueError):
            suite.record(self.run, "delivery", "rig", "pass", "Witness", "Observed", [capture])
        report["notion"] = {"state": "published", "url": "https://example.test/report"}
        delivered = save_report(report)
        for lane in suite.LANES:
            suite.record(self.run, "shutdown", lane, "pass", "Witness", "Observed standby", [delivered])
        suite.record(self.run, "delivery", "rig", "pass", "Witness", "Opened report", [delivered])

    def test_relay_stop_and_unlinked_shutdown_cannot_pass(self):
        report = {"startedAt": suite.now(), "kind": "relay-stop",
                  "notion": {"state": "published", "url": "https://example.test/report"}}
        def save_report():
            return suite.add_event(self.run, {"kind": "capture", "api": {
                "/api/state": {"simulation": False},
                "/api/health-reports": {"reports": [report]}}})
        capture = save_report()
        suite.release(self.run, "Stage manager", ["shutdown"], 30)
        for check in ("shutdown-report", "delivery"):
            with self.assertRaises(ValueError):
                suite.record(self.run, check, "rig", "pass", "Witness", "Observed", [capture])
        for lane in suite.LANES:
            suite.record(self.run, "shutdown", lane, "pass", "Witness", "Observed standby", [capture])
        for check in ("shutdown-report", "delivery"):
            with self.assertRaises(ValueError):
                suite.record(self.run, check, "rig", "pass", "Witness", "Observed", [capture])
        report["kind"] = "power-off"
        unrelated = save_report()
        with self.assertRaises(ValueError):
            suite.record(self.run, "shutdown-report", "rig", "pass", "Witness", "Observed", [unrelated])

    def test_missing_thermal_coverage_and_legacy_pass_require_reverification(self):
        report = {"startedAt": suite.now(), "kind": "manual",
                  "counts": {"units": 4, "reached": 4, "flagged": 0, "incomplete": 1}}
        capture = suite.add_event(self.run, {"kind": "capture", "api": {
            "/api/state": {"simulation": False}, "/api/health-reports": {"reports": [report]}}})
        with self.assertRaises(ValueError):
            suite.record(self.run, "temperature", "A", "pass", "Witness", "Observed", [capture])
        with suite.transaction(self.run) as data:
            data["events"].append({"kind": "result", "id": "legacy", "at": suite.now(),
                "check": "shutdown-report", "lane": "rig", "result": "pass", "witness": "Old witness",
                "notes": "Historical result", "evidence": [capture]})
        original = (self.run / "run.json").read_bytes()
        self.assertEqual(suite.report(self.run), 2)
        self.assertIn("legacy_unverified", (self.run / "report.md").read_text())
        self.assertEqual(original, (self.run / "run.json").read_bytes())

    def test_journal_lock_and_interrupted_transaction(self):
        before = (self.run / "run.json").read_bytes()
        with self.assertRaises(RuntimeError):
            with suite.transaction(self.run) as data:
                data["operator"] = "Changed"
                raise RuntimeError("Interruption")
        self.assertEqual(before, (self.run / "run.json").read_bytes())
        with suite.transaction(self.run):
            with self.assertRaises(ValueError):
                suite.add_event(self.run, {"kind": "test"})
        self.assertTrue((self.run / ".lock").is_file())

    def test_forced_exit_releases_os_lock_and_preserves_journal(self):
        before = (self.run / "run.json").read_bytes()
        code = "import os; from pathlib import Path; import suite; ctx=suite.transaction(Path(os.environ['TEST_RUN'])); ctx.__enter__(); os._exit(17)"
        import os
        env = {**os.environ, "TEST_RUN": str(self.run)}
        result = subprocess.run([sys.executable, "-c", code], cwd=Path(suite.__file__).parent, env=env)
        self.assertEqual(result.returncode, 17)
        self.assertEqual(before, (self.run / "run.json").read_bytes())
        self.assertEqual(suite.report(self.run), 2)
        suite.add_event(self.run, {"kind": "after-restart"})
        self.assertEqual(self.data()["events"][-1]["kind"], "after-restart")

    def test_report_integrity_resume_and_history(self):
        evidence = self.attachment()
        suite.record(self.run, "backup", "rig", "fail", "Person", "Initial failure", [evidence])
        suite.record(self.run, "backup", "rig", "pass", "Person", "Recovered", [evidence])
        self.assertEqual(suite.report(self.run), 2)
        report = (self.run / "report.md").read_text()
        self.assertIn("Initial failure", report)
        self.assertIn("| backup | rig | pass |", report)
        event = self.data()["events"][0]
        (self.run / event["file"]).write_text("tampered")
        suite.report(self.run)
        self.assertIn("Attachment integrity errors: " + evidence, (self.run / "report.md").read_text())

    def test_collector_is_get_only_redacts_and_records_partial_errors(self):
        paths = []
        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                paths.append(self.path)
                payload = {"simulation": False, "token": "secret", "nested": {"password": "secret", "ok": True}}
                if self.path == "/api/state":
                    payload["projectors"] = [{"slot": "P3"}]
                self.send_response(200)
                self.end_headers()
                self.wfile.write(json.dumps(payload).encode())
            def log_message(self, *args):
                pass
        server = HTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        with suite.transaction(self.run) as data:
            data["relay"] = "http://127.0.0.1:" + str(server.server_port)
        with patch.object(suite.subprocess, "run", side_effect=FileNotFoundError):
            suite.capture(self.run, "baseline", Path("absent"), Path("absent-profile"))
        serialized = (self.run / "run.json").read_text()
        self.assertNotIn("secret", serialized)
        self.assertIn("/api/display-info?slot=P3", paths)
        self.assertIn("screen-check", self.data()["events"][-1]["errors"])

    def test_all_checks_required_and_successful_report(self):
        evidence = self.attachment()
        with suite.transaction(self.run) as data:
            for check, lanes in suite.CHECKS.items():
                for lane in lanes:
                    data["events"].append({"kind": "result", "id": check + lane, "at": suite.now(),
                        "check": check, "lane": lane, "result": "pass", "witness": "Fixture", "notes": "Fixture", "evidence": [evidence], "criteria_version": 2})
        self.assertEqual(suite.report(self.run), 0)
        suite.record(self.run, "delivery", "rig", "not_tested", "Fixture", "Retest required", [])
        self.assertEqual(suite.report(self.run), 2)

    def test_cli_and_menu_resume(self):
        script = str(Path(suite.__file__).resolve())
        run = self.root / "folder with spaces"
        command = [sys.executable, script]
        created = subprocess.run(command + ["init", "--run", str(run), "--relay", "http://127.0.0.1:8080", "--operator", "Fixture"], capture_output=True)
        self.assertEqual(created.returncode, 0, created.stderr)
        resumed = subprocess.run(command + ["menu"], input=str(run) + "\n5\n0\n", text=True, capture_output=True)
        self.assertEqual(resumed.returncode, 0, resumed.stderr)
        self.assertIn("not_tested", (run / "report.md").read_text())
        final = subprocess.run(command + ["report", "--run", str(run)], capture_output=True)
        self.assertEqual(final.returncode, 2)

    def test_wrong_host_and_unlabelled_recovery_rejected(self):
        suite.release(self.run, "Operator", ["usb"], 30)
        before = self.good_capture(label="usb before")
        after = self.good_capture(label="usb after")
        with suite.transaction(self.run) as data:
            data["events"][-1]["host"] = "other-machine"
        with self.assertRaises(ValueError):
            suite.record(self.run, "usb", "A", "pass", "Witness", "Observed", [before, after])


if __name__ == "__main__":
    unittest.main()
