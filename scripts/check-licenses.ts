import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { pack } from "./consumer/install.js";
import { validatePackedNotices, validateProjectLicense } from "./project-license.js";

const root = new URL("../", import.meta.url);

async function validateManifest(directory: URL, name: string): Promise<void> {
  const manifest: { private: boolean; license: string; version: string; dependencies?: Record<string, string> } =
    JSON.parse(await readFile(new URL("package.json", directory), "utf8"));
  assert.equal(manifest.private, true);
  assert.equal(manifest.license, "MIT");
  assert.equal(manifest.version, name === "legacy" ? "0.4.15" : "2.0.0-poc.0");
  for (const [dependency, version] of Object.entries(manifest.dependencies ?? {})) {
    assert.ok(dependency.startsWith("@updf/"));
    assert.equal(version, "2.0.0-poc.0");
  }
}

function packedNotices(tarball: string, fontello?: string): number {
  const paths = execFileSync("tar", ["-tzf", tarball], { encoding: "utf8" })
    .trimEnd()
    .split("\n")
    .map((path) => path.replace(/^package\//u, ""));
  assert.ok(paths.length > 0);
  assert.ok(
    !paths.some((path) => /\.(?:ttf|otf|woff2?)$|liberation-sans\.json|(?:^|\/)(?:test|node_modules)\//u.test(path)),
    `Asset/test leak: ${tarball}`,
  );
  const contents = new Map<string, string>();
  for (const name of ["LICENSE", "LICENSE.svgpath"]) {
    if (paths.includes(name)) {
      contents.set(name, execFileSync("tar", ["-xOf", tarball, `package/${name}`], { encoding: "utf8" }));
    }
  }
  validatePackedNotices(contents, fontello);
  return paths.length;
}

validateProjectLicense(await readFile(new URL("LICENSE", root), "utf8"));
const rootManifest: { license: string } = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
assert.equal(rootManifest.license, "MIT");
const notice = await readFile(new URL("packages/geometry/LICENSE.svgpath", root), "utf8");
assert.match(notice, /Copyright \(C\) 2013-2015 by Vitaly Puzrin/u);
assert.equal(await readFile(new URL("packages/legacy/LICENSE.svgpath", root), "utf8"), notice);
const ofl = await readFile(new URL("tests/fixtures/fonts/LICENSE", root), "utf8");
assert.match(ofl, /SIL OPEN FONT LICENSE/u);
const destination = await mkdtemp("/tmp/opencode/updf-license-packs-");
const reports = [];
try {
  for (const name of ["core", "layout", "tables", "geometry", "svg", "fontkit", "legacy"]) {
    const directory = new URL(`packages/${name}/`, root);
    await validateManifest(directory, name);
    validateProjectLicense(await readFile(new URL("LICENSE", directory), "utf8"));
    const tarball = await pack(`packages/${name}`, destination);
    const files = packedNotices(tarball, name === "geometry" || name === "legacy" ? notice : undefined);
    reports.push({ package: name, files, projectLicense: true, fontAssets: false });
  }
} finally {
  await rm(destination, { recursive: true, force: true });
}
console.log(reports);
console.log(
  "Full project MIT license verified in actual tarballs: Copyright (c) 2026 Surikat AB. Third-party notices retained. Attribution is resolved; npm publication and deployment still require authorization.",
);
