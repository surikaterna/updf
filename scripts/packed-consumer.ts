import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { installedGraph } from "./consumer/graphs.js";
import { absent, execute, install, pack, root } from "./consumer/install.js";
import { coreRuntime, fontkitRuntime, geometryRuntime, svgRuntime } from "./consumer/runtime.js";
import { allTypes, coreTypes, typeConsumer } from "./consumer/types.js";
import { smokeFixture } from "./migration/legacy-smoke-fixture.js";

async function coreProof(directory: string, graphs: Record<string, readonly string[]>): Promise<void> {
  await execute(directory, coreRuntime);
  await typeConsumer(directory, ["measurement-template.tsx", "fonts-template.ts"]);
  await typeConsumer(directory, ["measurement-template.tsx", "fonts-template.ts"], true);
  for (const entry of [
    "@updf/core",
    "@updf/core/fonts",
    "@updf/core/measurement",
    "@updf/core/painting",
    "@updf/core/vdom",
    "@updf/core/jsx-runtime",
    "@updf/core/jsx-dev-runtime",
  ]) {
    graphs[entry] = await installedGraph(directory, entry);
  }
}

const packs = await mkdtemp("/tmp/opencode/updf-tarballs-");
const directories: string[] = [];
const graphs: Record<string, readonly string[]> = {};
try {
  const tarballs = new Map<string, string>();
  for (const name of ["core", "layout", "tables", "geometry", "svg", "fontkit", "legacy"])
    tarballs.set(name, await pack(`packages/${name}`, packs));
  tarballs.set("cmr", await pack("apps/cmr", packs));
  for (const names of [
    ["core", "cmr"],
    ["core", "layout"],
    ["core", "layout", "tables"],
    ["core", "geometry"],
    ["core", "geometry", "svg", "cmr"],
    ["core", "fontkit"],
    ["legacy"],
  ]) {
    const paths = names.map((name) => {
      const path = tarballs.get(name);
      assert.ok(path);
      return path;
    });
    const directory = await install(paths);
    directories.push(directory);
    await absent(directory, ["fontkit", "react", "react-dom"]);
    await absent(
      directory,
      ["tables", "geometry", "svg", "fontkit", "legacy"]
        .filter((name) => !names.includes(name))
        .map((name) => `@updf/${name}`),
    );
    if (names.includes("core")) await coreProof(directory, graphs);
    if (names.includes("layout")) {
      await typeConsumer(directory, ["content-template.tsx", "mixed-template.tsx"]);
      await typeConsumer(directory, ["content-template.tsx", "mixed-template.tsx"], true);
      await typeConsumer(directory, ["flow-template.tsx"]);
      await typeConsumer(directory, ["flow-template.tsx"], true);
      graphs.layout = await installedGraph(directory, "@updf/layout");
      await execute(
        directory,
        `
        import assert from 'node:assert/strict';
        const layout = await import('@updf/layout');
        for (const name of ['layoutFlow', 'layoutFlowUnknown']) assert.equal(name in layout, false);
        assert.equal('Document' in layout.Flow, false);
        for (const entry of ['@updf/layout/vdom', '@updf/layout/tables', '@updf/layout/tables/vdom'])
          await assert.rejects(import(entry), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
      `,
      );
      assert.ok(!graphs.layout.some((path) => /tables|react|geometry|svg|fontkit/u.test(path)));
    }
    if (names.includes("geometry")) {
      await execute(directory, geometryRuntime);
      graphs.geometry = await installedGraph(directory, "@updf/geometry");
      await typeConsumer(directory, ["geometry-template.ts"]);
      await typeConsumer(directory, ["geometry-template.ts"], true);
    }
    if (names.includes("tables")) {
      await typeConsumer(directory, ["tables-template.tsx"]);
      await typeConsumer(directory, ["tables-template.tsx"], true);
      await typeConsumer(directory, ["composable-tables-template.tsx"]);
      await typeConsumer(directory, ["composable-tables-template.tsx"], true);
      graphs.composableTables = await installedGraph(directory, "@updf/tables");
      assert.ok(graphs.composableTables.some((path) => /\/tables\/dist\/adapter\.js$/u.test(path)));
      assert.ok(!graphs.composableTables.some((path) => /\/layout\/dist\/tables\//u.test(path)));
    }
    if (names.includes("svg")) {
      await execute(directory, svgRuntime);
      graphs.svg = await installedGraph(directory, "@updf/svg");
      graphs.tree = await installedGraph(directory, "@updf/svg/tree");
    }
    if (names.includes("cmr")) {
      const types = names.includes("svg") ? allTypes : coreTypes;
      await typeConsumer(directory, types);
      await typeConsumer(directory, types, true);
    }
    if (names.length === 2 && names.includes("core") && names.includes("cmr")) {
      await absent(directory, ["@updf/geometry", "@updf/svg", "@updf/fontkit", "@updf/legacy"]);
    }
    if (names.includes("fontkit")) {
      await assert.rejects(execute(directory, "await import('@updf/fontkit');"), /ERR_MODULE_NOT_FOUND/u);
      await typeConsumer(directory, ["fontkit-template.ts"], false, false);
      await typeConsumer(directory, ["fontkit-template.ts"], true, false);
      execFileSync("npm", ["install", "fontkit@2.0.4", "--ignore-scripts", "--omit=dev", "--no-audit", "--no-fund"], {
        cwd: directory,
        stdio: "pipe",
      });
      await writeFile(
        join(directory, "fixture.ttf"),
        await readFile(join(root, "tests/fixtures/fonts/LiberationSans-Regular.ttf")),
      );
      await execute(directory, fontkitRuntime);
      graphs.fontkit = await installedGraph(directory, "@updf/fontkit", true);
    }
    if (names.includes("legacy")) {
      await writeFile(join(directory, "legacy.cjs"), smokeFixture("@updf/legacy", "@updf/legacy/lib"));
      const result: unknown = JSON.parse(
        execFileSync(process.execPath, ["legacy.cjs"], { cwd: directory, encoding: "utf8" }),
      );
      const baseline: { installed: unknown } = JSON.parse(
        await readFile(join(root, "docs/evidence/legacy-tarball-baseline.json"), "utf8"),
      );
      assert.deepEqual(result, baseline.installed);
    }
  }
  await mkdir(join(root, "artifacts"), { recursive: true });
  await writeFile(join(root, "artifacts/installed-graphs.json"), `${JSON.stringify(graphs, null, 2)}\n`);
  console.log(
    "Seven clean external tarball closures passed: core-only, layout/VDOM, composable tables, geometry, SVG/tree, Fontkit absent/present, legacy; NodeNext/Bundler types and runtime ownership.",
  );
} finally {
  for (const directory of directories) await rm(directory, { recursive: true, force: true });
  await rm(packs, { recursive: true, force: true });
}
