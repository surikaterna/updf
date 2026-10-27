import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";
import { preparedImageCostInputs } from "./prepared-image-cost-inputs.js";

const root = process.cwd();
const out = resolve(process.env.PREPARED_IMAGES_OUT ?? "artifacts/text-flow/prepared-images");
const baselineDirectory = resolve("artifacts/text-flow/image-visual-seam-final");
const read = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const baseline = await read(`${baselineDirectory}/report.json`);
const current = await read(
  process.env.PREPARED_IMAGES_SHARED ?? "artifacts/text-flow/prepared-images-shared/report.json",
);
const preFix = process.env.PREPARED_IMAGES_PRE_FIX ? await read(process.env.PREPARED_IMAGES_PRE_FIX) : undefined;
const cleanCopy = process.env.PREPARED_IMAGES_CLEAN_COPY;
const hash = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
await mkdir(out, { recursive: true });

async function consumer(profile: string, contents: string, platform: "browser" | "node", minify: boolean) {
  const built = await build({
    stdin: { contents, resolveDir: root, loader: "ts" },
    bundle: true,
    target: "es2022",
    platform,
    format: "esm",
    minify,
    write: false,
    metafile: true,
  });
  const label = `${profile}-${platform}-${minify ? "min" : "raw"}`;
  const output = built.outputFiles[0]!;
  await writeFile(`${out}/${label}.mjs`, output.contents);
  await writeFile(`${out}/${label}.meta.json`, JSON.stringify(built.metafile, null, 2));
  return {
    label,
    bytes: output.contents.length,
    gzip: gzipSync(output.contents, { level: 9 }).length,
    sourceSha256: hash(contents),
    meaning: "new Image profile; absolute cost only; baseline N/A",
  };
}

async function installed() {
  const directory = await mkdtemp("/tmp/opencode/updf-s5a2-baseline-loads-");
  for (const library of baseline.libraries) {
    const target = resolve(directory, "node_modules", library.name);
    await mkdir(target, { recursive: true });
    execFileSync("tar", [
      "-xzf",
      resolve(baselineDirectory, library.pack.filename),
      "--strip-components=1",
      "-C",
      target,
    ]);
  }
  return directory;
}

async function loaded(directory: string, entries: readonly string[]) {
  const modules: string[] = JSON.parse(
    execFileSync(
      process.execPath,
      [
        "--no-experimental-require-module",
        "-e",
        `
    const Module=require('node:module'),seen=new Set(),load=Module._load;
    Module._load=function(id,parent,...rest){seen.add(Module._resolveFilename(id,parent));return load.call(this,id,parent,...rest)};
    for(const entry of ${JSON.stringify(entries)})require(entry);
    process.stdout.write(JSON.stringify([...seen]));`,
      ],
      { cwd: directory, encoding: "utf8" },
    ),
  );
  const files = modules.filter((path) => path.startsWith(directory));
  const sizes = await Promise.all(files.map(async (path) => (await readFile(path)).length));
  return {
    modules: files.map((path) => path.slice(directory.length + 1)),
    moduleCount: files.length,
    bytes: sizes.reduce((a, b) => a + b, 0),
  };
}

const consumers = [];
for (const [profile, contents] of Object.entries(preparedImageCostInputs()))
  for (const platform of ["browser", "node"] as const)
    for (const minify of [false, true]) consumers.push(await consumer(profile, contents, platform, minify));
assert.deepEqual(current.flags, baseline.flags);
assert.deepEqual(current.versions, baseline.versions);
assert.deepEqual(current.inputs, baseline.inputs);
for (const [key, value] of Object.entries(current.metrics))
  if (/^(?:emitted|pack)\/@updf\/core\/|^consumer\/(?:drawing|ordinaryText|preparedFont|jpeg)-/u.test(key))
    assert.equal(value, baseline.metrics[key], key);
const oldRoot = await installed();
const loads: Record<string, object> = {};
for (const [name, entries] of Object.entries({
  drawing: ["@updf/core"],
  ordinaryText: ["@updf/text"],
  layout: ["@updf/layout"],
  textFlow: ["@updf/text-flow"],
  textFlowPath: ["@updf/text-flow", "@updf/text-flow/path"],
  images: ["@updf/images"],
  pngImages: ["@updf/images", "@updf/png"],
  jpegImages: ["@updf/images", "@updf/jpeg"],
})) {
  const after = await loaded(root, entries);
  const before = name.toLowerCase().includes("images") ? null : await loaded(oldRoot, entries);
  if (name === "images") assert.ok(!after.modules.some((p) => /\/(?:png|jpeg|assets|fonts|text-flow)\//u.test(p)));
  if (name === "textFlow") assert.ok(!after.modules.some((p) => /\/(?:images|png|jpeg|assets)\//u.test(p)));
  loads[name] = {
    before,
    after,
    delta: before ? { bytes: after.bytes - before.bytes, modules: after.moduleCount - before.moduleCount } : null,
  };
}
const report = {
  baseline: baselineDirectory,
  baselineLock: baseline.lockSha256,
  currentLock: current.lockSha256,
  lockMeaning:
    "Only @updf/images workspace/link records added; tool versions/flags and all 21 old consumer inputs identical",
  consumers,
  loads,
  sharedComparison: current.comparison,
  fixOnlyComparison: preFix
    ? Object.fromEntries(
        Object.entries(current.metrics).map(([key, value]) => [
          key,
          { base: preFix.metrics[key], current: value, delta: (value as number) - preFix.metrics[key] },
        ]),
      )
    : null,
  packageMeaning: current.packageMeaning,
  imagesPackage: current.libraries.find((library: { name: string }) => library.name === "@updf/images"),
  cleanCopyDelta: cleanCopy ? await sourceDelta(cleanCopy) : null,
};
await writeFile(`${out}/summary.json`, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      consumers,
      loads: Object.fromEntries(
        Object.entries(loads).map(([name, report]) => [name, (report as { delta: unknown }).delta]),
      ),
      imagesPack: { size: report.imagesPackage.pack.size, unpackedSize: report.imagesPackage.pack.unpackedSize },
      shared: Object.fromEntries(
        Object.entries(current.comparison).filter(([key]) =>
          /^(?:consumer\/(?:layout|textFlowSiblings|visualOrdinary)-browser-min\/(?:bytes|gzip)|pack\/@updf\/(?:core|layout)\/(?:size|unpackedSize)|total\/pack\/)/u.test(
            key,
          ),
        ),
      ),
    },
    null,
    2,
  ),
);

async function sourceDelta(directory: string) {
  const paths = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
  const changed = [];
  for (const path of paths) {
    const before = hash(await readFile(resolve(directory, path)));
    const after = hash(await readFile(path));
    if (before !== after) changed.push({ path, before, after });
  }
  return { directory, sourceCount: paths.length, changed };
}
