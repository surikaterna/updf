import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const output = resolve(root, "artifacts/font-extraction");
const input = {
  ...JSON.parse(await readFile(resolve(root, "tests/fixtures/fonts/liberation-sans.json"), "utf8")),
  bytes: new Uint8Array(await readFile(resolve(root, "tests/fixtures/fonts/LiberationSans-Regular.ttf"))),
};
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
async function proof(phase: string, profile: string): Promise<{ pdf: string; raster: string; text: string }> {
  const directory = resolve(output, phase);
  const module = await import(pathToFileURL(resolve(directory, `${profile}.mjs`)).href);
  const bytes: Uint8Array = module.pdf(profile === "prepared" ? input : "Hello");
  return inspect(phase, profile, bytes);
}
async function inspect(phase: string, profile: string, bytes: Uint8Array) {
  const directory = resolve(output, phase);
  const pdf = resolve(directory, `${profile}.pdf`);
  await writeFile(pdf, bytes);
  execFileSync("qpdf", ["--check", pdf], { stdio: "pipe" });
  const fonts = execFileSync("pdffonts", [pdf], { encoding: "utf8" });
  const text = execFileSync("pdftotext", [pdf, "-"], { encoding: "utf8" });
  const raster = resolve(directory, `${profile}-raster`);
  execFileSync("pdftoppm", ["-r", "72", "-singlefile", pdf, raster], { stdio: "pipe" });
  if (phase === "current" && profile === "drawing") assert.ok(!/Helvetica/u.test(fonts));
  if (phase === "current" && ["prepared", "cmr-unicode"].includes(profile)) assert.ok(!/Helvetica/u.test(fonts));
  if (profile === "helvetica") assert.match(text, /Hello/u);
  if (profile === "prepared") assert.match(text, /Москва/u);
  return { pdf: digest(bytes), raster: digest(await readFile(`${raster}.ppm`)), text };
}
const reports = [];
for (const profile of ["drawing", "helvetica", "prepared"]) {
  const baseline = await proof("baseline", profile);
  const current = await proof("current", profile);
  assert.equal(current.raster, baseline.raster, `${profile} appearance changed`);
  assert.equal(current.text, baseline.text, `${profile} extraction changed`);
  if (profile === "helvetica") assert.equal(current.pdf, baseline.pdf);
  reports.push({ profile, baseline, current });
}
const before = await import(pathToFileURL(resolve(output, "baseline/measurementFonts.mjs")).href);
const after = await import(pathToFileURL(resolve(output, "current/measurementFonts.mjs")).href);
assert.deepEqual(after.measure("Hello"), before.measure("Hello"));
await writeFile(resolve(output, "pdf-proof.json"), `${JSON.stringify(reports, null, 2)}\n`);
async function cmrProof(phase: string, source: string) {
  const load = (path: string) => import(pathToFileURL(resolve(source, path)).href);
  const core = await load("packages/core/dist/index.js");
  const fonts = await load(phase === "baseline" ? "packages/core/dist/fonts/index.js" : "packages/fonts/dist/index.js");
  const cmr = await load("apps/cmr/dist/cmr.js");
  const unicode = await load("apps/cmr/dist/cmr-unicode.js");
  const font = fonts.createPreparedFont(input);
  const ascii =
    phase === "baseline"
      ? core.render(cmr.createCmrDocument(cmr.cmrFixture))
      : cmr.renderCMR(cmr.createCmrDocument(cmr.cmrFixture));
  const prepared =
    phase === "baseline"
      ? core.render(unicode.createUnicodeCmrDocument(font), { resources: { CmrFont: font } })
      : unicode.renderUnicodeCMR(font);
  return { ascii: await inspect(phase, "cmr", ascii), unicode: await inspect(phase, "cmr-unicode", prepared) };
}
if (process.argv[2]) {
  const baseline = await cmrProof("baseline", process.argv[2]);
  const current = await cmrProof("current", root);
  assert.equal(current.ascii.pdf, baseline.ascii.pdf);
  for (const key of ["ascii", "unicode"] as const) {
    assert.equal(current[key].raster, baseline[key].raster);
    assert.equal(current[key].text, baseline[key].text);
  }
  await writeFile(resolve(output, "cmr-proof.json"), `${JSON.stringify({ baseline, current }, null, 2)}\n`);
}
console.log(
  "Shared cost-profile PDFs: qpdf/fonts/extraction and exact raster preservation passed; Helvetica bytes and measurement DTOs match baseline.",
);
