import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Original four-region artwork; development encoder only, never a runtime dependency.
const version = execFileSync("magick", ["-version"], { encoding: "utf8" }).split("\n")[0];
assert.equal(version, "Version: ImageMagick 7.1.2-31 Q16-HDRI x86_64 8309dc92a:20260903 https://imagemagick.org");
const width = 32,
  height = 24;
const header = Buffer.from(`P6\n${width} ${height}\n255\n`);
const pixels = Buffer.alloc(width * height * 3);
const colors = [
  [230, 30, 20],
  [20, 210, 40],
  [30, 40, 220],
  [240, 220, 30],
];
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const color = colors[(y >= height / 2 ? 2 : 0) + (x >= width / 2 ? 1 : 0)] ?? [];
    pixels.set(color, (y * width + x) * 3);
  }
}
const hashes: Record<string, string> = {};
for (const sampling of ["1x1", "2x1", "2x2", "gray"]) {
  const filename = sampling === "gray" ? "gray.jpg" : `color-${sampling}.jpg`;
  const path = fileURLToPath(new URL(filename, import.meta.url));
  const mode =
    sampling === "gray" ? ["-colorspace", "Gray", "-sampling-factor", "1x1"] : ["-sampling-factor", sampling];
  execFileSync(
    "magick",
    ["ppm:-", "-strip", ...mode, "-interlace", "none", "-quality", "90", "-define", "jpeg:optimize-coding=false", path],
    { input: Buffer.concat([header, pixels]) },
  );
  hashes[filename] = createHash("sha256").update(readFileSync(path)).digest("hex");
}
writeFileSync(new URL("hashes.json", import.meta.url), `${JSON.stringify({ encoder: version, hashes }, null, 2)}\n`);
