"""Checked project layouts and CPU proofs. Boxes are fractions of each artboard."""

import base64
import math
import re
from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

from store import dimensions, need, string, uid

FORMATS = {"feed": (1080, 1350), "story": (1080, 1920), "lobby": (1920, 1080)}
FONT = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
FIELD = re.compile(r"^[a-zA-Z][a-zA-Z0-9_]{0,39}$")
TOKEN = re.compile(r"\{\{([A-Za-z][A-Za-z0-9_]{0,39})\}\}")


def stage(name="Main"):
    return {"id": uid(), "name": name, "layers": [], "formats": {}}


def layer(label, box, text="", binding="", kind="info"):
    return {
        "id": uid(),
        "label": label,
        "box": box,
        "text": text,
        "binding": binding,
        "template": "",
        "kind": kind,
        "original": text,
        "art": None,
        "logo": None,
        "locked": False,
    }


def blank(name, kind):
    board = stage()
    data = {
        "name": string(name, 100, True).strip(),
        "kind": kind,
        "archived": False,
        "canvas": [640, 800],
        "background": None,
        "selected": None,
        "fields": {},
        "logos": {},
        "stages": [board],
        "brief": "",
        "tags": [],
    }
    need(kind in ("image", "show"), "Choose Image or Show.")
    if kind == "show":
        data["fields"] = {
            "title": name,
            "headliner": "",
            "support": "",
            "doors": "",
            "venue": "",
            "starts": "",
            "ends": "",
            "timezone": "America/New_York",
            "age": "",
            "address": "",
            "walk": "",
            "tickets": "",
        }
        board["layers"] = [
            layer("Title", [0.07, 0.08, 0.86, 0.14], binding="title"),
            layer("Headliner", [0.07, 0.43, 0.86, 0.17], binding="headliner", kind="artist"),
            layer("Support", [0.07, 0.63, 0.86, 0.08], binding="support", kind="artist"),
            layer("Venue", [0.08, 0.78, 0.84, 0.055], binding="venue"),
            layer("Doors", [0.08, 0.84, 0.84, 0.05], binding="doors"),
            layer("Tickets", [0.08, 0.90, 0.84, 0.045], binding="tickets"),
        ]
    return data


def number(v, lo, hi):
    return type(v) in (int, float) and math.isfinite(v) and lo <= v <= hi


def box(v):
    need(
        isinstance(v, list)
        and len(v) == 4
        and all(number(n, 0, 1) for n in v)
        and v[2] > 0
        and v[3] > 0
        and v[0] + v[2] <= 1.000001
        and v[1] + v[3] <= 1.000001,
        "Keep the layer box inside the canvas.",
    )


def validate(store, c, pid, d):
    need(isinstance(d, dict) and d.get("kind") in ("image", "show"), "Invalid project.")
    string(d.get("name"), 100, True)
    string(d.get("brief", ""), 6000)
    dimensions(d.get("canvas"))
    tags = d.get("tags", [])
    need(isinstance(tags, list) and len(tags) <= 24, "Too many tags.")
    for tag in tags:
        string(tag, 60)
    fields = d.get("fields")
    need(isinstance(fields, dict) and len(fields) <= 128, "Invalid event fields.")
    for k, v in fields.items():
        need(FIELD.fullmatch(k), "Invalid event field name.")
        string(v, 1600 if k == "copy" else 800)
    if fields.get("starts") or fields.get("ends"):
        try:
            zone = ZoneInfo(fields.get("timezone") or "America/New_York")
            dates = []
            for key in ("starts", "ends"):
                if fields.get(key):
                    local = datetime.fromisoformat(fields[key])
                    need(
                        "T" in fields[key] and local.tzinfo is None,
                        "Enter local start and end dates with their times.",
                    )
                    dates.append(local.replace(tzinfo=zone))
            need(
                len(dates) < 2 or dates[1] > dates[0],
                "End must follow the start. Choose tomorrow for an overnight event.",
            )
        except (ValueError, ZoneInfoNotFoundError):
            need(False, "Enter a valid local date, time and IANA timezone.")
    logos = d.get("logos", {})
    need(isinstance(logos, dict) and all(k in fields for k in logos), "Invalid logo binding.")
    for h in [d.get("background"), *logos.values()]:
        if h:
            store.owned(c, pid, h)
    stages = d.get("stages")
    need(isinstance(stages, list) and 0 < len(stages) <= 32, "A project needs 1 to 32 stages.")
    ids = set()
    for s in stages:
        need(isinstance(s, dict), "Invalid stage.")
        sid = string(s.get("id"), 64, True)
        need(sid not in ids, "Duplicate stage.")
        ids.add(sid)
        string(s.get("name"), 100, True)
        if "importFile" in s:
            receipt = s["importFile"]
            need(isinstance(receipt, dict), "Invalid imported file.")
            string(receipt.get("name"), 180, True)
            asset = store.owned(c, pid, receipt.get("hash"), image=False)
            need(asset["mime"] == "application/json", "Imported file must be JSON.")
        if s.get("background"):
            store.owned(c, pid, s["background"])
        ls = s.get("layers")
        need(isinstance(ls, list) and len(ls) <= 48, "A stage supports 48 layers.")
        lids = set()
        for l in ls:
            need(isinstance(l, dict) and l.get("kind") in ("artist", "info"), "Invalid layer.")
            lid = string(l.get("id"), 64, True)
            need(lid not in lids, "Duplicate layer.")
            lids.add(lid)
            string(l.get("label"), 200, True)
            for k in ("text", "original", "template"):
                string(l.get(k, ""), 800)
            binding = l.get("binding", "")
            need(not binding or binding in fields, "Unknown event binding.")
            need(
                all(k in fields for k in TOKEN.findall(l.get("template", ""))),
                "Unknown field in template.",
            )
            box(l.get("box"))
            for k in ("logo", "art"):
                if l.get(k):
                    store.owned(c, pid, l[k])
        fm = s.get("formats", {})
        need(
            isinstance(fm, dict) and set(fm) <= {"source", "feed", "story", "lobby", "custom"},
            "Invalid formats.",
        )
        for override in fm.values():
            need(isinstance(override, dict), "Invalid format override.")
            need(
                override.get("fit", "fit") in ("fit", "fill"), "Choose Fit original or Fill frame."
            )
            anchor = override.get("anchor", [0.5, 0.5])
            need(
                isinstance(anchor, list)
                and len(anchor) == 2
                and all(number(x, 0, 1) for x in anchor),
                "Invalid crop anchor.",
            )
            boxes = override.get("boxes", {})
            need(isinstance(boxes, dict) and set(boxes) <= lids, "Invalid format layer.")
            for v in boxes.values():
                box(v)
    return d


