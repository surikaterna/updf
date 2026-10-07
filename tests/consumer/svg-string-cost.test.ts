import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { gzipSync } from "node:zlib";
import { build, type Plugin } from "esbuild";
import ts from "typescript";

const base = "21dcd483dcd84961a24f5823e95a586ea25dd534";
const contents = `import { compileSVG } from "@updf/svg";
export function operationSource(source, target) { return compileSVG(source, target); }`;

// Compile baseline SVG modules in memory; all unchanged dependencies use the same built packages.
const baseline: Plugin = {
  name: "baseline-emitted-svg",
  setup(builder) {
    builder.onLoad({ filter: /packages\/svg\/dist\/[^/]+\.js$/ }, ({ path }) => {
      const name = path.slice(path.lastIndexOf("/") + 1).replace(/\.js$/u, ".ts");
      const source = execFileSync("git", ["show", `${base}:packages/svg/src/${name}`], { encoding: "utf8" });
      const compiled = ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
      });
      return { contents: compiled.outputText, loader: "js" };
    });
  },
};
test("same exported XML operation reports baseline/current emitted consumer cost", async () => {
  for (const [revision, plugins] of [
    [base, [baseline]],
    ["worktree", []],
  ] as const) {
    const result = await build({
      stdin: { contents, resolveDir: process.cwd(), loader: "js" },
      bundle: true,
      minify: true,
      target: "es2022",
      platform: "browser",
      format: "esm",
      conditions: ["browser"],
      metafile: true,
      write: false,
      plugins: [...plugins],
    });
    const retained = Object.values(result.metafile.outputs).flatMap((output) =>
      Object.entries(output.inputs)
        .filter(([, value]) => value.bytesInOutput > 0)
        .map(([path]) => path),
    );
    assert.equal(retained.filter((path) => path.endsWith("/svg/dist/compile.js")).length, 1);
    assert.ok(!retained.some((path) => /svg\/dist\/(?:authoring|jsx-runtime|structured)\.js$/u.test(path)));
    console.log(
      JSON.stringify({
        revision,
        bytes: result.outputFiles[0]?.contents.byteLength,
        gzip: gzipSync(result.outputFiles[0]?.contents ?? new Uint8Array()).byteLength,
        parsedModules: Object.keys(result.metafile.inputs).length,
        retainedModules: retained.length,
      }),
    );
  }
});
test("frozen baseline and current XML rendering use identical dynamic graphic and exported API", async () => {
  const entry = `import {render} from '@updf/core'; import {compileSVG} from '@updf/svg';
    export function pdf(fill) {
      const source = '<svg width="40" height="20" viewBox="0 0 40 20" transform="rotate(5)"><title>Cost comparison badge</title><g stroke="black" stroke-width="1"><rect x="2" y="2" width="36" height="16" fill="'+fill+'"/><path d="M4 10L20 4L36 10Z" fill="none"/></g></svg>';
      const {node} = compileSVG(source,{x:10,y:10,w:80,h:40});
      return render({version:1,pages:[{width:100,height:60,children:[node]}]});
    }`;
  const consumers: { pdf: (fill: string) => Uint8Array }[] = [];
  for (const [revision, plugins] of [
    [base, [baseline]],
    ["worktree", []],
  ] as const) {
    const result = await build({
      stdin: { contents: entry, resolveDir: process.cwd(), loader: "js" },
      bundle: true,
      minify: true,
      platform: "browser",
      format: "esm",
      target: "es2022",
      conditions: ["browser"],
      write: false,
      plugins: [...plugins],
    });
    const bytes = result.outputFiles[0]?.contents ?? new Uint8Array();
    consumers.push(await import(`data:text/javascript;base64,${Buffer.from(bytes).toString("base64")}`));
    console.log(
      JSON.stringify({
        profile: "equivalent-XML-render",
        revision,
        bytes: bytes.byteLength,
        gzip: gzipSync(bytes).byteLength,
      }),
    );
  }
  for (const fill of ["red", "blue"]) assert.deepEqual(consumers[0]?.pdf(fill), consumers[1]?.pdf(fill));
});
