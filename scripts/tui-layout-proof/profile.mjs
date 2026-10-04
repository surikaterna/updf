import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { bundle, here, updfBaseline, verifyRoot } from "./bundle.mjs";

const root = verifyRoot();
const baseline = process.argv.includes("--baseline");
const scopes = {
  allocator: baseline ? "../../packages/layout/src/width-resolver.ts" : "allocator.ts",
  formbarBridge: "bridge.mjs",
  terminalAdapter: "terminal.ts",
  combinedCLI: "cli.mjs",
};
async function persist(result, scope) {
  const destination = resolve(
    here,
    `../../artifacts/${baseline ? "layout-kernel-a/baseline-profile" : "layout-kernel-b/profile"}`,
    scope,
  );
  await mkdir(destination, { recursive: true });
  const output = result.outputFiles[0];
  await writeFile(resolve(destination, "bundle.mjs"), output.contents);
  await writeFile(resolve(destination, "bundle.mjs.gz"), gzipSync(output.contents));
  await writeFile(resolve(destination, "metafile.json"), `${JSON.stringify(result.metafile, null, 2)}\n`);
}
async function manifestAt(directory) {
  try {
    return JSON.parse(await readFile(resolve(directory, "package.json"), "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
async function externalVersions(imports) {
  const versions = {};
  for (const item of imports.filter((item) => item.path.startsWith("file:"))) {
    let directory = dirname(new URL(item.path).pathname);
    while (directory.startsWith(root)) {
      const manifest = await manifestAt(directory);
      if (manifest?.name && manifest.version) {
        versions[manifest.name] = manifest.version;
        break;
      }
      directory = dirname(directory);
    }
  }
  return versions;
}
async function report(entry, scope) {
  const result = await bundle(entry, root, baseline);
  const output = result.outputFiles[0];
  const metadata = Object.values(result.metafile.outputs)[0];
  const retained = Object.entries(metadata.inputs).filter(([, info]) => info.bytesInOutput > 0);
  const forbidden = (path) =>
    /^(?:core|layout|fontkit)\/src\//.test(resolve(path).slice(resolve(here, "../../packages").length + 1)) &&
    resolve(path).startsWith(`${resolve(here, "../../packages")}/`);
  const pdfLeak = retained.filter(([path]) => forbidden(path));
  const resolvedLeak = Object.keys(result.metafile.inputs).filter(forbidden);
  if (!baseline) {
    assert.deepEqual(pdfLeak, [], `${scope}: forbidden retained uPDF module`);
    assert.deepEqual(resolvedLeak, [], `${scope}: forbidden resolved uPDF module`);
  }
  if (!baseline && ["allocator", "terminalAdapter", "combinedCLI"].includes(scope))
    assert.ok(
      retained.some(([path]) => path.endsWith("layout-kernel/src/width-resolver.ts")),
      "Kernel positive bytes control missing",
    );
  if (!baseline && ["terminalAdapter", "combinedCLI"].includes(scope))
    assert.ok(
      retained.some(([path]) => path.endsWith("layout-kernel/src/box-placement.ts")),
      "Box placement positive control missing",
    );
  const label = (path) => resolve(path).replace(root, "FORMBAR_ROOT").replace(resolve(here, "../.."), "UPDF_ROOT");
  await persist(result, scope);
  return {
    baselineRevision: baseline ? updfBaseline : undefined,
    raw: output.contents.length,
    gzip: gzipSync(output.contents).length,
    inputs: Object.keys(result.metafile.inputs).map(label),
    retained: retained.map(([path, info]) => ({ path: label(path), bytes: info.bytesInOutput })),
    externalDependencies: metadata.imports
      .filter((item) => !item.path.startsWith("node:"))
      .map((item) => ({ path: item.path.replace(root, "FORMBAR_ROOT"), kind: item.kind })),
    externalVersions: await externalVersions(metadata.imports),
    externalNodeBuiltins: metadata.imports.filter((item) => item.path.startsWith("node:")).map((item) => item.path),
    pdfLeak: pdfLeak.map(([path]) => label(path)),
    resolvedLeak: resolvedLeak.map(label),
  };
}
const reports = [];
for (const [scope, entry] of Object.entries(scopes)) {
  const runtime = await report(entry, scope);
  const bootstrap = scope === "combinedCLI" ? await report("run.mjs", "bootstrap") : undefined;
  reports.push({ scope, ...runtime, bootstrap });
}
await writeFile(
  resolve(
    here,
    `../../artifacts/${baseline ? "layout-kernel-a/baseline-profile" : "layout-kernel-b/profile"}/report.json`,
  ),
  `${JSON.stringify(reports, null, 2)}\n`,
);
console.log(JSON.stringify(reports));
verifyRoot();
