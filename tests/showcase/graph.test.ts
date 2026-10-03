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
  const entry = chunks.find((chunk) => chunk.isEntry && chunk.modules.some((name) => name.endsWith("/src/main.ts")));
  assert.ok(entry);
  const initial = closure(chunks, entry, false);
  assert.ok(initial.some((name) => name.includes("/core/dist/vdom/")));
  assert.ok(!initial.some((name) => /\/packages\/(svg|geometry)\//.test(name)));
  assert.ok(!initial.some((name) => name.includes("/pdfjs-dist/")));
  const plasma = chunks.find(
    (chunk) => chunk.isEntry && chunk.modules.some((name) => name.endsWith("/plasma/main.ts")),
  );
  assert.ok(plasma);
  assert.ok(
    !closure(chunks, plasma, false).some((name) => /\/packages\/(core|svg|geometry)\/|\/pdfjs-dist\//.test(name)),
  );
  const optional = chunks.find((chunk) => chunk.modules.some((name) => name.includes("/svg/dist/")));
  assert.ok(optional);
  assert.ok(optional.modules.some((name) => name.includes("/svg/dist/")));
  assert.ok(closure(chunks, optional, false).some((name) => name.includes("/geometry/dist/")));
  const renderer = chunks.find((chunk) => chunk.modules.some((name) => name.includes("/pdfjs-dist/")));
  assert.ok(renderer);
  assert.ok(closure(chunks, entry, true).some((name) => name.includes("/pdfjs-dist/")));
  assert.ok(closure(chunks, entry, true).some((name) => name.includes("/svg/dist/")));
  assert.ok(closure(chunks, plasma, true).some((name) => name.includes("/svg/dist/")));
  assert.ok(closure(chunks, plasma, true).some((name) => name.includes("/pdfjs-dist/")));
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

test("both production HTML entries retain the /updf/ asset base", async () => {
  for (const name of ["index", "plasma"]) {
    const html = await readFile(new URL(`../../apps/showcase/dist/${name}.html`, import.meta.url), "utf8");
    assert.ok(html.includes('src="/updf/assets/'));
    assert.ok(html.includes('href="/updf/assets/'));
  }
});

function closure(chunks: readonly Chunk[], root: Chunk, dynamic: boolean): string[] {
  const visited = new Set<string>();
  const modules: string[] = [];
  const pending = [root];
  while (pending.length) {
    const chunk = pending.pop();
    if (!chunk || visited.has(chunk.fileName)) continue;
    visited.add(chunk.fileName);
    modules.push(...chunk.modules);
    const names = dynamic ? [...chunk.imports, ...chunk.dynamicImports] : chunk.imports;
    for (const name of names) {
      const child = chunks.find((item) => item.fileName === name);
      assert.ok(child, `Missing chunk ${name}`);
      pending.push(child);
    }
  }
  return modules;
}
