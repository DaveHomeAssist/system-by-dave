"""Private Envision coordinator. Run behind a loopback-only Tailscale Serve proxy."""

import io
import json
import logging
import os
import secrets
import signal
import tempfile
import threading
import time
import zipfile
from pathlib import Path

from flask import Flask, Response, abort, jsonify, request, send_file, send_from_directory
from PIL import Image, ImageEnhance
from werkzeug.exceptions import HTTPException

from layout import (
    FORMATS,
    blank,
    dimensions,
    legacy_export,
    legacy_import,
    number,
    render,
    validate,
)
from packages import LIMIT, portable, restore, stem
from queueing import active, claim, finish, recover, submit
from store import Catalog, Fault, need, pack, png, string, uid
from backup import snapshot

BASE = "/api/v1"
WEB = Path(__file__).parent / "web"


def read_json():
    b = request.get_json(silent=True)
    need(isinstance(b, dict), "Expected a JSON object.")
    return b


def result_file(name, raw, mime):
    return send_file(
        io.BytesIO(raw), mimetype=mime, as_attachment=True, download_name=name, max_age=0
    )


def export_stages(data, options):
    return (
        data["stages"]
        if options.get("campaign")
        else [next(s for s in data["stages"] if s["id"] == options["stage"])]
    )


def export_loop(store, stop):
    while not stop.is_set():
        with store.tx(True) as c:
            row = c.execute(
                "SELECT * FROM exports WHERE state='queued' ORDER BY created LIMIT 1"
            ).fetchone()
            if row:
                c.execute("UPDATE exports SET state='running' WHERE id=?", (row["id"],))
        if not row:
            stop.wait(0.4)
            continue
        files = json.loads(row["files"])
        try:
            opt = json.loads(row["options"])
            pid = row["project"]
            with store.tx() as c:
                p = store.project(c, pid, row["revision"])
            d = p["data"]
            stages = export_stages(d, opt)
            for index, s in enumerate(stages, 1):
                label = stem(s["name"])
                if len(stages) > 1:
                    label = f"{index:02} " + label
                root = stem(d["name"]) + " - " + label
                for fmt in opt["formats"]:
                    if stop.is_set():
                        return
                    if any(
                        f["format"] == fmt and f.get("stageId", opt["stage"]) == s["id"]
                        for f in files
                    ):
                        continue
                    with store.tx() as c:
                        im = render(store, c, pid, d, s["id"], fmt, opt.get("size"))
                        bg = s.get("background") or d.get("background")
                        meta = store.owned(c, pid, bg) if bg else None
                    raw = png(im)
                    with store.tx(True) as c:
                        h = store.blob(c, pid, raw, "image/png", im.size)
                        files.append(
                            {
                                "name": f"{root} - {fmt.title()} - r{p['revision']:02}.png",
                                "stageId": s["id"],
                                "stage": s["name"],
                                "background": bg,
                                "sourceSize": [meta["width"], meta["height"]]
                                if meta
                                else d["canvas"],
                                "hash": h,
                                "format": fmt,
                                "size": list(im.size),
                            }
                        )
                        c.execute("UPDATE exports SET files=? WHERE id=?", (pack(files), row["id"]))
            with store.tx(True) as c:
                c.execute("UPDATE exports SET state='succeeded',error='' WHERE id=?", (row["id"],))
        except Exception as exc:
            logging.warning("Export %s failed (%s)", row["id"], type(exc).__name__)
            with store.tx(True) as c:
                c.execute(
                    "UPDATE exports SET state='failed',error=? WHERE id=?",
                    (
                        str(exc)
                        if isinstance(exc, Fault)
                        else "Export failed. Retry after checking storage.",
                        row["id"],
                    ),
                )


