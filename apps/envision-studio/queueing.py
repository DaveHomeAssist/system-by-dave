import hashlib
import json
import secrets
import time

from PIL import Image, ImageStat

from layout import number
from store import dimensions, need, pack, png, read_image, string, uid

PROFILE = "sdxl-turbo-local"
SIZES = {(640, 800), (800, 640), (512, 512), (768, 432), (432, 768)}
LEASE = 60


def submit(store, c, pid, b):
    store.project(c, pid)
    key = string(b.get("key"), 128, True)
    digest = hashlib.sha256(pack(b).encode()).hexdigest()
    prior = c.execute(
        "SELECT digest,jobs FROM batches WHERE project=? AND key=?", (pid, key)
    ).fetchone()
    if prior:
        need(prior["digest"] == digest, "Submission key was reused for different settings.", 409)
        return json.loads(prior["jobs"])
    count = b.get("count", 1)
    need(type(count) is int and 1 <= count <= 4, "Choose one to four images.")
    store.room(count * 6_000_000)
    pending = c.execute("SELECT count(*) FROM jobs WHERE state IN ('queued','running')").fetchone()[
        0
    ]
    need(pending + count <= 64, "Queue is full. Finish or cancel a job first.", 429)
    op = b.get("operation", "generate")
    need(op in ("generate", "revise", "mask"), "Unsupported generation operation.")
    profile = b.get("profile", PROFILE)
    need(profile == PROFILE, "This model profile is not installed.", 422)
    w, h = dimensions(b.get("size", [640, 800]))
    need((w, h) in SIZES, "Choose a supported native render size.")
    prompt = string(b.get("prompt"), 6000, True)
    refs = {}
    rawrefs = b.get("refs", {})
    need(
        isinstance(rawrefs, dict) and set(rawrefs) <= {"composition", "style", "starting", "mask"},
        "Invalid reference role.",
    )
    for role, asset in rawrefs.items():
        if asset:
            store.owned(c, pid, asset)
            refs[role] = asset
    parent = b.get("parent") or None
    if parent:
        v = c.execute(
            "SELECT hash FROM versions WHERE id=? AND project=?", (parent, pid)
        ).fetchone()
        need(v is not None, "Parent artwork is unavailable.")
        refs["starting"] = v["hash"]
    need(op == "generate" or "starting" in refs, "Select the source artwork for this revision.")
    need(op != "mask" or "mask" in refs, "Paint an edit region first.")
    need("mask" not in refs or op == "mask", "Choose masked revision to use a mask.")
    if op == "mask":
        a = store.owned(c, pid, refs["starting"])
        m = store.owned(c, pid, refs["mask"])
        need(
            (a["width"], a["height"]) == (m["width"], m["height"]),
            "Mask must match source dimensions.",
        )
        mask = store.pixels(c, pid, refs["mask"]).convert("L")
        need(mask.getbbox() is not None, "Paint at least one pixel to edit.")
    strength = b.get("strength", 0.55)
    need(number(strength, 0.1, 1), "Strength must be between 0.1 and 1.")
    seed = b.get("seed")
    need(seed is None or type(seed) is int and 0 <= seed <= 2**52 - 4, "Use a nonnegative seed.")
    job_ids = []
    for i in range(count):
        jid = uid()
        job_ids.append(jid)
        payload = {
            "operation": op,
            "profile": profile,
            "size": [w, h],
            "prompt": prompt,
            "refs": refs,
            "parent": parent,
            "strength": strength,
            "seed": secrets.randbelow(2**52) if seed is None else seed + i,
            "steps": 4,
            "workflow": "turbo-v2",
        }
        c.execute(
            "INSERT INTO jobs(id,project,payload,state,created) VALUES(?,?,?,'queued',?)",
            (jid, pid, pack(payload), time.time()),
        )
    c.execute("INSERT INTO batches VALUES(?,?,?,?)", (pid, key, digest, pack(job_ids)))
    return job_ids


def recover(c):
    now = time.time()
    c.execute(
        "UPDATE jobs SET state=CASE WHEN attempt<2 THEN 'queued' ELSE 'failed' END,"
        "error='Worker lease expired',lease=NULL,expires=NULL WHERE state='running' AND expires<?",
        (now,),
    )


