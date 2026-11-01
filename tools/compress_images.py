"""Write web-sized WebP copies of the source art into public/; the originals in images/ stay untouched.
Usage: python3 tools/compress_images.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
JOBS = [
    (ROOT / "images" / "card_portraits", ROOT / "public" / "portraits", 512),
    (ROOT / "images", ROOT / "public", 1024),
]

for src_dir, dst_dir, size in JOBS:
    dst_dir.mkdir(parents=True, exist_ok=True)
    for src in sorted(src_dir.glob("*.png")):
        if src.stem in ("concept", "interface"):
            continue
        img = Image.open(src).convert("RGB")
        img.thumbnail((size, size), Image.LANCZOS)
        dst = dst_dir / f"{src.stem}.webp"
        img.save(dst, "WEBP", quality=82, method=6)
        print(f"{src.relative_to(ROOT)} -> {dst.relative_to(ROOT)} ({dst.stat().st_size // 1024} KB)")
