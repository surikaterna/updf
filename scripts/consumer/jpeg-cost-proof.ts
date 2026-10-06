import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const output = resolve("artifacts/jpeg-resources");
const source = new Uint8Array(await readFile("tests/fixtures/jpeg/color-1x1.jpg"));
const fontInput = {
  ...JSON.parse(await readFile("tests/fixtures/fonts/liberation-sans.json", "utf8")),
  bytes: new Uint8Array(await readFile("tests/fixtures/fonts/LiberationSans-Regular.ttf")),
};
const reports = [];
for (const profile of ["jpeg", "jpegMixed"]) {
  const module = await import(pathToFileURL(resolve(output, "current", `${profile}.mjs`)).href);
  const font = profile === "jpegMixed" ? module.prepareFontResource(fontInput) : undefined;
  const bytes: Uint8Array = profile === "jpeg" ? module.pdf(source) : module.pdf(font, source);
  assert.deepEqual(profile === "jpeg" ? module.pdf(source) : module.pdf(font, source), bytes);
  assert.ok(Buffer.from(bytes).includes(Buffer.from(source)), "Original DCT bytes lost");
  assert.equal(
    (
      Buffer.from(bytes)
        .toString("latin1")
        .match(/\/Subtype \/Image/gu) ?? []
    ).length,
    1,
  );
  const path = resolve(output, "current", `${profile}.pdf`);
  await writeFile(path, bytes);
  execFileSync("qpdf", ["--check", path], { stdio: "pipe" });
  const fonts = execFileSync("pdffonts", [path], { encoding: "utf8" });
  const text = execFileSync("pdftotext", [path, "-"], { encoding: "utf8" });
  if (profile === "jpeg") assert.ok(!/Helvetica|TrueType|Type 1/u.test(fonts));
  else assert.match(text, /JPEG caption/u);
  const ppm = execFileSync("pdftoppm", ["-r", "72", "-singlefile", path]);
  const header = /^P6\s+200\s+100\s+255\s/u.exec(ppm.toString("latin1"));
  assert.ok(header);
  const pixels = ppm.subarray(header[0].length);
  assert.ok(matches(pixels, 40, 20, [230, 30, 20]));
  assert.ok(matches(pixels, 100, 20, [20, 210, 40]));
  assert.ok(matches(pixels, 40, 50, [30, 40, 220]));
  assert.ok(matches(pixels, 100, 50, [240, 220, 30]));
  assert.ok(!matches(pixels, 40, 20, [30, 40, 220]), "Wrong-orientation negative control must fail");
  reports.push({
    profile,
    pdfBytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    fonts,
    text,
  });
}
function matches(pixels: Uint8Array, x: number, y: number, color: readonly number[]): boolean {
  const offset = (y * 200 + x) * 3;
  return color.every((value, index) => Math.abs((pixels[offset + index] ?? 0) - value) < 45);
}
await writeFile(resolve(output, "jpeg-pdf-proof.json"), `${JSON.stringify(reports, null, 2)}\n`);
console.log(reports);
