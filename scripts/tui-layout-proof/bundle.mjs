import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

export const revision = "4fc67c225ef9af80dd2345852df3b884e62656eb";
export const updfBaseline = "0bf8812b6c02c9e7114b75db02468ca4fe6f6147";
export const here = dirname(fileURLToPath(import.meta.url));

export function verifyRoot() {
  if (!process.env.FORMBAR_ROOT) throw new Error("FORMBAR_ROOT is required (trusted local pinned checkout)");
  const root = realpathSync(process.env.FORMBAR_ROOT);
  const git = (...args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
  if (git("rev-parse", "--show-toplevel") !== root || git("rev-parse", "HEAD") !== revision)
    throw new Error("Formbar root/revision mismatch");
  if (git("status", "--porcelain")) throw new Error("Formbar checkout must be clean");
  return root;
}

function sourcePath(root, specifier) {
  const [name, ...parts] = specifier.slice("@formbar/".length).split("/");
  const subpath = parts.join("/");
  const manifest = JSON.parse(readFileSync(join(root, "packages", name, "package.json"), "utf8"));
  const entry = manifest.exports[subpath ? `./${subpath}` : "."];
  const target = typeof entry === "string" ? entry : (entry?.import?.default ?? entry?.import);
  if (typeof target !== "string" || !target.startsWith("./dist/")) throw new Error(`No source entry: ${specifier}`);
  return join(root, "packages", name, target.replace("./dist/", "src/").replace(/\.js$/, ".ts"));
}

function baselineSources(builder) {
  builder.onResolve({ filter: /^\.\/width-(?:input|distribution)\.js$/ }, ({ path, importer }) => ({
    path: resolve(dirname(importer), path.replace(/\.js$/, ".ts")),
  }));
  builder.onResolve({ filter: /^@updf\/core\/internal$/ }, () => ({
    path: resolve(here, "../../packages/core/src/internal.ts"),
  }));
  const filter =
    /(?:packages\/layout\/src\/(?:binary64|width-(?:resolver|distribution|input|types))\.ts|scripts\/tui-layout-proof\/(?:intervals\.ts|terminal\.ts|bundle\.mjs|run\.mjs))$/;
  // Immutable Git blobs are only historical evidence, never a second production allocator.
  builder.onLoad({ filter }, ({ path }) => ({
    contents: execFileSync("git", ["show", `${updfBaseline}:${path.slice(resolve(here, "../..").length + 1)}`], {
      cwd: resolve(here, "../.."),
      encoding: "utf8",
    }),
    loader: path.endsWith(".ts") ? "ts" : "js",
  }));
}

function configure(builder, root, baseline) {
  if (baseline) baselineSources(builder);
  builder.onResolve({ filter: /^@updf\/layout-kernel(?:\/(?:numeric|boxes|arithmetic|geometry))?$/ }, ({ path }) => ({
    path: resolve(here, `../../packages/layout-kernel/src/${path.split("/")[2] ?? "index"}.ts`),
  }));
  builder.onResolve({ filter: /^proof:/ }, ({ path }) => ({
    path: join(root, "apps/demos/src", path === "proof:compile" ? "fsx/compile.ts" : "runtime/kalada-demo-install.ts"),
  }));
  builder.onResolve({ filter: /^@formbar\// }, ({ path }) => ({ path: sourcePath(root, path) }));
  builder.onResolve({ filter: /^[^./]/ }, async ({ path, importer, pluginData }) => {
    if (pluginData?.resolving) return;
    if (builtinModules.includes(path.replace(/^node:/, ""))) return { path, external: true };
    if (path === "esbuild") return { path, external: true };
    if (!importer.startsWith(root)) return;
    // Existing installed third-party dependencies stay external; no stale Formbar dist is used.
    const resolved = await builder.resolve(path, {
      resolveDir: root,
      kind: "import-statement",
      pluginData: { resolving: true },
    });
    if (resolved.errors.length) return { errors: resolved.errors };
    return { path: pathToFileURL(resolved.path).href, external: true };
  });
}

export async function bundle(entry, root, baseline = false) {
  return build({
    entryPoints: [resolve(here, entry)],
    bundle: true,
    write: false,
    metafile: true,
    platform: "node",
    format: "esm",
    target: "node24",
    minify: true,
    plugins: [{ name: "pinned-formbar-source", setup: (builder) => configure(builder, root, baseline) }],
  });
}

export async function load(entry, root) {
  const result = await bundle(entry, root);
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString("base64")}`);
}