def claim(c, info):
    now = time.time()
    worker = string(info.get("id"), 80, True)
    control = c.execute("SELECT paused FROM worker_controls WHERE id=?", (worker,)).fetchone()
    info["paused"] = bool(info.get("paused") or control and control["paused"])
    profiles = info.get("profiles", [])
    need(
        isinstance(profiles, list) and all(isinstance(p, str) for p in profiles),
        "Invalid worker profiles.",
    )
    workflows = info.get("workflows", ["turbo-v1"])
    need(
        isinstance(workflows, list) and all(isinstance(w, str) for w in workflows),
        "Invalid worker workflows.",
    )
    c.execute(
        "INSERT INTO workers VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET seen=excluded.seen,info=excluded.info",
        (worker, now, pack(info)),
    )
    recover(c)
    if info.get("paused") or info.get("busy") or PROFILE not in profiles:
        return None
    if c.execute("SELECT 1 FROM jobs WHERE state='running' AND worker=?", (worker,)).fetchone():
        return None
    row = c.execute(
        "SELECT * FROM jobs WHERE state='queued' AND json_extract(payload,'$.workflow') "
        "IN (SELECT value FROM json_each(?)) ORDER BY created,id LIMIT 1",
        (pack(workflows),),
    ).fetchone()
    if not row:
        return None
    lease = secrets.token_urlsafe(24)
    c.execute(
        "UPDATE jobs SET state='running',attempt=attempt+1,worker=?,lease=?,expires=?,started=?,error='',progress='Preparing' "
        "WHERE id=?",
        (worker, lease, now + LEASE, now, row["id"]),
    )
    info["busy"] = True
    c.execute("UPDATE workers SET info=? WHERE id=?", (pack(info), worker))
    return {
        "id": row["id"],
        "lease": lease,
        "payload": json.loads(row["payload"]),
        "attempt": row["attempt"] + 1,
    }


def active(c, jid, lease):
    row = c.execute("SELECT * FROM jobs WHERE id=?", (jid,)).fetchone()
    need(
        row is not None
        and row["state"] == "running"
        and row["expires"] > time.time()
        and secrets.compare_digest(lease or "", row["lease"] or ""),
        "Job lease is no longer active.",
        409,
    )
    return row


def finish(store, c, row, raw, receipt):
    finishing = time.monotonic()
    pid = row["project"]
    p = json.loads(row["payload"])
    refs = p["refs"]
    im, kind = read_image(raw)
    need(
        kind == "PNG" and im.size == tuple(p["size"]),
        "Worker returned an unexpected image size or format.",
    )
    if "style" in refs:
        # Palette role transfers the reference mean color while preserving local contrast.
        means = ImageStat.Stat(store.pixels(c, pid, refs["style"]).convert("RGB")).mean
        rgb = im.convert("RGB")
        own = ImageStat.Stat(rgb).mean
        channels = [
            ch.point(lambda x, shift=(target - cur) * 0.45: max(0, min(255, round(x + shift))))
            for ch, target, cur in zip(rgb.split(), means, own)
        ]
        im = Image.merge("RGB", channels).convert("RGBA")
    if p["operation"] == "mask":
        source = store.pixels(c, pid, refs["starting"])
        mask = store.pixels(c, pid, refs["mask"]).convert("L")
        im = Image.composite(im.resize(source.size, Image.Resampling.LANCZOS), source, mask)
    h = store.image(c, pid, png(im) if "style" in refs or p["operation"] == "mask" else raw)
    now = time.time()
    receipt = {
        **receipt,
        "queueSeconds": round(row["started"] - row["created"], 3),
        "coordinatorFinishSeconds": round(time.monotonic() - finishing, 3),
        "totalSeconds": round(now - row["created"], 3),
    }
    recipe = {**p, "receipt": receipt, "worker": row["worker"]}
    vid = store.version(c, pid, h, p["prompt"][:90], "generation", p.get("parent"), recipe)
    c.execute(
        "UPDATE jobs SET state='succeeded',finished=?,result=?,receipt=?,lease=NULL,expires=NULL,progress='Saved' WHERE id=?",
        (now, vid, pack(receipt), row["id"]),
    )
    return vid
