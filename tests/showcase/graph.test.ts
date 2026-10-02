import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

interface Chunk {
  readonly fileName: string;
  readonly isEntry: boolean;
  readonly imports: readonly string[];
  readonly dynamicImports: readonly string[];
  readonly modules: readonly string[];
}

test("production chunk graph keeps SVG optional and excludes Node, React and Fontkit", async () => {
  const directory = new URL("../../apps/showcase/dist/", import.meta.url);
  const chunks: Chunk[] = JSON.parse(await readFile(new URL("chunk-graph.json", directory), "utf8"));
  const entry = chunks.find((chunk) => chunk.isEntry);
  assert.ok(entry);
  assert.equal(entry.imports.length, 0);
  assert.equal(entry.dynamicImports.length, 2);
  assert.ok(entry.modules.some((name) => name.includes("/core/dist/vdom/")));
  assert.ok(!entry.modules.some((name) => /\/packages\/(svg|geometry)\//.test(name)));
  assert.ok(!entry.modules.some((name) => name.includes("/pdfjs-dist/")));
  const optional = chunks.find((chunk) => chunk.modules.some((name) => name.includes("/svg/dist/")));
  assert.ok(optional);
  assert.ok(optional.modules.some((name) => name.includes("/svg/dist/")));
  assert.ok(optional.modules.some((name) => name.includes("/geometry/dist/")));
  const renderer = chunks.find((chunk) => chunk.modules.some((name) => name.includes("/pdfjs-dist/")));
  assert.ok(renderer);
  assert.ok(entry.dynamicImports.includes(renderer.fileName));
  const modules = chunks.flatMap((chunk) => chunk.modules);
  assert.ok(!modules.some((name) => /node:|external|\/fontkit\/|\/react(?:-dom)?\//.test(name)));
  for (const notice of ["LICENSE.svgpath", "REUSE.md"]) {
    assert.deepEqual(
      await readFile(new URL(`notices/${notice}`, directory)),
      await readFile(new URL(`../../packages/geometry/${notice}`, import.meta.url)),
    );
  }
  assert.deepEqual(
    await readFile(new URL("notices/LICENSE.pdfjs", directory)),
    await readFile(new URL("../../node_modules/pdfjs-dist/LICENSE", import.meta.url)),
  );
  const html = await readFile(new URL("index.html", directory), "utf8");
  assert.ok(html.includes('src="/updf/assets/'));
  assert.ok(html.includes('href="/updf/assets/'));
});
