"""Optional independent check of reported glyph-bound samples, not a CI dependency."""

import argparse
import hashlib
import json
import math
from pathlib import Path

import fontTools
from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont


def checked_font(cache, digest):
    if len(digest) != 64 or any(c not in "0123456789abcdef" for c in digest):
        raise ValueError("Invalid font digest")
    path = cache / "sha256" / digest
    with path.open("rb") as stream:
        data = stream.read(4 * 1024 * 1024 + 1)
    if len(data) > 4 * 1024 * 1024 or hashlib.sha256(data).hexdigest() != digest:
        raise ValueError("Font cache integrity mismatch")
    # Parse the verified snapshot, not a second path read that could race a writer.
    from io import BytesIO

    return TTFont(BytesIO(data))


def check_samples(item, cache):
    results = []
    with checked_font(cache, item["sha256"]) as font:
        glyphs = font.getGlyphSet()
        for difference in item.get("glyphDifferences", []):
            actual, reference = difference["actual"], difference["reference"]
            if not actual or not reference or actual["glyphId"] != reference["glyphId"]:
                continue
            pen = BoundsPen(glyphs)
            glyphs[font.getGlyphName(actual["glyphId"])].draw(pen)
            bounds = pen.bounds or (0, 0, 0, 0)
            rounded = [math.floor(bounds[0]), math.floor(bounds[1]),
                       math.ceil(bounds[2]), math.ceil(bounds[3])]
            results.append({"id": item["id"], "codePoint": difference["codePoint"],
                            "fonttools": rounded, "unrounded": bounds,
                            "fontkite": actual["bounds"], "fontkit": reference["bounds"],
                            "matchesFontkite": rounded == actual["bounds"],
                            "matchesFontkit": rounded == reference["bounds"]})
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", required=True, type=Path)
    parser.add_argument("--cache", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    report = json.loads(args.report.read_text())
    samples = []
    for item in report["results"]:
        if item["status"] == "mismatch":
            samples.extend(check_samples(item, args.cache))
    result = {"fonttoolsVersion": fontTools.__version__,
              "manifestSha256": report["manifestSha256"], "samples": samples}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({"samples": len(samples),
                      "matchesFontkite": sum(row["matchesFontkite"] for row in samples),
                      "matchesFontkit": sum(row["matchesFontkit"] for row in samples)}))


if __name__ == "__main__":
    main()
