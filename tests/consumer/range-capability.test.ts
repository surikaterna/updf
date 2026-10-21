import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

async function retained(contents: string): Promise<readonly string[]> {
  const result = await build({
    stdin: { contents, resolveDir: process.cwd() },
    bundle: true,
    minify: true,
    platform: "browser",
    conditions: ["browser"],
    format: "esm",
    target: "es2022",
    write: false,
    metafile: true,
  });
  return Object.values(result.metafile.outputs).flatMap((output) =>
    Object.entries(output.inputs)
      .filter(([, input]) => input.bytesInOutput > 0)
      .map(([path]) => path),
  );
}
function selectionOnly(paths: readonly string[]): void {
  assert.ok(
    paths.some((path) => path.endsWith("/fragment-range.js")),
    "actual range implementation must remain",
  );
  assert.ok(
    paths.some((path) => path.endsWith("/fragment-select.js")),
    "canonical selection must remain",
  );
  assert.ok(!paths.some((path) => /\/fragment-(candidates|regions)\.js$/u.test(path)), "unused capabilities retained");
}
test("range and layout consumers retain shared selection but not optional candidate/region implementations", async () => {
  selectionOnly(await retained('export {createRangeOperation} from "@updf/layout-boxes/fragmentation";'));
  selectionOnly(await retained('export * from "@updf/layout"; export * from "@updf/tables";'));
});
test("explicit full capability remains available and defeats the narrow-graph assertion", async () => {
  const paths = await retained('export {createFragmentOperation} from "@updf/layout-boxes/fragmentation";');
  assert.ok(paths.some((path) => path.endsWith("/fragment-candidates.js")));
  assert.ok(paths.some((path) => path.endsWith("/fragment-regions.js")));
  assert.throws(() => selectionOnly(paths), /unused capabilities/);
});

test("minified production and development consumers retain the same runtime guards", async () => {
  const bundles: string[] = [];
  for (const environment of ["development", "production"]) {
    const result = await build({
      stdin: { contents: guardConsumer, resolveDir: process.cwd() },
      bundle: true,
      minify: true,
      platform: "browser",
      conditions: ["browser"],
      format: "esm",
      target: "es2022",
      define: { "process.env.NODE_ENV": JSON.stringify(environment) },
      write: false,
    });
    const code = result.outputFiles[0]!.text;
    bundles.push(code);
    const consumer = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
    assert.deepEqual(consumer.check(), ["LIMIT", 0, true, "VALUE"]);
  }
  assert.equal(bundles[0], bundles[1], "build environment must not remove runtime checks");
});

const guardConsumer = `
import {createRangeOperation} from '@updf/layout-boxes/fragmentation';
export function check() {
  let calls = 0;
  const operation = createRangeOperation({next() {
    calls++; return {end:1,height:1,content:null};
  }}, {measurements:0});
  const source = operation.prepare({id:'a',path:'/a',descriptor:{},extent:1,
    mode:'atomic',width:{mode:'fixed',value:1}});
  const request = {offset:0,width:1,height:1,usedHeight:0};
  let quota, closed;
  try { operation.select(source,request); } catch (error) { quota=error.code; }
  try { operation.select(source,request); } catch (error) { closed=error.code; }
  return [quota,calls,Object.isFrozen(operation.counts()),closed];
}
`;
