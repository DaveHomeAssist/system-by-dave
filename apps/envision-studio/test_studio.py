import base64
import io
import json
import tempfile
import threading
import time
import unittest
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw

from server import create_app, export_loop
from store import png
from layout import render
from backup import snapshot, verify

ORIGIN = "https://studio.test"
KEY = "test-worker-identity-" + ("x" * 32)
OWNER = {"Tailscale-User-Login": "owner@test", "X-Envision": "studio", "Origin": ORIGIN}
WORKER = {"Authorization": "Bearer " + KEY}


def image(size, color):
    return png(Image.new("RGBA", size, color))


class Studio(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)
        self.app = create_app(self.dir.name, "owner@test", KEY, ORIGIN)
        self.http = self.app.test_client()
        self.api = "/api/v1"
        p = self.post("/projects", {"name": "Test Show", "kind": "show"})
        self.pid = p["id"]
        self.project = "/projects/" + self.pid

    def post(self, path, body=None, headers=OWNER, expected=(200, 201, 202)):
        r = self.http.post(self.api + path, json=body or {}, headers=headers)
        self.assertIn(r.status_code, expected, r.get_data(as_text=True))
        return r.get_json()

    def get(self, path, headers=OWNER):
        r = self.http.get(self.api + path, headers=headers)
        self.assertEqual(r.status_code, 200, r.get_data(as_text=True)[:200])
        return r.get_json()

    def asset(self, raw, role="reference"):
        r = self.http.post(
            self.api + self.project + "/assets",
            headers=OWNER,
            data={"file": (io.BytesIO(raw), "reference.png"), "role": role},
        )
        self.assertEqual(r.status_code, 201)
        return r.get_json()

    def test_private_identity(self):
        self.assertEqual(self.http.get(self.api + "/state").status_code, 403)
        self.assertEqual(self.http.get(self.api + "/state", headers=WORKER).status_code, 403)
        self.assertEqual(
            self.http.post(
                self.api + "/projects", json={}, headers=OWNER | {"Origin": "https://else.test"}
            ).status_code,
            403,
        )
        self.post("/worker/claim", {"id": "runner", "profiles": []}, OWNER, (403,))

    def test_optimistic_save_and_history(self):
        p = self.get(self.project)
        d = p["data"]
        d["name"] = "New Title"
        endpoint = self.api + self.project
        b = {"revision": 1, "data": d}
        self.assertEqual(self.http.patch(endpoint, json=b, headers=OWNER).status_code, 200)
        self.assertEqual(self.http.patch(endpoint, json=b, headers=OWNER).status_code, 409)
        with self.app.config["STORE"].tx() as c:
            self.assertEqual(
                self.app.config["STORE"].project(c, self.pid, 1)["data"]["name"], "Test Show"
            )

    def test_lease_cancel_retry_and_mask(self):
        source = self.asset(image((40, 30), "#123456"))
        mask = Image.new("L", (40, 30), 0)
        ImageDraw.Draw(mask).rectangle((12, 12, 20, 20), fill=255)
        m = self.asset(png(mask), "mask")
        b = {
            "key": "one",
            "operation": "mask",
            "parent": source["id"],
            "refs": {"mask": m["hash"]},
            "size": [512, 512],
            "prompt": "Test mask",
            "seed": 17,
        }
        ids = self.post(self.project + "/jobs", b)["jobs"]
        self.assertEqual(self.post(self.project + "/jobs", b)["jobs"], ids)
        self.post(self.project + "/jobs", b | {"seed": 18}, expected=(409,))
        j = self.post("/worker/claim", {"id": "runner", "profiles": ["sdxl-turbo-local"]}, WORKER)[
            "job"
        ]
        self.assertEqual(j["id"], ids[0])
        route = "/worker/jobs/" + j["id"]
        h = WORKER | {"X-Lease": j["lease"]}
        other = self.asset(image((4, 4), "red"))
        self.assertEqual(
            self.http.get(self.api + route + "/input?hash=" + other["hash"], headers=h).status_code,
            403,
        )
        self.post("/jobs/" + j["id"] + "/cancel")
        self.post(route + "/progress", headers=h, expected=(409,))
        self.post("/jobs/" + j["id"] + "/retry")
        again = self.post(
            "/worker/claim", {"id": "runner", "profiles": ["sdxl-turbo-local"]}, WORKER
        )["job"]
        self.assertNotEqual(again["lease"], j["lease"])
        h = WORKER | {"X-Lease": again["lease"]}
        r = self.http.post(
            self.api + route + "/complete",
            headers=h,
            data={"image": (io.BytesIO(image((512, 512), "white")), "result.png")},
        )
        self.assertEqual(r.status_code, 200)
        v = next(v for v in self.get(self.project)["versions"] if v["id"] == r.json["version"])
        with self.http.get(
            self.api + self.project + "/media/" + v["hash"], headers=OWNER
        ) as response:
            im = Image.open(io.BytesIO(response.data))
        self.assertEqual(im.size, (40, 30))
        self.assertEqual(im.getpixel((0, 0)), (18, 52, 86, 255))
        self.assertEqual(im.getpixel((16, 16)), (255, 255, 255, 255))
        self.assertEqual(self.get("/jobs/" + j["id"])["state"], "succeeded")

    def test_expiry_and_queue_reopen(self):
        jid = self.post(self.project + "/jobs", {"key": "expire", "prompt": "p"})["jobs"][0]
        for attempt in (1, 2):
            j = self.post(
                "/worker/claim", {"id": "worker", "profiles": ["sdxl-turbo-local"]}, WORKER
            )["job"]
            self.assertEqual(j["attempt"], attempt)
            with self.app.config["STORE"].tx(True) as c:
                c.execute("UPDATE jobs SET expires=1 WHERE id=?", (jid,))
        self.assertEqual(self.get("/jobs/" + jid)["state"], "failed")
        app2 = create_app(self.dir.name, "owner@test", KEY, ORIGIN)
        self.assertEqual(
            app2.test_client().get(self.api + self.project, headers=OWNER).json["data"]["name"],
            "Test Show",
        )

    def test_pause_low_disk_and_overnight(self):
        store = self.app.config["STORE"]
        worker = {"id": "dedicated", "profiles": ["sdxl-turbo-local"]}
        self.post("/worker/claim", worker, WORKER)
        self.post("/workers/dedicated/pause", {"paused": True})
        self.post(self.project + "/jobs", {"prompt": "fog", "key": "paused"})
        self.assertIsNone(self.post("/worker/claim", worker, WORKER)["job"])
        self.post("/workers/dedicated/pause", {"paused": False})
        self.assertIsNotNone(self.post("/worker/claim", worker, WORKER)["job"])
        store.disk_floor = 2**60
        self.post(self.project + "/jobs", {"prompt": "fog", "key": "disk"}, expected=(507,))
        self.assertEqual(self.get(self.project)["revision"], 1)
        p = self.get(self.project)
        d = p["data"]
        d["fields"].update(starts="2026-12-30T23:45", ends="2026-12-30T06:00")
        url = self.api + self.project
        self.assertEqual(
            self.http.patch(url, json={"revision": 1, "data": d}, headers=OWNER).status_code, 400
        )
        d["fields"]["ends"] = "2026-12-31T06:00"
        self.assertEqual(
            self.http.patch(url, json={"revision": 1, "data": d}, headers=OWNER).status_code, 200
        )

    def test_fit_plate_finish_and_restore(self):
        store = self.app.config["STORE"]
        im = Image.new("RGB", (100, 50), "#084080")
        ImageDraw.Draw(im).rectangle((0, 0, 11, 49), fill="orange")
        src = self.asset(png(im))
        mask = Image.new("L", im.size)
        ImageDraw.Draw(mask).rectangle((48, 0, 99, 49), fill=255)
        edit = self.asset(png(mask), "mask")
        out = self.post(
            self.project + "/finishes",
            {"parent": src["id"], "mask": edit["hash"], "effect": "scanlines", "amount": 0.5},
        )
        with store.tx() as c:
            pixels = store.pixels(c, self.pid, out["hash"]).convert("RGB")
            self.assertEqual(
                im.crop((0, 0, 48, 50)).tobytes(), pixels.crop((0, 0, 48, 50)).tobytes()
            )
            self.assertNotEqual(im.getpixel((70, 30)), pixels.getpixel((70, 30)))
            d = store.project(c, self.pid)["data"]
            d.update(background=src["hash"], canvas=[100, 50])
            s = d["stages"][0]
            s["layers"] = []
            fit = render(store, c, self.pid, d, s["id"], "custom", [100, 100])
            self.assertEqual(fit.getpixel((4, 50))[:3], (255, 165, 0))
            s["formats"]["custom"] = {"fit": "fill"}
            fill = render(store, c, self.pid, d, s["id"], "custom", [100, 100])
            self.assertNotEqual(fill.getpixel((4, 50)), fit.getpixel((4, 50)))
        with tempfile.TemporaryDirectory() as t:
            z = Path(t) / "backup.zip"
            target = Path(t) / "restored"
            snapshot(store.root, z)
            verify(z, target)
            self.assertEqual(
                (target / "media" / out["hash"]).read_bytes(),
                (store.media / out["hash"]).read_bytes(),
            )
            with self.assertRaises(ValueError):
                verify(z, target)

    def test_legacy_native_export_and_snapshot(self):
        def url(raw):
            return "data:image/png;base64," + base64.b64encode(raw).decode()

        bg = image((615, 768), "#163848")
        art = image((30, 8), "#ff5522")
        obj = {
            "format": "nnc-layout-1",
            "background": url(bg),
            "layers": [
                {
                    "kind": "artist" if i < 7 else "info",
                    "label": "Slot " + str(i),
                    "text": "One",
                    "original": "One",
                    "box": [30, 30 + i * 40, 535, 35],
                    "art": url(art),
                }
                for i in range(11)
            ],
        }

        def import_data(raw, name):
            return self.http.post(
                self.api + "/imports", headers=OWNER, data={"file": (io.BytesIO(raw), name)}
            )

        self.assertEqual(import_data(b"{", "bad.json").status_code, 400)
        p = import_data(json.dumps(obj).encode(), "AfterJinx Test.flyer.json").json
        self.assertEqual(p["data"]["name"], "AfterJinx Test")
        path = "/projects/" + p["id"]
        sid = p["data"]["stages"][0]["id"]
        legacy = self.http.get(
            self.api + path + "/editable?type=legacy&stage=" + sid, headers=OWNER
        )
        self.assertEqual(json.loads(legacy.data)["layers"][0]["art"], url(art))
        native = self.http.get(self.api + path + "/editable", headers=OWNER)
        restored = import_data(native.data, "restore.envision.zip")
        self.assertEqual(restored.status_code, 201)
        self.assertEqual(restored.json["data"]["background"], p["data"]["background"])
        out = self.post(
            path + "/exports", {"stage": sid, "revision": 1, "formats": ["feed", "story", "lobby"]}
        )
        p["data"]["name"] = "Different event"
        r = self.http.patch(self.api + path, json={"revision": 1, "data": p["data"]}, headers=OWNER)
        self.assertEqual(r.status_code, 200)
        stop = threading.Event()
        t = threading.Thread(target=export_loop, args=(self.app.config["STORE"], stop))
        t.start()
        try:
            for _ in range(100):
                st = self.get("/exports/" + out["id"])
                if st["state"] in ("failed", "succeeded"):
                    break
                time.sleep(0.05)
            self.assertEqual(st["state"], "succeeded", st["error"])
            result = self.http.get(self.api + "/exports/" + out["id"] + "/package", headers=OWNER)
            with result, zipfile.ZipFile(io.BytesIO(result.data)) as z:
                m = json.loads(z.read("manifest.json"))
                self.assertEqual(m["event"], "AfterJinx Test")
                self.assertEqual(m["background"], p["data"]["background"])
                for f in m["files"]:
                    self.assertTrue(f["name"].startswith("AfterJinx Test - "))
                    self.assertEqual(
                        list(Image.open(io.BytesIO(z.read(f["name"]))).size), f["size"]
                    )
            self.assertEqual(self.get("/jobs"), [])
        finally:
            stop.set()
            t.join(5)


if __name__ == "__main__":
    unittest.main()
