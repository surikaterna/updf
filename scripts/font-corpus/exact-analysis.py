"""Trace every captured discrepancy to rational extrema and extracted paths."""

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


oracle = sibling("fonttools-oracle")
exact = sibling("exact-quadratic-pen")


def analyze(item, cache):
    if item["glyphDifferenceCount"] != len(item["glyphDifferences"]):
        raise ValueError("Truncated discrepancy inventory; cannot claim all cases")
    results = []
    with oracle.checked_font(cache, item["sha256"]) as font:
        glyphs = font.getGlyphSet()
        for difference in item["glyphDifferences"]:
            actual, reference = difference["actual"], difference["reference"]
            if not actual or not reference or actual["glyphId"] != reference["glyphId"]:
                raise ValueError("Mapping discrepancy requires separate investigation")
            if actual["advance"] != reference["advance"]:
                raise ValueError("Advance discrepancy requires separate investigation")
            pen = exact.ExactQuadraticPen(glyphs)
            glyphs[font.getGlyphName(actual["glyphId"])].draw(pen)
            results.append({"id": item["id"], "sha256": item["sha256"],
                            "codePoint": difference["codePoint"], "glyphId": actual["glyphId"],
                            "fontkite": actual["bounds"], "fontkit": reference["bounds"],
                            "exactRounded": pen.rounded(), "extrema": pen.extrema(),
                            "witnesses": pen.witnesses(),
                            "commands": pen.commands})
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", required=True, type=Path)
    parser.add_argument("--cache", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    report = json.loads(args.report.read_text())
    rows = []
    for item in report["results"]:
        if item["status"] == "mismatch":
            rows.extend(analyze(item, args.cache))
    result = {"fonttoolsVersion": fontTools.__version__,
              "manifestSha256": report["manifestSha256"], "rows": rows}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, default=str) + "\n")
    for row in rows:
        print(json.dumps({key: row[key] for key in ("id", "codePoint", "exactRounded", "extrema")}, default=str))


if __name__ == "__main__":
    main()
