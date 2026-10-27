import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const before = "artifacts/text-flow/manual-shapes-before/costs";
const out = process.env.TEXT_FLOW_MANUAL_OUT ?? "artifacts/text-flow/manual-shapes-fixed";
const after = `${out}/costs`;
const read = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const hash = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
function retainedPathResult(result: object) {
  let envelopes = 0;
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== "object") return value;
    const node = value as Record<string, unknown>;
    if (
      node.type === "paintGroup" &&
      JSON.stringify(node.transform) === "[1,0,0,1,0,0]" &&
      Object.keys(node).sort().join() === "children,transform,type" &&
      Array.isArray(node.children) &&
      node.children.length === 1 &&
      node.children[0].type === "path"
    ) {
      envelopes++;
      return node.children[0];
    }
    return Object.fromEntries(Object.entries(node).map(([key, item]) => [key, visit(item)]));
  };
  const normalized = visit(result);
  assert.equal(envelopes, 1, "Only the retained Block's one identity Path envelope may differ");
  return normalized;
}
async function pathPdfPair(label: string, old: Uint8Array, fresh: Uint8Array, pages: number) {
  const directory = `${out}/parity-runtime`;
  await mkdir(directory, { recursive: true });
  const names = ["before", "after"].map((name) => `${directory}/${label}-${name}`);
  for (const [index, name] of names.entries()) {
    await writeFile(`${name}.pdf`, index ? fresh : old);
    execFileSync("qpdf", ["--check", `${name}.pdf`]);
    execFileSync("pdftoppm", ["-r", "72", "-png", `${name}.pdf`, name]);
  }
  assert.equal(
    execFileSync("pdftotext", ["-raw", `${names[0]}.pdf`, "-"], { encoding: "utf8" }),
    execFileSync("pdftotext", ["-raw", `${names[1]}.pdf`, "-"], { encoding: "utf8" }),
  );
  for (let page = 1; page <= pages; page++)
    assert.deepEqual(await readFile(`${names[0]}-${page}.png`), await readFile(`${names[1]}-${page}.png`));
  return {
    beforeBytes: old.length,
    afterBytes: fresh.length,
    rasterPages: pages,
    qpdf: "pass",
    extractedText: "identical",
    raster: "identical",
  };
}
async function sample(profile: string) {
  if (profile === "preparedFont")
    return {
      ...(await read("tests/fixtures/fonts/liberation-sans.json")),
      bytes: new Uint8Array(await readFile("tests/fixtures/fonts/LiberationSans-Regular.ttf")),
    };
  if (profile === "jpeg") return new Uint8Array(await readFile("tests/fixtures/jpeg/color-2x2.jpg"));
  if (profile.startsWith("textFlow"))
    return [
      {
        runs: [{ text: "Same rich source, same owned resources." }],
        defaultStyle: { font: "Helvetica", fontSize: 10, color: [0, 0, 0] },
        lineHeight: 12,
        align: "left",
        whiteSpace: "preserve",
        breakLongWords: "error",
      },
    ];
  return "Same ordinary source";
}
async function execute(path: string, profile: string) {
  const raw = await readFile(path, "utf8");
  const check = /function checkLimit\d*\((\w+), (\w+), (\w+), (\w+)\) \{/gu;
  assert.equal([...raw.matchAll(check)].length, 1);
  const charges: Record<string, number[]> = {};
  const code = raw
    .replace(check, "$& (globalThis.__manualCharges[$4] ??= []).push($1);")
    .replace("this.totals[key] += amount;", "(globalThis.__manualCharges['kernel/'+key] ??= []).push(amount); $&");
  Reflect.set(globalThis, "__manualCharges", charges);
  try {
    const module = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
    const argument = await sample(profile);
    const output = module.size
      ? module.size(argument)
      : typeof module.pdf === "function"
        ? module.pdf(argument)
        : module.pdf;
    return { output, result: module.result, charges, bundleSha256: hash(raw) };
  } finally {
    Reflect.deleteProperty(globalThis, "__manualCharges");
  }
}
const baseline = await read(`${before}/report.json`);
const current = await read(`${after}/report.json`);
const pairs = [];
for (const profile of Object.keys(baseline.inputs)) {
  for (const platform of ["browser", "node"]) {
    const label = `${profile}-${platform}-raw`;
    const old = await execute(`${before}/${label}.mjs`, profile);
    const fresh = await execute(`${after}/${label}.mjs`, profile);
    if (profile !== "textFlowPath") assert.deepEqual(fresh.output, old.output, `${label}: output/PDF`);
    const pathPdf =
      profile === "textFlowPath"
        ? await pathPdfPair(label, old.output, fresh.output, fresh.result.pageCount)
        : undefined;
    assert.deepEqual(
      profile === "textFlowPath" ? retainedPathResult(fresh.result) : fresh.result,
      old.result,
      `${label}: layout/provenance/native data (Path identity envelope accounted)`,
    );
    if (profile !== "textFlowPath") assert.deepEqual(fresh.charges, old.charges, `${label}: cumulative charges`);
    pairs.push({
      label,
      ...(pathPdf ? { pathPdf } : {}),
      chargeChanges: Object.keys(fresh.charges)
        .filter((key) => JSON.stringify(fresh.charges[key]) !== JSON.stringify(old.charges[key]))
        .map((key) => ({
          key,
          beforeCount: old.charges[key]?.length ?? 0,
          afterCount: fresh.charges[key]!.length,
          beforeLast: old.charges[key]?.at(-1),
          afterLast: fresh.charges[key]!.at(-1),
        })),
      identicalInput: baseline.inputs[profile] === current.inputs[profile],
      beforeBundleSha256: old.bundleSha256,
      afterBundleSha256: fresh.bundleSha256,
      outputSha256: hash(JSON.stringify(fresh.output)),
      resultSha256: hash(JSON.stringify(fresh.result) ?? "undefined"),
      beforeCharges: old.charges,
      afterCharges: fresh.charges,
    });
  }
}
await writeFile(
  `${out}/parity.json`,
  JSON.stringify(
    {
      pairs,
      baselineMetrics: Object.keys(baseline.metrics).length,
      currentMetrics: Object.keys(current.metrics).length,
    },
    null,
    2,
  ),
);
console.log({
  pairedRuntimeCases: pairs.length,
  outputAndProvenance: "identical except retained Path identity envelope; all Path rasters/text identical",
  unchangedFixtureCharges: "identical",
  path: "canonical API source capture charges recorded separately",
});