def create_app(root, owner, worker_key, origin):
    need(
        owner and len(worker_key) >= 32 and origin.startswith("https://"),
        "Configure owner, private origin and worker credential.",
    )
    store = Catalog(root)
    app = Flask(__name__, static_folder=None)
    app.config["MAX_CONTENT_LENGTH"] = LIMIT + 1024 * 1024
    app.config["MAX_FORM_MEMORY_SIZE"] = LIMIT
    app.config["MAX_FORM_PARTS"] = 8
    app.config["STORE"] = store
    backup_lock = threading.Lock()

    @app.get(BASE + "/owner-backup")
    def owner_backup():
        if request.method == "HEAD":
            return Response(mimetype="application/zip")
        need(backup_lock.acquire(blocking=False), "Another backup is being prepared.", 409)
        try:
            temp = tempfile.TemporaryDirectory(dir=store.root)
        except OSError:
            backup_lock.release()
            raise Fault("Could not create a backup. Check the media volume.", 507)
        dest = Path(temp.name) / "snapshot.zip"
        try:
            snapshot(store.root, dest)
            size = dest.stat().st_size
        except Exception:
            temp.cleanup()
            backup_lock.release()
            raise

        def close_snapshot():
            nonlocal temp
            if temp is not None:
                temp.cleanup()
                temp = None
                backup_lock.release()

        def chunks():
            with dest.open("rb") as f:
                yield from iter(lambda: f.read(256 * 1024), b"")

        response = Response(
            chunks(),
            mimetype="application/zip",
            headers={
                "Content-Length": str(size),
                "Content-Disposition": 'attachment; filename="Envision-backup.zip"',
            },
        )
        response.call_on_close(close_snapshot)
        return response

    @app.before_request
    def access():
        if request.path.startswith(BASE + "/worker/"):
            auth = request.headers.get("Authorization", "")
            need(
                secrets.compare_digest(auth.encode(), ("Bearer " + worker_key).encode()),
                "Worker authentication required.",
                403,
            )
        else:
            need(
                not request.headers.get("Authorization")
                and secrets.compare_digest(
                    request.headers.get("Tailscale-User-Login", "").casefold().encode(),
                    owner.casefold().encode(),
                ),
                "Open the studio on your authorized private network.",
                403,
            )
            if request.method not in ("GET", "HEAD", "OPTIONS"):
                need(
                    request.headers.get("X-Envision") == "studio"
                    and request.headers.get("Origin", origin) == origin,
                    "Request originated outside the studio.",
                    403,
                )

    @app.after_request
    def protect(r):
        r.headers.update(
            {
                "Cache-Control": "private, no-store",
                "X-Content-Type-Options": "nosniff",
                "Referrer-Policy": "no-referrer",
                "Cross-Origin-Resource-Policy": "same-origin",
                "X-Frame-Options": "DENY",
                "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'",
            }
        )
        return r

    @app.errorhandler(Fault)
    def problem(exc):
        return jsonify(error=str(exc)), exc.status

    @app.errorhandler(HTTPException)
    def http_error(exc):
        return jsonify(error=exc.description), exc.code

    @app.errorhandler(Exception)
    def unexpected(exc):
        logging.error("Studio request failed (%s)", type(exc).__name__)
        return jsonify(
            error="Studio could not complete this request. Reopen the project and retry."
        ), 500

    @app.get("/")
    def home():
        return send_from_directory(WEB, "index.html")

    @app.get("/ui/<name>")
    def ui(name):
        need(name in ("studio.js", "studio.css"), "Unknown asset.", 404)
        return send_from_directory(WEB, name)

    @app.get(BASE + "/state")
    def dashboard():
        with store.tx(True) as c:
            recover(c)
            projects = []
            active_jobs = dict(
                c.execute(
                    "SELECT project,count(*) FROM jobs WHERE state IN ('queued','running') GROUP BY project"
                )
            )
            for r in c.execute("""
                SELECT p.*,
                       COALESCE(NULLIF(json_extract(p.data,'$.background'),''), (
                           SELECT v.hash FROM versions AS v
                           JOIN links AS l ON l.project = v.project AND l.hash = v.hash
                           WHERE v.project = p.id AND v.role IN ('generation','finish')
                           ORDER BY v.created DESC, v.id DESC LIMIT 1
                       )) AS cover
                FROM projects AS p ORDER BY p.updated DESC
            """):
                d = json.loads(r["data"])
                projects.append(
                    {
                        "id": r["id"],
                        "revision": r["revision"],
                        "name": d["name"],
                        "kind": d["kind"],
                        "archived": d["archived"],
                        "background": d["background"],
                        "cover": r["cover"],
                        "tags": d.get("tags", []),
                        "updated": r["updated"],
                        "activeJobs": active_jobs.get(r["id"], 0),
                    }
                )
            workers = [
                {**json.loads(r["info"]), "online": time.time() - r["seen"] < 65, "seen": r["seen"]}
                for r in c.execute("SELECT * FROM workers")
            ]
            pending = c.execute(
                "SELECT count(*) FROM jobs WHERE state IN ('running','queued')"
            ).fetchone()[0]
        return jsonify(projects=projects, workers=workers, pending=pending)

    @app.post(BASE + "/projects")
    def create():
        b = read_json()
        pid = uid()
        with store.tx(True) as c:
            p = store.save(c, pid, blank(b.get("name"), b.get("kind", "image")), 0)
        return jsonify(p), 201

    @app.get(BASE + "/projects/search")
    def search():
        q = string(request.args.get("q", ""), 150).casefold()
        with store.tx() as c:
            matches = {
                r["id"]
                for r in c.execute("SELECT id,data FROM projects")
                if any(
                    q in v.casefold()
                    for d in [json.loads(r["data"])]
                    for v in [d["name"], d.get("brief", ""), *d.get("tags", [])]
                )
            }
            matches.update(
                r["project"]
                for r in c.execute(
                    "SELECT DISTINCT project FROM jobs WHERE instr(lower(json_extract(payload,'$.prompt')),?)>0",
                    (q,),
                )
            )
        return jsonify(sorted(matches))

    @app.post(BASE + "/workers/<worker>/pause")
    def pause_worker(worker):
        paused = read_json().get("paused")
        need(type(paused) is bool, "Choose pause or resume.")
        with store.tx(True) as c:
            need(
                c.execute("SELECT 1 FROM workers WHERE id=?", (worker,)).fetchone(),
                "Unknown worker.",
                404,
            )
            c.execute(
                "INSERT INTO worker_controls VALUES(?,?) ON CONFLICT(id) DO UPDATE SET paused=excluded.paused",
                (worker, int(paused)),
            )
        return jsonify(paused=paused)

    @app.get(BASE + "/projects/<pid>")
    def get_project(pid):
        with store.tx() as c:
            p = store.project(c, pid)
            p["versions"] = [
                {**dict(r), "recipe": json.loads(r["recipe"])}
                for r in c.execute(
                    "SELECT v.*,m.width,m.height FROM versions v JOIN media m ON m.hash=v.hash WHERE v.project=? ORDER BY v.created DESC,v.id DESC",
                    (pid,),
                )
            ]
            p["exports"] = [
                {**dict(r), "files": json.loads(r["files"])}
                for r in c.execute(
                    "SELECT * FROM exports WHERE project=? ORDER BY created DESC LIMIT 32", (pid,)
                )
            ]
        return jsonify(p)

    @app.patch(BASE + "/projects/<pid>")
    def save(pid):
        b = read_json()
        with store.tx(True) as c:
            p = store.project(c, pid)
            d = b.get("data")
            validate(store, c, pid, d)
            if d.get("selected"):
                need(
                    c.execute(
                        "SELECT 1 FROM versions WHERE id=? AND project=? AND hash=?",
                        (d["selected"], pid, d.get("background")),
                    ).fetchone(),
                    "Selected artwork does not match the project background.",
                )
            p = store.save(c, pid, d, b.get("revision"))
        return jsonify(p)

    @app.post(BASE + "/projects/<pid>/duplicate")
    def duplicate(pid):
        with store.tx(True) as c:
            p = store.project(c, pid)
            raw = portable(store, c, p)
            dest = uid()
            d = restore(store, c, dest, raw)
            d["archived"] = False
            d["name"] = d["name"][:90] + " copy"
            out = store.save(c, dest, d, 0)
        return jsonify(out), 201

    @app.post(BASE + "/imports")
    @app.post(BASE + "/projects/<existing>/imports")
    def import_file(existing=None):
        f = request.files.get("file")
        need(f is not None, "Choose an editable file.")
        raw = f.read()
        name = f.filename or "Project"
        with store.tx(True) as c:
            pid = existing or uid()
            p = store.project(c, pid) if existing else None
            if raw.startswith(b"PK"):
                need(not existing, "Import a native package as a new project.")
                d = restore(store, c, pid, raw)
            else:
                need(len(raw) <= 40 * 1024**2, "Legacy import exceeds 40 MiB.")
                try:
                    obj = json.loads(raw)
                except (ValueError, UnicodeError):
                    raise Fault("Invalid project JSON.")
                if isinstance(obj, dict) and obj.get("format") == "envision-brief-1":
                    need(not existing, "Import a brief as a new project.")
                    d = blank(obj.get("title"), "show")
                    d["brief"] = string(obj.get("prompt"), 6000)
                    d["fields"]["copy"] = string(obj.get("copy", ""), 1600)
                else:
                    d = legacy_import(store, c, pid, obj, name)
                d["stages"][0]["importFile"] = {
                    "name": stem(name, 180),
                    "hash": store.blob(c, pid, raw, "application/json"),
                }
            if p:
                need(
                    str(p["revision"]) == request.form.get("revision"),
                    "Project has changed. Reopen it.",
                    409,
                )
                current = p["data"]
                need(current["canvas"] == d["canvas"], "Stage canvas must match this project.")
                s = d["stages"][0]
                s["name"] = string(request.form.get("stage", "Imported stage"), 100, True)
                if current["background"] != d["background"]:
                    s["background"] = d["background"]
                for l in s["layers"]:
                    k = l["binding"]
                    if k not in current["fields"]:
                        current["fields"][k] = d["fields"][k]
                    if current["fields"][k] != d["fields"][k] or current["logos"].get(k) != d[
                        "logos"
                    ].get(k):
                        l["binding"] = ""
                        l["logo"] = d["logos"].get(k)
                current["stages"].append(s)
                d = current
            out = store.save(c, pid, validate(store, c, pid, d), p["revision"] if p else 0)
        return jsonify(out), 201

    @app.post(BASE + "/projects/<pid>/assets")
    def upload(pid):
        f = request.files.get("file")
        need(f is not None, "Choose a PNG, JPEG, or WebP.")
        role = request.form.get("role", "reference")
        need(role in ("reference", "logo", "mask", "background"), "Invalid asset role.")
        with store.tx(True) as c:
            store.project(c, pid)
            h = store.image(c, pid, f.read())
            vid = store.version(c, pid, h, stem(f.filename or "Image"), role)
        return jsonify(id=vid, hash=h), 201

    @app.get(BASE + "/projects/<pid>/media/<h>")
    def media(pid, h):
        with store.tx() as c:
            r = store.owned(c, pid, h, image=False)
        if request.args.get("thumb") == "1" and r["mime"].startswith("image/"):
            dest = store.root / "thumbs"
            dest.mkdir(exist_ok=True)
            cache = dest / (h + ".webp")
            if not cache.exists():
                with store.tx() as c:
                    im = store.pixels(c, pid, h)
                im.thumbnail((360, 360))
                with tempfile.NamedTemporaryFile(dir=dest, delete=False) as tmp:
                    im.save(tmp, format="WEBP", quality=78)
                os.replace(tmp.name, cache)
            return send_file(cache, mimetype="image/webp")
        name = request.args.get("download")
        return send_file(
            store.media / h,
            mimetype=r["mime"],
            as_attachment=bool(name),
            download_name=stem(name, 230) if name else h,
        )

    @app.post(BASE + "/projects/<pid>/versions/<vid>/favorite")
    def favorite(pid, vid):
        with store.tx(True) as c:
            cur = c.execute(
                "UPDATE versions SET favorite=1-favorite WHERE project=? AND id=?", (pid, vid)
            )
            need(cur.rowcount == 1, "Unknown artwork.", 404)
        return jsonify(ok=True)

    @app.get(BASE + "/projects/<pid>/versions/<vid>/png")
    def artwork_png(pid, vid):
        with store.tx() as c:
            p = store.project(c, pid)
            v = c.execute(
                "SELECT hash FROM versions WHERE id=? AND project=?", (vid, pid)
            ).fetchone()
            need(v, "Unknown artwork.", 404)
            raw = png(store.pixels(c, pid, v["hash"]))
        return result_file(stem(p["data"]["name"]) + " - " + vid[:8] + ".png", raw, "image/png")

    @app.post(BASE + "/projects/<pid>/finishes")
    def local_finish(pid):
        b = read_json()
        effect = b.get("effect", "scanlines")
        need(effect in ("scanlines", "darken", "grain"), "Unsupported finish.")
        amount = b.get("amount", 0.45)
        need(number(amount, 0, 1), "Choose a finish amount from 0 to 1.")
        with store.tx(True) as c:
            parent = c.execute(
                "SELECT * FROM versions WHERE project=? AND id=?", (pid, b.get("parent"))
            ).fetchone()
            need(parent, "Select an artwork version.")
            src = store.pixels(c, pid, parent["hash"])
            im = ImageEnhance.Brightness(src).enhance(1 - amount * 0.6)
            if effect == "scanlines":
                stripe = Image.new("L", (1, im.height))
                stripe.putdata(
                    [int(255 * (1 - amount * 0.6)) if y % 3 == 0 else 255 for y in range(im.height)]
                )
                im = Image.composite(
                    im, Image.new("RGBA", im.size, "black"), stripe.resize(im.size)
                )
            if effect == "grain":
                import random

                rng = random.Random(19)
                noise = Image.frombytes(
                    "L", (128, 128), bytes(rng.randrange(256) for _ in range(128**2))
                ).convert("RGBA")
                tile = Image.new("RGBA", im.size)
                for x in range(0, im.width, 128):
                    for y in range(0, im.height, 128):
                        tile.paste(noise, (x, y))
                im = Image.blend(im, tile, amount * 0.22)
            im.putalpha(src.getchannel("A"))
            mask = b.get("mask")
            if mask:
                edit_map = store.pixels(c, pid, mask).convert("L")
                need(edit_map.size == src.size, "Finish mask must match the source.")
                im = Image.composite(im, src, edit_map)
            h = store.image(c, pid, png(im))
            v = store.version(
                c,
                pid,
                h,
                effect.title() + " finish",
                "finish",
                parent["id"],
                {"effect": effect, "amount": amount, "mask": mask, "version": 1},
            )
        return jsonify(id=v, hash=h), 201

    @app.get(BASE + "/projects/<pid>/proof")
    def proof(pid):
        with store.tx() as c:
            p = store.project(c, pid, request.args.get("revision", type=int))
            im = render(
                store,
                c,
                pid,
                p["data"],
                request.args.get("stage"),
                request.args.get("format", "source"),
                [request.args.get("w", type=int), request.args.get("h", type=int)],
                request.args.get("background"),
                guides=request.args.get("guides") == "1",
            )
        return send_file(io.BytesIO(png(im)), mimetype="image/png")

    @app.get(BASE + "/projects/<pid>/editable")
    def editable(pid):
        with store.tx() as c:
            p = store.project(c, pid, request.args.get("revision", type=int))
            d = p["data"]
            if request.args.get("type") == "legacy":
                s = next((s for s in d["stages"] if s["id"] == request.args.get("stage")), None)
                need(s, "Choose a stage.")
                raw = pack(legacy_export(store, c, pid, d, s)).encode()
                return result_file(stem(d["name"]) + ".flyer.json", raw, "application/json")
            raw = portable(store, c, p)
        return result_file(stem(d["name"]) + ".envision.zip", raw, "application/zip")

    @app.post(BASE + "/projects/<pid>/jobs")
    def new_job(pid):
        with store.tx(True) as c:
            ids = submit(store, c, pid, read_json())
        return jsonify(jobs=ids), 202

    def job_view(row):
        return {
            k: (json.loads(row[k]) if k in ("payload", "receipt") and row[k] else row[k])
            for k in (
                "id",
                "project",
                "payload",
                "state",
                "attempt",
                "worker",
                "created",
                "started",
                "finished",
                "progress",
                "error",
                "result",
                "receipt",
            )
        }

    @app.get(BASE + "/jobs")
    @app.get(BASE + "/jobs/<jid>")
    def jobs(jid=None):
        with store.tx(True) as c:
            recover(c)
            if jid:
                row = c.execute("SELECT * FROM jobs WHERE id=?", (jid,)).fetchone()
                need(row, "Unknown job.", 404)
                return jsonify(job_view(row))
            return jsonify(
                [
                    job_view(r)
                    for r in c.execute("SELECT * FROM jobs ORDER BY created DESC LIMIT 80")
                ]
            )

    @app.post(BASE + "/jobs/<jid>/<action>")
    def job_action(jid, action):
        with store.tx(True) as c:
            if action == "cancel":
                cur = c.execute(
                    "UPDATE jobs SET state='cancelled',finished=?,lease=NULL WHERE id=? AND state IN ('queued','running')",
                    (time.time(), jid),
                )
            elif action == "retry":
                cur = c.execute(
                    "UPDATE jobs SET state='queued',attempt=0,worker=NULL,started=NULL,finished=NULL,error='',progress='' "
                    "WHERE id=? AND state IN ('failed','cancelled')",
                    (jid,),
                )
            else:
                abort(404)
            need(cur.rowcount, "The job has already changed state.", 409)
        return jsonify(ok=True)

    @app.post(BASE + "/worker/claim")
    def worker_claim():
        with store.tx(True) as c:
            out = claim(c, read_json())
        return jsonify(job=out)

    @app.route(BASE + "/worker/jobs/<jid>/<op>", methods=["GET", "POST"])
    def worker_update(jid, op):
        with store.tx(True) as c:
            row = active(c, jid, request.headers.get("X-Lease"))
            pid = row["project"]
            if op == "input" and request.method == "GET":
                h = request.args.get("hash")
                need(
                    h in json.loads(row["payload"])["refs"].values(),
                    "Input is outside this job.",
                    403,
                )
                img = store.pixels(c, pid, h)
                # An owned workflow receives a PNG that exactly matches its input latent's dimensions.
                sz = tuple(json.loads(row["payload"])["size"])
                img = img.resize(
                    sz,
                    Image.Resampling.NEAREST
                    if request.args.get("role") == "mask"
                    else Image.Resampling.LANCZOS,
                )
                return send_file(io.BytesIO(png(img)), mimetype="image/png")
            need(request.method == "POST", "Unsupported method.", 405)
            if op == "progress":
                b = read_json()
                c.execute(
                    "UPDATE jobs SET expires=?,progress=? WHERE id=?",
                    (time.time() + 60, string(b.get("progress", "Rendering"), 160), jid),
                )
                c.execute("UPDATE workers SET seen=? WHERE id=?", (time.time(), row["worker"]))
            elif op == "complete":
                f = request.files.get("image")
                need(f is not None, "Missing result.")
                try:
                    receipt = json.loads(request.form.get("receipt", "{}"))
                except ValueError:
                    raise Fault("Invalid worker receipt.")
                need(
                    isinstance(receipt, dict) and len(pack(receipt)) < 16384,
                    "Invalid worker receipt.",
                )
                vid = finish(store, c, row, f.read(), receipt)
                return jsonify(version=vid)
            elif op == "fail":
                c.execute(
                    "UPDATE jobs SET state='failed',error=?,finished=?,lease=NULL WHERE id=?",
                    (string(read_json().get("error", "Render failed."), 500), time.time(), jid),
                )
            else:
                abort(404)
        return jsonify(ok=True)

    @app.post(BASE + "/projects/<pid>/exports")
    def new_export(pid):
        b = read_json()
        fm = b.get("formats")
        need(
            isinstance(fm, list)
            and 1 <= len(fm) <= 5
            and len(set(fm)) == len(fm)
            and all(f in {*FORMATS, "source", "custom"} for f in fm),
            "Choose unique output formats.",
        )
        if "custom" in fm:
            dimensions(b.get("size"))
        with store.tx(True) as c:
            p = store.project(c, pid, b.get("revision"))
            need(any(s["id"] == b.get("stage") for s in p["data"]["stages"]), "Unknown stage.")
            need(type(b.get("campaign", False)) is bool, "Choose current stage or whole campaign.")
            count = len(export_stages(p["data"], b)) * len(fm)
            need(count <= 48, "Choose fewer formats. A package supports 48 outputs.")
            store.room(count * 16_000_000)
            eid = uid()
            c.execute(
                "INSERT INTO exports(id,project,revision,options,state,created) VALUES(?,?,?,?,'queued',?)",
                (eid, pid, p["revision"], pack(b), time.time()),
            )
        return jsonify(id=eid), 202

    @app.get(BASE + "/exports/<eid>")
    @app.get(BASE + "/exports/<eid>/package")
    def export_status(eid):
        with store.tx() as c:
            row = c.execute("SELECT * FROM exports WHERE id=?", (eid,)).fetchone()
            need(row, "Unknown export.", 404)
            r = dict(row)
            r["files"] = json.loads(r["files"])
            if not request.path.endswith("/package"):
                return jsonify(r)
            need(r["state"] == "succeeded", "Export package is still being prepared.", 409)
            d = store.project(c, r["project"], r["revision"])["data"]
            stages = export_stages(d, json.loads(r["options"]))
            label = "Campaign" if len(stages) > 1 else stages[0]["name"]
            manifest = {
                "event": d["name"],
                "eventRevision": r["revision"],
                "stage": label,
                "layoutRevision": r["revision"],
                "background": stages[0].get("background") or d.get("background"),
                "files": r["files"],
            }
        store.room(sum((store.media / f["hash"]).stat().st_size for f in r["files"]))
        temp = tempfile.TemporaryFile(dir=store.root)
        try:
            with zipfile.ZipFile(temp, "w", zipfile.ZIP_STORED) as archive:
                for f in r["files"]:
                    archive.write(store.media / f["hash"], f["name"])
                archive.writestr("manifest.json", pack(manifest))
            temp.seek(0)
            return send_file(
                temp,
                download_name=stem(d["name"]) + " - " + stem(label) + f" - r{r['revision']:02}.zip",
                mimetype="application/zip",
                as_attachment=True,
            )
        except BaseException:
            temp.close()
            raise

    @app.post(BASE + "/exports/<eid>/retry")
    def retry_export(eid):
        with store.tx(True) as c:
            cur = c.execute(
                "UPDATE exports SET state='queued',error='' WHERE id=? AND state='failed'", (eid,)
            )
            need(cur.rowcount, "Only failed exports can be retried.", 409)
        return jsonify(id=eid), 202

    @app.route(BASE + "/presets", methods=["GET", "POST"])
    def presets():
        if request.method == "GET":
            with store.tx() as c:
                return jsonify(
                    [
                        {**dict(r), "data": json.loads(r["data"])}
                        for r in c.execute("SELECT * FROM presets ORDER BY created DESC")
                    ]
                )
        b = read_json()
        with store.tx(True) as c:
            store.project(c, b.get("project"))
            settings = b.get("data")
            need(
                isinstance(settings, dict) and len(pack(settings)) <= 12000, "Invalid style preset."
            )
            for h in settings.get("refs", {}).values():
                store.owned(c, b["project"], h)
            ident = uid()
            c.execute(
                "INSERT INTO presets VALUES(?,?,?,?,?)",
                (
                    ident,
                    string(b.get("name"), 100, True),
                    b["project"],
                    pack(settings),
                    time.time(),
                ),
            )
        return jsonify(id=ident), 201

    @app.post(BASE + "/projects/<pid>/presets/<ident>/apply")
    def apply_preset(pid, ident):
        with store.tx(True) as c:
            store.project(c, pid)
            row = c.execute("SELECT * FROM presets WHERE id=?", (ident,)).fetchone()
            need(row, "Unknown preset.", 404)
            settings = json.loads(row["data"])
            for h in settings.get("refs", {}).values():
                store.owned(c, row["project"], h)
                c.execute("INSERT OR IGNORE INTO links VALUES(?,?)", (pid, h))
                if not c.execute(
                    "SELECT 1 FROM versions WHERE project=? AND hash=?", (pid, h)
                ).fetchone():
                    store.version(c, pid, h, "Preset reference", "reference")
        return jsonify(settings)

    return app


if __name__ == "__main__":
    from waitress import serve

    app = create_app(
        os.environ["ENVISION_DATA"],
        os.environ["ENVISION_OWNER"],
        Path(os.environ["ENVISION_WORKER_KEY_FILE"]).read_text().strip(),
        os.environ["ENVISION_ORIGIN"],
    )
    store = app.config["STORE"]
    with store.tx(True) as c:
        c.execute("UPDATE exports SET state='queued' WHERE state='running'")
    stopping = threading.Event()
    exporter = threading.Thread(target=export_loop, args=(store, stopping), daemon=True)
    exporter.start()
    signal.signal(signal.SIGTERM, signal.default_int_handler)
    try:
        serve(app, host="127.0.0.1", port=8766, threads=6, max_request_body_size=LIMIT + 1024 * 1024)
    finally:
        stopping.set()
        exporter.join(timeout=5)
