import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { version as esbuild } from "esbuild";
import { chromium } from "playwright";
import { bundle, sizes } from "./bundle-comparison/build.js";
import { inputs, smoke } from "./bundle-comparison/browser.js";
import { competitors } from "./bundle-comparison/competitors.js";
import { updfProfiles } from "./bundle-comparison/updf.js";

const root = process.cwd();
const output = resolve(root, "artifacts/bundle-comparison");
await mkdir(output, { recursive: true });
const manifest = JSON.parse(await readFile(resolve(root, "scripts/bundle-comparison/package.json"), "utf8"));
const lock = await readFile(resolve(root, "scripts/bundle-comparison/package-lock.json"));
const browser = await chromium.launch({
  executablePath: process.env.SHOWCASE_CHROMIUM ?? "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const payload = await inputs(root);
const profiles = [];
try {
  for (const profile of [...updfProfiles(), ...competitors()]) {
    console.log(`Measuring ${profile.id}`);
    const built = await bundle(profile, root, output);
    try {
      const validation = await smoke(browser, profile, built, output, payload);
      profiles.push({ ...built, validation });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      profiles.push({ ...built, validation: { status: "failed", message } });
      console.error(`${profile.id}: ${message}`);
    }
  }
} finally {
  await browser.close();
}

const assets = [];
for (const path of [
  "fonts/LiberationSans-Regular.ttf",
  "fonts/liberation-sans.json",
  "jpeg/color-1x1.jpg",
  "png/color-alpha.png",
]) {
  assets.push({ path, ...sizes(await readFile(resolve(root, "tests/fixtures", path))) });
}
const report = {
  date: new Date().toISOString(),
  sourceRevision: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  node: process.version,
  esbuild,
  competitors: manifest.dependencies,
  lockSha256: createHash("sha256").update(lock).digest("hex"),
  settings: {
    target: "es2022",
    platform: "browser",
    format: "esm",
    minify: true,
    splitting: true,
    production: true,
    gzipLevel: 9,
    brotliQuality: 11,
    legalComments: "eof",
    compression: "sum of separately compressed emitted files",
  },
  assets,
  profiles,
};
await writeFile(resolve(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.table(
  profiles.map((profile) => ({
    profile: profile.id,
    minKiB: (profile.initial.minified / 1024).toFixed(1),
    gzipKiB: (profile.initial.gzip / 1024).toFixed(1),
    brotliKiB: (profile.initial.brotli / 1024).toFixed(1),
    allGzipKiB: (profile.total.gzip / 1024).toFixed(1),
    validation: profile.validation.status,
  })),
);
if (profiles.some((profile) => profile.validation.status !== "passed")) process.exitCode = 1;