def text_of(l, d):
    if l.get("template"):
        return TOKEN.sub(lambda m: d["fields"].get(m[1], ""), l["template"])
    return d["fields"].get(l.get("binding"), l["text"])


def mark_of(l, d):
    return l.get("logo") or d.get("logos", {}).get(l.get("binding"))


def image_of(l, d):
    return mark_of(l, d) or (l.get("art") if text_of(l, d) == l.get("original") else None)


@lru_cache(maxsize=150)
def font(px):
    return ImageFont.truetype(str(FONT), px)


def fit_text(draw, name, text, w, h):
    hi = max(9, min(190, round(h * 0.72)))
    lo = min(hi, max(8, round(min(h * 0.36, 18))))
    for px in range(hi, lo - 1, -1):
        f = font(px)
        lines = []
        for paragraph in text.splitlines():
            line = ""
            for word in paragraph.split():
                candidate = (line + " " + word).strip()
                if line and draw.textlength(candidate, font=f) > w:
                    lines.append(line)
                    line = ""
                for ch in (" " if line else "") + word:
                    if line and draw.textlength(line + ch, font=f) > w:
                        lines.append(line)
                        line = ""
                    line += ch
            lines.append(line)
        leading = max(1, round(px * 0.12))
        value = "\n".join(lines)
        x0, y0, x1, y1 = draw.multiline_textbbox(
            (0, 0), value, font=f, spacing=leading, align="center", stroke_width=1
        )
        if x1 - x0 <= w and y1 - y0 <= h:
            return value, f, leading, (x0, y0, x1, y1)
    need(False, f"Text in {name} needs a larger box or shorter wording.", 422)


