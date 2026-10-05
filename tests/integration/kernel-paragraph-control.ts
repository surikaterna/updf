import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { build, type Plugin } from "esbuild";

// Exact bytes from cb719c2e709f0d2ee2dc79773fb093c9ce17650a:packages/layout/src/content-producer.ts.
// Keep the certificate independent of the fixture so refreshing it is an explicit review decision.
const controlDigest = "eb2c1c642e0eaf4f384e78edd84d169a5a6fc7d3b3402b6f9cfeb829d06db32c";
const producerPath = /packages\/layout\/(?:src\/content-producer\.ts|dist\/content-producer\.js)$/;

export function certifyControlSource(source: string): void {
  assert.equal(createHash("sha256").update(source).digest("hex"), controlDigest, "pre-C source certificate");
}

export async function controlSource(): Promise<string> {
  const source = await readFile(new URL("./fixtures/pre-c-content-producer.ts.txt", import.meta.url), "utf8");
  certifyControlSource(source);
  return source;
}

function replacement(source: string, hits: string[]): Plugin {
  return {
    name: "pre-C-selector-control",
    setup(builder) {
      builder.onLoad({ filter: producerPath }, ({ path }) => {
        hits.push(path);
        // Historical relative imports belong to layout source, even if exports resolve to dist.
        const resolveDir = path.endsWith(".ts") ? dirname(path) : resolve(dirname(path), "../src");
        return { contents: source, loader: "ts", resolveDir };
      });
    },
  };
}

export async function paragraphFixture(fixture: string, source?: string) {
  const hits: string[] = [];
  const result = await build({
    stdin: { contents: fixture, resolveDir: process.cwd() },
    bundle: true,
    write: false,
    format: "esm",
    platform: "neutral",
    metafile: true,
    plugins: source === undefined ? [] : [replacement(source, hits)],
  });
  const inputs = Object.keys(result.metafile.inputs).filter((path) => producerPath.test(path));
  assert.equal(inputs.length, 1, "exactly one resolved paragraph producer");
  assert.equal(hits.length, source === undefined ? 0 : 1, "exactly one historical replacement required");
  if (source !== undefined) assert.equal(resolve(inputs[0]!), hits[0]);
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0]!.contents).toString("base64")}`);
}
