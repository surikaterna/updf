"""Generate an offline, independent per-GID bounds oracle for the selected static fonts."""

import argparse
import importlib.util
import json
from pathlib import Path

import fontTools


def sibling(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(name + ".py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


reader = sibling("fonttools-oracle")
exact = sibling("exact-quadratic-pen")


def font_bounds(item, cache):
    bounds = []
    with reader.checked_font(cache, item["sha256"]) as font:
        if "glyf" not in font or "fvar" in font:
            raise ValueError("Oracle requires a static quadratic TrueType font")
        glyphs = font.getGlyphSet()
        for name in font.getGlyphOrder():
            pen = exact.ExactQuadraticPen(glyphs, half_only=False)
            glyphs[name].draw(pen)
            bounds.append(pen.rounded())
        return {"id": item["id"], "sha256": item["sha256"],
                "unitsPerEm": font["head"].unitsPerEm,
                "glyphCount": len(bounds), "bounds": bounds}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", required=True, type=Path)
    parser.add_argument("--cache", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    if fontTools.__version__ != "4.60.1":
        raise ValueError("Use pinned FontTools 4.60.1 for this oracle format")
    report = json.loads(args.report.read_text())
    fonts = []
    for item in report["results"]:
        if item["expected"]["kind"] == "supported":
            result = font_bounds(item, args.cache)
            fonts.append(result)
            print(f"{item['id']}: {result['glyphCount']} glyph bounds")
    result = {"version": 1, "algorithm": "fonttools-fraction-quad-v1",
              "coordinateModel": "materialized-binary64", "fonttoolsVersion": fontTools.__version__,
              "manifestSha256": report["manifestSha256"], "fonts": fonts}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, separators=(",", ":")) + "\n")


if __name__ == "__main__":
    main()
