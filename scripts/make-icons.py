"""Build every app icon and web logo from doc/Bieltructor_logo.jpeg.

Usage: python3 scripts/make-icons.py   (requires Pillow and macOS iconutil)
"""

import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

root = Path(__file__).resolve().parent.parent
source = Image.open(root / "doc/Bieltructor_logo.jpeg").convert("RGB")
w, h = source.size

# The artwork sits on white rounded corners. Flood fill them from each corner
# with a marker colour, so the whole artwork (title included) is kept.
MARK = (255, 0, 255)
probe = source.copy()
for xy in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
    ImageDraw.floodfill(probe, xy, MARK, thresh=60)
r, g, b = probe.split()
corners = ImageChops.multiply(
    ImageChops.multiply(r.point(lambda v: 255 * (v == 255)), g.point(lambda v: 255 * (v == 0))),
    b.point(lambda v: 255 * (v == 255)),
).filter(ImageFilter.MaxFilter(5))

# Transparent corners for macOS, the web logo and the favicon.
cutout = source.convert("RGBA")
cutout.putalpha(ImageChops.invert(corners).filter(ImageFilter.GaussianBlur(1.5)))

# iOS needs an opaque full-bleed square: paint the corners with blurred artwork.
square = source.copy()
square.paste(source.filter(ImageFilter.GaussianBlur(60)), (0, 0), corners)


def sized(image, size):
    return image.resize((size, size), Image.LANCZOS)


sized(square, 1024).save(root / "ios/Assets.xcassets/AppIcon.appiconset/AppIcon.png")

# macOS: artwork on the standard 824 px grid with a soft shadow.
canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
shadow = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
ImageDraw.Draw(shadow).rounded_rectangle((104, 116, 920, 932), 150, fill=(0, 0, 0, 110))
canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(14)))
canvas.alpha_composite(sized(cutout, 824), (100, 100))
with tempfile.TemporaryDirectory() as tmp:
    iconset = Path(tmp) / "AppIcon.iconset"
    iconset.mkdir()
    for size in (16, 32, 128, 256, 512):
        for scale in (1, 2):
            name = f"icon_{size}x{size}{'@2x' if scale == 2 else ''}.png"
            sized(canvas, size * scale).save(iconset / name)
    subprocess.run(
        ["iconutil", "-c", "icns", str(iconset), "-o", str(root / "macos/AppIcon.icns")], check=True
    )

# Web: logo for the splash screen and menu, plus the favicon.
sized(cutout, 512).save(root / "public/logo.webp", quality=88)
sized(cutout, 64).save(root / "public/favicon.png", optimize=True)
print("Icons written.")
