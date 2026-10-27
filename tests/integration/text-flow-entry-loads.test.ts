import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { textFlowEntryGraph } from "../../scripts/text-flow-entry-graph.js";

function loaded(entries: string[]): string[] {
  return JSON.parse(
    execFileSync(
      process.execPath,
      [
        "--no-experimental-require-module",
        "-e",
        `
    const Module=require('node:module'), seen=new Set(), load=Module._load;
    Module._load=function(id,parent,...rest) {
      seen.add(Module._resolveFilename(id,parent));
      return load.call(this,id,parent,...rest);
    };
    for(const entry of ${JSON.stringify(entries)}) require(entry);
    process.stdout.write(JSON.stringify([...seen]));
  `,
      ],
      { encoding: "utf8" },
    ),
  );
}
test("fresh unshaken CommonJS loads statically isolate each explicit entry", () => {
  const profiles = {
    textFlowSiblings: ["@updf/text-flow", "@updf/text/selection"],
    textFlowPath: ["@updf/text-flow/path", "@updf/text/selection"],
    textFlowSyntax: ["@updf/text-flow", "@updf/text-flow/path", "@updf/text-flow/syntax"],
    textFlowSources: ["@updf/text-flow/sources"],
    textFlow: ["@updf/text-flow/atomic", "@updf/text/composition"],
    ordinaryText: ["@updf/text"],
    layout: ["@updf/layout"],
    drawing: ["@updf/core"],
    authoredRender: ["@updf/layout/render"],
  };
  for (const [profile, entries] of Object.entries(profiles)) textFlowEntryGraph(profile, loaded(entries));
  const root = loaded(["@updf/text-flow"]);
  assert.ok(!root.some((p) => /packages\/geometry\/dist\//u.test(p)));
  assert.ok(!root.some((p) => /text-flow\/dist\/(?:cjs\/)?(?:path|path-band|atomic)\.js$/u.test(p)));
});
