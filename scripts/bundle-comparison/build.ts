import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import { build, type Metafile } from "esbuild";
import type { Profile } from "./competitors.js";

export function sizes(bytes: Uint8Array) {
  return {
    minified: bytes.length,
    gzip: gzipSync(bytes, { level: 9 }).length,
    brotli: brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length,
  };
}

export function initialOutputs(meta: Metafile, entry: string, seen = new Set<string>()): Set<string> {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  for (const item of meta.outputs[entry]?.imports ?? []) {
    if (item.kind !== "dynamic-import" && !item.external) initialOutputs(meta, item.path, seen);
  }
  return seen;
}

export function sum(files: readonly { minified: number; gzip: number; brotli: number }[]) {
  return files.reduce(
    (total, file) => ({
      minified: total.minified + file.minified,
      gzip: total.gzip + file.gzip,
      brotli: total.brotli + file.brotli,
    }),
    { minified: 0, gzip: 0, brotli: 0 },
  );
}

function compile(profile: Profile, root: string, directory: string) {
  return build({
    stdin: {
      contents: profile.source,
      resolveDir: resolve(root, "scripts/bundle-comparison"),
      sourcefile: "entry.tsx",
      loader: "tsx",
    },
    entryNames: "entry",
    chunkNames: "chunks/[name]-[hash]",
    outdir: directory,
    bundle: true,
    minify: true,
    splitting: true,
    target: "es2022",
    platform: "browser",
    conditions: ["browser"],
    format: "esm",
    metafile: true,
    write: false,
    jsx: "automatic",
    jsxImportSource: "@updf/core",
    define: { "process.env.NODE_ENV": '"production"' },
    legalComments: "eof",
  });
}

export async function bundle(profile: Profile, root: string, output: string) {
  const directory = resolve(output, profile.id);
  await mkdir(directory, { recursive: true });
  const result = await compile(profile, root, directory);
  const entry = Object.keys(result.metafile.outputs).find((path) => path.endsWith("/entry.js"));
  assert.ok(entry);
  const initial = initialOutputs(result.metafile, entry);
  const files = [];
  for (const file of result.outputFiles) {
    await mkdir(dirname(file.path), { recursive: true });
    await writeFile(file.path, file.contents);
    files.push({
      path: relative(directory, file.path),
      initial: initial.has(relative(root, file.path)),
      ...sizes(file.contents),
    });
  }
  const modules = Object.keys(result.metafile.inputs);
  assert.ok(
    !modules.some((path) => /packages\/[^/]+\/(?:src|dist\/(?:cjs|node))\//u.test(path)),
    "uPDF must use emitted browser package exports",
  );
  await writeFile(resolve(directory, "input.tsx"), profile.source);
  await writeFile(resolve(directory, "metafile.json"), JSON.stringify(result.metafile, null, 2));
  return {
    id: profile.id,
    library: profile.library,
    features: profile.features,
    initial: sum(files.filter((file) => file.initial)),
    total: sum(files),
    files,
    modules,
  };
}

export type Bundle = Awaited<ReturnType<typeof bundle>>;
