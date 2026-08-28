#!/usr/bin/env python3
"""Generate Play/home-screen launcher icons from the canonical on&on+ artwork."""
from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path("/workspace/mobile")
SRC = Path("/home/ubuntu/.cursor/projects/workspace/assets/6f654ba8-3d20-471e-a4bc-504cae1561c4.png")
ASSETS = ROOT / "assets"
LAUNCHER = ASSETS / "launcher"
ANDROID_RES = ROOT / "android" / "app" / "src" / "main" / "res"
BLUE = (30, 111, 234, 255)

MIPMAPS = {
    "mdpi": (48, 108),
    "hdpi": (72, 162),
    "xhdpi": (96, 216),
    "xxhdpi": (144, 324),
    "xxxhdpi": (192, 432),
}


def cover(im: Image.Image, size: int) -> Image.Image:
    return im.resize((size, size), Image.Resampling.LANCZOS)


def inset_on_blue(im: Image.Image, size: int, scale: float = 0.72) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), BLUE)
    inner = max(1, int(size * scale))
    art = im.resize((inner, inner), Image.Resampling.LANCZOS).convert("RGBA")
    x = (size - inner) // 2
    canvas.paste(art, (x, x), art)
    return canvas


def circle_mask(im: Image.Image) -> Image.Image:
    size = im.size[0]
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(im, (0, 0), mask)
    return out


def save_png(im: Image.Image, path: Path, mode: str = "RGBA") -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    converted = im.convert(mode)
    converted.save(path, "PNG", optimize=True)


def copy_dir_pngs(src_dir: Path, dest_dir: Path) -> None:
    if not dest_dir.exists():
        return
    for name in os.listdir(src_dir):
        if name.endswith(".png") or name.endswith(".xml"):
            data = (src_dir / name).read_bytes()
            (dest_dir / name).write_bytes(data)


def main() -> None:
    src = Image.open(SRC).convert("RGBA")
    icon_1024 = cover(src, 1024)
    adaptive_1024 = inset_on_blue(src, 1024, 0.78)
    favicon = cover(src, 192)

    save_png(icon_1024, ASSETS / "icon.png")
    save_png(adaptive_1024, ASSETS / "adaptive-icon.png")
    save_png(favicon, ASSETS / "favicon.png")

    xml = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/iconBackground"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
"""
    anydpi = LAUNCHER / "mipmap-anydpi-v26"
    anydpi.mkdir(parents=True, exist_ok=True)
    (anydpi / "ic_launcher.xml").write_text(xml)
    (anydpi / "ic_launcher_round.xml").write_text(xml)

    for density, (legacy, foreground) in MIPMAPS.items():
        folder = LAUNCHER / f"mipmap-{density}"
        full = cover(src, legacy)
        save_png(full, folder / "ic_launcher.png")
        save_png(circle_mask(full), folder / "ic_launcher_round.png")
        save_png(inset_on_blue(src, foreground, 0.72), folder / "ic_launcher_foreground.png")

    if ANDROID_RES.exists():
        for density in list(MIPMAPS) + ["anydpi-v26"]:
            src_dir = LAUNCHER / f"mipmap-{density}"
            dest_dir = ANDROID_RES / f"mipmap-{density}"
            copy_dir_pngs(src_dir, dest_dir)

    print("generated", ASSETS / "icon.png", (ASSETS / "icon.png").stat().st_size)


if __name__ == "__main__":
    main()
