import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";
import { layoutPackageTarball } from "../layout-package-identity.js";
import { nativeNodeInput } from "./native-node-input.js";

const before = resolve(process.argv[2] ?? "/tmp/opencode/updf-slice-a-current");
const after = resolve(process.argv[3] ?? "/tmp/opencode/updf-slice-b-current");
const bridge = process.argv[4] === "--bridge";
const installed = await mkdtemp("/tmp/opencode/updf-slice-b-post-a-");
await writeFile(resolve(installed, "package.json"), '{"private":true,"type":"module"}\n');
const packages = [
  await layoutPackageTarball(before, "2.0.0-poc.0"),
  ...["core", "fonts", "text", "jpeg"].map((name) => resolve(before, `updf-${name}-2.0.0-poc.0.tgz`)),
];
execFileSync("npm", ["install", "--ignore-scripts", "--package-lock=false", "--no-audit", "--no-fund", ...packages], {
  cwd: installed,
  stdio: "pipe",
});

async function compile(root: string, output: string, contents = nativeNodeInput) {
  const result = await build({
    stdin: { contents, resolveDir: root, sourcefile: "native-node-proof.ts", loader: "ts" },
    bundle: true,
    minify: true,
    target: "es2022",
    platform: "browser",
    conditions: ["browser"],
    format: "esm",
    metafile: true,
    write: false,
  });
  assert.ok(result.outputFiles[0]);
  await writeFile(output, result.outputFiles[0].contents);
  await writeFile(
    `${output}.cost.json`,
    JSON.stringify(
      {
        raw: result.outputFiles[0].contents.length,
        gzip: gzipSync(result.outputFiles[0].contents).length,
        inputs: result.metafile.inputs,
        outputs: result.metafile.outputs,
      },
      null,
      2,
    ),
  );
  return import(pathToFileURL(output).href);
}

const old = await compile(installed, resolve(installed, "native-before.mjs"));
const bridgeInput = nativeNodeInput.replace(
  /function vnode\(node\)\{[^\n]+\}/u,
  "import {nativeNodeToVdom as vnode} from '@updf/core/internal-drawing';",
);
if (bridge) assert.notEqual(bridgeInput, nativeNodeInput);
const current = await compile(
  process.cwd(),
  resolve(after, "native-after.mjs"),
  bridge ? bridgeInput : nativeNodeInput,
);
const jpeg = new Uint8Array(await readFile("tests/fixtures/jpeg/color-1x1.jpg"));
const expected = old.run(jpeg);
const actual = current.run(jpeg);
assert.deepEqual(actual, expected, "Post-A exact native PDFs/ASTs/ink and diagnostic code/path/message parity");
for (let i = 0; i < actual.length; i++) {
  const path = resolve(after, `native-${i}.pdf`);
  await writeFile(path, actual[i].pdf);
  execFileSync("qpdf", ["--check", path], { stdio: "pipe" });
}

const baseline = JSON.parse(await readFile(resolve(before, "report.json"), "utf8"));
const currentReport = JSON.parse(await readFile(resolve(after, "report.json"), "utf8"));
const profiles = currentReport.profiles.map((profile: (typeof baseline.profiles)[number]) => {
  const prior = baseline.profiles.find((entry: typeof profile) => entry.profile === profile.profile);
  assert.ok(prior);
  assert.equal(profile.input, prior.input, "Profile source must match Post-A exactly");
  const retainedNodes = profile.contributions.filter(
    (entry: { module: string; bytesInOutput: number }) => entry.module.includes("/nodes/") && entry.bytesInOutput > 0,
  );
  if (profile.profile.startsWith("measurement")) {
    assert.ok(retainedNodes.every((entry: { module: string }) => entry.module.endsWith("/metadata.js")));
    assert.ok(
      !profile.contributions.some(
        (entry: { module: string; bytesInOutput: number }) =>
          entry.bytesInOutput > 0 && /core\/(?:content|pdf-writer)|painting\/pdf/.test(entry.module),
      ),
    );
  }
  return {
    profile: profile.profile,
    rawDelta: profile.raw - prior.raw,
    gzipDelta: profile.gzip - prior.gzip,
    parsedNodeInputs: profile.modules.filter((module: string) => module.includes("/nodes/")),
    retainedNodes,
  };
});
for (const profile of ["drawing", "helvetica", "prepared", "fontkit", "jpeg", "jpegMixed"])
  assert.deepEqual(await readFile(resolve(after, `${profile}.pdf`)), await readFile(resolve(before, `${profile}.pdf`)));
const proof = {
  baselineTarballs: before,
  installed,
  source: nativeNodeInput,
  currentSource: bridge ? bridgeInput : nativeNodeInput,
  bridge,
  modes: actual.length,
  profiles,
  nativeBundles: {
    before: JSON.parse(await readFile(resolve(installed, "native-before.mjs.cost.json"), "utf8")),
    after: JSON.parse(await readFile(resolve(after, "native-after.mjs.cost.json"), "utf8")),
  },
};
await writeFile(resolve(after, "native-node-proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
console.log(
  "Exact frozen-baseline six-kind native lifecycle parity, four qpdf PDFs, six profile PDFs and eight cost/retention profiles passed.",
  {
    installed,
    profiles: profiles.map(
      ({ profile, rawDelta, gzipDelta }: { profile: string; rawDelta: number; gzipDelta: number }) => ({
        profile,
        rawDelta,
        gzipDelta,
      }),
    ),
  },
);
