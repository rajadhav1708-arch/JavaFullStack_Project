"""Convert the raw product photography into web-ready WebP derivatives.

The source PNGs in `product images/` are ~7 MB each, which is roughly 122 MB
across the catalogue. Shipping those to a product grid would download ~7 MB per
tile, so this produces three responsive sizes per SKU instead.

Inputs are already metadata-free and fully opaque (RGBA with a flat alpha
channel), so flattening to RGB costs no transparency and saves roughly a third
of the output. The originals are left untouched as the source of truth.

Run: python scripts/optimise_product_images.py
"""

from __future__ import annotations

import os
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "product images"
OUTPUT_DIR = ROOT / "frontend" / "public" / "products"

# Longest edge in pixels for each derivative. 400 covers phones, 800 covers the
# product grid and landing tiles, 1600 covers the detail modal at 2x.
SIZES = (400, 800, 1600)
QUALITY = 80
METHOD = 6

# Gemini filenames carry no meaning, so every SKU needs an explicit slug. These
# must stay in sync with the `image` field of each PRODUCT_SEED entry.
IMAGE_SLUGS: dict[str, str] = {
    "Gemini_Generated_Image_8jsbeu8jsbeu8jsb.png": "nutricell-mineral-mixture-25kg",
    "Gemini_Generated_Image_9fxk049fxk049fxk.png": "pvc-bunker-liner-sheets",
    "Gemini_Generated_Image_9i6x9e9i6x9e9i6x.png": "zyme-plus-odour-control",
    "Gemini_Generated_Image_9mqw5u9mqw5u9mqw.png": "ss-cluster-milking-machine-4",
    "Gemini_Generated_Image_9skui99skui99sku.png": "poly-shovel-tool-kit",
    "Gemini_Generated_Image_e7q1oce7q1oce7q1.png": "ms-barn-scraping-spades",
    "Gemini_Generated_Image_eco4s8eco4s8eco4.png": "galvanized-field-wire-25kg",
    "Gemini_Generated_Image_epbiedepbiedepbi.png": "super-wonder-cattle-nutrition",
    "Gemini_Generated_Image_f06hd5f06hd5f06h.png": "povidone-iodine-10-1l",
    "Gemini_Generated_Image_fmr8z4fmr8z4fmr8.png": "super-advance-protein-supplement",
    "Gemini_Generated_Image_fozy9mfozy9mfozy.png": "pleated-air-filter-cartridge",
    "Gemini_Generated_Image_jugc1ajugc1ajugc.png": "spray-king-25l-sprayer",
    "Gemini_Generated_Image_jz67j6jz67j6jz67.png": "jaggery-energy-blocks",
    "Gemini_Generated_Image_oquzjzoquzjzoquz.png": "single-cow-milking-machine",
    "Gemini_Generated_Image_pemkvjpemkvjpemk.png": "calf-feeding-bottle-1l",
    "Gemini_Generated_Image_q06o0nq06o0nq06o.png": "upvc-pipe-fittings",
    "Gemini_Generated_Image_qhiu6vqhiu6vqhiu.png": "tractor-linkage-spares-kit",
    "Gemini_Generated_Image_t2ik22t2ik22t2ik.png": "cattle-dog-leads-assortment",
    "Gemini_Generated_Image_tthq9wtthq9wtthq.png": "milking-machine-pulsator",
}


def resize_longest_edge(image: Image.Image, longest_edge: int) -> Image.Image:
    """Scale so the longest side equals longest_edge, preserving aspect ratio.

    Never upscales: the two PVC-fitting shots are already smaller than 1600 on
    their long edge, and inflating them would add bytes without detail.
    """
    width, height = image.size
    current = max(width, height)
    if current <= longest_edge:
        return image
    scale = longest_edge / current
    return image.resize((round(width * scale), round(height * scale)), Image.LANCZOS)


def convert_one(source: Path, slug: str) -> int:
    written = 0
    total_bytes = 0

    # Re-opening per size would re-decode 19 times. Decode once, keep it in
    # memory, and derive every derivative from the same pixels.
    with Image.open(source) as raw:
        # flatten() composites against white, which matches how the opaque
        # alpha renders in the browser anyway.
        base = raw.convert("RGBA")
        rgb = Image.new("RGB", base.size, (255, 255, 255))
        rgb.paste(base, mask=base.getchannel("A"))

        for size in SIZES:
            derivative = resize_longest_edge(rgb, size)
            out_path = OUTPUT_DIR / f"{slug}-{size}.webp"
            # Passing no exif/icc strips anything that survived the source.
            derivative.save(out_path, "WEBP", quality=QUALITY, method=METHOD)
            written += 1
            total_bytes += out_path.stat().st_size

    print(f"  {slug:<36} {written} files  {total_bytes / 1024:7.0f} KB")
    return written


def main() -> None:
    if not SOURCE_DIR.is_dir():
        raise SystemExit(f"Source directory not found: {SOURCE_DIR}")

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    missing = [name for name in IMAGE_SLUGS if not (SOURCE_DIR / name).is_file()]
    if missing:
        raise SystemExit("Missing source images:\n  " + "\n  ".join(missing))

    print(f"Converting {len(IMAGE_SLUGS)} source images to WebP...")

    source_total = sum(
        (SOURCE_DIR / name).stat().st_size for name in IMAGE_SLUGS
    )
    written = 0
    output_total = 0
    for name, slug in IMAGE_SLUGS.items():
        written += convert_one(SOURCE_DIR / name, slug)
        output_total += sum(
            (OUTPUT_DIR / f"{slug}-{size}.webp").stat().st_size for size in SIZES
        )

    print(
        f"\n{written} files written to {OUTPUT_DIR.relative_to(ROOT)}"
        f"\n{source_total / 1024 / 1024:.1f} MB of PNG -> "
        f"{output_total / 1024 / 1024:.1f} MB of WebP "
        f"({100 - output_total * 100 // source_total}% smaller)")


if __name__ == "__main__":
    main()