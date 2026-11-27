"""Single-owner studio catalog. One connection per transaction, immutable media."""

import hashlib
import io
import json
import os
import shutil
import sqlite3
import tempfile
import time
import uuid
from contextlib import closing, contextmanager
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError

SIDE = 4096
PIXELS = 16_777_216
MAX_UPLOAD = 40 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = PIXELS
MIMES = {"PNG": "image/png", "JPEG": "image/jpeg", "WEBP": "image/webp"}


class Fault(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def uid():
    return uuid.uuid4().hex


def pack(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False)


def need(condition, message, status=400):
    if not condition:
        raise Fault(message, status)


def string(value, limit=200, required=False):
    need(isinstance(value, str) and len(value) <= limit, "Text exceeds its supported length.")
    need(not required or value.strip(), "Enter a value before saving.")
    return value


def dimensions(size):
    need(
        isinstance(size, (list, tuple))
        and len(size) == 2
        and all(type(n) is int and 0 < n <= SIDE for n in size)
        and size[0] * size[1] <= PIXELS,
        "Image or canvas exceeds supported dimensions.",
    )
    return tuple(size)


def read_image(raw):
    need(0 < len(raw) <= MAX_UPLOAD, "Image is empty or exceeds 40 MiB.")
    try:
        with Image.open(io.BytesIO(raw)) as im:
            need(
                im.format in MIMES and getattr(im, "n_frames", 1) == 1,
                "Use a single-frame PNG, JPEG, or WebP image.",
            )
            dimensions(im.size)
            kind = im.format
            img = ImageOps.exif_transpose(im).convert("RGBA")
            return img, kind
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
        raise Fault("Image could not be decoded safely.") from exc


def png(img):
    out = io.BytesIO()
    img.save(out, format="PNG")
    return out.getvalue()


class Catalog:
    def __init__(self, root):
        self.root = Path(root)
        self.media = self.root / "media"
        self.media.mkdir(parents=True, exist_ok=True)
        self.db = self.root / "studio.sqlite"
        self.disk_floor = int(os.environ.get("ENVISION_FREE_BYTES", 512 * 1024 * 1024))
        with closing(self.connect()) as c:
            c.execute("PRAGMA journal_mode=WAL")
            c.executescript("""
                CREATE TABLE IF NOT EXISTS projects(
                  id TEXT PRIMARY KEY, revision INTEGER NOT NULL, data TEXT NOT NULL,
                  updated REAL NOT NULL);
                CREATE TABLE IF NOT EXISTS revisions(
                  project TEXT NOT NULL, revision INTEGER NOT NULL, data TEXT NOT NULL,
                  PRIMARY KEY(project,revision));
                CREATE TABLE IF NOT EXISTS media(
                  hash TEXT PRIMARY KEY, mime TEXT NOT NULL, width INTEGER, height INTEGER);
                CREATE TABLE IF NOT EXISTS links(project TEXT, hash TEXT, PRIMARY KEY(project,hash));
                CREATE TABLE IF NOT EXISTS versions(
                  id TEXT PRIMARY KEY, project TEXT NOT NULL, hash TEXT NOT NULL,
                  label TEXT NOT NULL, role TEXT NOT NULL, parent TEXT, recipe TEXT NOT NULL,
                  favorite INTEGER DEFAULT 0, created REAL NOT NULL);
                CREATE TABLE IF NOT EXISTS batches(project TEXT,key TEXT,digest TEXT,jobs TEXT,
                  PRIMARY KEY(project,key));
                CREATE TABLE IF NOT EXISTS jobs(
                  id TEXT PRIMARY KEY, project TEXT, payload TEXT, state TEXT, attempt INTEGER DEFAULT 0,
                  worker TEXT, lease TEXT, expires REAL, created REAL, started REAL, finished REAL,
                  progress TEXT DEFAULT '', error TEXT DEFAULT '', result TEXT, receipt TEXT);
                CREATE INDEX IF NOT EXISTS queue ON jobs(state,created);
                CREATE INDEX IF NOT EXISTS version_card_art ON versions(project,created DESC,id DESC)
                  WHERE role IN ('generation','finish');
                CREATE TABLE IF NOT EXISTS workers(id TEXT PRIMARY KEY, seen REAL, info TEXT);
                CREATE TABLE IF NOT EXISTS worker_controls(id TEXT PRIMARY KEY, paused INTEGER NOT NULL);
                CREATE TABLE IF NOT EXISTS exports(
                  id TEXT PRIMARY KEY, project TEXT, revision INTEGER, options TEXT, state TEXT,
                  files TEXT DEFAULT '[]', error TEXT DEFAULT '', created REAL);
                CREATE TABLE IF NOT EXISTS presets(
                  id TEXT PRIMARY KEY, name TEXT, project TEXT, data TEXT, created REAL);
            """)

    def connect(self):
        c = sqlite3.connect(self.db, timeout=12, isolation_level=None)
        c.row_factory = sqlite3.Row
        return c

    @contextmanager
    def tx(self, write=False):
        c = self.connect()
        try:
            c.execute("BEGIN IMMEDIATE" if write else "BEGIN")
            yield c
            c.commit()
        except BaseException:
            c.rollback()
            raise
        finally:
            c.close()

    def room(self, size):
        need(
            shutil.disk_usage(self.root).free >= size + self.disk_floor,
            "Studio storage is low. Free space or restore the media volume.",
            507,
        )

    def blob(self, c, pid, raw, mime, size=(None, None)):
        h = hashlib.sha256(raw).hexdigest()
        dest = self.media / h
        if not dest.exists():
            self.room(len(raw))
            with tempfile.NamedTemporaryFile(dir=self.media, delete=False) as tmp:
                name = tmp.name
                try:
                    tmp.write(raw)
                    tmp.flush()
                    os.fsync(tmp.fileno())
                except BaseException:
                    os.unlink(name)
                    raise
            try:
                os.replace(name, dest)
            finally:
                Path(name).unlink(missing_ok=True)
        c.execute("INSERT OR IGNORE INTO media VALUES(?,?,?,?)", (h, mime, *size))
        c.execute("INSERT OR IGNORE INTO links VALUES(?,?)", (pid, h))
        return h

    def image(self, c, pid, raw):
        im, kind = read_image(raw)
        return self.blob(c, pid, raw, MIMES[kind], im.size)

    def owned(self, c, pid, h, image=True):
        row = c.execute(
            "SELECT m.* FROM media m JOIN links l ON m.hash=l.hash WHERE l.project=? AND m.hash=?",
            (pid, h),
        ).fetchone()
        need(
            row is not None and (not image or row["mime"] in MIMES.values()),
            "Media unavailable for this project.",
            404,
        )
        return row

    def pixels(self, c, pid, h):
        self.owned(c, pid, h)
        return read_image((self.media / h).read_bytes())[0]

    def version(self, c, pid, h, label, role, parent=None, recipe=None):
        vid = uid()
        c.execute(
            "INSERT INTO versions(id,project,hash,label,role,parent,recipe,created) "
            "VALUES(?,?,?,?,?,?,?,?)",
            (vid, pid, h, label, role, parent, pack(recipe or {}), time.time()),
        )
        return vid

    def project(self, c, pid, revision=None):
        if revision is None:
            row = c.execute("SELECT revision,data FROM projects WHERE id=?", (pid,)).fetchone()
        else:
            row = c.execute(
                "SELECT revision,data FROM revisions WHERE project=? AND revision=?",
                (pid, revision),
            ).fetchone()
        need(row is not None, "Project or revision unavailable.", 404)
        return {"id": pid, "revision": row["revision"], "data": json.loads(row["data"])}

    def save(self, c, pid, data, base):
        old = c.execute("SELECT revision FROM projects WHERE id=?", (pid,)).fetchone()
        need(
            base == (old["revision"] if old else 0),
            "This project changed on another device. Reopen its latest revision.",
            409,
        )
        rev = base + 1
        encoded = pack(data)
        c.execute(
            "INSERT INTO projects VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET "
            "revision=excluded.revision,data=excluded.data,updated=excluded.updated",
            (pid, rev, encoded, time.time()),
        )
        c.execute("INSERT INTO revisions VALUES(?,?,?)", (pid, rev, encoded))
        return {"id": pid, "revision": rev, "data": data}
