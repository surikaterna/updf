import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const baseline = resolve(process.argv[2] ?? "/tmp/opencode/updf-slice-a-f97-baseline");
const current = resolve(process.argv[3] ?? "/tmp/opencode/updf-slice-a-current");
const fontInput = {
  ...JSON.parse(await readFile("tests/fixtures/fonts/liberation-sans.json", "utf8")),
  bytes: new Uint8Array(await readFile("tests/fixtures/fonts/LiberationSans-Regular.ttf")),
};
const jpeg = new Uint8Array(await readFile("tests/fixtures/jpeg/color-1x1.jpg"));
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

async function produce(directory: string, profile: string) {
  const module = await import(pathToFileURL(resolve(directory, `${profile}.mjs`)).href);
  const argument = profile === "prepared" ? fontInput : profile === "fontkit" ? fontInput.bytes : "Hello";
  const bytes: Uint8Array =
    profile === "jpeg"
      ? module.pdf(jpeg)
      : profile === "jpegMixed"
        ? module.pdf(module.prepareFontResource(fontInput), jpeg)
        : module.pdf(argument);
  const path = resolve(directory, `${profile}.pdf`);
  await writeFile(path, bytes);
  execFileSync("qpdf", ["--check", path], { stdio: "pipe" });
  const json = JSON.parse(
    execFileSync("qpdf", ["--json", "--json-stream-data=inline", path], {
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    }),
  );
  return {
    bytes,
    json,
    text: execFileSync("pdftotext", [path, "-"], { encoding: "utf8" }),
    raster: digest(execFileSync("pdftoppm", ["-r", "72", "-singlefile", path], { maxBuffer: 16 * 1024 * 1024 })),
  };
}

type Objects = Record<
  string,
  { value?: Record<string, unknown>; stream?: { dict: Record<string, unknown>; data: string } }
>;
function normalize(json: { qpdf: [unknown, Objects] }) {
  const objects = structuredClone(json.qpdf[1]);
  const names = new Map<string, string>();
  for (const object of Object.values(objects)) {
    const resources = object.value?.["/Resources"] as Record<string, Record<string, string>> | undefined;
    if (!resources) continue;
    for (const [category, dictionary] of Object.entries(resources)) {
      const normalized: Record<string, string> = {};
      for (const [name, ref] of Object.entries(dictionary)) {
        const canonical = `/${category.slice(1)}Object${ref.split(" ")[0]}`;
        assert.ok(!names.has(name) || names.get(name) === canonical, "Inconsistent resource binding");
        names.set(name, canonical);
        normalized[canonical] = ref;
      }
      resources[category] = normalized;
    }
  }
  for (const object of Object.values(objects)) {
    if (!object.stream || object.stream.dict["/Subtype"] || object.stream.dict["/Length1"]) continue;
    const content = Buffer.from(object.stream.data, "base64").toString("latin1");
    if (!/\b(?:Tf|Do|gs)\b/u.test(content)) continue;
    const normalized = content.replace(/(\/[^\s]+)(?= (?:[\d.]+ Tf|Do|gs)\b)/gu, (name) => {
      const canonical = names.get(name);
      assert.ok(canonical, `Missing resource dictionary entry for ${name}`);
      return canonical;
    });
    object.stream.data = Buffer.from(normalized, "latin1").toString("base64");
    delete object.stream.dict["/Length"];
  }
  return objects;
}

const reports = [];
const beforeReport = JSON.parse(await readFile(resolve(baseline, "report.json"), "utf8"));
const afterReport = JSON.parse(await readFile(resolve(current, "report.json"), "utf8"));
for (const before of beforeReport.profiles) {
  const after = afterReport.profiles.find((profile: { profile: string }) => profile.profile === before.profile);
  assert.equal(after.input, before.input, "Cost inputs must match exactly");
  const retained = (profile: typeof before) =>
    profile.contributions
      .filter((item: { bytesInOutput: number }) => item.bytesInOutput > 0)
      .map((item: { module: string }) => item.module)
      .sort();
  reports.push({
    profile: before.profile,
    rawDelta: after.raw - before.raw,
    gzipDelta: after.gzip - before.gzip,
    parsedBefore: before.modules.length,
    parsedAfter: after.modules.length,
    retainedBefore: retained(before).length,
    retainedAfter: retained(after).length,
  });
}
for (const profile of ["drawing", "helvetica", "prepared", "fontkit", "jpeg", "jpegMixed"]) {
  const before = await produce(baseline, profile);
  const after = await produce(current, profile);
  assert.equal(after.text, before.text, `${profile} extraction`);
  assert.equal(after.raster, before.raster, `${profile} raster`);
  assert.deepEqual(normalize(after.json), normalize(before.json), `${profile}: only resource names may change`);
  if (profile.startsWith("jpeg"))
    assert.ok(Buffer.from(after.bytes).includes(Buffer.from(jpeg)), "Original JPEG bytes");
}
for (const profile of ["measurementFonts", "measurementHost"]) {
  const before = await import(pathToFileURL(resolve(baseline, `${profile}.mjs`)).href);
  const after = await import(pathToFileURL(resolve(current, `${profile}.mjs`)).href);
  for (const text of ["Hello", "A B\nA", ""]) assert.deepEqual(after.measure(text), before.measure(text));
}
await writeFile(resolve(current, "resource-name-proof.json"), `${JSON.stringify(reports, null, 2)}\n`);
console.log(
  "Matched inputs, six PDFs: qpdf, name/reference-normalized object equality (including embedded streams), raster/extraction; measurement DTOs passed.",
  reports,
);
