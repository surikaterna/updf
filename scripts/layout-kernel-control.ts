import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Metafile, Plugin } from "esbuild";

export const arithmeticProvenance = {
  revision: "e96d2741f8d4a5f3086e6b95ff61a5967db7e7f1",
  path: "packages/core/src/measurement/arithmetic.ts",
  sha256: "6c99483a778c69420c73b74c4745247479d484c4d6d0eacce1be1ed28b0dd620",
};
const arithmeticPath = /packages\/core\/(?:src\/measurement\/arithmetic\.ts|dist\/measurement\/arithmetic\.js)$/;

export function certifyArithmetic(source: string): void {
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    arithmeticProvenance.sha256,
    "pre-kernel source certificate",
  );
}

export async function arithmeticSource(): Promise<string> {
  const source = await readFile(
    new URL("../tests/integration/fixtures/pre-kernel-arithmetic.ts.txt", import.meta.url),
    "utf8",
  );
  certifyArithmetic(source);
  return source;
}

export function arithmeticControl(source: string) {
  const hits: string[] = [];
  const plugin: Plugin = {
    name: "immutable-arithmetic-control",
    setup(builder) {
      builder.onLoad({ filter: arithmeticPath }, ({ path }) => {
        hits.push(path);
        return { contents: source, loader: "ts" };
      });
    },
  };
  return {
    plugin,
    assertApplied(metafile: Metafile) {
      const inputs = Object.keys(metafile.inputs).filter((path) => arithmeticPath.test(path));
      assert.equal(inputs.length, 1, "exactly one core arithmetic input");
      assert.equal(hits.length, 1, "exactly one historical arithmetic replacement required");
      assert.equal(resolve(inputs[0]!), hits[0]);
      return { ...arithmeticProvenance, resolvedInput: inputs[0]!, replacements: hits.length };
    },
  };
}
