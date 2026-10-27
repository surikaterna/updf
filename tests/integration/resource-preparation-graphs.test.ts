import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { build } from "esbuild";
import { resourcePreparationCostInput } from "../../scripts/resource-preparation-cost-input.js";

test("private async driver is absent from ordinary parsed graphs and retained by explicit preparation", async () => {
  const ordinary = ["@updf/core", "@updf/layout", "@updf/layout/render", "@updf/images"];
  for (const platform of ["browser", "node"] as const) {
    for (const entry of [...ordinary, "preparation"]) {
      const result = await build({
        stdin: {
          contents:
            entry === "preparation" ? resourcePreparationCostInput() : `import * as api from '${entry}'; export {api};`,
          resolveDir: process.cwd(),
          loader: "ts",
        },
        platform,
        format: "esm",
        target: "es2022",
        bundle: true,
        write: false,
        metafile: true,
      });
      const modules = Object.keys(result.metafile.inputs);
      const drivers = modules.filter((path) =>
        /\/(?:internal-preparation|preparation-resource|preparation-signal|preparation-content)\.js$/u.test(path),
      );
      assert.equal(drivers.length > 0, entry === "preparation", `${platform}/${entry}`);
      if (entry === "preparation")
        assert.ok(!modules.some((path) => /\/(?:assets|png|jpeg|fontkit|fontkite|images|text-flow)\//u.test(path)));
    }
  }
});

test("fresh unshaken CommonJS ordinary entries do not load the async driver", () => {
  for (const entry of ["@updf/core", "@updf/layout", "@updf/layout/render", "@updf/images"]) {
    execFileSync(
      process.execPath,
      [
        "-e",
        `require(${JSON.stringify(entry)});
      if(Object.keys(require.cache).some(p=>/(internal-preparation|preparation-resource|preparation-signal|preparation-content)\\.js$/.test(p)))process.exit(1);`,
      ],
      { cwd: process.cwd() },
    );
  }
});
