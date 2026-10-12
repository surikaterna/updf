import assert from "node:assert/strict";
import test from "node:test";
import type { Metafile } from "esbuild";
import { initialOutputs, sum } from "../../scripts/bundle-comparison/build.js";
import { competitors } from "../../scripts/bundle-comparison/competitors.js";
import { updfProfiles } from "../../scripts/bundle-comparison/updf.js";

test("bundle measurement includes the static graph once and separates optional dynamic chunks", () => {
  const output = (imports: Metafile["outputs"][string]["imports"]) => ({ imports, exports: [], inputs: {}, bytes: 1 });
  const meta: Metafile = {
    inputs: {},
    outputs: {
      "entry.js": output([
        { path: "shared.js", kind: "import-statement" },
        { path: "lazy.js", kind: "dynamic-import" },
      ]),
      "shared.js": output([
        { path: "entry.js", kind: "import-statement" },
        { path: "external", kind: "import-statement", external: true },
      ]),
      "lazy.js": output([]),
    },
  };
  assert.deepEqual([...initialOutputs(meta, "entry.js")], ["entry.js", "shared.js"]);
  assert.deepEqual(
    sum([
      { minified: 10, gzip: 8, brotli: 7 },
      { minified: 20, gzip: 15, brotli: 12 },
    ]),
    { minified: 30, gzip: 23, brotli: 19 },
  );
});

test("comparison profiles use live operations rather than empty imports or externalized runtimes", () => {
  const profiles = [...updfProfiles(), ...competitors()];
  assert.equal(new Set(profiles.map((profile) => profile.id)).size, profiles.length);
  assert.equal(profiles.length, 30);
  for (const profile of profiles) assert.match(profile.source, /export (?:async )?(?:function|const) run/u);
  const get = (id: string) => profiles.find((profile) => profile.id === id)!.source;
  assert.ok(!get("updf-text").includes("@updf/png"));
  assert.match(get("updf-text-png"), /preparePng\(input.png\)/u);
  assert.match(get("updf-full-fontkit"), /prepareFont\(input.font\)/u);
  assert.match(get("pdfmake-text"), /addFontContainer/u);
  assert.match(get("react-pdf-text"), /toBlob\(\)/u);
});
