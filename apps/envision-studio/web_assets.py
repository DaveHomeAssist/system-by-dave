"""Fixed-size downloads for website artwork."""

import io

from PIL import Image, ImageOps

from store import need


FORMATS = {
    "square": dict(label="Square thumbnail", width=480, height=480, extension="webp", mime="image/webp"),
    "card": dict(label="Wide card", width=640, height=360, extension="webp", mime="image/webp"),
    "share": dict(label="Link preview", width=1200, height=630, extension="jpg", mime="image/jpeg"),
}
ANCHORS = {"center": (0.5, 0.5), "top": (0.5, 0), "bottom": (0.5, 1), "left": (0, 0.5), "right": (1, 0.5)}


def web_options(format_id, framing):
    need(format_id in FORMATS, "Choose a listed web format.")
    need(framing == "contain" or framing in ANCHORS, "Choose a listed framing option.")
    return FORMATS[format_id]


def encode_artwork(source, profile, framing):
    size = (profile["width"], profile["height"])
    if framing == "contain":
        image = ImageOps.pad(source, size, method=Image.Resampling.LANCZOS, color=(0, 0, 0, 0))
    else:
        image = ImageOps.fit(source, size, method=Image.Resampling.LANCZOS, centering=ANCHORS[framing])
    image.info.clear()
    out = io.BytesIO()
    if profile["mime"] == "image/jpeg":
        matte = Image.new("RGB", size, "white")
        matte.paste(image, mask=image.getchannel("A"))
        matte.save(out, "JPEG", quality=88, optimize=True)
    else:
        image.save(out, "WEBP", quality=82, method=4)
    return out.getvalue()
