import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { checkSeams, portableGraph } from "./boundaries.js";

const root = new URL("../", import.meta.url);
await checkSeams(fileURLToPath(root));
const builds = [
  "dist-core",
  "dist-vdom",
  "dist-fonts",
  "dist-measurement",
  "dist-flow",
  "dist-tables",
  "dist-composable-tables",
  "dist",
  "dist-fontkit",
  "font-browser",
  "dist-geometry",
  "dist-svg",
];
const reports: { build: string; moduleCount: number; modules: string[] }[] = [];
for (const build of builds) {
  const path = build === "font-browser" ? "apps/browser-fonts/dist" : `apps/browser-react/${build}`;
  const graph: unknown = JSON.parse(await readFile(new URL(`${path}/module-graph.json`, root), "utf8"));
  assert.ok(graph && typeof graph === "object" && "modules" in graph && Array.isArray(graph.modules));
  const modules: string[] = [];
  for (const candidate of graph.modules) {
    assert.ok(typeof candidate === "string");
    modules.push(candidate);
  }
  const optional = build === "dist-fontkit" || build === "font-browser";
  portableGraph(modules, optional, build === "dist");
  assert.ok(
    modules.some((id) => /\/packages\/(?:core|layout|geometry|svg|fontkit)\/dist\/.*\.js$/u.test(id)),
    "Must inspect emitted package JS",
  );
  assert.ok(!modules.some((id) => /\/packages\/[^/]+\/src\//u.test(id)), "Source alias bypassed package exports");
  if (build !== "dist-geometry" && build !== "dist-svg" && build !== "font-browser")
    assert.ok(
      !modules.some((id) => /\/geometry\/dist\/(scanner|normalize)\.js|\/svg\/dist\//u.test(id)),
      `${build} must not import SVG/scanner`,
    );
  if (build === "dist-core") assert.ok(!modules.some((id) => /\/layout\//u.test(id)), "Layout leaked into core");
  if (build === "font-browser") {
    assert.ok(
      modules.some((id) => id.endsWith("/showcase/src/optional-inline-svg.ts")),
      "Local inline SVG proof missing",
    );
    assert.ok(
      modules.some((id) => id.endsWith("/svg/dist/index.js")),
      "Optional native SVG compiler proof missing",
    );
  }
  if (build === "dist-flow") assert.ok(!modules.some((id) => /\/tables\//u.test(id)), "Future tables leaked into flow");
  if (build === "dist-composable-tables") {
    assert.ok(
      modules.some((id) => /\/tables\/dist\/adapter\.js$/u.test(id)),
      "Public table package positive control missing",
    );
    assert.ok(
      !modules.some((id) => /\/layout\/dist\/tables\//u.test(id)),
      "Legacy table implementation leaked into the new package",
    );
  }
  if (build === "dist-tables")
    assert.ok(
      modules.some((id) => /\/layout\/dist\/tables\/paint\.js$/u.test(id)),
      "Tables positive control missing",
    );
  if (build === "dist-flow")
    assert.ok(
      modules.some((id) => /\/layout\/dist\/mixed-layout\.js$/u.test(id)),
      "Mixed-document positive control missing",
    );
  if (build === "dist-tables")
    assert.ok(
      !modules.some((id) => /\/vdom\/(lower|native)\.js$|\/layout\/dist\/vdom\.js$/u.test(id)),
      "Native document lowering leaked into a layout content entry",
    );
  if (optional)
    assert.ok(
      modules.some((id) => /node_modules\/fontkit\/dist\/browser-module\.mjs/u.test(id)),
      `${build} must use public browser Fontkit export`,
    );
  reports.push({ build, moduleCount: modules.length, modules });
}
await mkdir(new URL("artifacts/", root), { recursive: true });
await writeFile(new URL("artifacts/module-graphs.json", root), `${JSON.stringify(reports, null, 2)}\n`);
console.log(reports.map(({ build, moduleCount }) => ({ build, moduleCount })));
