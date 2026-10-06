import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const output = resolve(process.argv[3] ?? resolve(root, "artifacts/font-extraction"));
const baselineReport = JSON.parse(await readFile(resolve(output, "baseline/report.json"), "utf8"));
const input = {
  ...JSON.parse(await readFile(resolve(root, "tests/fixtures/fonts/liberation-sans.json"), "utf8")),
  bytes: new Uint8Array(await readFile(resolve(root, "tests/fixtures/fonts/LiberationSans-Regular.ttf"))),
};
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
async function proof(phase: string, profile: string): Promise<{ pdf: string; raster: string; text: string }> {
  const directory = resolve(output, phase);
  const module = await import(pathToFileURL(resolve(directory, `${profile}.mjs`)).href);
  const argument = profile === "prepared" ? input : profile === "fontkit" ? input.bytes : "Hello";
  const bytes: Uint8Array = module.pdf(argument);
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
for (const phase of ["baseline", "current"]) {
  const report = JSON.parse(await readFile(resolve(output, phase, "report.json"), "utf8"));
  for (const name of ["helvetica", "prepared"]) {
    const profile = report.profiles.find((item: { profile: string }) => item.profile === name);
    assert.match(
      profile.input,
      /type: ?['"]richText['"]/u,
      "Regenerate both cost profiles with equivalent canonical native rich workloads; old native plain parity is retired in E2",
    );
  }
}
for (const profile of ["drawing", "helvetica", "prepared", "fontkit"]) {
  const baseline = await proof("baseline", profile);
  const current = await proof("current", profile);
  assert.equal(current.raster, baseline.raster, `${profile} appearance changed`);
  assert.equal(current.text, baseline.text, `${profile} extraction changed`);
  if (!baselineReport.historical || profile === "helvetica") assert.equal(current.pdf, baseline.pdf);
  reports.push({ profile, baseline, current });
}
const before = await import(pathToFileURL(resolve(output, "baseline/measurementFonts.mjs")).href);
const after = await import(pathToFileURL(resolve(output, "current/measurementFonts.mjs")).href);
for (const phase of ["baseline", "current"]) {
  const report = JSON.parse(await readFile(resolve(output, phase, "report.json"), "utf8"));
  const profile = report.profiles.find((item: { profile: string }) => item.profile === "measurementFonts");
  assert.match(
    profile.input,
    /paragraphs:/u,
    "Regenerate cost profiles with equivalent rich workloads; old plain DTO parity is intentionally retired in E1",
  );
}
for (const text of ["Hello", "A B\nA", ""]) assert.deepEqual(after.measure(text), before.measure(text));
if (!baselineReport.historical) {
  const oldHost = await import(pathToFileURL(resolve(output, "baseline/measurementHost.mjs")).href);
  const newHost = await import(pathToFileURL(resolve(output, "current/measurementHost.mjs")).href);
  for (const text of ["Hello", "A B\nA", ""]) assert.deepEqual(newHost.measure(text), oldHost.measure(text));
}
await writeFile(resolve(output, "pdf-proof.json"), `${JSON.stringify(reports, null, 2)}\n`);
async function cmrProof(phase: string, source: string) {
  // Both engines render the current canonical AST: this is rich preservation,
  // not a converter or a claim of former plain baseline/raster parity.
  const load = (path: string) => import(pathToFileURL(resolve(root, path)).href);
  const require = createRequire(resolve(source, "package.json"));
  const core = require("@updf/core");
  const historical = phase === "baseline" && baselineReport.historical;
  const fonts = require(historical ? "@updf/core/fonts" : "@updf/fonts");
  const cmr = await load("apps/cmr/dist/cmr.js");
  const unicode = await load("apps/cmr/dist/cmr-unicode.js");
  const font = fonts.createPreparedFont(input);
  const currentFonts = createRequire(resolve(root, "package.json"))("@updf/fonts");
  const unicodeDocument = unicode.createUnicodeCmrDocument(currentFonts.createPreparedFont(input));
  const composition = (resource: object, id: string) => {
    if (historical) return { resources: { [id]: resource } };
    const runtime = fonts.fontRuntime();
    const text = require("@updf/text");
    return {
      resources: { [id]: resource },
      text: text.createTextService({ runtime }),
      providers: [fonts.fontProvider(runtime)],
    };
  };
  const ascii = core.render(
    cmr.createCmrDocument(cmr.cmrFixture),
    historical ? {} : composition(fonts.createHelvetica(), "Helvetica"),
  );
  const prepared = core.render(unicodeDocument, composition(font, "CmrFont"));
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
  "Shared canonical-rich cost-profile PDFs: qpdf/fonts/extraction and exact raster preservation passed; Helvetica bytes and equivalent rich measurement DTOs match baseline. Historical plain measurement/native parity is not claimed (accepted E1/E2 contract changes).",
);