def render(store, c, pid, d, sid, fmt, custom=None, bg=None, guides=False):
    s = next((s for s in d["stages"] if s["id"] == sid), None)
    need(s is not None, "Choose a campaign stage.")
    need(fmt in {*FORMATS, "source", "custom"}, "Choose a supported format.")
    size = dimensions(custom if fmt == "custom" else FORMATS.get(fmt, d["canvas"]))
    opt = s.get("formats", {}).get(fmt, {})
    background = bg or s.get("background") or d.get("background")
    anchor = tuple(opt.get("anchor", [0.5, 0.5]))
    art = (
        store.pixels(c, pid, background)
        if background
        else Image.new("RGBA", tuple(d["canvas"]), "#171823")
    )
    plate_size = size
    offset = (0, 0)
    if fmt != "source" and opt.get("fit", "fit") == "fit":
        base = ImageOps.fit(
            art, tuple(d["canvas"]), method=Image.Resampling.LANCZOS, centering=anchor
        )
        plate = ImageOps.contain(base, size, Image.Resampling.LANCZOS)
        plate_size = plate.size
        offset = tuple(round((size[i] - plate_size[i]) * anchor[i]) for i in (0, 1))
        soft = ImageOps.fit(
            art, (max(1, size[0] // 8), max(1, size[1] // 8)), centering=anchor
        ).filter(ImageFilter.GaussianBlur(8))
        canvas = ImageEnhance.Brightness(soft.resize(size)).enhance(0.55)
        canvas.alpha_composite(plate, offset)
    else:
        canvas = ImageOps.fit(art, size, method=Image.Resampling.LANCZOS, centering=anchor)
    draw = ImageDraw.Draw(canvas)
    for l in s["layers"]:
        overridden = l["id"] in opt.get("boxes", {})
        b = opt.get("boxes", {}).get(l["id"], l["box"])
        frame = size if overridden else plate_size
        x, y, w, h = (round(v * frame[i % 2]) for i, v in enumerate(b))
        if not overridden:
            x += offset[0]
            y += offset[1]
        w, h = max(w, 1), max(h, 1)
        art = image_of(l, d)
        if art:
            im = ImageOps.contain(store.pixels(c, pid, art), (w, h), Image.Resampling.LANCZOS)
            canvas.alpha_composite(im, (x + (w - im.width) // 2, y + (h - im.height) // 2))
        elif t := text_of(l, d).strip():
            text, f, sp, (x0, y0, x1, y1) = fit_text(draw, l["label"], t, w, h)
            draw.multiline_text(
                (x + (w - x1 + x0) / 2 - x0, y + (h - y1 + y0) / 2 - y0),
                text,
                font=f,
                align="center",
                spacing=sp,
                fill="#f8faff",
                stroke_width=1,
                stroke_fill="#161322",
            )
    if guides and fmt in ("feed", "story"):
        dx, dy = (72, 250) if fmt == "story" else (round(size[0] * 0.06), round(size[1] * 0.06))
        draw.rectangle(
            (dx, dy, size[0] - dx - 1, size[1] - dy - 1),
            outline="#82e5bc",
            width=max(2, size[0] // 280),
        )
    return canvas


def decode_url(value):
    need(
        isinstance(value, str)
        and value.startswith(
            ("data:image/png;base64,", "data:image/jpeg;base64,", "data:image/webp;base64,")
        ),
        "Expected an embedded image.",
    )
    try:
        return base64.b64decode(value.split(",", 1)[1], validate=True)
    except ValueError:
        need(False, "Invalid embedded image.")


def legacy_import(store, c, pid, obj, filename):
    need(
        isinstance(obj, dict)
        and obj.get("format") == "nnc-layout-1"
        and isinstance(obj.get("layers"), list)
        and len(obj["layers"]) == 11,
        "Choose an eleven-layer .flyer.json file.",
    )
    name = (
        obj.get("eventName")
        or re.sub(r"(?:\.flyer)?\.json$", "", Path(filename).name, flags=re.I)
        or "Envision"
    )
    d = blank(name, "show")
    d["canvas"] = [615, 768]
    bg = store.image(c, pid, decode_url(obj.get("background")))
    m = store.owned(c, pid, bg)
    need((m["width"], m["height"]) == (615, 768), "Legacy background must be 615 × 768.")
    d["background"] = bg
    d["selected"] = store.version(c, pid, bg, "Imported background", "background")
    s = d["stages"][0]
    s["layers"] = []
    for i, l in enumerate(obj["layers"]):
        need(isinstance(l, dict) and l.get("kind") in ("artist", "info"), "Invalid legacy layer.")
        b = l.get("box")
        need(
            isinstance(b, list) and len(b) == 4 and all(number(n, 0, 768) for n in b),
            "Invalid legacy box.",
        )
        key = f"slot{i + 1}"
        new = layer(
            string(l.get("label"), 200, True),
            [v / d["canvas"][j % 2] for j, v in enumerate(b)],
            string(l.get("text"), 200),
            key,
            l["kind"],
        )
        new["original"] = string(l.get("original"), 200)
        new["art"] = store.image(c, pid, decode_url(l.get("art")))
        if l.get("logo"):
            d["logos"][key] = store.image(c, pid, decode_url(l["logo"]))
        d["fields"][key] = new["text"]
        s["layers"].append(new)
    return validate(store, c, pid, d)


def legacy_export(store, c, pid, d, s):
    background = s.get("background") or d.get("background")
    need(
        d["canvas"] == [615, 768] and background and len(s["layers"]) == 11,
        "Use the native package for this canvas or layer count.",
        422,
    )
    bg = store.owned(c, pid, background)
    need(
        (bg["width"], bg["height"]) == (615, 768),
        "Use the native package for this background size.",
        422,
    )

    def url(h):
        mime = store.owned(c, pid, h)["mime"]
        return (
            "data:" + mime + ";base64," + base64.b64encode((store.media / h).read_bytes()).decode()
        )

    ls = []
    for l in s["layers"]:
        t = text_of(l, d)
        need(
            l.get("art") and max(len(t), len(l["original"]), len(l["label"])) <= 200,
            "This layout needs the native editable package.",
            422,
        )
        v = {
            "kind": l["kind"],
            "label": l["label"],
            "text": t,
            "original": l["original"],
            "art": url(l["art"]),
            "box": [round(n * d["canvas"][i % 2], 5) for i, n in enumerate(l["box"])],
        }
        if logo := mark_of(l, d):
            v["logo"] = url(logo)
        ls.append(v)
    return {
        "format": "nnc-layout-1",
        "eventName": d["name"],
        "background": url(background),
        "layers": ls,
    }
