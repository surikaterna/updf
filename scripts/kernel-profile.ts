import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";

export async function kernelProfile() {
  const result = await build({
    stdin: {
      contents:
        'export { LayoutInputError, resolveWidths } from "@updf/layout-boxes"; export { bits, dyadic } from "@updf/layout-boxes/numeric";',
      resolveDir: process.cwd(),
    },
    bundle: true,
    write: false,
    metafile: true,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    minify: true,
  });
  const output = result.outputFiles[0];
  assert.ok(output);
  const inputs = Object.keys(result.metafile.inputs).filter((path) => path !== "<stdin>");
  assert.ok(inputs.length > 0);
  assert.ok(
    inputs.every((path) => path.startsWith("packages/layout-boxes/dist/")),
    "Nonkernel source resolved",
  );
  const metadata = Object.values(result.metafile.outputs)[0];
  assert.ok(metadata);
  assert.deepEqual(metadata.imports, []);
  const retained = Object.entries(metadata.inputs).filter(([, info]) => info.bytesInOutput > 0);
  assert.ok(
    retained.some(([path]) => path.endsWith("/width-resolver.js")),
    "Allocator bytes absent",
  );
  assert.ok(
    retained.some(([path]) => path.endsWith("/binary64.js")),
    "Numeric bytes absent",
  );
  const directory = new URL("../artifacts/layout-boxes-a/standalone/", import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL("bundle.mjs", directory), output.contents);
  await writeFile(new URL("bundle.mjs.gz", directory), gzipSync(output.contents));
  await writeFile(new URL("metafile.json", directory), `${JSON.stringify(result.metafile, null, 2)}\n`);
  return {
    raw: output.contents.length,
    gzip: gzipSync(output.contents).length,
    inputs,
    retained,
    externals: metadata.imports,
  };
}
if (process.argv[1]?.endsWith("kernel-profile.ts")) console.log(JSON.stringify(await kernelProfile(), null, 2));
