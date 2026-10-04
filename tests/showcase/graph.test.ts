import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

interface Chunk {
  readonly fileName: string;
  readonly isEntry: boolean;
  readonly imports: readonly string[];
  readonly dynamicImports: readonly string[];
  readonly modules: readonly string[];
}
function closure(chunks: readonly Chunk[], entry: Chunk, dynamic = false, seen = new Set<string>()): readonly string[] {
  if (seen.has(entry.fileName)) return [];
  seen.add(entry.fileName);
  return [
    ...entry.modules,
    ...(dynamic ? [...entry.imports, ...entry.dynamicImports] : entry.imports).flatMap((name) => {
      const chunk = chunks.find((candidate) => candidate.fileName === name);
      assert.ok(chunk);
      return closure(chunks, chunk, dynamic, seen);
    }),
  ];
}

test("production chunk graph keeps adapters optional; Fontkit belongs only to opt-in freight", async () => {
  const directory = new URL("../../apps/showcase/dist/", import.meta.url);
  const chunks: Chunk[] = JSON.parse(await readFile(new URL("chunk-graph.json", directory), "utf8"));
  const entry = chunks.find((chunk) => chunk.isEntry && chunk.modules.some((name) => name.endsWith("/src/main.ts")));
  assert.ok(entry);
  const initial = closure(chunks, entry, false);
  assert.ok(initial.some((name) => name.includes("/core/dist/")));
  assert.ok(!initial.some((name) => /\/packages\/(svg|geometry|layout|tables)\//.test(name)));
  assert.ok(!initial.some((name) => name.includes("/pdfjs-dist/")));
  const plasma = chunks.find(
    (chunk) => chunk.isEntry && chunk.modules.some((name) => name.endsWith("/plasma/main.ts")),
  );
  assert.ok(plasma);
  assert.ok(
    !closure(chunks, plasma, false).some((name) => /\/packages\/(core|svg|geometry)\/|\/pdfjs-dist\//.test(name)),
  );
  const optional = chunks.find(
    (chunk) =>
      entry.dynamicImports.includes(chunk.fileName) &&
      closure(chunks, chunk).some((name) => name.includes("/svg/dist/")),
  );
  assert.ok(optional);
  assert.ok(closure(chunks, optional, false).some((name) => name.includes("/geometry/dist/")));
  const renderer = chunks.find((chunk) => chunk.modules.some((name) => name.includes("/pdfjs-dist/")));
  assert.ok(renderer);
  assert.ok(closure(chunks, entry, true).some((name) => name.includes("/pdfjs-dist/")));
  assert.ok(closure(chunks, entry, true).some((name) => name.includes("/svg/dist/")));
  assert.ok(closure(chunks, plasma, true).some((name) => name.includes("/svg/dist/")));
  assert.ok(closure(chunks, plasma, true).some((name) => name.includes("/pdfjs-dist/")));
  assert.ok(closure(chunks, optional).some((name) => name.includes("/svg/dist/")));
  assert.ok(closure(chunks, optional).some((name) => name.includes("/geometry/dist/")));
  layoutClosures(chunks, entry);
  const modules = chunks.flatMap((chunk) => chunk.modules);
  assert.ok(!modules.some((name) => /node:|external|\/react(?:-dom)?\//.test(name)));
  freightClosure(chunks, entry);
  await notices(directory);
});
function freightClosure(chunks: readonly Chunk[], entry: Chunk): void {
  const freight = chunks.find((chunk) =>
    chunk.modules.some((name) => name.endsWith("/src/optional-freight-invoice.ts")),
  );
  assert.ok(freight && entry.dynamicImports.includes(freight.fileName));
  const parser = /\/fontkit\/|\/restructure\/|\/brotli\/|\/unicode-trie\//u;
  const freightModules = new Set(closure(chunks, freight));
  for (const name of chunks.flatMap((chunk) => chunk.modules).filter((name) => parser.test(name)))
    assert.ok(freightModules.has(name), `Parser outside freight ownership: ${name}`);
  assert.ok(closure(chunks, freight).some((name) => /\/fontkit\/dist\/browser-module\.mjs$/u.test(name)));
  assert.ok(!closure(chunks, freight).some((name) => /\/packages\/(svg|geometry|tables)\//u.test(name)));
  assert.ok(!closure(chunks, entry).some((name) => parser.test(name)));
  for (const chunk of chunks.filter((candidate) => entry.dynamicImports.includes(candidate.fileName))) {
    if (chunk !== freight) assert.ok(!closure(chunks, chunk).some((name) => parser.test(name)), chunk.fileName);
  }
  for (const chunk of chunks.filter((candidate) => candidate.isEntry && candidate !== entry))
    assert.ok(!closure(chunks, chunk, true).some((name) => parser.test(name)), chunk.fileName);
}

test("every installed package in the actual freight closure has byte-exact emitted notices", async () => {
  const directory = new URL("../../apps/showcase/dist/", import.meta.url);
  const chunks: Chunk[] = JSON.parse(await readFile(new URL("chunk-graph.json", directory), "utf8"));
  const freight = chunks.find((chunk) =>
    chunk.modules.some((name) => name.endsWith("/src/optional-freight-invoice.ts")),
  );
  assert.ok(freight);
  const packages = new Map<string, string>();
  for (const module of closure(chunks, freight)) {
    const match = /^(.*\/node_modules\/((?:@[^/]+\/)?[^/]+))\//u.exec(module);
    if (match) packages.set(match[2]!, match[1]!);
  }
  assert.ok(packages.has("fontkit"));
  assert.ok(packages.has("tslib"), "The @swc/helpers transitive runtime must be covered");
  for (const [name, root] of packages) await packageNotice(directory, name, root);
});

async function packageNotice(directory: URL, name: string, root: string): Promise<void> {
  const files = await readdir(root);
  const license = files.find((file) => file === "LICENSE" || file === "LICENSE.txt");
  if (license) {
    assert.deepEqual(
      await readFile(new URL(`notices/LICENSE.${name.replace(/[@/]/gu, "-")}`, directory)),
      await readFile(`${root}/${license}`),
      `${name}: emitted license must match the installed source exactly`,
    );
    return;
  }
  // Only the documented upstream distributions may use the metadata/README fallback.
  assert.ok(["fontkit", "dfa", "brotli"].includes(name), `${name}: missing standalone license`);
  for (const [notice, source] of [
    [`${name}.metadata.json`, "package.json"],
    [`${name}.README.md`, name === "brotli" ? "readme.md" : "README.md"],
  ]) {
    assert.deepEqual(
      await readFile(new URL(`notices/${notice}`, directory)),
      await readFile(`${root}/${source}`),
      `${name}: emitted fallback must match the installed source exactly`,
    );
  }
}

function layoutClosures(chunks: readonly Chunk[], entry: Chunk): void {
  const flow = chunks.find(
    (chunk) =>
      entry.dynamicImports.includes(chunk.fileName) &&
      chunk.modules.some((name) => name.endsWith("/src/optional-flow.ts")),
  );
  assert.ok(flow);
  assert.ok(closure(chunks, flow).some((name) => name.endsWith("/layout/dist/mixed-layout.js")));
  assert.ok(!flow.modules.some((name) => /\/packages\/(svg|geometry)\//u.test(name)));
  assert.ok(!closure(chunks, flow).some((name) => /\/layout\/dist\/tables\//u.test(name)));
  tableClosure(chunks, entry);
  assert.ok(!closure(chunks, entry).some((name) => /\/layout\//u.test(name)));
  paragraphClosure(chunks, entry);
  mixedClosure(chunks, entry);
  rowClosure(chunks, entry);
  invoiceClosure(chunks, entry);
  manifestClosure(chunks, entry);
  const template = chunks.find((chunk) => chunk.modules.some((name) => name.endsWith("/src/template.tsx")));
  assert.ok(template && entry.dynamicImports.includes(template.fileName));
  assert.ok(closure(chunks, template).some((name) => name.endsWith("/layout/dist/mixed-layout.js")));
  assert.ok(
    !closure(chunks, template).some((name) =>
      /\/packages\/(svg|geometry|tables)\/|\/layout\/dist\/tables\//u.test(name),
    ),
  );
  const blocks = chunks.find((chunk) => chunk.modules.some((name) => name.endsWith("/src/optional-blocks.ts")));
  assert.ok(blocks && entry.dynamicImports.includes(blocks.fileName));
  assert.ok(closure(chunks, blocks).some((name) => name.endsWith("/src/chart.ts")));
  assert.ok(
    !closure(chunks, blocks).some((name) => /\/packages\/(svg|geometry)\/|\/layout\/dist\/tables\//u.test(name)),
  );
}

async function notices(directory: URL): Promise<void> {
  for (const name of ["fontkit", "dfa", "brotli"])
    assert.deepEqual(
      await readFile(new URL(`notices/${name}.metadata.json`, directory)),
      await readFile(new URL(`../../node_modules/${name}/package.json`, import.meta.url)),
    );
  assert.deepEqual(
    await readFile(new URL("notices/LICENSE.liberation", directory)),
    await readFile(new URL("../../tests/fixtures/fonts/LICENSE", import.meta.url)),
  );
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
}

test("both production HTML entries retain the /updf/ asset base", async () => {
  for (const name of ["index", "plasma"]) {
    const html = await readFile(new URL(`../../apps/showcase/dist/${name}.html`, import.meta.url), "utf8");
    assert.ok(html.includes('src="/updf/assets/'));
    assert.ok(html.includes('href="/updf/assets/'));
  }
});

function tableClosure(chunks: readonly Chunk[], entry: Chunk): void {
  const tables = chunks.find((chunk) => chunk.modules.some((name) => name.endsWith("/src/optional-tables.ts")));
  assert.ok(tables && entry.dynamicImports.includes(tables.fileName));
  assert.ok(closure(chunks, tables).some((name) => name.endsWith("/tables/dist/adapter.js")));
  assert.ok(closure(chunks, tables).some((name) => name.endsWith("/tables/dist/measure.js")));
  assert.ok(
    !closure(chunks, tables).some((name) => /\/packages\/(svg|geometry)\/|\/layout\/dist\/tables\//u.test(name)),
  );
  const svgCells = chunks.find((chunk) => chunk.modules.some((name) => name.endsWith("/src/optional-table-svg.ts")));
  assert.ok(svgCells && entry.dynamicImports.includes(svgCells.fileName));
  assert.ok(closure(chunks, svgCells).some((name) => name.includes("/svg/dist/")));
}
function mixedClosure(chunks: readonly Chunk[], entry: Chunk): void {
  const mixed = chunks.find((chunk) => chunk.modules.some((name) => name.endsWith("/src/optional-mixed.ts")));
  assert.ok(mixed && entry.dynamicImports.includes(mixed.fileName));
  assert.ok(closure(chunks, mixed).some((name) => name.endsWith("/layout/dist/mixed-layout.js")));
  assert.ok(
    !closure(chunks, mixed).some((name) => /\/packages\/(svg|geometry)\/|\/layout\/dist\/tables\//u.test(name)),
  );
}
function paragraphClosure(chunks: readonly Chunk[], entry: Chunk): void {
  const paragraph = chunks.find((chunk) => chunk.modules.some((name) => name.endsWith("/src/rich.tsx")));
  assert.ok(paragraph && entry.dynamicImports.includes(paragraph.fileName));
  assert.ok(closure(chunks, paragraph).some((name) => name.endsWith("/layout/dist/content-data.js")));
  assert.ok(
    !closure(chunks, paragraph).some((name) => /\/packages\/(svg|geometry)\/|\/layout\/dist\/tables\//u.test(name)),
  );
}
function rowClosure(chunks: readonly Chunk[], entry: Chunk): void {
  const rows = chunks.find((chunk) => chunk.modules.some((name) => name.endsWith("/src/optional-rows.ts")));
  assert.ok(rows && entry.dynamicImports.includes(rows.fileName));
  const modules = closure(chunks, rows);
  assert.ok(modules.some((name) => name.endsWith("/layout/dist/row-vdom.js")));
  assert.ok(modules.some((name) => name.endsWith("/src/chart.ts")));
  assert.ok(modules.some((name) => name.includes("/svg/dist/")));
  assert.ok(!modules.some((name) => /\/packages\/(tables|fontkit)\/|\/react(?:-dom)?\//u.test(name)));
}
function invoiceClosure(chunks: readonly Chunk[], entry: Chunk): void {
  const invoice = chunks.find((chunk) => chunk.modules.some((name) => name.endsWith("/src/optional-invoice.ts")));
  assert.ok(invoice && entry.dynamicImports.includes(invoice.fileName));
  const modules = closure(chunks, invoice);
  assert.ok(modules.some((name) => name.endsWith("/examples/business/invoice.tsx")));
  assert.ok(modules.some((name) => name.endsWith("/examples/business/components.tsx")));
  assert.ok(modules.some((name) => name.endsWith("/tables/dist/adapter.js")));
  assert.ok(!modules.some((name) => /\/packages\/(svg|geometry|fontkit)\/|node:|\/react(?:-dom)?\//u.test(name)));
  assert.ok(!closure(chunks, entry).some((name) => name.includes("/examples/business/")));
}
function manifestClosure(chunks: readonly Chunk[], entry: Chunk): void {
  const manifest = chunks.find((chunk) => chunk.modules.some((name) => name.endsWith("/src/optional-manifest.ts")));
  assert.ok(manifest && entry.dynamicImports.includes(manifest.fileName));
  const modules = closure(chunks, manifest);
  for (const name of ["manifest.tsx", "manifest-data.ts", "manifest-calculations.ts", "components.tsx"])
    assert.ok(modules.some((path) => path.endsWith(`/examples/business/${name}`)));
  assert.ok(modules.some((name) => name.endsWith("/tables/dist/adapter.js")));
  assert.ok(!modules.some((name) => /\/packages\/(svg|geometry|fontkit)\/|node:|\/react(?:-dom)?\//u.test(name)));
  assert.ok(!modules.some((name) => name.endsWith("/invoice.tsx") || name.endsWith("/invoice-data.ts")));
}
